import { pushAPI } from './api';

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
const SAFARI_WEB_ID = "web.onesignal.auto.428d294a-5ce2-44bb-bee0-dec3149a5564";

export const initOneSignal = async (user) => {
  if (typeof window === 'undefined' || !ONESIGNAL_APP_ID) return;

  // 1. Setup Deferred Push (Modern v16 Method)
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  
  // Prevent duplicate logical calls inside our helper
  if (window._oneSignalInitialized) {
    console.log('OneSignal already initialized');
    return;
  }
  window._oneSignalInitialized = true;

  window.OneSignalDeferred.push(async (OneSignal) => {
    try {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        safari_web_id: SAFARI_WEB_ID,
        allowLocalhostAsSecureOrigin: true,
        notifyButton: {
          enable: true,
        },
      });

      if (user && user.id) {
        // Link user in OneSignal
        await OneSignal.login(user.id);
        
        // Save Player ID to backend
        const playerId = await OneSignal.getUserId();
        if (playerId) {
          try {
            await pushAPI.updateOneSignalId(playerId).catch(() => {});
            console.log('OneSignal ID synced');
          } catch (err) {}
        }
      }

      // Handle Notification Clicks
      OneSignal.Notifications.addEventListener('click', (event) => {
        const data = event.notification.additionalData;
        if (data && data.chat_id) {
          window.location.href = `/chat/${data.chat_id}`;
        }
      });
    } catch (err) {
      console.error('OneSignal v16 Init Error:', err);
    }
  });

};

export const requestOneSignalPermission = async () => {
    if (typeof window !== 'undefined' && window.OneSignal) {
        try {
            await window.OneSignal.showNativePrompt();
        } catch (err) {
            console.error('OneSignal permission prompt error:', err);
        }
    }
};
