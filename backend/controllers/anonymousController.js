const prisma = require('../prisma/client');

// Get anonymous posts
exports.getAnonymousPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const posts = await prisma.anonymousPost.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    res.json({ posts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create anonymous post
exports.createAnonymousPost = async (req, res) => {
  try {
    const { content, tags } = req.body;

    const post = await prisma.anonymousPost.create({
      data: {
        content,
        tags
      }
    });

    res.status(201).json({ post });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
