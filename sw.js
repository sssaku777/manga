/* Manga Manager PWA - Service Worker (iOS friendly) */
const CACHE_NAME = 'manga-pwa-ios-v1';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/manifest.webmanifest',
  '/assets/cover-placeholder.png',
  '/icons/icon-180.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/idb-keyval@6/dist/idb-keyval.iife.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Navigation: Network first, fallback to cache (helps with updates)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put('/', copy)).catch(()=>{});
        return res;
      }).catch(() => caches.match('/') || caches.match('/index.html'))
    );
    return;
  }

  // Static/resources: Cache first
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(()=>{});
      return res;
    }).catch(() => cached))
  );
});