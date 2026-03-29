const webpush = require('web-push');
const prisma = require('../prisma/client');

webpush.setVapidDetails(
  'mailto:support@campuschat.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

exports.getPublicKey = (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};

exports.subscribe = async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    const userId = req.user.id;

    if (!endpoint || !keys) {
      return res.status(400).json({ message: 'Invalid subscription object' });
    }

    // Save or update subscription
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId
      },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId
      }
    });

    res.status(201).json({ message: 'Subscribed to push notifications' });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
