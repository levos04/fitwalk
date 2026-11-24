// Service Worker: caché de la app (cache-first), de la API (network-first) y de teselas del mapa
const V = 'fitwalk-v2', TILES = 'fitwalk-tiles', MAX_TILES = 400;
const ASSETS = ['./', './index.html', './style.css', './app.js', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png',
  './lib/leaflet/leaflet.js', './lib/leaflet/leaflet.css',
  './lib/leaflet/images/marker-icon.png', './lib/leaflet/images/marker-icon-2x.png',
  './lib/leaflet/images/marker-shadow.png', './lib/leaflet/images/layers.png', './lib/leaflet/images/layers-2x.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== TILES).map(k => caches.delete(k)))));
  self.clients.claim();
});
const save = (req, res) => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(req, cp)); } return res; };
async function trim(c) { // conserva solo las últimas MAX_TILES teselas
  const ks = await c.keys();
  if (ks.length > MAX_TILES) await Promise.all(ks.slice(0, ks.length - MAX_TILES).map(k => c.delete(k)));
}
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.hostname === 'tile.openstreetmap.org') {              // teselas: caché primero, se guardan las que se ven
    e.respondWith(caches.open(TILES).then(async c => {
      const hit = await c.match(r); if (hit) return hit;
      try { const res = await fetch(r); if (res.ok) { await c.put(r, res.clone()); trim(c); } return res; }
      catch { return Response.error(); }
    }));
    return;
  }
  if (u.origin !== location.origin) {                         // API externa: red primero, caché si falla
    e.respondWith(fetch(r).then(res => save(r, res)).catch(() => caches.match(r)));
    return;
  }
  e.respondWith(caches.match(r).then(hit => hit ||            // archivos propios: caché primero
    fetch(r).then(res => save(r, res)).catch(() => caches.match('./index.html'))));
});
