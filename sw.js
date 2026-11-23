// Service Worker: caché de la app (cache-first) y de la API del clima (network-first)
const V = 'fitwalk-v1';
const ASSETS = ['./', './index.html', './style.css', './app.js', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))));
  self.clients.claim();
});
const save = (req, res) => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(req, cp)); } return res; };
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  if (new URL(r.url).origin !== location.origin) {           // API externa: red primero, caché si falla
    e.respondWith(fetch(r).then(res => save(r, res)).catch(() => caches.match(r)));
    return;
  }
  e.respondWith(caches.match(r).then(hit => hit ||           // archivos propios: caché primero
    fetch(r).then(res => save(r, res)).catch(() => caches.match('./index.html'))));
});
