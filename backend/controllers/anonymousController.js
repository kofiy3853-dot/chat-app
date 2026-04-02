const prisma = require('../prisma/client');

// Get anonymous posts
exports.getAnonymousPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const posts = await prisma.anonymousPost.findMany({
      select: {
        id: true,
        content: true,
        tags: true,
        createdAt: true,
        userId: true // We fetch it but will transform it
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    const transformedPosts = posts.map(post => {
      const isOwner = req.user && post.userId === req.user.id;
      const { userId, ...postData } = post;
      return { ...postData, isOwner };
    });

    res.json({ posts: transformedPosts });
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
        tags,
        userId: req.user.id
      }
    });

    res.status(201).json({ post });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// Delete anonymous post
exports.deleteAnonymousPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await prisma.anonymousPost.findUnique({
      where: { id }
    });

    if (!post) {
      return res.status(404).json({ message: 'Whisper not found' });
    }

    if (post.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized to delete this whisper' });
    }

    await prisma.anonymousPost.delete({
      where: { id }
    });

    res.json({ message: 'Whisper deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
