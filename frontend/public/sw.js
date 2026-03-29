self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("app-cache").then(cache => {
      return cache.addAll([
        "/",
        "/manifest.json"
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Only intercept GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Ignore navigation requests (HTML pages) to prevent stale content & 404s on dynamic Next.js routes
  if (event.request.mode === 'navigate') return;

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

  // Bypass SERVICE WORKER for high-load media assets (Prevents 408 Timeout on large/slow Render instance images)
  const isUploadMedia = url.pathname.includes('/uploads/');

  if (!isStaticAsset || isUploadMedia) return;

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
// This fires when the server sends a push, even if the app/browser is closed.
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || 'Campus Chat';
  const options = {
    body: data.body || 'You have a new message!',
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",   // Small monochrome icon shown on Android status bar
    vibrate: [200, 100, 200],
    tag: data.url || 'campus-chat', // Collapse duplicate notifications from same chat
    renotify: true,                 // Still vibrate/ring even if tag already exists
    requireInteraction: false,      // Auto-dismiss after OS timeout
    data: { url: data.url || '/' },
    actions: [
      { action: 'reply', title: '💬 Open Chat' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    // Update the app badge counter with unread count if supported
    Promise.all([
      self.registration.showNotification(title, options),
      // Badge API: Shows the unread count dot on the app icon (Android/Chrome)
      (navigator.setAppBadge || (() => Promise.resolve()))
        .call(navigator, data.unreadCount || 1)
        .catch(() => {})
    ])
  );
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

// ─── PUSH SUBSCRIPTION CHANGE ────────────────────────────────────────────────
// Fires when the browser rotates the push subscription key (rare but important)
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then(async (subscription) => {
        // Re-send the new subscription to the server
        const token = await clients.matchAll({ type: 'window' })
          .then(cls => cls[0]?.postMessage({ type: 'GET_TOKEN' }));
        return fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription.toJSON())
        });
      })
  );
});
