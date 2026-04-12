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

    // REQUIREMENT: Chunk tokens into batches of 500 (FCM limit for sendEachForMulticast)
    const CHUNK_SIZE = 500;
    const tokenChunks = [];
    for (let i = 0; i < validTokens.length; i += CHUNK_SIZE) {
      tokenChunks.push(validTokens.slice(i, i + CHUNK_SIZE));
    }

    console.log(`[FCM] Starting broadcast to ${validTokens.length} token(s) in ${tokenChunks.length} chunk(s).`);

    for (const chunk of tokenChunks) {
      const messagePayload = {
        // DATA-ONLY payload: This is the gold standard for reliable PWA notifications.
        // It ensures the Service Worker 'onBackgroundMessage' ALWAYS fires, 
        // giving us full control over notification display, grouping, and deep-linking.
        data: {
          title: payload.title || 'Campus Hub',
          body: payload.message || 'New notification',
          url: payload.url || '/',
          unreadCount: String(payload.badgeCount || 0),
          ...(payload.messageId ? { messageId: String(payload.messageId) } : {}),
          ...(payload.extraData
            ? Object.fromEntries(
                Object.entries(payload.extraData)
                  .filter(([, v]) => v !== undefined && v !== null)
                  .map(([k, v]) => [k, String(v)])
              )
            : {})
        },
        tokens: chunk,
        android: {
          priority: 'high',
          // Note: When using data-only, 'android.notification' is ignored, 
          // but priority helps delivery.
        },
        webpush: {
          headers: {
            Urgency: 'high'
          },
          fcmOptions: {
            link: payload.url || '/'
          }
        }
      };

      console.log(`[FCM] Sending chunk... Payload:`, JSON.stringify(messagePayload, null, 2));
        const response = await admin.messaging().sendEachForMulticast(messagePayload);
      
      console.log(`[FCM] Chunk complete. Success: ${response.successCount} | Failure: ${response.failureCount}`);

      if (response.failureCount > 0) {
        const invalidTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const error = resp.error;
            const token = chunk[idx];
            
            console.warn(`[FCM] Failure for token: ${token.substring(0, 10)}... | Error: ${error.code} | Msg: ${error.message}`);

            if (error.code === 'messaging/invalid-registration-token' || 
                error.code === 'messaging/registration-token-not-registered' ||
                error.code === 'messaging/mismatched-credential') {
              invalidTokens.push(token);
            }
          }
        });

        if (invalidTokens.length > 0) {
          console.log(`[FCM] Cleaning up ${invalidTokens.length} invalid tokens.`);
          await prisma.user.updateMany({
            where: { fcmToken: { in: invalidTokens } },
            data: { fcmToken: null }
          });
        }
      }
    }
  } catch (error) {
    console.error('[FCM CRITICAL ERROR] Notification broadcast failed:', error.message);
  }
}


module.exports = { sendPushNotification };
