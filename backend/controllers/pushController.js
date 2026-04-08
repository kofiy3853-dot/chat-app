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

/**
 * Send a test notification to the requesting user
 */
exports.sendTestPush = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true, name: true }
    });

    if (!user?.fcmToken) {
      return res.status(400).json({ message: 'No registered push token found. Please ensure notifications are enabled in your browser.' });
    }

    const { sendPushNotification } = require('../utils/firebasePush');
    await sendPushNotification([user.fcmToken], {
      title: '🔔 Campus Alert Test',
      message: `Success! ${user.name.split(' ')[0]}, your notifications are live and ready.`,
      url: '/account'
    });

    res.json({ message: 'Push notification sent! Check your device.' });
  } catch (error) {
    console.error('Test push error:', error);
    res.status(500).json({ message: 'Failed to send test push', error: error.message });
  }
};
