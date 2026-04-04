const prisma = require('../prisma/client');

// Search users
exports.searchUsers = async (req, res) => {
  try {
    const { query, faculty, level, department } = req.query;
    const currentUserId = req.user.id;

    // Advanced filtering based on KTU academic metadata
    const filters = {
      AND: [
        { id: { not: currentUserId } },
        { role: { not: 'NANA' } },
        { role: { not: 'ADMIN' } } // Admins are usually hidden from public student searches
      ]
    };

    if (faculty) filters.AND.push({ faculty });
    if (level) filters.AND.push({ level });
    if (department) filters.AND.push({ department: { contains: department, mode: 'insensitive' } });

    if (query) {
      filters.AND.push({
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { studentId: { contains: query, mode: 'insensitive' } }
        ]
      });
    }

    const users = await prisma.user.findMany({
      where: filters,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        studentId: true,
        department: true,
        faculty: true,
        level: true,
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
        faculty: true,
        level: true,
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
        faculty: true,
        level: true,
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
        faculty: true,
        level: true,
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
    
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, Math.min(100, parseInt(limit) || 20));
    const offset = (p - 1) * l;
    const userId = req.user.id;

    console.log(`[NOTIF] Raw SQL fetch for user: ${userId}, Page: ${p}, Offset: ${offset}, Limit: ${l}`);

    // Use raw SQL to completely bypass Prisma schema mapping.
    // This is immune to column mismatches, missing migrations, and broken relations in production.
    const notifications = await prisma.$queryRawUnsafe(`
      SELECT
        n.id,
        n.type,
        n.title,
        n.content,
        n."isRead",
        n."actionUrl",
        n."createdAt",
        n."senderId",
        n."messageId",
        n."courseId",
        u.id            AS "senderUserId",
        u.name          AS "senderName",
        u.avatar        AS "senderAvatar",
        m.id            AS "msgId",
        m.content       AS "msgContent",
        m."conversationId" AS "msgConversationId",
        m.type          AS "msgType"
      FROM "Notification" n
      LEFT JOIN "User" u ON u.id = n."senderId"
      LEFT JOIN "Message" m ON m.id = n."messageId"
      WHERE n."recipientId" = $1
      ORDER BY n."createdAt" DESC
      LIMIT $2 OFFSET $3
    `, userId, l, offset);

    // Shape the flat SQL rows into the expected nested structure
    const shaped = notifications.map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      content: row.content,
      isRead: row.isRead,
      actionUrl: row.actionUrl,
      createdAt: row.createdAt,
      senderId: row.senderId,
      messageId: row.messageId,
      courseId: row.courseId,
      sender: row.senderUserId ? {
        id: row.senderUserId,
        name: row.senderName,
        avatar: row.senderAvatar
      } : null,
      message: row.msgId ? {
        id: row.msgId,
        content: row.msgContent,
        conversationId: row.msgConversationId,
        type: row.msgType
      } : null
    }));

    res.json({ 
      notifications: shaped,
      hasMore: notifications.length === l
    });
  } catch (error) {
    console.error('[CRITICAL NOTIF ERROR] getNotifications (raw SQL) failed:', error);
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
