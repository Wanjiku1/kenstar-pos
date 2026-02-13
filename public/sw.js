const CACHE_NAME = 'kenstar-v1.1.2'; // Incremented for the new strategy

const ASSETS_TO_CACHE = [
  '/terminal',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => 
          cache.add(url).catch(err => console.warn(`PWA: Cache failed for ${url}`))
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. DYNAMIC DATA (Supabase / API)
  // We NEVER cache these. The terminal/page.tsx handles the offline 
  // queueing for these automatically.
  if (url.hostname.includes('supabase.co') || request.method !== 'GET') {
    return event.respondWith(fetch(request));
  }

  // 2. APP SHELL & ICONS (Cache-First, Network-Fallback)
  // This ensures the Kenstar Terminal opens instantly even in Airplane Mode.
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        // Cache new static assets on the fly (like new fonts or images)
        if (networkResponse && networkResponse.status === 200 && url.origin === location.origin) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // If both fail and it's a page navigation, show the cached terminal
        if (request.mode === 'navigate') {
          return caches.match('/terminal');
        }
      });
    })
  );
});