const admin = require('../config/firebaseAdmin');
const prisma = require('../prisma/client'); // REQUIREMENT 5: Enable token cleanup

/**
 * Send a push notification to one or more FCM tokens and handle DB cleanup.
 * @param {string|string[]} fcmTokens - Single token or array of strings
 * @param {object} payload - Title, message, and extra data
 */
async function sendPushNotification(fcmTokens, payload) {
  try {
    if (!admin) {
      console.warn('[FCM] Firebase not initialized. Notification skipped.');
      return;
    }

    const tokens = Array.isArray(fcmTokens) ? fcmTokens : [fcmTokens];
    const validTokens = [...new Set(tokens.filter(t => !!t))]; // Dedup

    if (validTokens.length === 0) return;

    const messagePayload = {
      notification: {
        title: payload.title || 'Campus Chat',
        body: payload.message || 'New notification',
      },
      data: {
        url: payload.url || '/',
        ...(payload.extraData || {})
      },
      webpush: {
        notification: {
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png'
        },
        fcm_options: {
          link: payload.url || '/'
        }
      },
      tokens: validTokens,
    };

    // REQUIREMENT 4: Log every notification attempt
    console.log(`[FCM] Sending push to ${validTokens.length} token(s)...`);

    const response = await admin.messaging().sendEachForMulticast(messagePayload);
    
    // Log overall success
    console.log(`[FCM] Successfully delivered to ${response.successCount} device(s).`);

    // REQUIREMENT 5: Handle token cleanup for invalid tokens
    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error;
          const token = validTokens[idx];
          
          console.warn(`[FCM] Failure for token: ${token.substring(0, 10)}... Error: ${error.code}`);

          // Tokens that are invalid or no longer registered should be removed from DB
          if (error.code === 'messaging/invalid-registration-token' || 
              error.code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(token);
          }
        }
      });

      if (invalidTokens.length > 0) {
        console.log(`[FCM] Cleaning up ${invalidTokens.length} invalid tokens from database.`);
        await prisma.user.updateMany({
          where: { fcmToken: { in: invalidTokens } },
          data: { fcmToken: null }
        });
      }
    }
  } catch (error) {
    console.error('[FCM CRITICAL ERROR] Notification broadcast failed:', error.message);
  }
}

module.exports = { sendPushNotification };
