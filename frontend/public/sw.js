// App Service Worker — handles caching, offline support, and background sync.
// Firebase Cloud Messaging is handled separately by firebase-messaging-sw.js.

const CACHE_VERSION = 'v2';
const APP_CACHE = `app-cache-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-cache-${CACHE_VERSION}`;
const PAGE_CACHE = `page-cache-${CACHE_VERSION}`;

// Core assets to pre-cache on install
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
      console.log("[SW] Pre-caching core assets");
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

// --- Fetch Strategy ---
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // 1. Navigation requests: Network-first, fall back to cached page shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the page for offline use
          const clone = response.clone();
          caches.open(PAGE_CACHE).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Try cached version of this exact page
          return caches.match(event.request).then(cached => {
            if (cached) return cached;
            // Fall back to app shell (index page)
            return caches.match("/");
          });
        })
    );
    return;
  }

  // 2. Next.js static chunks: Cache-first (these are versioned/hashed)
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

  // 3. Static assets (icons, sounds, images): Cache-first
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

  // 4. API calls: Network-only (socket handles realtime)
  if (url.pathname.includes('/api/')) return;

  // 5. Socket.io: Network-only
  if (url.pathname.includes('/socket.io/')) return;

  // 6. HMR: Skip
  if (url.pathname.includes('/_next/webpack-hmr')) return;

  // 7. Range requests: Skip
  if (event.request.headers.has('range')) return;

  // 8. Everything else: Stale-while-revalidate
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

// --- Background Push (handled by firebase-messaging-sw.js) ---

// --- Background Sync for offline messages ---
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

// --- IndexedDB Helpers ---
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
