// Service Worker: hält die zwei Programme offline bereit. Seiten: erst Netz, sonst Zwischenspeicher.
const NAME = 'guthabenkasse-2.6.0';
const DATEIEN = ['guthabenkasse-terminal.html','guthabenkasse-verkauf.html','guthabenkasse-anzeige.html','manifest-anzeige.webmanifest','manifest-terminal.webmanifest','manifest-verkauf.webmanifest','icon-192.png','icon-512.png','icon-verkauf-192.png','icon-verkauf-512.png','favicon.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(NAME).then(c => c.addAll(DATEIEN).catch(() => {})).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // Ablage (Google) nie zwischenspeichern
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const k = r.clone(); caches.open(NAME).then(c => c.put(e.request, k)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});
