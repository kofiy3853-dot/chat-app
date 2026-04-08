import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Check if Firebase config is properly set
const isFirebaseConfigured = Object.values(firebaseConfig).every(val => val);

let app;
let messaging;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (error) {
    console.warn('Firebase initialization failed:', error.message);
  }
}

/** FCM needs its own SW; your app may also register /sw.js — we try to attach to the messaging SW. */
async function getFirebaseMessagingServiceWorkerRegistration() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return undefined;

  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    const existing = regs.find((r) => {
      const url = (r.active || r.waiting || r.installing)?.scriptURL || '';
      return url.includes('sw.js');
    });
    if (existing) return existing;

    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return undefined;
  }
}

function isExpectedFcmFailure(error) {
  const name = error?.name || '';
  const msg = (error?.message || String(error)).toLowerCase();
  return (
    name === 'AbortError' ||
    msg.includes('push service not available') ||
    msg.includes('registration failed') ||
    msg.includes('not supported') ||
    msg.includes('permission denied')
  );
}

export const requestFirebaseNotificationPermission = async () => {
  try {
    if (!isFirebaseConfigured) {
      console.warn('Firebase is not configured. Skipping notification permission request.');
      return null;
    }

    if (!app) {
      console.warn('Firebase app not initialized.');
      return null;
    }

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
    if (!vapidKey) {
      console.warn(
        '[FCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing. Add it in .env.local (Firebase Console → Project settings → Cloud Messaging → Web Push certificates).'
      );
      return null;
    }

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      console.warn('[FCM] Push requires a secure context (HTTPS or localhost).');
      return null;
    }

    const supported = await isSupported();
    if (!supported) {
      console.warn("Firebase Messaging isn't supported in this browser.");
      return null;
    }

    messaging = getMessaging(app);

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied.');
      return null;
    }

    const serviceWorkerRegistration = await getFirebaseMessagingServiceWorkerRegistration();

    const token = await getToken(messaging, {
      vapidKey,
      ...(serviceWorkerRegistration ? { serviceWorkerRegistration } : {})
    });
    return token || null;
  } catch (error) {
    if (isExpectedFcmFailure(error)) {
      console.warn(
        '[FCM] Push token unavailable (browser/OS may block push, another service worker may own the page, or notifications are off). App works without push.',
        error?.message || error
      );
    } else {
      console.warn('[FCM] Unexpected error while getting token:', error?.message || error);
    }
    return null;
  }
};

export const onMessageListener = (callback) => {
  try {
    if (!isFirebaseConfigured || !app) {
      console.warn('Firebase not configured for message listening.');
      return () => {};
    }

    if (messaging) {
      return onMessage(messaging, callback);
    }
  } catch (e) {
    console.error('onMessageListener error', e);
  }
  return () => {};
};
