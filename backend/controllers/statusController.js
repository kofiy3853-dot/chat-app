const prisma = require('../prisma/client');
const { v4: uuidv4 } = require('uuid');

exports.createStatus = async (req, res) => {
  try {
    const { type, contentUrl, textContent, backgroundColor, caption } = req.body;
    const userId = req.user.id;

    // Default to TEXT if not provided
    const statusType = type || 'TEXT';

    // Status expires in 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const status = await prisma.status.create({
      data: {
        type: statusType,
        contentUrl: statusType !== 'TEXT' ? contentUrl : null,
        textContent: statusType === 'TEXT' ? textContent : null,
        backgroundColor: statusType === 'TEXT' ? backgroundColor || '#6B73FF' : null,
        caption: caption || '',
        expiresAt,
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

    res.status(201).json(status);
  } catch (error) {
    console.error('Error creating status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.uploadImage = async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const file = req.files.file[0];
    const fileUrl = file.path.replace(/\\/g, '/'); // normalize path for all OS

    res.json({
      fileUrl,
      fileName: file.originalname,
      fileSize: file.size
    });
  } catch (err) {
    console.error('Error uploading status image:', err);
    res.status(500).json({ message: 'Failed to upload image' });
  }
};

exports.getStatuses = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // Get all non-expired statuses from the user's contacts and themselves
    // For simplicity in this campus chat, we'll get all active statuses
    const statuses = await prisma.status.findMany({
      where: {
        expiresAt: {
          gt: now
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        views: {
          where: {
            viewerId: userId
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Group by user
    const groupedStatuses = statuses.reduce((acc, status) => {
      const uId = status.user.id;
      if (!acc[uId]) {
        acc[uId] = {
          user: status.user,
          statuses: [],
          hasUnseen: false
        };
      }
      acc[uId].statuses.push(status);
      if (status.views.length === 0 && uId !== userId) {
        acc[uId].hasUnseen = true;
      }
      return acc;
    }, {});

    res.json(Object.values(groupedStatuses));
  } catch (error) {
    console.error('Error getting statuses:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.viewStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const viewerId = req.user.id;

    const view = await prisma.statusView.upsert({
      where: {
        statusId_viewerId: {
          statusId,
          viewerId
        }
      },
      update: {
        viewedAt: new Date()
      },
      create: {
        statusId,
        viewerId
      }
    });

    res.json(view);
  } catch (error) {
    console.error('Error viewing status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getStatusViewers = async (req, res) => {
  try {
    const { statusId } = req.params;
    const userId = req.user.id;

    const status = await prisma.status.findUnique({
      where: { id: statusId }
    });

    if (!status || status.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const views = await prisma.statusView.findMany({
      where: { statusId },
      include: {
        viewer: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: {
        viewedAt: 'desc'
      }
    });

    res.json(views);
  } catch (error) {
    console.error('Error getting status viewers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
