// Firebase Cloud Messaging Service Worker (compat SDK)
// Handles background push notifications with sound and vibration.
// Data-only payloads force this handler to fire, giving us full control.

importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAOtUMkW1zGB1OJKpfUqU2QzHrcqJWxGZg",
  authDomain: "acoustic-arch-373523.firebaseapp.com",
  projectId: "acoustic-arch-373523",
  storageBucket: "acoustic-arch-373523.firebasestorage.app",
  messagingSenderId: "165706271744",
  appId: "1:165706271744:web:4d1f86939d13ddb2479ce5"
});

const messaging = firebase.messaging();

// Handle background messages — showNotification() plays default browser sound automatically.
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM-SW] Background message received:', payload);

  const title = payload.data?.title || 'Campus Hub';
  const body = payload.data?.body || 'New message received!';
  const url = payload.data?.url || '/';

  const options = {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    vibrate: [0, 300, 200, 300, 200, 300],
    tag: url,
    renotify: true,
    requireInteraction: true,
    data: { url },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  // showNotification() plays the browser/OS default notification sound.
  // Do NOT set silent:true — that would suppress the sound.
  return self.registration.showNotification(title, options);
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if ('navigate' in client) {
          return client.navigate(urlToOpen).then(c => c && c.focus());
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
});
