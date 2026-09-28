// Split-Flap service worker: keeps a board running when the network drops.
//
// Network first, cache as fallback, for this app's own files only. Always fresh when
// online (so a new page never meets an old module, the mismatch that once stranded
// Tunnelbana on a loading screen), and the last good copy when offline. Live data
// (SL, Open-Meteo) is cross-origin and never touched here: the board shows its age.
const CACHE = 'split-flap-v3';
// Paths this worker answers for: the page it controls (its scope) and the folder the
// app's files live in, which on maclaine.se differs from the page (?assets=/split-flap/).
const SCOPE = new URL(self.registration.scope).pathname;
const ASSETS = new URL(location.href).searchParams.get('assets') || SCOPE.replace(/[^/]*$/, '');
// The account API (from 0.5) is never answered or cached here: its replies carry
// personal data and must always come fresh from the server.
const API = /\/split-flap\/api(\/|$)/;
const mine = p => !API.test(p) && (p === SCOPE || p === SCOPE.replace(/\/$/, '') || p.startsWith(SCOPE.replace(/\/?$/, '/')) || p.startsWith(ASSETS));

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
      // cache: 'no-cache' revalidates with the server (a cheap 304) instead of trusting the
      // browser's HTTP cache, which the maclaine.se zone holds for 4 hours whatever _headers
      // says. A navigation request cannot be re-initialised, so it is refetched by URL.
      const res = req.mode === 'navigate'
        ? await fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
        : await fetch(req, { cache: 'no-cache' });
      // A page load that the server redirected (/split-flap/ to /split-flap, say) must be
      // answered as a redirect: a followed redirect handed back as the page is refused by
      // the browser, which then shows its own error page (0.7.3).
      if (req.mode === 'navigate' && res.redirected) return Response.redirect(res.url, 302);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch {
      return (await cache.match(req, { ignoreSearch: req.mode === 'navigate' })) || Response.error();
    }
  })());
});
