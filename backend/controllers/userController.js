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
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch notifications without the missing 'sender' relation
    const notifications = await prisma.notification.findMany({
      where: { recipientId: req.user.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
      include: {
        message: {
          select: {
            id: true,
            content: true,
            conversationId: true,
            type: true
          }
        }
      }
    });

    // Manually fetch sender information for notifications that have a senderId
    const senderIds = [...new Set(notifications.map(n => n.senderId).filter(Boolean))];
    let senders = [];
    if (senderIds.length > 0) {
      senders = await prisma.user.findMany({
        where: { id: { in: senderIds } },
        select: { id: true, name: true, avatar: true }
      });
    }

    // Map senders back to notifications
    const notificationsWithSenders = notifications.map(notif => ({
      ...notif,
      sender: senders.find(s => s.id === notif.senderId) || null
    }));

    res.json({ 
      notifications: notificationsWithSenders,
      hasMore: notifications.length === parseInt(limit)
    });
  } catch (error) {
    console.error('[NOTIF ERROR] getNotifications failed:', error);
    res.status(500).json({ 
      message: 'Server error while fetching notifications', 
      error: error.message 
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
