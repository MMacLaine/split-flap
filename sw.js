// Split-Flap service worker: keeps a board running when the network drops.
//
// Network first, cache as fallback, for this app's own files only. Always fresh when
// online (so a new page never meets an old module, the mismatch that once stranded
// Tunnelbana on a loading screen), and the last good copy when offline. Live data
// (SL, Open-Meteo) is cross-origin and never touched here: the board shows its age.
const CACHE = 'split-flap-v1';
// Paths this worker answers for: the page it controls (its scope) and the folder the
// app's files live in, which on maclaine.se differs from the page (?assets=/split-flap/).
const SCOPE = new URL(self.registration.scope).pathname;
const ASSETS = new URL(location.href).searchParams.get('assets') || SCOPE.replace(/[^/]*$/, '');
const mine = p => p === SCOPE || p === SCOPE.replace(/\/$/, '') || p.startsWith(SCOPE.replace(/\/?$/, '/')) || p.startsWith(ASSETS);

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('split-flap-') && k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (!mine(url.pathname)) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch {
      return (await cache.match(req, { ignoreSearch: req.mode === 'navigate' })) || Response.error();
    }
  })());
});
