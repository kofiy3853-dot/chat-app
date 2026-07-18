const prisma = require('../prisma/client');

// Get all upcoming events
exports.getEvents = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const now = new Date();

    const events = await prisma.event.findMany({
      where: {
        startTime: { gte: now }
      },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        _count: { select: { participants: true } },
        participants: {
          where: { userId: req.user.id },
          select: { id: true }
        }
      },
      orderBy: { startTime: 'asc' },
      skip,
      take: parseInt(limit)
    });

    const eventsWithJoinStatus = events.map(e => ({
      ...e,
      isJoined: e.participants.length > 0,
      attendeeCount: e._count.participants,
      participants: undefined,
      _count: undefined
    }));

    res.json({ events: eventsWithJoinStatus, hasMore: events.length === parseInt(limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create event
exports.createEvent = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      startTime, 
      endTime, 
      category,
      locationType,
      locationValue,
      maxAttendees,
      visibility,
      rsvpEnabled,
      bannerUrl
    } = req.body;

    const event = await prisma.event.create({
      data: {
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        category,
        locationType,
        locationValue,
        maxAttendees: maxAttendees ? parseInt(maxAttendees) : null,
        visibility,
        rsvpEnabled: rsvpEnabled !== undefined ? rsvpEnabled : true,
        bannerUrl,
        creatorId: req.user.id,
        participants: {
          create: { userId: req.user.id }
        }
      },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        _count: { select: { participants: true } }
      }
    });

    // 5. Create a SINGLE broadcast notification (recipientId = null)
    const broadcastNotification = await prisma.notification.create({
      data: {
        type: 'SYSTEM',
        title: `New ${category.toLowerCase()} event`,
        content: `${req.user.name} created: ${title}`,
        actionUrl: '/events'
      }
    });

    // Broadcast to all connected users via single room emit
    if (req.io) {
      req.io.to('broadcast').emit('new-notification', {
        notification: {
          ...broadcastNotification,
          sender: { id: req.user.id, name: req.user.name }
        },
        unreadCount: 'refresh'
      });
    }

    // 6. Send FCM Push Notifications to users with tokens
    try {
      const { sendPushNotification } = require('../utils/firebasePush');
      const allUsers = await prisma.user.findMany({
        where: { id: { not: req.user.id } },
        select: { fcmToken: true }
      });
      const tokens = allUsers
        .map(u => u.fcmToken)
        .filter(token => !!token);

      if (tokens.length > 0) {
        await sendPushNotification(tokens, {
          title: `🗓️ New Event: ${title}`,
          message: `${req.user.name} posted a new ${category.toLowerCase()} event.`,
          url: '/events',
          extraData: { type: 'EVENT', eventId: event.id }
        });
      }
    } catch (fcmErr) {
      console.error('[FCM] Event creation push error:', fcmErr);
    }

    res.status(201).json(event);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Join/Leave event (transactional to prevent race conditions)
exports.toggleJoinEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const result = await prisma.$transaction(async (tx) => {
      const existingParticipant = await tx.eventParticipant.findUnique({
        where: { eventId_userId: { eventId, userId } }
      });

      if (existingParticipant) {
        await tx.eventParticipant.delete({
          where: { eventId_userId: { eventId, userId } }
        });
        return { message: 'Left event', isJoined: false };
      } else {
        await tx.eventParticipant.create({
          data: { eventId, userId }
        });
        return { message: 'Joined event', isJoined: true };
      }
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// Delete event
exports.deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.creatorId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }

    await prisma.event.delete({
      where: { id: eventId }
    });

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
