const CACHE = 'gameseeker-v1';
const STATIC_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/robots.txt',
  '/feed.xml',
  '/sitemap.xml',
  '/assets/logo.svg',
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(STATIC_URLS).catch(() => {})
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  return cached || fetch(request);
}

async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  const path = url.pathname;

  if (path === '/' || path === '/index.html' || path === '/manifest.json' || path.startsWith('/assets/') || path === '/robots.txt' || path === '/feed.xml' || path === '/sitemap.xml') {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  if (path.endsWith('.json')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
