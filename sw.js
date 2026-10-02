// dialed service worker — offline support
// App page: network-first (always fresh when online, cached copy when offline).
// Icons/manifest/fonts: stale-while-revalidate. version.json: always from the network.
const VERSION = '3.32';   // keep in step with APP_VERSION (js/app.js) and version.json — the tests check this
const CACHE = 'dialed-' + VERSION;
const CORE = ['./', './index.html', './manifest.json', './css/styles.css?v=' + VERSION,
  ...['data', 'core', 'coffee', 'views', 'tools', 'app'].map(n => './js/' + n + '.js?v=' + VERSION),
  './icon-any-192.png', './icon-any-512.png', './icon-maskable-192.png', './icon-maskable-512.png', './apple-touch-icon.png',
  './fonts/SpaceGrotesk-var.woff2', './fonts/SpaceMono-Regular.woff2', './fonts/SpaceMono-Bold.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('dialed-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)); }

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // The app itself: try the network (bypassing the HTTP cache), fall back to the saved copy
  if (req.mode === 'navigate' || (url.origin === location.origin && /\/(index\.html)?$/.test(url.pathname))) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await Promise.race([fetch(req, { cache: 'no-cache' }), timeout(5000)]);
        if (res && res.ok) cache.put('./index.html', res.clone());
        return res;
      } catch (err) {
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  // Version check must never come from a cache
  if (url.origin === location.origin && /\/version\.json$/.test(url.pathname)) return;

  // Same-origin static files: serve cached, refresh in the background
  if (url.origin === location.origin) {
    e.respondWith(caches.open(CACHE).then(async cache => {
      const hit = await cache.match(req);
      const net = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
  // Everything else (e.g. exchange-rate API) goes straight to the network
});

// Tapping a "score your brew" notification brings the app forward on the score sheet
self.addEventListener('notificationclick', e => {
  const id = e.notification.data && e.notification.data.id;
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const c = list.find(x => 'focus' in x);
    if (c) { c.postMessage({ type: 'score', id }); return c.focus(); }
    return self.clients.openWindow('./?score=' + encodeURIComponent(id || ''));
  }));
});
