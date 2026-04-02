/**
 * OneSignal Push Notification Utility
 * Sends push notifications via OneSignal REST API.
 * Called from backend only — REST API key is never exposed to frontend.
 */
const axios = require('axios');

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

/**
 * Send a push notification to one or more OneSignal player IDs.
 * @param {string[]} playerIds - Array of OneSignal player IDs
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.body
 * @param {string} opts.chatId - conversation ID for deep link
 * @param {string} opts.senderName
 */
async function sendPushNotification(playerIds, { title, body, chatId, senderName } = {}) {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.warn('[OneSignal] Missing ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY — skipping push.');
    return;
  }

  if (!playerIds || playerIds.length === 0) return;

  // Filter out null/undefined
  const validIds = playerIds.filter(Boolean);
  if (validIds.length === 0) return;

  const payload = {
    app_id: ONESIGNAL_APP_ID,
    include_player_ids: validIds,
    headings: { en: title || 'New Message' },
    contents: { en: body || 'You have a new message' },
    data: {
      chat_id: chatId,
      type: 'new_message',
      sender: senderName
    },
    url: `/chat/${chatId}`,
    android_channel_id: process.env.ONESIGNAL_ANDROID_CHANNEL_ID || undefined,
    priority: 10,
    ttl: 86400, // expire after 24h if undelivered
    ios_badge_type: 'Increase',
    ios_badge_count: 1
  };

  try {
    const response = await axios.post(
      'https://api.onesignal.com/notifications',
      payload,
      {
        headers: {
          'Authorization': `Key ${ONESIGNAL_REST_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 8000
      }
    );

    if (response.data?.errors?.length > 0) {
      console.warn('[OneSignal] Partial send errors:', response.data.errors);
    } else {
      console.log(`[OneSignal] Notification sent to ${validIds.length} device(s). id=${response.data.id}`);
    }

    return response.data;
  } catch (err) {
    const errMsg = err.response?.data || err.message;
    console.error('[OneSignal] Failed to send notification:', errMsg);
    // Don't rethrow — notification failure should never crash the message API
  }
}

module.exports = { sendPushNotification };
