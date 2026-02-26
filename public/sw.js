const CACHE_NAME = 'pos-inventory-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/login.html',
        '/css/styles.css',
        '/js/pages/main.js',
        '/pages/sales.html',
        '/pages/inventory.html',
        '/pages/sales-history.html',
        '/pages/reports.html',
        '/pages/settings.html',
        '/pages/entries.html',
        '/pages/clients.html',
        '/pages/categories.html',
        '/pages/admin.html',
      ]).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Nunca interceptar peticiones a la API (login, datos, etc.)
  if (event.request.url.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((r) => r || caches.match('/index.html'));
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});
