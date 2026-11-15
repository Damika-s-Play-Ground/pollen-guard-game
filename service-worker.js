const CACHE_PREFIX = 'pollen-guard-shell-';
const APP_VERSION = '11624f8c8e68';
const CACHE_NAME = `${CACHE_PREFIX}v2-${APP_VERSION}`;
const MANIFEST = './offline-assets.json';
const scopeUrl = new URL(self.registration.scope);
const releaseUrl = resource => {
  const url = new URL(resource, scopeUrl);
  url.searchParams.set('__pollen_version', APP_VERSION);
  return url;
};

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch(releaseUrl(MANIFEST), { cache: 'no-store' });
    if (!response.ok) throw new Error('Offline asset list is unavailable.');
    const files = await response.json();
    if (!Array.isArray(files) || files.length > 250 || files.some(file => typeof file !== 'string' || !file.startsWith('./'))) {
      throw new Error('Offline asset list is invalid.');
    }
    const cache = await caches.open(CACHE_NAME);
    // Fetch a release-specific URL to avoid mixing CDN responses across deployments.
    // Store under canonical URLs so relative imports and offline navigation still work.
    await Promise.all(files.map(async file => {
      const resource = new URL(file, scopeUrl);
      const response = await fetch(releaseUrl(resource), { cache: 'no-store' });
      if (!response.ok) throw new Error(`Game file is unavailable: ${file}`);
      await cache.put(resource.href, response);
    }));
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
