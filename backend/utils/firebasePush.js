const admin = require('../config/firebaseAdmin');

/**
 * Firebase Cloud Messaging Push Notification Utility
 */

/**
 * Send a push notification to one or more FCM tokens.
 * @param {string|string[]} fcmTokens - Single token or array of FCM tokens
 * @param {object} payload - Title, message, and extra data
 */
async function sendPushNotification(fcmTokens, payload) {
  try {
    if (!admin) {
      console.warn('[FCM] Firebase Admin not initialized. Skipping push.');
      return;
    }

    const tokens = Array.isArray(fcmTokens) ? fcmTokens : [fcmTokens];
    const validTokens = tokens.filter(t => !!t);

    if (validTokens.length === 0) return;

    const message = {
      notification: {
        title: payload.title || 'New Notification',
        body: payload.message || '',
      },
      data: {
        url: payload.url || '/',
        ...(payload.extraData || {})
      },
      tokens: validTokens,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default'
          }
        }
      }
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(validTokens[idx]);
          console.warn('[FCM] Error sending to token:', validTokens[idx], resp.error);
        }
      });
      // Optionally handle db cleanup for failedTokens if error is 'messaging/invalid-registration-token'
    }

    console.log(`[FCM] Successfully sent message to ${response.successCount} devices.`);
  } catch (error) {
    console.error('[FCM] Catch block error:', error);
  }
}

module.exports = { sendPushNotification };
