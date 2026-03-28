const prisma = require('../prisma/client');
const { socketAuthMiddleware } = require('../middleware/authMiddleware');

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
    
    // Send initial notification count
    prisma.notification.count({
      where: { recipientId: socket.user.id, isRead: false }
    }).then(count => {
      socket.emit('unread-count', { count });
    });

    // Join user's conversations
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
          socket.join(`conversation:${conv.id}`);
        });

        socket.emit('joined-conversations', { 
          count: conversations.length 
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Join specific conversation
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
          socket.emit('joined-conversation', { conversationId });
        } else {
          socket.emit('error', { message: 'Access denied' });
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Leave conversation
    socket.on('leave-conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
      socket.emit('left-conversation', { conversationId });
    });

    // Send message
    socket.on('send-message', async (data) => {
      try {
        const { conversationId, content, type = 'TEXT', replyToId } = data;

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
        io.to(`conversation:${conversationId}`).emit('new-message', {
          message: { ...message, tempId: data.tempId },
          conversationId
        });

        // Handle notifications for participants not in the room in parallel
        const chatParticipants = await prisma.conversationParticipant.findMany({
          where: { conversationId },
          select: { userId: true }
        });
        const recipients = chatParticipants.filter(p => p.userId !== socket.user.id);

        await Promise.all(recipients.map(async (recipient) => {
          // Senior Implementation: Check if recipient is active in the room using socket mapping
          const room = io.sockets.adapter.rooms.get(`conversation:${conversationId}`);
          let isRecipientActiveInRoom = false;
          
          if (room) {
            for (const socketId of room) {
              const activeSocket = io.sockets.sockets.get(socketId);
              if (activeSocket?.user?.id === recipient.userId) {
                isRecipientActiveInRoom = true;
                break;
              }
            }
          }
          
          // Only create notification if user is NOT looking at the chat
          if (!isRecipientActiveInRoom) {
            const notificationContent = content || (type === 'VOICE' ? 'Voice memo' : 'File attachment');

            // Create notification in DB
            const notification = await prisma.notification.create({
              data: {
                type: 'MESSAGE',
                title: `New message from ${socket.user.name}`,
                content: notificationContent.length > 50 ? notificationContent.substring(0, 50) + '...' : notificationContent,
                recipientId: recipient.userId,
                senderId: socket.user.id,
                messageId: message.id
              }
            });

            // Global Signaling (user:ID): Multi-device sync
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
      } catch (error) {
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

        if (updatedNotifications.count > 0) {
          // Send updated count to the user's navbar badge
          const newCount = await prisma.notification.count({
            where: { recipientId: socket.user.id, isRead: false }
          });
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

        const reaction = await prisma.reaction.upsert({
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
          // Broadcast to conversation
          io.to(`conversation:${message.conversationId}`).emit('reaction-added', {
            messageId,
            reactions: allReactions
          });
        }
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

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.name} (${socket.user.id})`);
      
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
