const prisma = require('../prisma/client');

// Get user's conversations
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: userId,
            isDeleted: false
          }
        },
        isActive: true
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                isOnline: true,
                lastSeen: true
              }
            }
          }
        },
        lastMessage: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            },
            readReceipts: true
          }
        },
        course: {
          select: {
            id: true,
            code: true,
            name: true
          }
        }
      },
      orderBy: {
        lastMessageAt: 'desc'
      }
    });

    const conversationIds = conversations.map(c => c.id);
    const unreadCounts = await prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: conversationIds },
        senderId: { not: userId },
        readReceipts: {
          none: {
            userId: userId
          }
        }
      },
      _count: true
    });

    const conversationsWithUnread = conversations.map(conv => {
      const countObj = unreadCounts.find(c => c.conversationId === conv.id);
      return {
        ...conv,
        unreadCount: countObj ? countObj._count : 0
      };
    });

    res.json({ conversations: conversationsWithUnread });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get or create direct conversation
exports.getOrCreateDirectConversation = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user.id;

    // Check if conversation already exists
    let conversation = await prisma.conversation.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { participants: { some: { userId: currentUserId } } },
          { participants: { some: { userId: userId } } }
        ],
        isActive: true
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                isOnline: true,
                lastSeen: true
              }
            }
          }
        },
        lastMessage: true
      }
    });

    if (!conversation) {
      // Create new conversation
      conversation = await prisma.conversation.create({
        data: {
          type: 'DIRECT',
          participants: {
            create: [
              { userId: currentUserId, role: 'OWNER' },
              { userId: userId, role: 'OWNER' }
            ]
          }
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                  isOnline: true,
                  lastSeen: true
                }
              }
            }
          }
        }
      });
    }

    res.json({ conversation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create group conversation
exports.createGroupConversation = async (req, res) => {
  try {
    const { name, participantIds } = req.body;
    const currentUserId = req.user.id;

    const conversation = await prisma.conversation.create({
      data: {
        type: 'GROUP',
        name,
        participants: {
          create: [
            { userId: currentUserId, role: 'OWNER' },
            ...participantIds.map(id => ({ userId: id, role: 'MEMBER' }))
          ]
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                isOnline: true,
                lastSeen: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({ conversation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get specific conversation
exports.getConversationById = async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                isOnline: true,
                lastSeen: true
              }
            }
          }
        },
        course: {
          select: { id: true, code: true, name: true }
        }
      }
    });

    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    // Verify user is participant
    const isParticipant = conversation.participants.some(p => p.userId === req.user.id);
    if (!isParticipant) return res.status(403).json({ message: 'Access denied' });

    res.json({ conversation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get messages in a conversation
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify user is participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId: req.user.id,
          conversationId: conversationId
        }
      }
    });

    if (!participant) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId: conversationId,
        isDeleted: false
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    res.json({ 
      messages: messages.reverse(),
      hasMore: messages.length === parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Send message
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, content, type = 'TEXT', replyToId } = req.body;

    // Verify user is participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId: req.user.id,
          conversationId: conversationId
        }
      }
    });

    if (!participant) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: req.user.id,
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

    // Update conversation last message
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageId: message.id,
        lastMessageAt: new Date()
      }
    });

    res.status(201).json({ message });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // In Prisma, we'd typically have a ReadReceipt model
    // This part depends on how you want to handle "unread" messages
    // For now, let's create read receipts for messages in this conversation
    const messagesToMark = await prisma.message.findMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readReceipts: {
          none: {
            userId: userId
          }
        }
      }
    });

    if (messagesToMark.length > 0) {
      await prisma.readReceipt.createMany({
        data: messagesToMark.map(m => ({
          userId: userId,
          messageId: m.id
        })),
        skipDuplicates: true
      });
    }

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add reaction to message
exports.addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    // Upsert reaction
    const reaction = await prisma.reaction.upsert({
      where: {
        userId_messageId: {
          userId,
          messageId
        }
      },
      update: { emoji },
      create: {
        userId,
        messageId,
        emoji
      }
    });

    const allReactions = await prisma.reaction.findMany({
      where: { messageId },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json({ message: 'Reaction added', reactions: allReactions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Upload attachment
exports.uploadAttachment = async (req, res) => {
  try {
    const { conversationId, type } = req.body;
    const userId = req.user.id;

    if (!req.files || (!req.files.file && !req.files.voice)) {
      console.error('Upload failed: No files received');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Verify participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId,
          conversationId
        }
      }
    });

    if (!participant) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let fileUrl = '';
    let fileName = '';
    let fileSize = 0;

    if (req.files.file && req.files.file.length > 0) {
      fileUrl = `/uploads/files/${req.files.file[0].filename}`;
      fileName = req.files.file[0].originalname;
      fileSize = req.files.file[0].size;
    } else if (req.files.voice && req.files.voice.length > 0) {
      fileUrl = `/uploads/voice/${req.files.voice[0].filename}`;
      fileName = 'Voice Note';
      fileSize = req.files.voice[0].size;
    } else {
      return res.status(400).json({ message: 'No valid file data received' });
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: type === 'VOICE' ? 'Voice memo' : fileName,
        type,
        fileUrl,
        fileName,
        fileSize
      },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true }
        }
      }
    });

    // Update conversation
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageId: message.id,
        lastMessageAt: new Date()
      }
    });

    // Notify participants
    const chatParticipants = await prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true }
    });

    const recipients = chatParticipants.filter(p => p.userId !== userId);
    const notificationContent = message.content || 'Sent an attachment';

    for (const recipient of recipients) {
      const notification = await prisma.notification.create({
        data: {
          type: 'MESSAGE',
          title: `New message from ${message.sender.name}`,
          content: notificationContent.length > 50 ? notificationContent.substring(0, 50) + '...' : notificationContent,
          recipientId: recipient.userId,
          senderId: userId,
          messageId: message.id
        }
      });

      // Emit new-notification if io is available
      if (req.io) {
        req.io.to(`user:${recipient.userId}`).emit('new-notification', {
          notification,
          unreadCount: await prisma.notification.count({ where: { recipientId: recipient.userId, isRead: false } })
        });
      }
    }

    // Broadcast the message to the conversation room so it appears in real-time
    if (req.io) {
      req.io.to(`conversation:${conversationId}`).emit('new-message', {
        message,
        conversationId
      });
    }

    res.status(201).json({ message });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Archive conversation (toggle)
exports.archiveConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const participant = await prisma.conversationParticipant.findUnique({
      where: { userId_conversationId: { userId, conversationId: id } }
    });

    if (!participant) return res.status(404).json({ message: 'Participant not found' });

    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { isArchived: !participant.isArchived }
    });

    res.json({ message: `Conversation ${participant.isArchived ? 'unarchived' : 'archived'}` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete conversation (soft delete for user)
exports.deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const participant = await prisma.conversationParticipant.findUnique({
      where: { userId_conversationId: { userId, conversationId: id } }
    });

    if (!participant) return res.status(404).json({ message: 'Participant not found' });

    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { isDeleted: true }
    });

    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
