importScripts('https://www.gstatic.com/firebasejs/11.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAOtUMkW1zGB1OJKpfUqU2QzHrcqJWxGZg",
  authDomain: "acoustic-arch-373523.firebaseapp.com",
  projectId: "acoustic-arch-373523",
  storageBucket: "acoustic-arch-373523.firebasestorage.app",
  messagingSenderId: "165706271744",
  appId: "1:165706271744:web:4d1f86939d13ddb2479ce5"
});

const messaging = firebase.messaging();

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("app-cache").then(cache => {
      console.log("[SW] Pre-caching core assets with credentials...");
      const assets = [
        "/",
        "/manifest.json",
        "/icons/icon-192.png",
        "/favicon.ico"
      ];
      
      return Promise.all(
        assets.map(url => 
          fetch(url, { credentials: 'include' })
            .then(response => {
              if (response.ok) return cache.put(url, response);
              throw new Error(`Failed to fetch ${url}: ${response.status}`);
            })
            .catch(err => console.warn(`[SW] Pre-cache error for ${url}:`, err))
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const cacheWhitelist = ["app-cache", "dynamic-cache"];
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheWhitelist.includes(cacheName)) {
              console.log("[SW] Deleting stale cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener("fetch", (event) => {
  // Only intercept GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // --- OFFLINE NAVIGATION SUPPORT ---
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // If the network fails, serve the cached root (our App Shell)
          return caches.match("/"); 
        })
    );
    return;
  }

  // Cache-First with Network Update for static assets (images, styles, local scripts)
  if (url.origin === self.origin && (url.pathname.startsWith('/_next/static/') || url.pathname.includes('/icons/') || url.pathname.includes('/sounds/'))) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open("app-cache").then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Ignore Socket.io, API calls, and Next.js HMR
  if (url.pathname.includes('/socket.io/')) return;
  if (url.pathname.includes('/api/')) return;
  if (url.pathname.includes('/_next/webpack-hmr')) return;

  // Ignore range requests (audio, video) to avoid 206 Partial Content caching errors
  if (event.request.headers.has('range')) return;

  // Only aggressively cache specific static assets (images, Next.js static chunks)
  const isStaticAsset = url.pathname.includes('/_next/static/') || 
                        url.pathname.includes('/icons/') || 
                        url.pathname.match(/\.(png|jpg|jpeg|svg|gif|woff2?|css|js)$/);

  // Bypass SERVICE WORKER for high-load media assets and partial stream content (audio/video)
  // This prevents ERR_CACHE_OPERATION_NOT_SUPPORTED and 408 Timeouts
  const isExcludedMedia = (url.pathname.includes('/uploads/') && !url.pathname.match(/\.(png|jpg|jpeg|webp)$/i)) || 
                          url.pathname.includes('/sounds/') ||
                          url.pathname.endsWith('.mp3');

  if (!isStaticAsset || isExcludedMedia) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Return cached asset if found
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise fetch from network and catch potential errors safely
      return fetch(event.request)
        .then(res => {
          // Only cache valid 200 OK responses
          if (!res || res.status !== 200 || res.type === 'opaque') {
            return res;
          }
          
          const clone = res.clone();
          caches.open("dynamic-cache").then(cache => {
            // Safely put in cache
            cache.put(event.request, clone).catch(err => console.error("Cache put error:", err));
          });
          return res;
        })
        .catch(err => {
          console.error("Fetch failed for static asset:", event.request.url, err);
          // Return a safe fallback rather than crashing
          return new Response("", { status: 408, statusText: "Request Timeout" });
        });
    })
  );
});

// ─── BACKGROUND PUSH NOTIFICATIONS ──────────────────────────────────────────
// Handled by Firebase Messaging for data-only messages. 
// Firebase automatically handles 'notification' fields.
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Received background message:', payload);

  const title = payload.notification?.title || payload.data?.title || 'Campus Chat';
  const body = payload.notification?.body || payload.data?.body || 'New message received!';
  const url = payload.data?.url || '/';
  const unreadCount = parseInt(payload.data?.unreadCount || 1);

  const options = {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    vibrate: [200, 100, 200],
    tag: url,
    renotify: true,
    data: { url },
    actions: [
      { action: 'open', title: '💬 Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  // Skip showing notification if a client is already focused
  return clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    const isVisible = clients.some(client => client.visibilityState === 'visible' && client.focused);
    
    // We only show manual notification for 'data' payloads that don't have 'notification'
    // because Firebase SDK handles the 'notification' payload automatically.
    const tasks = [];
    
    if (!isVisible && !payload.notification) {
      tasks.push(self.registration.showNotification(title, options));
    }

    if ('setAppBadge' in navigator) {
      tasks.push(navigator.setAppBadge(unreadCount).catch(() => {}));
    }
    
    return Promise.all(tasks);
  });
});

// ─── NOTIFICATION CLICK ───────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Handle action buttons
  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // If app is already open in some tab, navigate it and focus
      for (const client of windowClients) {
        if ('navigate' in client) {
          return client.navigate(urlToOpen).then(c => c && c.focus());
        }
      }
      // Otherwise open a fresh tab pointing to the chat room
      return clients.openWindow(urlToOpen);
    })
  );
});

// ─── BACKGROUND SYNC ──────────────────────────────────────────────────────────
// Handles deferred message sending when connectivity returns
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

/**
 * Iterates through the 'outbox' in IndexedDB and attempts to POST pending messages.
 */
async function syncMessages() {
  try {
    const db = await openIndexedDB();
    const outbox = await getAllFromStore(db, 'outbox');
    
    if (outbox.length === 0) return;

    for (const msg of outbox) {
      if (msg.fileUrl) continue; // Attachments still require manual handling in foreground for now

      try {
        // We need the auth token which should be stored in 'meta' or similar store
        const authData = await getFromStore(db, 'auth', 'current');
        if (!authData?.token) {
           console.warn('[SW] No auth token found for background sync');
           continue; 
        }

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
          console.log('[SW] Background sync successful for:', msg.tempId);
        }
      } catch (err) {
        console.error('[SW] Message sync failed:', err);
        // We don't throw here to allow other messages to try, 
        // but if it's a network error, the browser will retry the whole 'sync' event anyway.
      }
    }
  } catch (err) {
    console.error('[SW] Sync process error:', err);
  }
}

// ─── INDEXEDDB HELPERS (RAW API) ──────────────────────────────────────────────
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('campus_chat_db', 1);
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
