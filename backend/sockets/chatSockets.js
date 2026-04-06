const prisma = require('../prisma/client');
const { socketAuthMiddleware } = require('../middleware/authMiddleware');
const { getNanaAiResponse } = require('../services/nanaAi');
const setupChatSockets = (io) => {
  // Apply auth middleware to socket connections
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    // REQUIREMENT 4: Reject connection if userId is missing
    if (!socket.user || !socket.user.id) {
      console.warn('[SOCKET ERROR] Unauthorized connection attempt rejected: Missing userId', socket.id);
      return socket.disconnect(true);
    }

    console.log(`User connected: ${socket.user.name} (${socket.user.id})`);

    // Update user online status
    prisma.user.update({
      where: { id: socket.user.id },
      data: {
        isOnline: true,
        socketId: socket.id,
        lastSeen: new Date()
      }
    }).then(user => {
      // Broadcast user online status
      io.emit('user-status-changed', {
        userId: user.id,
        isOnline: true,
        lastSeen: user.lastSeen
      });
    }).catch(err => {
      // REQUIREMENT 5: Log database schema mismatch/P2022 issues clearly
      if (err.code === 'P2022') {
        console.error(`[DATABASE SCHEMA ERROR] Missing column during status update: ${err.message}`);
      } else {
        console.error(`[SOCKET STATUS ERROR] User ${socket.user.id}:`, err.message);
      }
    });

    // Join personal room for notifications
    socket.join(`user:${socket.user.id}`);
    console.log(`[NOTIF DEBUG] Socket ${socket.id} joined personal room: user:${socket.user.id}`);
    
    // Send initial notification count
    prisma.notification.count({
      where: { recipientId: socket.user.id, isRead: false }
    }).then(count => {
      console.log(`[NOTIF DEBUG] Sending initial unread-count=${count} to user:${socket.user.id}`);
      socket.emit('unread-count', { count });
    }).catch(err => console.error('[NOTIF ERROR] Failed to get initial unread count:', err));

    // Join user's conversations for broadcast reception
    socket.on('join-conversations', async () => {
      try {
        const conversations = await prisma.conversation.findMany({
          where: {
            participants: { some: { userId: socket.user.id, isDeleted: false } },
            isActive: true
          },
          select: { id: true }
        });

        conversations.forEach(conv => {
          // Join broadcast room (for new-message events)
          socket.join(`conversation:${conv.id}`);
          // NOTE: Do NOT join 'viewing:id' here — only join that when user opens the chat
        });

        socket.emit('joined-conversations', { 
          count: conversations.length 
        });
        console.log(`[NOTIF DEBUG] User ${socket.user.id} joined ${conversations.length} active conversation broadcast rooms.`);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Auto-join conversations on connect (so clients don't need to manually emit)
    (async () => {
      try {
        const conversations = await prisma.conversation.findMany({
          where: {
            participants: { some: { userId: socket.user.id, isDeleted: false } },
            isActive: true
          },
          select: { id: true }
        });
        conversations.forEach(conv => socket.join(`conversation:${conv.id}`));
      } catch (err) {
        console.error('[NOTIF ERROR] Auto join-conversations failed:', err);
      }
    })();

    // Join specific conversation (for broadcast)
    // Also joins the 'viewing' room so the server knows this user is actively looking
    socket.on('join-conversation', async (conversationId) => {
      try {
        const participant = await prisma.conversationParticipant.findFirst({
          where: {
            userId: socket.user.id,
            conversationId: conversationId,
            isDeleted: false // REQUIREMENT: Prevent access to soft-deleted chats
          }
        });

        if (participant) {
          socket.join(`conversation:${conversationId}`);
          socket.join(`viewing:${conversationId}`); // 🔑 marks user as actively viewing
          socket.emit('joined-conversation', { conversationId });
          console.log(`[NOTIF DEBUG] User ${socket.user.id} is now ACTIVELY VIEWING conv:${conversationId}`);
        } else {
          socket.emit('error', { message: 'Access denied: Conversation deleted or hidden.' });
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Leave conversation — also leave the viewing room
    socket.on('leave-conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
      socket.leave(`viewing:${conversationId}`); // 🔑 user no longer actively viewing
      socket.emit('left-conversation', { conversationId });
      console.log(`[NOTIF DEBUG] User ${socket.user.id} LEFT viewing conv:${conversationId}`);
    });

    // Join course room for real-time updates (materials, assignments)
    socket.on('join-course', async (courseId) => {
      try {
        const course = await prisma.course.findUnique({
          where: { id: courseId },
          include: { memberships: { select: { userId: true } } }
        });

        if (course && (course.instructorId === socket.user.id || course.memberships.some((m) => m.userId === socket.user.id))) {
          socket.join(`course:${courseId}`);
          socket.emit('joined-course', { courseId });
          console.log(`[COURSE DEBUG] User ${socket.user.id} joined course room: course:${courseId}`);
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Leave course room
    socket.on('leave-course', (courseId) => {
      socket.leave(`course:${courseId}`);
      socket.emit('left-course', { courseId });
      console.log(`[COURSE DEBUG] User ${socket.user.id} left course room: course:${courseId}`);
    });

    // Send message
    socket.on('send-message', async (data) => {
      try {
        const { conversationId, content, type = 'TEXT', replyToId } = data;
        console.log(`[NOTIF DEBUG] send-message from user:${socket.user.id} (${socket.user.name}) to conv:${conversationId} | type:${type}`);

        // Verify user is participant AND check course lock status
        const participantObj = await prisma.conversationParticipant.findFirst({
          where: { userId: socket.user.id, conversationId: conversationId },
          include: { 
            conversation: { 
              include: { 
                course: {
                  include: {
                    memberships: {
                      where: { userId: socket.user.id }
                    }
                  }
                }
              } 
            } 
          }
        });

        if (!participantObj) {
          return socket.emit('error', { message: 'Access denied' });
        }

        const conversation = participantObj.conversation;
        if (conversation.type === 'COURSE' && conversation.course?.announcementsOnly) {
          const userMembership = conversation.course.memberships[0];
          const isLecturer = conversation.course.instructorId === socket.user.id;
          const isRep = userMembership?.role === 'COURSE_REP';

          if (!isLecturer && !isRep && socket.user.role !== 'ADMIN') {
            return socket.emit('error', { message: 'This course chat is restricted to announcements only.' });
          }
        }

        // Create message and update conversation in a transaction
        const message = await prisma.$transaction(async (tx) => {
          const m = await tx.message.create({
            data: {
              conversationId,
              senderId: socket.user.id,
              content,
              type,
              replyToId: replyToId || null
            },
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  avatar: true
                }
              }
            }
          });

          await tx.conversation.update({
            where: { id: conversationId },
            data: {
              lastMessageId: m.id,
              lastMessageAt: new Date()
            }
          });

          await tx.conversationParticipant.updateMany({
              where: { conversationId },
              data: { isDeleted: false }
          });

          return m;
        });

        // Broadcast to conversation room 
        console.log(`[NOTIF DEBUG] Message ${message.id} created. Broadcasting new-message.`);
        io.to(`conversation:${conversationId}`).emit('new-message', {
          message: { ...message, tempId: data.tempId },
          conversationId
        });

        // Handle notifications for participants not in the room in parallel (non-blocking)
        const [chatParticipants, convInfo] = await Promise.all([
          prisma.conversationParticipant.findMany({
            where: { conversationId },
            select: { userId: true }
          }),
          prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { id: true, name: true, type: true }
          })
        ]);

        const recipients = chatParticipants.filter(p => p.userId !== socket.user.id);
        
        // personal personal PERSONAL: Also emit direct to recipients' personal rooms 
        // to ensure they get the 'new-message' toast (even without joining room yet).
        recipients.forEach(r => {
          io.to(`user:${r.userId}`).emit('new-message', {
            message,
            conversationId
          });
        });

        // Background Push - do not block
        Promise.all(recipients.map(async (recipient) => {
          try {
            // Check if recipient is actively viewing this room
            const roomSockets = await io.in(`viewing:${conversationId}`).fetchSockets();
            const isViewing = roomSockets.some(s => s.user?.id === recipient.userId);

            if (!isViewing) {
              const userObj = await prisma.user.findUnique({ where: { id: recipient.userId } });
              if (userObj?.fcmToken) {
                const unreadCount = await prisma.notification.count({ where: { recipientId: recipient.userId, isRead: false } });
                const { sendPushNotification } = require('../utils/firebasePush');
                
                sendPushNotification(userObj.fcmToken, {
                  title: `${socket.user.name} in ${convInfo?.name || 'Chat'}`,
                  message: type === 'IMAGE' ? 'Sent an image' : (type === 'VOICE' ? 'Sent a voice memo' : content),
                  url: `/chat/${conversationId}`,
                  badgeCount: unreadCount,
                  messageId: message.id, // For deduplication
                  extraData: { 
                    type: 'MESSAGE',
                    chatId: String(conversationId),
                    senderId: socket.user.id,
                    senderName: socket.user.name
                  }
                });
              }
            }
          } catch (err) {
            console.error('[PUSH BG ERROR]:', err);
          }
        })).catch(e => console.error('[PUSH CRITICAL ERROR]:', e));

        const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
        const mentions = [...content.matchAll(mentionRegex)];

        await Promise.all(mentions.map(async (mention) => {
          const mentionedUserId = mention[2];
          if (mentionedUserId === socket.user.id) return;

          const notification = await prisma.notification.create({
            data: {
              type: 'MENTION',
              title: `${socket.user.name} mentioned you`,
              content: content.replace(mentionRegex, '$1').substring(0, 50),
              recipientId: mentionedUserId,
              senderId: socket.user.id,
              messageId: message.id,
              actionUrl: `/chat/${conversationId}`
            }
          });

          const count = await prisma.notification.count({ where: { recipientId: mentionedUserId, isRead: false } });
          io.to(`user:${mentionedUserId}`).emit('new-notification', { notification, unreadCount: count });

          // REQUIREMENT 3: Trigger FCM for MENTION
          const mentionedUser = await prisma.user.findUnique({
            where: { id: mentionedUserId },
            select: { fcmToken: true }
          });
          if (mentionedUser?.fcmToken) {
            const { sendPushNotification } = require('../utils/firebasePush');
            sendPushNotification(mentionedUser.fcmToken, {
              title: notification.title,
              message: notification.content,
              url: notification.actionUrl,
              extraData: { mention: 'true', conversationId }
            });
          }
        }));

        await Promise.all(recipients.map(async (recipient) => {
          // Check if recipient was already notified via mention to avoid double notifying
          if (mentions.some(m => m[2] === recipient.userId)) return;

          console.log(`[NOTIF DEBUG] Checking recipient user:${recipient.userId}`);
          const viewingRoom = io.sockets.adapter.rooms.get(`viewing:${conversationId}`);
          let isRecipientActiveInRoom = false;

          if (viewingRoom) {
            for (const socketId of viewingRoom) {
              const activeSocket = io.sockets.sockets.get(socketId);
              if (activeSocket?.user?.id === recipient.userId) {
                isRecipientActiveInRoom = true;
                break;
              }
            }
          }
          if (!isRecipientActiveInRoom) {
            const isReply = !!replyToId;
            const notificationContent = content || (type === 'VOICE' ? 'Voice memo' : 'File attachment');

            const notification = await prisma.notification.create({
              data: {
                type: isReply ? 'MESSAGE' : 'MESSAGE',
                title: isReply ? `${socket.user.name} replied to your message` : `New message from ${socket.user.name}`,
                content: notificationContent.length > 50 ? notificationContent.substring(0, 50) + '...' : notificationContent,
                recipientId: recipient.userId,
                senderId: socket.user.id,
                messageId: message.id
              }
            });

            // REQUIREMENT 3: Trigger FCM notification for offline recipient
            const recipientUser = await prisma.user.findUnique({
              where: { id: recipient.userId },
              select: { fcmToken: true }
            });

            if (recipientUser?.fcmToken) {
              const { sendPushNotification } = require('../utils/firebasePush');
              sendPushNotification(recipientUser.fcmToken, {
                title: notification.title,
                message: notification.content,
                url: `/chat/${conversationId}`,
                extraData: { conversationId, messageId: message.id }
              });
            }

            const totalUnreadCount = await prisma.notification.count({ 
              where: { recipientId: recipient.userId, isRead: false } 
            });

            io.to(`user:${recipient.userId}`).emit('new-notification', {
              notification,
              unreadCount: totalUnreadCount
            });
          }
        }));

        // Send confirmation to sender with their original tempId
        socket.emit('message-sent', { 
          message: { ...message, tempId: data.tempId } 
        });

        // --- 🤖 Nana AI Trigger Logic ---
        const nanaProfile = await prisma.user.findFirst({ where: { role: 'NANA' }, select: { id: true, name: true } });
        const realNanaId = nanaProfile ? nanaProfile.id : 'sys-nana-id';
        const realNanaName = nanaProfile ? nanaProfile.name : 'Nana';

        // Identify session by marker name, explicit mention, or direct chat
        const NANA_SESSION_MARKER = '__nana__';
        const isNanaSession = convInfo?.name === NANA_SESSION_MARKER;
        const nameMatch = content && (content.toLowerCase().includes('nana') || content.includes('@Nana'));
        const hasNanaParticipant = chatParticipants.some(p => p.userId === realNanaId);
        const isDirectWithNana = convInfo?.type === 'DIRECT' && hasNanaParticipant;

        if (isNanaSession || nameMatch || isDirectWithNana) {
          if (socket.user.id !== realNanaId) {
            console.log(`[Nana AI Trigger] Triggered for conv:${conversationId}. Session:${isNanaSession}, Mention:${!!nameMatch}, Direct:${isDirectWithNana}`);
          
          (async () => {
             try {
                // 1. Typing indicator - Use dynamic ID
                io.to(`conversation:${conversationId}`).emit('user-typing', {
                  userId: realNanaId,
                  userName: realNanaName,
                  conversationId,
                  isTyping: true
                });

                // 2. Build contextual history
                const history = await prisma.message.findMany({
                  where: { conversationId, isDeleted: false },
                  orderBy: { createdAt: 'desc' },
                  take: 15,
                  include: { sender: { select: { id: true, name: true, role: true } } }
                });

                // 3. Call Nana AI brain
                console.log(`[Nana AI Trigger] Fetching brain response...`);
                const aiResponse = await getNanaAiResponse(content, history.reverse(), socket.user);
                
                // 4. Save & Emit
                const nanaMessage = await prisma.$transaction(async (tx) => {
                  const m = await tx.message.create({
                    data: { conversationId, senderId: realNanaId, content: aiResponse, type: 'TEXT' },
                    include: {
                      sender: { select: { id: true, name: true, avatar: true } }
                    }
                  });
                  await tx.conversation.update({
                    where: { id: conversationId },
                    data: { lastMessageId: m.id, lastMessageAt: new Date() }
                  });
                  return m;
                });

                // 5. Stop typing + broadcast
                io.to(`conversation:${conversationId}`).emit('user-typing', {
                  userId: realNanaId,
                  userName: realNanaName,
                  conversationId,
                  isTyping: false
                });
                io.to(`conversation:${conversationId}`).emit('new-message', {
                  message: nanaMessage,
                  conversationId
                });

                // Reliability Fix: Also emit direct to recipients' personal rooms for Nana responses
                recipients.forEach(r => {
                  io.to(`user:${r.userId}`).emit('new-message', {
                    message: nanaMessage,
                    conversationId
                  });
                });
                
                // 6. Handle notification for the student (parallel)
                const chatParticipants = await prisma.conversationParticipant.findMany({
                  where: { conversationId },
                  select: { userId: true }
                });
                
                const recipients = chatParticipants.filter(p => p.userId !== realNanaId);
                await Promise.all(recipients.map(async (recipient) => {
                  // Only notify if recipient is NOT viewing the conversation actively
                  const viewingRoom = io.sockets.adapter.rooms.get(`viewing:${conversationId}`);
                  let isActive = false;
                  if (viewingRoom) {
                    for (const sid of viewingRoom) {
                      const s = io.sockets.sockets.get(sid);
                      if (s?.user?.id === recipient.userId) { isActive = true; break; }
                    }
                  }

                  if (!isActive) {
                    const notification = await prisma.notification.create({
                      data: {
                        type: 'MESSAGE',
                        title: `New message from Nana AI`,
                        content: aiResponse.length > 50 ? aiResponse.substring(0, 50) + '...' : aiResponse,
                        recipientId: recipient.userId,
                        senderId: realNanaId,
                        messageId: nanaMessage.id
                      }
                    });

                    const count = await prisma.notification.count({ where: { recipientId: recipient.userId, isRead: false } });
                    io.to(`user:${recipient.userId}`).emit('new-notification', { notification, unreadCount: count });
                  }
                }));

                console.log(`[Nana AI Trigger] Response sent successfully with notifications.`);

             } catch (aiErr) {
                console.error('[Nana AI Handler Error]:', aiErr);
                const nanaProfile = await prisma.user.findFirst({ where: { role: 'NANA' }, select: { id: true } });
                const realId = nanaProfile ? nanaProfile.id : 'nana-system';
                io.to(`conversation:${conversationId}`).emit('user-typing', {
                  userId: realId,
                  userName: 'Nana',
                  conversationId,
                  isTyping: false
                });
             }
          })();
          }
        }

      } catch (error) {
        console.error(`[SOCKET ERROR] send-message handler crashed:`, error);
        socket.emit('error', { message: error.message });
      }
    });

    // Typing indicator
    socket.on('typing', (data) => {
      const { conversationId, isTyping } = data;
      console.log(`[TYPING DEBUG] User:${socket.user.name} isTyping:${isTyping} in conv:${conversationId}`);
      socket.to(`conversation:${conversationId}`).emit('user-typing', {
        userId: socket.user.id,
        userName: socket.user.name,
        conversationId,
        isTyping
      });
    });

    // Mark messages as read
    socket.on('mark-read', async (data) => {
      try {
        const { conversationId } = data;
        console.log(`[NOTIF DEBUG] mark-read received for conv:${conversationId} by user:${socket.user.id}`);

        const messagesToMark = await prisma.message.findMany({
          where: {
            conversationId,
            senderId: { not: socket.user.id },
            readReceipts: {
              none: {
                userId: socket.user.id
              }
            }
          }
        });

        console.log(`[NOTIF DEBUG] Marking ${messagesToMark.length} message(s) as read for user:${socket.user.id}`);
        if (messagesToMark.length > 0) {
          await prisma.readReceipt.createMany({
            data: messagesToMark.map(m => ({
              userId: socket.user.id,
              messageId: m.id
            })),
            skipDuplicates: true
          });
        }

        // Also mark related UI notifications as read for this user
        const updatedNotifications = await prisma.notification.updateMany({
          where: {
            recipientId: socket.user.id,
            isRead: false,
            message: { conversationId: conversationId }
          },
          data: { isRead: true, readAt: new Date() }
        });

        console.log(`[NOTIF DEBUG] Marked ${updatedNotifications.count} notification(s) as read for user:${socket.user.id}`);
        if (updatedNotifications.count > 0) {
          // Send updated count to the user's navbar badge
          const newCount = await prisma.notification.count({
            where: { recipientId: socket.user.id, isRead: false }
          });
          console.log(`[NOTIF DEBUG] Emitting unread-count=${newCount} to room user:${socket.user.id}`);
          io.to(`user:${socket.user.id}`).emit('unread-count', { count: newCount });
        }

        // Notify all participants in the conversation (including the sender's other devices)
        io.to(`conversation:${conversationId}`).emit('messages-read', {
          userId: socket.user.id,
          conversationId
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Add reaction
    socket.on('add-reaction', async (data) => {
      try {
        const { messageId, emoji } = data;

        const existingReaction = await prisma.reaction.findUnique({
          where: {
            userId_messageId: {
              userId: socket.user.id,
              messageId
            }
          }
        });

        if (existingReaction && existingReaction.emoji === emoji) {
          // Remove reaction if user clicks same emoji
          await prisma.reaction.delete({
            where: {
              userId_messageId: {
                userId: socket.user.id,
                messageId
              }
            }
          });
        } else {
          await prisma.reaction.upsert({
            where: {
              userId_messageId: {
                userId: socket.user.id,
                messageId
              }
            },
            update: { emoji },
            create: {
              userId: socket.user.id,
              messageId,
              emoji
            }
          });
        }

        const allReactions = await prisma.reaction.findMany({
          where: { messageId },
          include: {
            user: { select: { id: true, name: true } }
          }
        });

        const message = await prisma.message.findUnique({
          where: { id: messageId },
          select: { conversationId: true }
        });

        if (message) {
          io.to(`conversation:${message.conversationId}`).emit('reaction-updated', {
            messageId,
            reactions: allReactions
          });
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Edit message
    socket.on('edit-message', async (data) => {
      try {
        const { messageId, content } = data;

        const message = await prisma.message.findUnique({
          where: { id: messageId }
        });

        if (!message || message.senderId !== socket.user.id) {
          return socket.emit('error', { message: 'Unauthorized' });
        }

        const updatedMessage = await prisma.message.update({
          where: { id: messageId },
          data: {
            content,
            editedAt: new Date()
          },
          include: {
            sender: {
              select: { id: true, name: true, avatar: true }
            }
          }
        });

        io.to(`conversation:${updatedMessage.conversationId}`).emit('message-updated', {
          message: updatedMessage
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Delete message (Soft delete)
    socket.on('delete-message', async (data) => {
      try {
        const { messageId } = data;

        const message = await prisma.message.findUnique({
          where: { id: messageId }
        });

        if (!message || message.senderId !== socket.user.id) {
          return socket.emit('error', { message: 'Unauthorized' });
        }

        const updatedMessage = await prisma.message.update({
          where: { id: messageId },
          data: {
            isDeleted: true,
            content: 'This message was deleted'
          }
        });

        io.to(`conversation:${updatedMessage.conversationId}`).emit('message-deleted', {
          messageId: updatedMessage.id
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // WebRTC Signaling
    socket.on('call-user', ({ targetUserId, offer, from, type }) => {
      io.to(`user:${targetUserId}`).emit('incoming-call', {
        from,
        offer,
        type
      });
    });

    socket.on('answer-call', ({ targetUserId, answer }) => {
      io.to(`user:${targetUserId}`).emit('call-accepted', { answer });
    });

    socket.on('reject-call', ({ targetUserId }) => {
      io.to(`user:${targetUserId}`).emit('call-rejected');
    });

    socket.on('ice-candidate', ({ targetUserId, candidate }) => {
      io.to(`user:${targetUserId}`).emit('ice-candidate', { candidate });
    });

    socket.on('end-call', ({ targetUserId }) => {
      io.to(`user:${targetUserId}`).emit('call-ended');
    });

    socket.on('missed-call', async ({ targetUserId, type }) => {
      try {
        const title = `Missed ${type === 'VIDEO' ? 'video ' : ''}call from ${socket.user.name}`;
        const notification = await prisma.notification.create({
          data: {
            type: 'SYSTEM',
            title,
            content: "Tap to view.",
            recipientId: targetUserId,
            senderId: socket.user.id
          }
        });

        const totalUnreadCount = await prisma.notification.count({ 
          where: { recipientId: targetUserId, isRead: false } 
        });

        io.to(`user:${targetUserId}`).emit('new-notification', {
          notification,
          unreadCount: totalUnreadCount
        });
      } catch (err) {
        console.error("Failed to create missed call notification:", err);
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.name} (${socket.user.id})`);

      // If this user was in a call, notify all sockets in their personal room
      // and broadcast call-ended to any connected peer waiting on them
      // We can't know who the peer is server-side without state tracking,
      // so emit to the disconnected user's room \u2014 this covers multi-device scenarios
      // The peer's call-ended is handled via the 'end-call' flow; if the socket dies,
      // we send call-ended broadly to the user's room to unblock any pending UI
      console.log(`[CALL] ${socket.user.name} disconnected — broadcasting call-ended to their room`);
      socket.to(`user:${socket.user.id}`).emit('call-ended');

      // Clear any 'typing' state for this user by broadcasting isTyping: false
      // Since we don't track active typing rooms per-socket, we rely on the 
      // client's 'typingUsers' state filtering by userId.
      // Broadcast broadly to ALL rooms is expensive, so we just emit to the user's personal room
      // or we can just leave it to the frontend's cleanup/timeout. 
      // ACTUALLY: The best way is to let the socket leave rooms on disconnect, 
      // which it does automatically. 
      // However, we should explicitly emit a "stop typing" to the conversations they were in.
      // For now, let's just log and rely on the 2s frontend timeout + explicit emits.
      // But wait! If we want to be proactive:
      const userConvs = await prisma.conversationParticipant.findMany({
        where: { userId: socket.user.id, isDeleted: false },
        select: { conversationId: true }
      });
      userConvs.forEach(c => {
         socket.to(`conversation:${c.conversationId}`).emit('user-typing', {
           userId: socket.user.id,
           userName: socket.user.name,
           conversationId: c.conversationId,
           isTyping: false
         });
      });

      // Multi-device: Only mark as offline if no sockets remain in the user's personal room
      const userRoom = `user:${socket.user.id}`;
      const remainingSockets = io.sockets.adapter.rooms.get(userRoom);
      
      if (!remainingSockets || remainingSockets.size === 0) {
        await prisma.user.update({
          where: { id: socket.user.id },
          data: {
            isOnline: false,
            socketId: null,
            lastSeen: new Date()
          }
        }).then(user => {
          io.emit('user-status-changed', {
            userId: user.id,
            isOnline: false,
            lastSeen: user.lastSeen
          });
        }).catch(err => console.error('Error updating status on disconnect:', err));
      }
    });
  });
};

module.exports = { setupChatSockets };
