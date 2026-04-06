// Firebase Messaging Service Worker
// This file runs in the background to receive push notifications when the app is closed.
// It MUST use the compat (v8-style) SDK via importScripts — ES modules are not supported in SW.

importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAOtUMkW1zGB1OJKpfUqU2QzHrcqJWxGZg",
  authDomain: "acoustic-arch-373523.firebaseapp.com",
  projectId: "acoustic-arch-373523",
  storageBucket: "acoustic-arch-373523.firebasestorage.app",
  messagingSenderId: "165706271744",
  appId: "1:165706271744:web:4d1f86939d13ddb2479ce5"
});

const messaging = firebase.messaging();

// Add manual background handler to enforce badge rendering as requested
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'New Message';
  
  // Extract notification options, ensuring badge explicitly exists
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body,
    icon: payload.notification?.icon || '/icons/icon-192.png',
    badge: payload.notification?.badge || '/icons/icon-192.png',
    data: { url: payload.data?.url || '/' },
  };

  // Sync the app icon badge (e.g. for PWA on Android/Desktop)
  if ('setAppBadge' in navigator) {
    const rawCount = payload.data?.unreadCount || payload.notification?.badgeCount;
    if (rawCount !== undefined) {
      const count = parseInt(rawCount);
      navigator.setAppBadge(count).catch(e => console.error('[SW] Badge error:', e));
    }
  }

  return self.registration.showNotification(notificationTitle, notificationOptions);
});
