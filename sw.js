const CACHE_NAME = 'bar-cepte-v39-shopping-portions';
const IMAGE_CACHE = 'bar-cepte-images-v2';
const ASSETS = ['./personal-bar.js', './personal-ui.js', './', './index.html', './privacy.html', './privacy.js', './style.css', './visual-refresh.css', './tailwind.css', './game.js',
    './security.js', './ui-bindings.js', './dynamic-ui.js', './support.js',
    './ads.js', './reserve.js', './auth.js', './firebase-config.js', './manifest.json', './cocktails.json', './icon.png', './editorial-ui.js', './editorial-cocktails.webp', './hero-cocktail-ambient.mp4'];
const SCOPE = new URL('./', self.location.href);
const allowedAssets = new Set(ASSETS.map(path => new URL(path, SCOPE).pathname));

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS.map(path => new Request(new URL(path, SCOPE), {cache:'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        for (const key of await caches.keys()) {
            if (key.startsWith('bar-cepte-') && key !== CACHE_NAME && key !== IMAGE_CACHE) await caches.delete(key);
        }
        await self.clients.claim();
    })());
});
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (url.origin === SCOPE.origin && allowedAssets.has(url.pathname)) {
        // App code is network-first so security fixes do not remain stuck in an old cache.
        event.respondWith((async () => {
            const cache = await caches.open(CACHE_NAME);
            try {
                const response = await fetch(event.request, {cache:'no-cache'});
                if (response.ok && !response.redirected) await cache.put(event.request, response.clone());
                return response;
            } catch {
                return await cache.match(event.request, { ignoreSearch: true }) ||
                    new Response('Çevrimdışı: Bu dosya henüz önbellekte değil.', { status: 503 });
            }
        })());
    } else if (url.protocol === 'https:' && url.hostname === 'www.thecocktaildb.com' &&
        url.pathname.startsWith('/images/')) {
        event.respondWith((async () => {
            const cache = await caches.open(IMAGE_CACHE);
            const saved = await cache.match(event.request);
            if (saved) return saved;
            try {
                const response = await fetch(event.request);
                if (response.ok || response.type === 'opaque') {
                    await cache.put(event.request, response.clone());
                    const keys = await cache.keys();
                    for (const key of keys.slice(0, Math.max(0, keys.length - 150))) await cache.delete(key);
                }
                return response;
            } catch { return new Response('', { status: 404 }); }
        })());
    }
    // Payment pages, API responses and unrelated same-origin files are never cached.
});
