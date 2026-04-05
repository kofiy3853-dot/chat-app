const prisma = require('../prisma/client');
const uploadToSupabase = require('../utils/uploadToSupabase');
const fs = require('fs');
const path = require('path');
const { sendPushNotification } = require('../utils/firebasePush');

const NANA_USER_ID = '7951b52c-b14e-486a-a802-8e0a9fa2495b';
const NANA_SESSION_MARKER = '__nana__';

// Get user's conversations
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    let conversations = await prisma.conversation.findMany({
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
                role: true,
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
                avatar: true,
                role: true
              }
            },
            readReceipts: true
          }
        },
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            announcementsOnly: true
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

// Get or create Nana AI session — Nana is a system agent, not a participant
exports.getOrCreateNanaSession = async (req, res) => {
  try {
    const userId = req.user.id;

    // Build a reusable include block
    const include = {
      participants: {
        include: {
          user: {
            select: { id: true, name: true, avatar: true, isOnline: true, lastSeen: true }
          }
        }
      },
      lastMessage: {
        include: {
          sender: { select: { id: true, name: true, avatar: true } },
          readReceipts: true
        }
      }
    };

    // Look for an existing Nana session for this student
    let conversation = await prisma.conversation.findFirst({
      where: {
        name: NANA_SESSION_MARKER,
        type: 'DIRECT',
        isActive: true,
        participants: { some: { userId } }
      },
      include
    });

    // Fetch the authentic Nana Profile from the DB
    const nanaProfile = await prisma.user.findFirst({
      where: { role: 'NANA' },
      select: { id: true, name: true, avatar: true }
    });

    if (!nanaProfile) {
      return res.status(500).json({ message: 'Nana system user not found in the database. Please ensure the NANA user is initialized.' });
    }
    const realNanaId = nanaProfile.id;

    if (!conversation) {
      try {
        conversation = await prisma.$transaction(async (tx) => {
          // Create the conversation — include NANA so she can view/reply in her inbox
          const conv = await tx.conversation.create({
            data: {
              type: 'DIRECT',
              name: NANA_SESSION_MARKER,
              participants: {
                create: [
                  { userId, role: 'MEMBER' },
                  { userId: realNanaId, role: 'MEMBER' }
                ]
              }
            }
          });

          // Post Nana's welcome message (senderId = realNanaId for display)
          const welcome = await tx.message.create({
            data: {
              conversationId: conv.id,
              senderId: realNanaId,
              content: "Hi there! 👋 I'm Nana, your campus AI assistant powered by KTU. Ask me anything about courses, events, or campus life!",
              type: 'TEXT'
            }
          });

          return tx.conversation.update({
            where: { id: conv.id },
            data: { lastMessageId: welcome.id, lastMessageAt: welcome.createdAt },
            include
          });
        });
      } catch (createErr) {
        // Race condition: another request may have created it
        if (createErr.code === 'P2002' || createErr.code === 'P2003') {
          conversation = await prisma.conversation.findFirst({
            where: { name: NANA_SESSION_MARKER, type: 'DIRECT', isActive: true, participants: { some: { userId } } },
            include
          });
        } else {
          throw createErr;
        }
      }
    }

    if (!conversation) {
      return res.status(500).json({ message: 'Failed to create Nana session' });
    }

    res.json({ conversation, nanaProfile });
  } catch (error) {
    console.error('[getOrCreateNanaSession] Error:', error.message, error.code);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get or create direct conversation
exports.getOrCreateDirectConversation = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user.id;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    // Validate the target user actually exists first
    const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    const conversationInclude = {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
              isOnline: true,
              lastSeen: true
            }
          }
        }
      },
      lastMessage: true
    };

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
      include: conversationInclude
    });

    if (!conversation) {
      try {
        // Create new conversation — wrap in try/catch for race-condition safety
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
          include: conversationInclude
        });
      } catch (createError) {
        // P2002 = Unique constraint failed (race condition: another request already created it)
        if (createError.code === 'P2002' || createError.code === 'P2003') {
          conversation = await prisma.conversation.findFirst({
            where: {
              type: 'DIRECT',
              AND: [
                { participants: { some: { userId: currentUserId } } },
                { participants: { some: { userId: userId } } }
              ],
              isActive: true
            },
            include: conversationInclude
          });
        } else {
          throw createError;
        }
      }
    }

    if (!conversation) {
      return res.status(500).json({ message: 'Failed to resolve conversation' });
    }

    res.json({ conversation });
  } catch (error) {
    console.error('[getOrCreateDirectConversation] Error:', error.message, error.code);
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
                role: true,
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
                role: true,
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
  const { conversationId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  
  try {
    // 1. Initial Access Check
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        userId: req.user.id,
        conversationId: conversationId
      }
    });

    if (!participant) {
      console.warn(`[DIAGNOSTIC] Access Denied: User ${req.user.id} -> Conv ${conversationId}`);
      return res.status(403).json({ message: 'Access denied' });
    }

    // 2. Bare-Bones Message Fetch (Simplifying to identify 500 cause)
    // REMOVED isDeleted filter temporarily to rule out missing column
    const messages = await prisma.message.findMany({
      where: {
        conversationId: conversationId
        // isDeleted: false (Removing filter to check if column exists)
      },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true, role: true }
        },
        replyTo: {
          include: {
            sender: { select: { id: true, name: true } }
          }
        },
        reactions: {
          include: {
            user: { select: { id: true, name: true } }
          }
        }
        // DEFERRED: readReceipts (Potential heavy join)
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    // 3. Simplified Conversation Metadata fetch
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, avatar: true, role: true } }
          }
        }
        // DEFERRED: course (Potential heavy join with nested membership check)
      }
    });

    res.json({ 
      messages: messages.reverse(),
      hasMore: messages.length === parseInt(limit),
      conversation,
      diagnostic: "Running in simplified mode"
    });
  } catch (error) {
    console.error(`[CRITICAL 500] chatController.getMessages:`, {
      message: error.message,
      stack: error.stack,
      params: req.params,
      user: req.user?.id
    });
    res.status(500).json({ 
      message: 'Server failed to process message fetch', 
      error: error.message,
      detail: "Attempting simplified query"
    });
  }
};

// Send message
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, content, type = 'TEXT', replyToId } = req.body;

    // Verify user is participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        userId: req.user.id,
        conversationId: conversationId
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

    // Notify other participants via socket if available
    if (req.io) {
      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId },
        select: { userId: true }
      });

      const recipients = participants.filter(p => p.userId !== req.user.id);
      
      // Emit to conversation room
      req.io.to(`conversation:${conversationId}`).emit('new-message', {
        message,
        conversationId
      });

      // Send notifications to each recipient in parallel
      await Promise.all(recipients.map(async (recipient) => {
        // Create DB Notification
        const notification = await prisma.notification.create({
          data: {
            type: 'MESSAGE',
            title: `New message from ${message.sender.name}`,
            content: content.length > 50 ? content.substring(0, 50) + '...' : content,
            recipientId: recipient.userId,
            senderId: req.user.id,
            messageId: message.id
          }
        });

        const unreadCount = await prisma.notification.count({
          where: { recipientId: recipient.userId, isRead: false }
        });

        // Emit new-notification
        req.io.to(`user:${recipient.userId}`).emit('new-notification', {
          notification,
          unreadCount
        });

        // FCM: Send push to the recipient's registered device
        try {
          const recipientUser = await prisma.user.findUnique({
            where: { id: recipient.userId },
            select: { fcmToken: true }
          });
          
          if (recipientUser?.fcmToken) {
            const msgPreview = content
              ? (content.length > 80 ? content.substring(0, 80) + '…' : content)
              : 'Sent an attachment';

            await sendPushNotification([recipientUser.fcmToken], {
              title: `💬 ${message.sender.name}`,
              message: msgPreview,
              url: `/chat/${conversationId}`,
              extraData: {
                type: 'MESSAGE',
                chatId: conversationId.toString(),
                senderName: message.sender.name
              }
            });
          }
        } catch (fcmErr) {
          console.error('[FCM] Error in sendMessage push:', fcmErr.message);
        }
      }));
    }

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
      
      // Update the user's unread count via socket
      if (req.io) {
        const newCount = await prisma.message.count({
          where: {
            senderId: { not: userId },
            readReceipts: { none: { userId: userId } },
            conversation: { participants: { some: { userId: userId, isDeleted: false } }, isActive: true }
          }
        });
        req.io.to(`user:${userId}`).emit('total-unread-chat-count', { count: newCount });
      }
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
    const { conversationId, type, tempId } = req.body;
    const userId = req.user.id;

    if (!req.files || (!req.files.file && !req.files.voice)) {
      console.error('Upload failed: No files received');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    let fileName = '';
    let fileSize = 0;
    let localFile = null;

    if (req.files.file && req.files.file.length > 0) {
      localFile = req.files.file[0];
      fileName = localFile.originalname;
      fileSize = localFile.size;
    } else if (req.files.voice && req.files.voice.length > 0) {
      localFile = req.files.voice[0];
      fileName = 'Voice Note';
      fileSize = localFile.size;
    } else {
      return res.status(400).json({ message: 'No valid file data received' });
    }

    // Upload to Supabase cloud storage (Memory Buffer)
    const fileUrl = await uploadToSupabase(localFile);
    
    if (!fileUrl) {
      return res.status(500).json({ message: 'Failed to upload to cloud storage' });
    }

    // Auto-detect IMAGE type from extension if it's currently FILE
    let finalType = type;
    if (finalType === 'FILE' && fileName && /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)) {
      finalType = 'IMAGE';
    }

    // GENERAL UPLOAD MODE: Quick return for generic file uploads (e.g., Avatars/Profile Pics)
    if (!conversationId || conversationId === 'undefined' || conversationId === 'null') {
      return res.status(200).json({ url: fileUrl });
    }

    // Verify participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        userId,
        conversationId
      }
    });

    if (!participant) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: finalType === 'VOICE' ? 'Voice memo' : fileName,
        type: finalType,
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

      // 6. Send FCM Push Notification
      try {
        const recipientUser = await prisma.user.findUnique({
          where: { id: recipient.userId },
          select: { fcmToken: true }
        });
        
        if (recipientUser?.fcmToken) {
          await sendPushNotification([recipientUser.fcmToken], {
            title: `📎 New File: ${message.sender.name}`,
            message: notification.content,
            url: `/chat/${conversationId}`,
            extraData: { 
              type: 'MESSAGE',
              chatId: conversationId.toString(),
              senderName: message.sender.name
            }
          });
        }
      } catch (fcmErr) {
        console.error('[FCM] Error in attachment push:', fcmErr.message);
      }
    }

    // Broadcast the message to the conversation room so it appears in real-time
    if (req.io) {
      req.io.to(`conversation:${conversationId}`).emit('new-message', {
        message: { ...message, tempId },
        conversationId
      });
    }

    res.status(201).json({ message: { ...message, tempId } });
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

// Delete conversation (soft delete for user, hard delete for NANA session)
exports.deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const participant = await prisma.conversationParticipant.findUnique({
      where: { userId, conversationId: id },
      include: { conversation: true }
    });

    if (!participant) return res.status(404).json({ message: 'Participant not found' });

    if (participant.conversation.name === NANA_SESSION_MARKER) {
      // Hard delete to easily reset ephemeral NANA sessions
      await prisma.conversation.delete({
        where: { id: id }
      });
    } else {
      // Soft delete for normal peer conversations
      await prisma.conversationParticipant.update({
        where: { id: participant.id },
        data: { isDeleted: true }
      });
    }

    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete multiple conversations
exports.deleteMultipleConversations = async (req, res) => {
  try {
    const { conversationIds } = req.body;
    const userId = req.user.id;

    // Find if any of the target conversations are NANA sessions
    const nanaConvs = await prisma.conversation.findMany({
      where: {
        id: { in: conversationIds },
        name: NANA_SESSION_MARKER
      }
    });
    
    const nanaConvIds = nanaConvs.map(c => c.id);
    const normalConvIds = conversationIds.filter(id => !nanaConvIds.includes(id));

    // Hard delete NANA sessions
    if (nanaConvIds.length > 0) {
      await prisma.conversation.deleteMany({
        where: { id: { in: nanaConvIds } }
      });
    }

    // Soft delete normal sessions for the current user
    if (normalConvIds.length > 0) {
      await prisma.conversationParticipant.updateMany({
        where: {
          userId,
          conversationId: { in: normalConvIds }
        },
        data: { isDeleted: true }
      });
    }

    res.json({ message: 'Conversations deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark all conversations as read
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all conversations where user is a participant
    const participantIn = await prisma.conversationParticipant.findMany({
      where: { userId, isDeleted: false },
      select: { conversationId: true }
    });

    const conversationIds = participantIn.map(p => p.conversationId);

    // Find all unread messages in those conversations
    const messagesToMark = await prisma.message.findMany({
      where: {
        conversationId: { in: conversationIds },
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

      // Update the user's unread count via socket
      if (req.io) {
        req.io.to(`user:${userId}`).emit('total-unread-chat-count', { count: 0 });
      }
    }

    res.json({ message: 'All messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get total unread message count across all conversations
exports.getTotalUnreadMessages = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await prisma.message.count({
      where: {
        senderId: { not: userId },
        readReceipts: {
          none: {
            userId: userId
          }
        },
        conversation: {
          participants: {
            some: {
              userId: userId,
              isDeleted: false
            }
          },
          isActive: true
        }
      }
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Clear all chat messages
exports.clearChat = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log(`[CLEAR CHAT] Starting for CID:${id} by User:${userId}`);

    try {
      // 1. Verify access
      const participant = await prisma.conversationParticipant.findUnique({
        where: { userId, conversationId: id }
      });

      if (!participant) {
        console.warn(`[CLEAR CHAT] Access denied for user:${userId} on CID:${id}`);
        return res.status(403).json({ message: 'Access denied' });
      }

      // Execute as a transaction to ensure database consistency
      await prisma.$transaction(async (tx) => {
        console.log(`[CLEAR CHAT] Transaction started for CID:${id}`);

        // A. Handle Conversation pointers first
        await tx.conversation.update({
          where: { id },
          data: {
            lastMessageId: null,
            lastMessageAt: new Date()
          }
        });
        console.log(`[CLEAR CHAT] Conversation pointers reset`);

        // B. Clear notifications
        await tx.notification.deleteMany({
          where: {
            message: {
              conversationId: id
            }
          }
        });
        console.log(`[CLEAR CHAT] Notifications cleared`);

        // C. Break self-referential reply chains
        await tx.message.updateMany({
          where: { conversationId: id },
          data: { replyToId: null }
        });
        console.log(`[CLEAR CHAT] Reply chains broken`);

        // D. Final deletion
        const deletedResult = await tx.message.deleteMany({
          where: { conversationId: id }
        });
        
        console.log(`[CLEAR CHAT] Deleted ${deletedResult.count} messages`);
      });

      // 5. Notify all participants via Socket
      if (req.io) {
        req.io.to(`conversation:${id}`).emit('chat-cleared', { conversationId: id });
        console.log(`[CLEAR CHAT] Socket event emitted`);
      }

      return res.json({ message: 'Chat cleared successfully' });
    } catch (dbError) {
      console.error('[CLEAR CHAT] DB Error during transaction:', dbError);
      return res.status(500).json({ 
        message: 'Could not clear chat history due to a database constraint.',
        error: dbError.message 
      });
    }
  } catch (outerError) {
    console.error('[CLEAR CHAT] Outer Error:', outerError);
    return res.status(500).json({ message: 'Internal server error', error: outerError.message });
  }
};
