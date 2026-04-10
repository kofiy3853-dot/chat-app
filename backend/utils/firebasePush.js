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
      // Data payload for Service Worker control
      data: {
        title: payload.title || 'Campus Chat',
        body: payload.message || 'New notification',
        url: payload.url || '/',
        unreadCount: String(payload.badgeCount || 0),
        // Conditionally include messageId — FCM rejects keys with undefined values
        ...(payload.messageId ? { messageId: String(payload.messageId) } : {}),
        // Defensively stringify all extraData values — FCM rejects non-string data fields
        ...(payload.extraData
          ? Object.fromEntries(
              Object.entries(payload.extraData)
                .filter(([, v]) => v !== undefined && v !== null)
                .map(([k, v]) => [k, String(v)])
            )
          : {})
      },
      // Notification block for native system backup (Android/iOS)
      notification: {
        title: payload.title || 'Campus Chat',
        body: payload.message || 'New notification',
      },
      tokens: validTokens,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: 'OPEN_CHAT',
          channelId: 'campus_chat_messages'
        }
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
            
            console.warn(`[FCM] Failure for token: ${token.substring(0, 10)}... | Error: ${error.code} | Msg: ${error.message}`);

            // Tokens that are invalid, or for a different project, should be removed
            if (error.code === 'messaging/invalid-registration-token' || 
                error.code === 'messaging/registration-token-not-registered' ||
                error.code === 'messaging/mismatched-credential') {
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
