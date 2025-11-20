const CACHE_NAME = 'robot-sim-cache-v1';

// Install event: Skip waiting to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event: Claim clients to control uncontrolled pages immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Fetch event: Stale-While-Revalidate strategy
self.addEventListener('fetch', (event) => {
  // We only want to cache GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        // Fetch from network to update cache in background
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            // Check if valid response
            if (networkResponse && networkResponse.status === 200) {
              // Clone response because it can only be consumed once
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch((err) => {
            // Network failed (offline)
            // If we have no cached response, we are in trouble, but hopefully we do.
            console.log('Network fetch failed, falling back to cache if available', err);
          });

        // Return cached response immediately if available, otherwise wait for network
        return cachedResponse || fetchPromise;
      });
    })
  );
});