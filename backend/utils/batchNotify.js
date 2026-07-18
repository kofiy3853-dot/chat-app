/**
 * Batch notification utility — eliminates N+1 create+count patterns.
 *
 * Creates all notifications in a single INSERT, then fetches unread counts
 * in one grouped query, and emits socket events per recipient.
 *
 * @param {object} prisma - Prisma client
 * @param {object|null} io - Socket.io instance (optional, skips emit if null)
 * @param {Array<object>} notifications - Array of notification data objects
 *   Each: { type, title, content, recipientId, senderId?, messageId?, actionUrl? }
 * @returns {Promise<Map<string, number>>} Map of recipientId → unreadCount
 */
async function batchNotify(prisma, io, notifications) {
  if (!notifications || notifications.length === 0) return new Map();

  // 1. Batch insert all notifications in one query
  await prisma.notification.createMany({
    data: notifications.map(n => ({
      type: n.type || 'MESSAGE',
      title: n.title,
      content: n.content,
      recipientId: n.recipientId,
      senderId: n.senderId || null,
      messageId: n.messageId || null,
      actionUrl: n.actionUrl || null
    })),
    skipDuplicates: false
  });

  // 2. Fetch the just-created notifications with real IDs
  const recipientIds = [...new Set(notifications.map(n => n.recipientId))];
  let createdNotifications = [];
  try {
    createdNotifications = await prisma.notification.findMany({
      where: {
        recipientId: { in: recipientIds },
        createdAt: { gte: new Date(Date.now() - 5000) }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        recipientId: true,
        senderId: true,
        messageId: true,
        actionUrl: true,
        isRead: true,
        createdAt: true
      }
    });
  } catch (err) {
    console.error('[batchNotify] Failed to fetch created notifications:', err.message);
  }

  // 3. Batch fetch unread counts for all recipients in one grouped query
  let unreadMap = new Map();

  try {
    const placeholders = recipientIds.map((_, i) => `$${i + 1}`).join(',');
    const rows = await prisma.$queryRawUnsafe(
      `SELECT "recipientId", COUNT(*)::int AS "unreadCount"
       FROM "Notification"
       WHERE "recipientId" IN (${placeholders})
         AND "isRead" = false
       GROUP BY "recipientId"`,
      ...recipientIds
    );
    for (const row of rows) {
      unreadMap.set(row.recipientId, row.unreadCount);
    }
  } catch (err) {
    console.error('[batchNotify] Unread count query failed:', err.message);
    for (const id of recipientIds) {
      unreadMap.set(id, 0);
    }
  }

  // 4. Emit socket events per recipient with real DB IDs
  if (io) {
    // Group created notifications by recipient for efficient lookup
    const byRecipient = new Map();
    for (const n of createdNotifications) {
      if (!byRecipient.has(n.recipientId)) byRecipient.set(n.recipientId, []);
      byRecipient.get(n.recipientId).push(n);
    }

    for (const n of notifications) {
      const created = byRecipient.get(n.recipientId)?.shift();
      io.to(`user:${n.recipientId}`).emit('new-notification', {
        notification: created || {
          id: `batch-${Date.now()}-${n.recipientId}`,
          type: n.type || 'MESSAGE',
          title: n.title,
          content: n.content,
          recipientId: n.recipientId,
          senderId: n.senderId || null,
          messageId: n.messageId || null,
          actionUrl: n.actionUrl || null,
          isRead: false,
          createdAt: new Date()
        },
        unreadCount: unreadMap.get(n.recipientId) || 0
      });
    }
  }

  return unreadMap;
}

module.exports = { batchNotify };
