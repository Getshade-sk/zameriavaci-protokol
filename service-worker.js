const CACHE_NAME = "zameranie-v1";
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./script.js",
  "./style.css",
  "./manifest.json",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://accounts.google.com/gsi/client"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request))
  );
});
