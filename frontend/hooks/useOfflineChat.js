import { useState, useEffect, useCallback } from 'react';
import { 
  queueMessage, 
  getOutboxMessages, 
  removeFromOutbox 
} from '../utils/indexedDB';

const useOfflineChat = (conversationId, onSyncSuccess) => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      syncQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [conversationId]);

  const syncQueue = useCallback(async () => {
    if (!navigator.onLine) return;
    
    try {
      const outbox = await getOutboxMessages();
      const relevant = outbox.filter(m => m.conversationId === conversationId);
      
      if (relevant.length === 0) return;

      console.log(`[OFFLINE] Syncing ${relevant.length} messages for ${conversationId}`);
      
      for (const msg of relevant) {
        // We trigger the success callback which should handle the actual API/Socket send
        // The callback needs to return a promise that resolves when the send is confirmed
        try {
          if (onSyncSuccess) {
            await onSyncSuccess(msg);
            await removeFromOutbox(msg.tempId);
          }
        } catch (err) {
          console.error('[OFFLINE] Sync failed for message:', msg.tempId, err);
          break; // Stop syncing to preserve order if one fails
        }
      }
    } catch (err) {
      console.error('[OFFLINE] Queue sync error:', err);
    }
  }, [conversationId, onSyncSuccess]);

  const sendWithQueue = async (msgData, sendFn) => {
    // Save to outbox regardless (source of truth for offline messages)
    await queueMessage({ ...msgData, conversationId });

    if (!navigator.onLine) {
      console.log('[OFFLINE] Network down, registering background sync if available');
      
      // Attempt to register Background Sync
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.sync.register('sync-messages');
          console.log('[SW] Background sync registered: sync-messages');
        } catch (err) {
          console.warn('[SW] Sync registration failed:', err);
        }
      }
      
      return { status: 'queued' };
    }

    try {
      await sendFn(msgData);
      // If immediate send succeeds, remove from outbox
      await removeFromOutbox(msgData.tempId);
      return { status: 'sent' };
    } catch (err) {
      console.warn('[OFFLINE] Immediate send failed, relying on queue/sync');
      
      // Same logic as offline for retry
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.sync.register('sync-messages');
        } catch (sErr) { /* ignore */ }
      }
      
      return { status: 'queued' };
    }
  };

  return { isOnline, sendWithQueue, syncQueue };
};

export default useOfflineChat;
