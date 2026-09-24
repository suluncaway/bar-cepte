const CACHE_NAME = 'bar-cepte-v10';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './manifest.json'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Sadece GET ve http/https isteklerini yakala
  if (e.request.method !== 'GET' || !e.request.url.startsWith('http')) {
    return;
  }

  // CocktailDB istekleri
  if (e.request.url.includes('thecocktaildb.com')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response(JSON.stringify({ drinks: null }), {
        headers: { 'Content-Type': 'application/json' }
      }))
    );
    return;
  }

  // Stale-while-revalidate stratejisi
  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      const fetchPromise = fetch(e.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return cachedResponse || new Response('Offline', { status: 503, statusText: 'Offline' });
      });

      return cachedResponse || fetchPromise;
    })
  );
});
