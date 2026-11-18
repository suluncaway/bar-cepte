const CACHE_NAME = 'bar-cepte-v84-home';
const IMAGE_CACHE = 'bar-cepte-images-v2';
const ASSETS = ['./business-flow.js', './landing.html', './landing.css', './business-reports.js', './business.html', './business.css', './business-rules.js', './business-ui.js', './inventory.js', './personal-bar.js', './personal-ui.js', './', './index.html', './privacy.html', './privacy.js', './style.css', './visual-refresh.css', './vivid.css', './icons.css', './tailwind.css', './game.js',
    './security.js', './ui-bindings.js', './dynamic-ui.js', './support.js',
    './ads.js', './reserve.js', './ai-assistant-ui.js', './tutorial.js', './theme.js', './auth.js', './firebase-config.js', './manifest.json', './cocktails.json', './icon.png', './icon-192.png', './icon-512.png', './icon-512-maskable.png', './apple-touch-icon.png', './favicon.svg', './favicon-32.png', './editorial-ui.js', './editorial-cocktails.webp'];
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
            // Storage may be unavailable or full; it must never discard a valid network response.
            const cache = await caches.open(CACHE_NAME).catch(() => null);
            const saved = async () => cache && await cache.match(event.request, { ignoreSearch: true }).catch(() => null);
            try {
                const response = await fetch(event.request, {cache:'no-cache'});
                if (response.status >= 500) return await saved() || response;
                if (cache && response.ok && response.status !== 206 && !response.redirected && !event.request.headers.has('range')) {
                    await cache.put(event.request, response.clone()).catch(() => {});
                }
                return response;
            } catch {
                return await saved() ||
                    new Response('Çevrimdışı: Bu dosya henüz önbellekte değil.', { status: 503 });
            }
        })());
    } else if (url.protocol === 'https:' && ((url.hostname === 'www.thecocktaildb.com' && url.pathname.startsWith('/images/')) ||
        (url.hostname === 'barcepte.com.tr' && url.pathname.startsWith('/img/')))) {
        event.respondWith((async () => {
            const cache = await caches.open(IMAGE_CACHE).catch(() => null);
            const saved = cache && await cache.match(event.request).catch(() => null);
            if (saved) return saved;
            try {
                const response = await fetch(event.request);
                if (cache && (response.ok || response.type === 'opaque')) {
                    try {
                        await cache.put(event.request, response.clone());
                        const keys = await cache.keys();
                        for (const key of keys.slice(0, Math.max(0, keys.length - 150))) await cache.delete(key);
                    } catch { /* Cache quota/availability does not invalidate the downloaded image. */ }
                }
                return response;
            } catch { return new Response('', { status: 404 }); }
        })());
    }
    // Payment pages, API responses and unrelated same-origin files are never cached.
});
