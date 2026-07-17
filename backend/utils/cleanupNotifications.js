const prisma = require('../prisma/client');

const NOTIFICATION_TTL_DAYS = 30;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // Run daily

/**
 * Delete notifications older than NOTIFICATION_TTL_DAYS.
 * Runs once at startup and then every 24 hours.
 */
async function cleanupOldNotifications() {
  try {
    const cutoff = new Date(Date.now() - NOTIFICATION_TTL_DAYS * 24 * 60 * 60 * 1000);
    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoff }
      }
    });
    if (result.count > 0) {
      console.log(`[CLEANUP] Deleted ${result.count} notifications older than ${NOTIFICATION_TTL_DAYS} days`);
    }
  } catch (err) {
    console.error('[CLEANUP] Notification cleanup failed:', err.message);
  }
}

function startNotificationCleanup() {
  // Run once at startup (after a short delay to let the server finish starting)
  setTimeout(cleanupOldNotifications, 10_000);
  // Then run every 24 hours
  setInterval(cleanupOldNotifications, CLEANUP_INTERVAL_MS);
}

module.exports = { startNotificationCleanup, cleanupOldNotifications };
