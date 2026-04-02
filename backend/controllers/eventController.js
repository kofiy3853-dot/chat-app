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

    // 5. Notify all users via high-performance batch creation
    const allUsers = await prisma.user.findMany({
      where: { id: { not: req.user.id } },
      select: { id: true }
    });

    if (allUsers.length > 0) {
      await prisma.notification.createMany({
        data: allUsers.map(u => ({
          type: 'SYSTEM',
          title: `New ${category.toLowerCase()} event`,
          content: `${req.user.name} created: ${title}`,
          recipientId: u.id,
          actionUrl: `/events`
        })),
        skipDuplicates: true
      });

      // Emit sockets in background
      if (req.io) {
        allUsers.forEach(u => {
          req.io.to(`user:${u.id}`).emit('new-notification', { 
            notification: { title: `New ${category} event`, content: title },
            unreadCount: 'refresh' // Client will fetch count if needed or we can optimize later
          });
        });
      }
    }

    res.status(201).json(event);
  } catch (error) {
    console.error('Create event error:', error);
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
