const webpush = require('web-push');

// Lazy initializer — only configure web-push when the VAPID keys are available.
// Prevents a crash on startup if env vars haven't been set on the host yet.
function getWebPush() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('[WebPush] VAPID keys not set. Push notifications are disabled.');
    return null;
  }
  webpush.setVapidDetails(
    'mailto:support@campuschat.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  return webpush;
}

module.exports = { getWebPush };
