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
      select: { id: true, onesignal_player_id: true }
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

      // 2. WebPush (VAPID)
      try {
        const { getWebPush } = require('../utils/webPushHelper');
        const wp = getWebPush();
        if (wp) {
          const subscriptions = await prisma.pushSubscription.findMany({
            where: { userId: { in: usersToNotify.map(u => u.id) } }
          });
          
          if (subscriptions.length > 0) {
            const payload = JSON.stringify({
              title: `📢 ${title}`,
              body: content.substring(0, 100) + '...',
              url: '/activity'
            });
            
            subscriptions.forEach(sub => {
              const pushSubscription = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
              wp.sendNotification(pushSubscription, payload).catch(err => {
                if (err.statusCode === 404 || err.statusCode === 410) {
                  prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
                }
              });
            });
          }
        }
      } catch (wpErr) {
        console.error('[WP] Announcement error:', wpErr);
      }

      // 3. OneSignal
      try {
        const { sendPushNotification } = require('../utils/notificationHelper');
        const playerIds = usersToNotify.map(u => u.onesignal_player_id).filter(id => !!id);
        if (playerIds.length > 0) {
          await sendPushNotification(playerIds, {
            title: `📢 KTU Announcement`,
            body: title,
            type: 'ANNOUNCEMENT'
          });
        }
      } catch (osErr) {
        console.error('[OS] Announcement error:', osErr);
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
