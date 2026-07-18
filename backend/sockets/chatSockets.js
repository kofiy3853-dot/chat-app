const prisma = require('../prisma/client');
const { socketAuthMiddleware } = require('../middleware/authMiddleware');
const { getNanaAiResponse } = require('../services/nanaAi');
const { sendPushNotification } = require('../utils/firebasePush');
const { moderateContent } = require('../middleware/contentModeration');
const { batchNotify } = require('../utils/batchNotify');

// Cached Nana profile — avoids DB query on every message
let _nanaProfileCache = null;
async function getNanaProfile() {
  if (_nanaProfileCache) return _nanaProfileCache;
  try {
    _nanaProfileCache = await prisma.user.findFirst({ where: { role: 'NANA' }, select: { id: true, name: true } });
  } catch (err) {
    console.error('[Nana] Failed to cache Nana profile:', err.message);
  }
  return _nanaProfileCache;
}

// Invalidate cache if Nana account is updated (e.g., renamed)
function invalidateNanaCache() { _nanaProfileCache = null; }

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
    // Join broadcast room for platform-wide announcements/events
    socket.join('broadcast');
    
    // Send initial notification count (user-specific + broadcast)
    Promise.all([
      prisma.notification.count({ where: { recipientId: socket.user.id, isRead: false } }),
      prisma.notification.count({ where: { isBroadcast: true, isRead: false } })
    ]).then(([userUnread, broadcastUnread]) => {
      const count = userUnread + broadcastUnread;
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

        // Content moderation (Morph Reflexes)
        if (type === 'TEXT' && content) {
          const mod = await moderateContent(content);
          if (!mod.allowed) {
            return socket.emit('error', { message: 'Message blocked by content policy.' });
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

        // Pre-fetch participants and conversation info for broadcasting
        const [chatParticipants, convInfo] = await Promise.all([
          prisma.conversationParticipant.findMany({
            where: { conversationId },
            select: { userId: true, user: { select: { fcmToken: true } } }
          }),
          prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { id: true, name: true, type: true }
          })
        ]);

        // Build FCM token lookup map (avoids N+1 queries)
        const fcmTokenMap = new Map();
        for (const p of chatParticipants) {
          if (p.user?.fcmToken) {
            fcmTokenMap.set(p.userId, p.user.fcmToken);
          }
        }

        const recipients = chatParticipants.filter(p => p.userId !== socket.user.id);

        // Broadcast to conversation room + all recipients' personal rooms in one go 
        // Socket.io handles deduplication automatically when chaining .to()
        let broadcast = io.to(`conversation:${conversationId}`);
        recipients.forEach(r => {
          broadcast = broadcast.to(`user:${r.userId}`);
        });

        console.log(`[NOTIF DEBUG] Message ${message.id} created. Broadcasting new-message.`);
        broadcast.emit('new-message', {
          message: { ...message, tempId: data.tempId },
          conversationId
        });

        // NOTE: FCM push is sent below inside the notification creation block.

        // Sending push here AND there was causing double notifications + rate limiting.


        const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
        const mentions = content ? [...content.matchAll(mentionRegex)] : [];

        // Batch create mention notifications (single DB query)
        const mentionNotifs = [];
        for (const mention of mentions) {
          const mentionedUserId = mention[2];
          if (mentionedUserId === socket.user.id) continue;
          mentionNotifs.push({
            type: 'MENTION',
            title: `${socket.user.name} mentioned you`,
            content: content.replace(mentionRegex, '$1').substring(0, 50),
            recipientId: mentionedUserId,
            senderId: socket.user.id,
            messageId: message.id,
            actionUrl: `/chat/${conversationId}`
          });
        }

        if (mentionNotifs.length > 0) {
          await batchNotify(prisma, io, mentionNotifs);

          // FCM for mentions (batch lookup from pre-fetched map)
          for (const n of mentionNotifs) {
            const fcmToken = fcmTokenMap.get(n.recipientId);
            if (fcmToken) {
              const { sendPushNotification: sendPush } = require('../utils/firebasePush');
              sendPush(fcmToken, {
                title: n.title,
                message: n.content,
                url: n.actionUrl,
                extraData: { mention: 'true', conversationId: String(conversationId) }
              }).catch(err => console.error('[FCM] Mention push error:', err.message));
            }
          }
        }

        // Batch create notifications for non-active, non-mentioned recipients
        const viewingRoom = io.sockets.adapter.rooms.get(`viewing:${conversationId}`);
        const activeUserIds = new Set();
        if (viewingRoom) {
          for (const socketId of viewingRoom) {
            const activeSocket = io.sockets.sockets.get(socketId);
            if (activeSocket?.user?.id) activeUserIds.add(activeSocket.user.id);
          }
        }

        const isReply = !!replyToId;
        const notificationContent = content || (type === 'VOICE' ? 'Voice memo' : 'File attachment');
        const mentionUserIds = new Set(mentions.map(m => m[2]));

        const messageNotifs = recipients
          .filter(r => !mentionUserIds.has(r.userId) && !activeUserIds.has(r.userId))
          .map(r => ({
            type: 'MESSAGE',
            title: isReply ? `${socket.user.name} replied to your message` : `New message from ${socket.user.name}`,
            content: notificationContent.length > 50 ? notificationContent.substring(0, 50) + '...' : notificationContent,
            recipientId: r.userId,
            senderId: socket.user.id,
            messageId: message.id
          }));

        const unreadMap = await batchNotify(prisma, io, messageNotifs);

        // FCM pushes (batch lookup from pre-fetched map, non-blocking)
        for (const n of messageNotifs) {
          const fcmToken = fcmTokenMap.get(n.recipientId);
          if (fcmToken) {
            sendPushNotification(fcmToken, {
              title: n.title,
              message: n.content,
              url: `/chat/${conversationId}`,
              badgeCount: unreadMap.get(n.recipientId) || 0,
              messageId: message.id,
              extraData: { conversationId: String(conversationId), messageId: String(message.id) }
            }).catch(err => console.error('[FCM] Message push error:', err.message));
          }
        }

        // Send confirmation to sender with their original tempId
        socket.emit('message-sent', { 
          message: { ...message, tempId: data.tempId } 
        });

        // --- 🤖 Nana AI Trigger Logic ---
        const nanaProfile = await getNanaProfile();
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
                // Reuse chatParticipants already fetched at line 240
                const recipients = chatParticipants.filter(p => p.userId !== realNanaId);

                if (!recipients || recipients.length === 0) {
                  console.warn("[Nana AI] No recipients found for conversation:", conversationId);
                }

                // 2. Typing indicator - Use dynamic ID
                io.to(`conversation:${conversationId}`).emit('user-typing', {
                  userId: realNanaId,
                  userName: realNanaName,
                  conversationId,
                  isTyping: true
                });

                // 3. Build contextual history
                const history = await prisma.message.findMany({
                  where: { conversationId, isDeleted: false },
                  orderBy: { createdAt: 'desc' },
                  take: 15,
                  include: { sender: { select: { id: true, name: true, role: true } } }
                });

                // 4. Call Nana AI brain
                console.log(`[Nana AI Trigger] Fetching brain response...`);
                const aiResponse = await getNanaAiResponse(content, history.reverse(), socket.user, conversationId);
                
                // 5. Save & Emit
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

                // 6. Stop typing + broadcast
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
                
                // Batch notify non-active recipients (single DB query)
                const viewingRoom = io.sockets.adapter.rooms.get(`viewing:${conversationId}`);
                const activeUserIds = new Set();
                if (viewingRoom) {
                  for (const sid of viewingRoom) {
                    const s = io.sockets.sockets.get(sid);
                    if (s?.user?.id) activeUserIds.add(s.user.id);
                  }
                }

                const nanaNotifs = recipients
                  .filter(r => !activeUserIds.has(r.userId))
                  .map(r => ({
                    type: 'MESSAGE',
                    title: `New message from Nana AI`,
                    content: aiResponse.length > 50 ? aiResponse.substring(0, 50) + '...' : aiResponse,
                    recipientId: r.userId,
                    senderId: realNanaId,
                    messageId: nanaMessage.id
                  }));

                await batchNotify(prisma, io, nanaNotifs);

                console.log(`[Nana AI Trigger] Response sent successfully with notifications.`);

             } catch (aiErr) {
                console.error('[Nana AI Handler Error]:', aiErr);
                const cachedNana = await getNanaProfile();
                const realId = cachedNana ? cachedNana.id : 'nana-system';
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
      // Broad cast to all in room except sender
      socket.to(`conversation:${conversationId}`).emit('user-typing', {
        userId: socket.user.id,
        userName: socket.user.name,
        conversationId,
        isTyping
      });
      console.log(`[SOCKET] Broadcast typing:${isTyping} for user:${socket.user.name} in conv:${conversationId}`);
    });

    // Mark messages as read
    socket.on('mark-read', async (data) => {
      try {
        const { conversationId } = data;

        // Batch insert read receipts with raw SQL — avoids loading all messages
        await prisma.$executeRaw`
          INSERT INTO "ReadReceipt" ("id", "userId", "messageId", "readAt")
          SELECT gen_random_uuid()::text, ${socket.user.id}, "Message"."id", NOW()
          FROM "Message"
          WHERE "Message"."conversationId" = ${conversationId}
            AND "Message"."senderId" != ${socket.user.id}
            AND NOT EXISTS (
              SELECT 1 FROM "ReadReceipt"
              WHERE "ReadReceipt"."messageId" = "Message"."id"
                AND "ReadReceipt"."userId" = ${socket.user.id}
            )
          ON CONFLICT DO NOTHING
        `;

        // Mark related notifications as read
        await prisma.notification.updateMany({
          where: {
            recipientId: socket.user.id,
            isRead: false,
            message: { conversationId }
          },
          data: { isRead: true, readAt: new Date() }
        });

        // Send updated unread count (user-specific + broadcast)
        const [newUserCount, newBroadcastCount] = await Promise.all([
          prisma.notification.count({ where: { recipientId: socket.user.id, isRead: false } }),
          prisma.notification.count({ where: { isBroadcast: true, isRead: false } })
        ]);
        io.to(`user:${socket.user.id}`).emit('unread-count', { count: newUserCount + newBroadcastCount });

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

        // Content moderation on edit
        const modEdit = await moderateContent(content);
        if (!modEdit.allowed) {
          return socket.emit('error', { message: 'Edit blocked by content policy.' });
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
        console.log(`[DELETE] User ${socket.user.id} (${socket.user.role}) attempting to delete message: ${messageId}`);

        const message = await prisma.message.findUnique({
          where: { id: messageId }
        });

        if (!message) {
          console.warn(`[DELETE] Message ${messageId} not found`);
          return socket.emit('error', { message: 'Message not found' });
        }

        // Allow: own message, or ADMIN, or LECTURER (moderators)
        const isOwner = message.senderId === socket.user.id;
        const isModerator = socket.user.role === 'ADMIN' || socket.user.role === 'LECTURER';

        if (!isOwner && !isModerator) {
          console.warn(`[DELETE] Unauthorized delete attempt by ${socket.user.id} on message ${messageId}`);
          return socket.emit('error', { message: 'Unauthorized: Cannot delete this message' });
        }

        const updatedMessage = await prisma.message.update({
          where: { id: messageId },
          data: {
            isDeleted: true,
            content: 'This message was deleted'
          }
        });

        console.log(`[DELETE] Message ${messageId} soft-deleted. Broadcasting to conversation:${updatedMessage.conversationId}`);

        // Broadcast to entire conversation room (including sender)
        io.to(`conversation:${updatedMessage.conversationId}`).emit('message-deleted', {
          messageId: updatedMessage.id,
          conversationId: updatedMessage.conversationId
        });

        // Also emit directly to sender's personal room in case they're not in the conv room
        socket.emit('message-deleted', {
          messageId: updatedMessage.id,
          conversationId: updatedMessage.conversationId
        });

      } catch (error) {
        console.error('[DELETE ERROR]', error.message);
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
      try {
        console.log(`User disconnected: ${socket.user.name} (${socket.user.id})`);

        // Notify user's room about call ended
        console.log(`[CALL] ${socket.user.name} disconnected — broadcasting call-ended to their room`);
        socket.to(`user:${socket.user.id}`).emit('call-ended');

        // Clear typing state for this user across their conversations
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
      } catch (err) {
        console.error('[DISCONNECT ERROR]', err.message);
      }
    });
  });
};

module.exports = { setupChatSockets };
