const prisma = require('../prisma/client');

// Get all announcements
exports.getAnnouncements = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const announcements = await prisma.announcement.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    res.json({ announcements });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create announcement
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, content, imageUrl, targetCourseId, targetDepartment, targetAll = true } = req.body;
    const userId = req.user.id;

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        imageUrl,
        targetCourseId,
        targetDepartment,
        targetAll,
        userId
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      }
    });

    // Create notifications for subscribers/targets
    const targetFilter = {};
    if (!targetAll) {
      if (targetCourseId) {
        targetFilter.courses = { some: { id: targetCourseId } };
      } else if (targetDepartment) {
        targetFilter.department = targetDepartment;
      }
    }

    const usersToNotify = await prisma.user.findMany({
      where: targetFilter,
      select: { id: true, fcmToken: true }
    });

    if (usersToNotify.length > 0) {
      const notifsData = usersToNotify.map(u => ({
        recipientId: u.id,
        type: 'ANNOUNCEMENT',
        title: `Campus Announcement: ${title}`,
        content: content.substring(0, 150),
        senderId: userId
      }));

      await prisma.notification.createMany({ data: notifsData });

      // 1. Socket Emits
      if (req.io) {
        usersToNotify.forEach(u => {
          req.io.to(`user:${u.id}`).emit('new-notification', {
            notification: {
              type: 'ANNOUNCEMENT',
              title: `Campus Announcement: ${title}`,
              content: content.substring(0, 150),
              createdAt: new Date(),
              sender: { name: announcement.user.name, avatar: announcement.user.avatar }
            }
          });
        });
      }

      // FCM Push
      try {
        const { sendPushNotification } = require('../utils/firebasePush');
        const tokens = usersToNotify.map(u => u.fcmToken).filter(token => !!token);
        if (tokens.length > 0) {
          await sendPushNotification(tokens, {
            title: `📢 KTU Announcement`,
            message: title,
            url: '/activity',
            extraData: { type: 'ANNOUNCEMENT' }
          });
        }
      } catch (fcmErr) {
        console.error('[FCM] Announcement error:', fcmErr);
      }
    }

    res.status(201).json({ announcement });
  } catch (error) {
    console.error('[ANNOUNCEMENT CREATE ERROR]', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// Delete announcement
exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const announcement = await prisma.announcement.findUnique({
      where: { id }
    });

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    if (announcement.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized to delete this announcement' });
    }

    await prisma.announcement.delete({
      where: { id }
    });

    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
