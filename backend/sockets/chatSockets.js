const prisma = require('../prisma/client');
const { socketAuthMiddleware } = require('../middleware/authMiddleware');
const { getNanaAiResponse } = require('../services/nanaAi');
const NANA_USER_ID = '7951b52c-b14e-486a-a802-8e0a9fa2495b';

const setupChatSockets = (io) => {
  // Apply auth middleware to socket connections
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
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
    }).catch(err => console.error('Error updating status:', err));

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
            participants: { some: { userId: socket.user.id } },
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
        console.log(`[NOTIF DEBUG] User ${socket.user.id} joined ${conversations.length} conversation broadcast rooms.`);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Auto-join conversations on connect (so clients don't need to manually emit)
    (async () => {
      try {
        const conversations = await prisma.conversation.findMany({
          where: {
            participants: { some: { userId: socket.user.id } },
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
        const participant = await prisma.conversationParticipant.findUnique({
          where: {
            userId_conversationId: {
              userId: socket.user.id,
              conversationId: conversationId
            }
          }
        });

        if (participant) {
          socket.join(`conversation:${conversationId}`);
          socket.join(`viewing:${conversationId}`); // 🔑 marks user as actively viewing
          socket.emit('joined-conversation', { conversationId });
          console.log(`[NOTIF DEBUG] User ${socket.user.id} is now ACTIVELY VIEWING conv:${conversationId}`);
        } else {
          socket.emit('error', { message: 'Access denied' });
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
          include: { students: { select: { id: true } } }
        });

        if (course && (course.instructorId === socket.user.id || course.students.some(s => s.id === socket.user.id))) {
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

        // Verify user is participant
        const participant = await prisma.conversationParticipant.findUnique({
          where: {
            userId_conversationId: {
              userId: socket.user.id,
              conversationId: conversationId
            }
          }
        });

        if (!participant) {
          return socket.emit('error', { message: 'Access denied' });
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

          return m;
        });

        // Broadcast to conversation room (including tempId so the sender recognizes it)
        console.log(`[NOTIF DEBUG] Message ${message.id} created. Broadcasting new-message to room conversation:${conversationId}`);
        io.to(`conversation:${conversationId}`).emit('new-message', {
          message: { ...message, tempId: data.tempId },
          conversationId
        });

        // Handle notifications for participants not in the room in parallel
        const [chatParticipants, conversation] = await Promise.all([
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
        console.log(`[NOTIF DEBUG] Found ${recipients.length} recipient(s) to potentially notify.`);

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
                type: isReply ? 'MESSAGE' : 'MESSAGE', // Keep as MESSAGE but maybe add REPLY type later if needed
                title: isReply ? `${socket.user.name} replied to your message` : `New message from ${socket.user.name}`,
                content: notificationContent.length > 50 ? notificationContent.substring(0, 50) + '...' : notificationContent,
                recipientId: recipient.userId,
                senderId: socket.user.id,
                messageId: message.id
              }
            });

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
        // Identify session by marker name — Nana is a system agent (not a participant)
        const NANA_SESSION_MARKER = '__nana__';
        const isNanaSession = conversation.name === NANA_SESSION_MARKER;
        const nameMatch = content && (content.toLowerCase().includes('nana') || content.includes('@Nana'));

        if (isNanaSession || nameMatch) {
          const nanaProfile = await prisma.user.findFirst({ where: { role: 'NANA' }, select: { id: true } });
          const realNanaId = nanaProfile ? nanaProfile.id : NANA_USER_ID;

          if (socket.user.id !== realNanaId) {
            console.log(`[Nana AI Trigger] Triggered for conv:${conversationId}. Session:${isNanaSession}, Mention:${!!nameMatch}`);
          
          (async () => {
             try {
                // 1. Typing indicator
                io.to(`conversation:${conversationId}`).emit('user-typing', {
                  userId: NANA_USER_ID,
                  userName: 'Nana',
                  conversationId,
                  isTyping: true
                });

                // 2. Build contextual history
                const history = await prisma.message.findMany({
                  where: { conversationId, isDeleted: false },
                  orderBy: { createdAt: 'desc' },
                  take: 15,
                  include: { sender: { select: { id: true, name: true } } }
                });

                // 3. Call Nana AI brain
                console.log(`[Nana AI Trigger] Fetching brain response...`);
                const aiResponse = await getNanaAiResponse(content, history.reverse());
                
                // 4. Save & Emit
                const nanaMessage = await prisma.$transaction(async (tx) => {
                  const m = await tx.message.create({
                    data: { conversationId, senderId: NANA_USER_ID, content: aiResponse, type: 'TEXT' },
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
                  userId: NANA_USER_ID,
                  userName: 'Nana',
                  conversationId,
                  isTyping: false
                });
                io.to(`conversation:${conversationId}`).emit('new-message', {
                  message: nanaMessage,
                  conversationId
                });
                
                console.log(`[Nana AI Trigger] Response sent successfully.`);

             } catch (aiErr) {
                console.error('[Nana AI Handler Error]:', aiErr);
                io.to(`conversation:${conversationId}`).emit('user-typing', {
                  userId: NANA_USER_ID,
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
            // Find notifications for messages in this conversation
            messageId: {
              in: (await prisma.message.findMany({
                where: { conversationId },
                select: { id: true }
              })).map(m => m.id)
            }
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
      console.log(`[CALL] ${socket.user.name} disconnected \u2014 broadcasting call-ended to their room`);
      socket.to(`user:${socket.user.id}`).emit('call-ended');

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
