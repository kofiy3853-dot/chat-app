const prisma = require('../prisma/client');

// Get all upcoming events
exports.getEvents = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const now = new Date();

    const events = await prisma.event.findMany({
      where: {
        dateTime: { gte: now }
      },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        _count: { select: { participants: true } },
        participants: {
          where: { userId: req.user.id },
          select: { id: true }
        }
      },
      orderBy: { dateTime: 'asc' },
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
    const { title, description, dateTime, location } = req.body;

    const event = await prisma.event.create({
      data: {
        title,
        description,
        dateTime: new Date(dateTime),
        location,
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

    // Notify users via Activity
    // In a real app, we might notify everyone, but for now we'll create a system notification
    // that the Activity page can pick up.
    const users = await prisma.user.findMany({
      where: { id: { not: req.user.id } },
      select: { id: true }
    });

    await Promise.all(users.map(async (u) => {
      const notification = await prisma.notification.create({
        data: {
          type: 'SYSTEM',
          title: 'New Event',
          content: `${req.user.name} posted a new event: ${title}`,
          recipientId: u.id,
          actionUrl: '/events'
        }
      });
      if (req.io) {
        const count = await prisma.notification.count({ where: { recipientId: u.id, isRead: false } });
        req.io.to(`user:${u.id}`).emit('new-notification', { notification, unreadCount: count });
      }
    }));

    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Join/Leave event
exports.toggleJoinEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const existingParticipant = await prisma.eventParticipant.findUnique({
      where: { eventId_userId: { eventId, userId } }
    });

    if (existingParticipant) {
      await prisma.eventParticipant.delete({
        where: { eventId_userId: { eventId, userId } }
      });
      res.json({ message: 'Left event', isJoined: false });
    } else {
      await prisma.eventParticipant.create({
        data: { eventId, userId }
      });
      res.json({ message: 'Joined event', isJoined: true });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
