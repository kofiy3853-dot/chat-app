import { pushAPI } from './api';
import { Capacitor } from '@capacitor/core';

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
const SAFARI_WEB_ID = "web.onesignal.auto.428d294a-5ce2-44bb-bee0-dec3149a5564";

export const initOneSignal = async (user) => {
  if (typeof window === 'undefined' || !ONESIGNAL_APP_ID) return;

  // --- NATIVE MOBILE PLATFORMS (Capacitor) ---
  if (Capacitor.isNativePlatform()) {
    try {
      const OneSignal = require('onesignal-cordova-plugin');
      
      OneSignal.initialize(ONESIGNAL_APP_ID);
      
      if (user && user.id) {
          OneSignal.login(String(user.id));
          
          // Sync Push Subscription ID to backend
          OneSignal.User.getPushSubscriptionId((id) => {
              if (id) {
                  pushAPI.updateOneSignalId(id).catch(() => {});
                  console.log('OneSignal Native ID synced:', id);
              }
          });
      }

      // Handle notification clicks for mobile
      OneSignal.Notifications.addEventListener('click', (event) => {
          const data = event.notification.additionalData;
          if (data && data.chat_id) {
              window.location.href = `/chat/${data.chat_id}`;
          }
      });

      return; // Stop here for native
    } catch (err) {
      console.error('OneSignal Native Error:', err);
    }
  }

  // --- WEB BROWSER PLATFORMS (v16) ---
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  
  if (window._oneSignalInitialized) return;
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
        await OneSignal.login(String(user.id));
        const playerId = OneSignal.User.PushSubscription.id;
        if (playerId) {
          await pushAPI.updateOneSignalId(playerId).catch(() => {});
          console.log('OneSignal Web ID synced');
        }
      }

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
    if (typeof window === 'undefined') return;

    if (Capacitor.isNativePlatform()) {
        try {
            const OneSignal = require('onesignal-cordova-plugin');
            OneSignal.Notifications.requestPermission(true);
        } catch (err) {}
    } else if (window.OneSignal) {
        try {
            await window.OneSignal.showNativePrompt();
        } catch (err) {}
    }
};
