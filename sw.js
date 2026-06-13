const CACHE_NAME = 'ngerubik-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './game.js',
  'https://unpkg.com/three@0.128.0/build/three.min.js'
];

// Install Service Worker and Cache Assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Cache and Return Requests
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});
