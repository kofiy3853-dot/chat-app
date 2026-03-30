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
    const { title, content, imageUrl } = req.body;
    const userId = req.user.id;

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        imageUrl,
        userId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    res.status(201).json({ announcement });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
