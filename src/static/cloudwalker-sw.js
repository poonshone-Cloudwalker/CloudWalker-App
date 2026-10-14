/* CloudWalker service worker: caches the app shell so the app opens offline. Serve this file next to the app's HTML. */
const CACHE = 'cloudwalker-v09-shell-1';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('cloudwalker-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('message', e => { const d = e.data || {}; if (d.type === 'cache-shell' && typeof d.url === 'string') e.waitUntil(caches.open(CACHE).then(c => c.add(new Request(d.url, { cache: 'reload' }))).catch(() => {})); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== self.location.origin) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); } return res; })
      .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.open(CACHE).then(c => c.keys().then(ks => ks.length ? c.match(ks[0]) : Response.error())))));
    return;
  }
  e.respondWith(caches.match(r).then(m => { const net = fetch(r).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); } return res; }).catch(() => m); return m || net; }));
});
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => { const c = cs[0]; if (c) { c.focus(); return c.navigate ? c.navigate(c.url.split('#')[0] + '#/retention').catch(() => {}) : null; } return self.clients.openWindow(self.registration.scope); })); });
