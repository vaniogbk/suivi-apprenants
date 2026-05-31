const CACHE_NAME = 'eductrack-v11';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/register.html',
  '/trainer.html',
  '/css/styles.css',
  '/css/components.css',
  '/css/responsive.css',
  '/js/ui.js',
  '/js/auth.js',
  '/js/data.js',
  '/js/students.js',
  '/js/attendance.js',
  '/js/statistics.js',
  '/js/formations.js',
  '/js/formateurs.js',
  '/js/pdf-import.js',
  '/js/exports.js',
  '/js/trainer.js',
  '/js/pwa-install.js',
  '/js/app.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/manifest.json',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API: réseau en priorité, fallback silencieux (data.js gère le localStorage)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // Statique: cache en priorité
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
