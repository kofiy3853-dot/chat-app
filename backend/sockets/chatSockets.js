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

        // Broadcast to conversation room
        io.to(`conversation:${conversationId}`).emit('new-message', {
          message,
          conversationId
        });

        // Handle notifications for participants not in the room
        const chatParticipants = await prisma.conversationParticipant.findMany({
          where: { conversationId },
          select: { userId: true }
        });

        const recipients = chatParticipants.filter(p => p.userId !== socket.user.id);

        for (const recipient of recipients) {
          // Check if user is in the room
          const isUserInRoom = io.sockets.adapter.rooms.get(`conversation:${conversationId}`)?.has(recipient.userId); // This check is simplified, real check needs tracking
          
          const notificationContent = content || (type === 'VOICE' ? 'Voice memo' : fileName || 'File attachment');

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

          // Emit to recipient's private room
          io.to(`user:${recipient.userId}`).emit('new-notification', {
            notification,
            unreadCount: await prisma.notification.count({ where: { recipientId: recipient.userId, isRead: false } })
          });
        }

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

        // Notify other participants
        socket.to(`conversation:${conversationId}`).emit('messages-read', {
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

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.name} (${socket.user.id})`);
      
      await prisma.user.update({
        where: { id: socket.user.id },
        data: {
          isOnline: false,
          socketId: null,
          lastSeen: new Date()
        }
      }).catch(err => console.error('Error updating status on disconnect:', err));

      // Notify all rooms user was in
      // Note: socket.rooms is cleared on disconnect in newer socket.io versions
      // Better to track active conversations elsewhere or just broadcast to all joined
    });
  });
};

module.exports = { setupChatSockets };


module.exports = { setupChatSockets };
