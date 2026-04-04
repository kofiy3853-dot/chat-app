const prisma = require('../prisma/client');

/**
 * Update user's Firebase Cloud Messaging (FCM) Token
 */
exports.updateFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.user.id;

    if (!fcmToken) {
      return res.status(400).json({ message: 'FCM Token is required' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { fcmToken }
    });

    res.json({ message: 'FCM Token updated successfully' });
  } catch (error) {
    console.error('Update FCM Token error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
