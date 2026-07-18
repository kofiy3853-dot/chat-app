// App Service Worker — handles caching, offline support, background sync, AND Firebase push.
// Single SW to avoid conflicts between multiple service workers.

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

// ─── FIREBASE PUSH: onBackgroundMessage handles display for PWA + browser ─
// PWA on Android needs showNotification() to trigger sound and popup.
// Desktop browser uses the notification field in FCM payload, but this
// handler ensures PWA gets the same behavior.
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background push received:', payload);

  const title = payload.data?.title || payload.notification?.title || 'Campus Hub';
  const body = payload.data?.body || payload.notification?.body || 'New message received!';
  const url = payload.data?.url || payload.notification?.click_action || '/';

  // showNotification() triggers default OS notification sound and screen wake.
  // iOS PWA does NOT support vibrate, requireInteraction, or actions.
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const options = {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: url,
    renotify: true,
    data: { url }
  };
  // Android/Chrome supports these, iOS ignores them (but don't include to be safe)
  if (!isIOS) {
    options.vibrate = [0, 300, 200, 300, 200, 300];
    options.requireInteraction = true;
    options.actions = [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ];
  }
  return self.registration.showNotification(title, options);
});

// ─── NOTIFICATION CLICK ───────────────────────────────────────────────────────
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

// ─── CACHING ──────────────────────────────────────────────────────────────────
const CACHE_VERSION = 'v4';
const APP_CACHE = `app-cache-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-cache-${CACHE_VERSION}`;
const PAGE_CACHE = `page-cache-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/favicon.ico'
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then(cache => {
      return cache.addAll(PRECACHE_URLS).catch(err => {
        console.warn("[SW] Pre-cache partial failure:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const validCaches = [APP_CACHE, DYNAMIC_CACHE, PAGE_CACHE];
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(keys =>
        Promise.all(
          keys.filter(k => !validCaches.includes(k)).map(k => caches.delete(k))
        )
      )
    ])
  );
});

// ─── FETCH STRATEGY ───────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(PAGE_CACHE).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then(cached => cached || caches.match("/"));
        })
    );
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(APP_CACHE).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  if (url.origin === self.origin && (
    url.pathname.includes('/icons/') ||
    url.pathname.includes('/sounds/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|woff2?|css|js)$/)
  )) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(APP_CACHE).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  if (url.pathname.includes('/api/') || url.pathname.includes('/socket.io/')) return;
  if (url.pathname.includes('/_next/webpack-hmr')) return;
  if (event.request.headers.has('range')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// ─── BACKGROUND SYNC ──────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  try {
    const db = await openIndexedDB();
    const outbox = await getAllFromStore(db, 'outbox');
    if (outbox.length === 0) return;

    for (const msg of outbox) {
      if (msg.fileUrl) continue;
      try {
        const authData = await getFromStore(db, 'auth', 'current');
        if (!authData?.token) continue;

        const response = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authData.token}`
          },
          body: JSON.stringify({
            conversationId: msg.conversationId,
            content: msg.content,
            tempId: msg.tempId,
            replyToId: msg.replyToId
          })
        });

        if (response.ok) {
          await deleteFromStore(db, 'outbox', msg.tempId);
        }
      } catch (err) {
        console.error('[SW] Message sync failed:', err);
      }
    }
  } catch (err) {
    console.error('[SW] Sync process error:', err);
  }
}

// ─── INDEXEDDB HELPERS ────────────────────────────────────────────────────────
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('campus_chat_db', 2);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getFromStore(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deleteFromStore(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
