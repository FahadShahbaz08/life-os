const CACHE = 'lifeos-shell-v2';
const SHELL_PATHS = ['/', '/login', '/tasks', '/finance'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(
        SHELL_PATHS.map(async (path) => {
          try {
            const res = await fetch(path, { credentials: 'same-origin' });
            if (res.ok || res.type === 'opaqueredirect') {
              await cache.put(path, res.clone());
            }
          } catch {
            // first install may be offline; ignore
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(req));
    return;
  }

  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(networkFirst(req, true));
    return;
  }

  event.respondWith(networkFirst(req, false));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow('/');
    })
  );
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) {
    void updateCache(req);
    return cached;
  }
  const res = await fetch(req);
  if (res.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(req, res.clone());
  }
  return res;
}

async function updateCache(req) {
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(req, res.clone());
    }
  } catch {
    // stay on cache
  }
}

async function networkFirst(req, isNav) {
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(req, res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    if (isNav) {
      const fallback = await fallbackDocument();
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline', headers: { 'Content-Type': 'text/plain' } });
  }
}

async function fallbackDocument() {
  const cache = await caches.open(CACHE);
  for (const path of SHELL_PATHS) {
    const hit = await cache.match(path);
    if (hit) return hit;
  }
  const keys = await cache.keys();
  for (const key of keys) {
    const url = new URL(key.url);
    if (url.pathname.startsWith('/_next')) continue;
    const res = await cache.match(key);
    if (res && (res.headers.get('content-type') || '').includes('text/html')) return res;
  }
  return undefined;
}
