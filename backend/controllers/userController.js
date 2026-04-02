const prisma = require('../prisma/client');

// Search users
exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const currentUserId = req.user.id;

    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
              { studentId: { contains: query, mode: 'insensitive' } }
            ]
          }
        ]
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        studentId: true,
        department: true,
        isOnline: true,
        lastSeen: true
      },
      take: 20
    });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        studentId: true,
        department: true,
        isOnline: true,
        lastSeen: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get online users
exports.getOnlineUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { isOnline: true },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        studentId: true,
        department: true,
        isOnline: true,
        lastSeen: true
      },
      take: 50
    });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update user status
exports.updateStatus = async (req, res) => {
  try {
    const { isOnline } = req.body;
    
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { 
        isOnline, 
        lastSeen: new Date() 
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        studentId: true,
        department: true,
        isOnline: true,
        lastSeen: true
      }
    });

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get notifications
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    // Safer pagination parsing
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, Math.min(100, parseInt(limit) || 20));
    const skip = (p - 1) * l;

    console.log(`[NOTIF] Fetching notifications for user: ${req.user.id}, Page: ${p}, Skip: ${skip}, Take: ${l}`);

    // Fetch core notifications WITHOUT relations to avoid "broken relation" errors in Prisma/Postgres
    const notifications = await prisma.notification.findMany({
      where: { recipientId: req.user.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: l
    });

    if (!notifications || notifications.length === 0) {
      return res.json({ notifications: [], hasMore: false });
    }

    // 1. Manually fetch Senders
    const senderIds = [...new Set(notifications.map(n => n.senderId).filter(Boolean))];
    let senders = [];
    if (senderIds.length > 0) {
      senders = await prisma.user.findMany({
        where: { id: { in: senderIds } },
        select: { id: true, name: true, avatar: true }
      });
    }

    // 2. Manually fetch Messages (if referenced)
    const messageIds = [...new Set(notifications.map(n => n.messageId).filter(Boolean))];
    let messages = [];
    if (messageIds.length > 0) {
      messages = await prisma.message.findMany({
        where: { id: { in: messageIds } },
        select: {
          id: true,
          content: true,
          conversationId: true,
          type: true
        }
      });
    }

    // Combine everything
    const populatedNotifications = notifications.map(notif => {
      const sender = senders.find(s => s.id === notif.senderId) || null;
      const message = messages.find(m => m.id === notif.messageId) || null;
      
      return {
        ...notif,
        sender,
        message
      };
    });

    res.json({ 
      notifications: populatedNotifications,
      hasMore: notifications.length === l
    });
  } catch (error) {
    console.error('[CRITICAL NOTIF ERROR] getNotifications failed:', error);
    res.status(500).json({ 
      message: 'Server error while fetching notifications', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get unread notification count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: {
        recipientId: req.user.id,
        isRead: false
      }
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark notifications as read
exports.markNotificationsAsRead = async (req, res) => {
  try {
    const { notificationIds } = req.body;

    if (notificationIds && Array.isArray(notificationIds)) {
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          recipientId: req.user.id
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });
    } else {
      // Mark all as read
      await prisma.notification.updateMany({
        where: {
          recipientId: req.user.id,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });
    }

    // Grab the new count and notify the Navbar badge!
    if (req.io) {
      const newCount = await prisma.notification.count({
        where: { recipientId: req.user.id, isRead: false }
      });
      req.io.to(`user:${req.user.id}`).emit('unread-count', { count: newCount });
    }

    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
