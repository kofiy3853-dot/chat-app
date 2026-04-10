# Fixing Push Notification Stability

The investigation revealed a critical `ReferenceError` in the backend sockets and potential service worker registration issues.

## 1. Backend: Fix `ReferenceError` in `chatSockets.js`
In the message handler, `totalUnreadCount` is used before it is defined. This causes the push notification logic to crash silently or throw an error that interrupts the message flow.

- **Action**: Move the unread count calculation above the `sendPushNotification` call.
- **Optimization**: Fetch all recipient FCM tokens once instead of once per recipient.

## 2. Backend: Consolidation and Robustness
- **Action**: Move `require('../utils/firebasePush')` to the top of the file or at least outside the loop.
- **Action**: Ensure `extraData` is always consistently stringified.

## 3. Frontend: Service Worker Reliability
- **Action**: Ensure the `manifest.json` has the correct `gcm_sender_id` (Already done).
- **Action**: Verify `firebase.js` uses the same project configuration as `sw.js`.

## 4. Environment: Credential Validation
- **Action**: Add startup logging to `firebaseAdmin.js` to confirm the project ID and service account email being used.
