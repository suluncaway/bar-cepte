const CACHE_NAME = 'bar-cepte-v12';
const IMAGE_CACHE = 'bar-cepte-images-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './manifest.json',
  './cocktails.json'
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
        if (key !== CACHE_NAME && key !== IMAGE_CACHE) {
          return caches.delete(key);
        }
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

  const url = e.request.url;

  // 1. Görseller (CocktailDB kokteyl/malzeme resimleri) — Cache-First stratejisi
  if (url.includes('thecocktaildb.com/images/') || e.request.destination === 'image') {
    e.respondWith(
      caches.open(IMAGE_CACHE).then(async cache => {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        try {
          const res = await fetch(e.request);
          if (res && (res.status === 200 || res.type === 'opaque')) {
            cache.put(e.request, res.clone());
          }
          return res;
        } catch {
          return cached || new Response('', { status: 404 });
        }
      })
    );
    return;
  }

  // 2. CocktailDB JSON API istekleri
  if (url.includes('thecocktaildb.com')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response(JSON.stringify({ drinks: null }), {
        headers: { 'Content-Type': 'application/json' }
      }))
    );
    return;
  }

  // 3. Google Fonts (Yazı tipleri önbelleği)
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, networkResponse.clone()));
          }
          return networkResponse;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // 4. Diğer Statik Dosyalar — Stale-while-revalidate stratejisi
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
