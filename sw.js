/* KeepGoing — service worker: funciona sin conexión cuando la app se sirve por https */
const CACHE = 'keepgoing-v4';
const RANKS = ['iniciado', 'aprendiz', 'discipulo', 'experto', 'elite', 'maestro', 'ascendente', 'supremo', 'mitico', 'trascendente'];
const SHELL = ['./', './index.html', './css/app.css', './js/i18n.js', './js/i18n-plus.js', './js/app.js', './manifest.webmanifest', './icons/icon.svg', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
  ...RANKS.flatMap(r => [`./cards/${r}-front.jpg`, `./cards/${r}-back.jpg`])];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Red primero (para recibir actualizaciones), caché si no hay conexión
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      if (res.ok && (new URL(e.request.url).origin === location.origin || e.request.url.includes('fonts.g'))) caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
