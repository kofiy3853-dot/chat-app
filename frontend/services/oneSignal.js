import OneSignal from 'react-onesignal';
import { userAPI, pushAPI } from './api';

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

export const initOneSignal = async (user) => {
  if (typeof window === 'undefined' || !ONESIGNAL_APP_ID) return;

  try {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true, // Only for development
      notifyButton: {
        enable: false, // We'll use our own button or prompt
      },
    });

    if (user && user.id) {
      // 1. Link user in OneSignal
      await OneSignal.login(user.id);
      
      // 2. Get Subscription ID (Player ID)
      const playerId = await OneSignal.getUserId();
      console.log('OneSignal Player ID:', playerId);

      if (playerId) {
        // 3. Save to backend
        try {
          await pushAPI.updateOneSignalId(playerId);
          console.log('OneSignal ID saved to backend');
        } catch (err) {
          console.error('Failed to save OneSignal ID to backend:', err);
        }
      }
    }

    // Handle Notification Clicks
    OneSignal.on('notificationClick', (event) => {
      console.log('OneSignal Notification Clicked:', event);
      if (event.notification.additionalData && event.notification.additionalData.chat_id) {
        const chatId = event.notification.additionalData.chat_id;
        window.location.href = `/chat/${chatId}`;
      }
    });

  } catch (err) {
    console.error('OneSignal Init Error:', err);
  }
};

export const requestOneSignalPermission = async () => {
  try {
    await OneSignal.showNativePrompt();
  } catch (err) {
    console.error('OneSignal permission prompt error:', err);
  }
};
