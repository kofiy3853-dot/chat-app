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
  // Only cache GET requests (don't cache POST/PUT/DELETE for API calls)
  if (event.request.method !== "GET") return;

  // Don't intercept Socket.io WebSocket connections
  if (event.request.url.includes('/socket.io/')) return;
  // Don't intercept API calls to prevent caching dynamic data indefinitely
  if (event.request.url.includes('/api/')) return;

  // Don't intercept Range requests (like audio/video partial content) to avoid 206 errors
  if (event.request.headers.has('range')) return;

  event.respondWith(
    fetch(event.request)
      .then(res => {
        // Only cache perfectly valid 200 OK responses to prevent 206 Audio crashes
        if (!res || res.status !== 200 || res.type === 'opaque') {
          return res;
        }
        
        const clone = res.clone();
        caches.open("dynamic-cache").then(cache => {
          cache.put(event.request, clone);
        });
        return res;
      })
      .catch(() => {
        return caches.match(event.request).then(response => {
          if (response) return response;
          // Fallback mechanism could return a cached offline page if implemented
          // But effectively we must return a valid Response value otherwise it throws a TypeError
          return Response.error();
        });
      })
  );
});

// Listen to Supabase/Backend push notifications
self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'You have a new message!',
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      vibrate: [100, 50, 100],
      data: { url: data.url || '/' }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Campus Chat', options)
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data.url;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // If so, just focus it
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
