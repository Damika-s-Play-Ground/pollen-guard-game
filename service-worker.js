const CACHE_PREFIX = 'pollen-guard-shell-';
const APP_VERSION = 'c9df1816e0fb';
const CACHE_NAME = `${CACHE_PREFIX}${APP_VERSION}`;
const MANIFEST = './offline-assets.json';
const scopeUrl = new URL(self.registration.scope);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch(new URL(MANIFEST, scopeUrl), { cache: 'no-store' });
    if (!response.ok) throw new Error('Offline asset list is unavailable.');
    const files = await response.json();
    if (!Array.isArray(files) || files.length > 250 || files.some(file => typeof file !== 'string' || !file.startsWith('./'))) {
      throw new Error('Offline asset list is invalid.');
    }
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(files.map(file => new URL(file, scopeUrl).href));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'APPLY_UPDATE') self.skipWaiting();
  if (event.data?.type === 'CLEAR_GAME_CACHE') {
    event.waitUntil((async () => {
      for (const key of await caches.keys()) if (key.startsWith(CACHE_PREFIX)) await caches.delete(key);
      event.source?.postMessage({ type: 'GAME_CACHE_CLEARED' });
    })());
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== scopeUrl.origin || !url.href.startsWith(scopeUrl.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
      return response;
    } catch (error) {
      if (request.mode === 'navigate') return (await cache.match(new URL('./index.html', scopeUrl))) || Response.error();
      return Response.error();
    }
  })());
});
