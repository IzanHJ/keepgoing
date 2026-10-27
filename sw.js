/* KeepGoing — service worker: funciona sin conexión cuando la app se sirve por https */
const CACHE = 'keepgoing-v35';
const RANKS = ['iniciado', 'aprendiz', 'discipulo', 'experto', 'elite', 'maestro', 'ascendente', 'supremo', 'mitico', 'trascendente'];
const SHELL = ['./', './index.html', './css/app.css', './js/i18n.js', './js/i18n-plus.js', './js/i18n-social.js', './js/i18n-contract.js', './js/i18n-profile.js', './js/i18n-caprice.js', './js/caprice.js', './js/ledger.js', './js/debts.js', './js/vault.js', './js/vault-device.js', './js/groups.js', './js/i18n-ledger.js', './js/sound.js', './js/i18n-polish.js', './js/i18n-groups.js', './js/i18n-v12.js', './js/i18n-v13.js', './js/i18n-v14.js', './js/i18n-v15.js', './js/i18n-v16.js', './js/i18n-calc.js', './js/pets.js', './js/ledger-export.js', './js/calc.js', './js/pdf.js', './js/turns.js', './js/turns-pdf.js', './js/i18n-cal.js', './js/bankcsv.js', './js/i18n-v21.js', './js/i18n-v22.js', './js/i18n-v23.js', './js/i18n-v24.js', './js/i18n-v25.js', './js/i18n-news.js', './js/fx.js', './js/worth.js', './js/plan.js', './js/i18n-plan.js', './js/app.js', './manifest.webmanifest', './icons/icon.svg', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
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
  // Solo la propia app y las fuentes; las peticiones a la nube (Supabase) van directas
  const url = new URL(e.request.url);
  if (url.origin !== location.origin && !url.hostname.includes('fonts.g')) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then(res => {
      const copy = res.clone();
      if (res.ok && (new URL(e.request.url).origin === location.origin || e.request.url.includes('fonts.g'))) caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});

// Recordatorios push
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: 'KeepGoing', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'KeepGoing', {
    body: d.body || '', tag: d.tag || 'keepgoing', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url: d.url || './' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow(url);
  }));
});
