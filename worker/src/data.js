// Live data through the Worker (0.8): sources that want one polite caller instead of
// every screen asking on its own. Each answer is kept in Cloudflare's edge cache, so a
// hundred screens watching one stop cost one upstream request a minute.
//
// Routes (under /split-flap/api/data):
//   GET /status                           which sources are switched off
//   GET /transit/departures?stop=&n=      the next departures from a stop
//   GET /transit/search?text=&lang=       stops by name
//   GET /transit/near?lat=&lon=           the stops nearest a place
//
// Only known sources with checked parameters are fetched; this is not a relay for
// arbitrary addresses. SOURCES_OFF (a Worker variable, comma separated) switches a source
// off without a release: its routes answer 503 source_off and the app hides its tiles.

import { stoptimes, stops, upstream, STOP_ID, roundLL } from '../../src/transit.js';

const UA = 'split-flap/0.8 (+https://maclaine.se/en/split-flap; github.com/MMacLaine/split-flap)';
const TTL = { departures: 60, search: 86400, near: 86400 };
export const offList = env => String(env.SOURCES_OFF || '').split(',').map(s => s.trim()).filter(Boolean);

const reply = (body, status, maxAge) => new Response(JSON.stringify(body), { status, headers: {
  'content-type': 'application/json; charset=utf-8', 'x-content-type-options': 'nosniff',
  'cache-control': status === 200 && maxAge ? `public, max-age=${Math.min(maxAge, 60)}` : 'no-store'
} });

// The checked request, or null: each route names its parameters and their shapes.
export function parseData(path, q) {
  if (path === '/data/status') return { kind: 'status' };
  const m = /^\/data\/transit\/(departures|search|near)$/.exec(path);
  if (!m) return null;
  if (m[1] === 'departures') {
    const stop = q.get('stop') || '', n = Math.round(+(q.get('n') || 12));
    return STOP_ID.test(stop) && n >= 1 && n <= 30 ? { kind: 'departures', key: `d/${stop}/${n}`, url: upstream.departures(stop, n) } : null;
  }
  if (m[1] === 'search') {
    const text = (q.get('text') || '').trim(), lang = q.get('lang') === 'sv' ? 'sv' : 'en';
    return text.length >= 2 && text.length <= 60 ? { kind: 'search', key: `s/${lang}/${text.toLowerCase()}`, url: upstream.search(text, lang) } : null;
  }
  const lat = +q.get('lat'), lon = +q.get('lon');
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { kind: 'near', key: `n/${roundLL(lat)}/${roundLL(lon)}`, url: upstream.near(roundLL(lat), roundLL(lon)) };
}

export async function data(req, env, ctx, url) {
  if (req.method !== 'GET') return reply({ error: 'method_not_allowed' }, 405);
  const off = offList(env), p = parseData(url.pathname.slice('/split-flap/api'.length), url.searchParams);
  if (!p) return reply({ error: 'bad_request' }, 400);
  if (p.kind === 'status') return reply({ off }, 200, 60);
  if (off.includes('transit')) return reply({ error: 'source_off' }, 503);
  // one address per question, whatever the order or spelling of the parameters
  const cacheKey = new Request(`https://split-flap-data.internal/${p.key}`);
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const hit = cache && await cache.match(cacheKey);
  if (hit) return hit;
  if (env.DATA && !(await env.DATA.limit({ key: req.headers.get('cf-connecting-ip') || 'anon' })).success) return reply({ error: 'rate_limited' }, 429);
  let body;
  try {
    const r = await fetch(p.url, { headers: { 'user-agent': UA, accept: 'application/json' }, signal: AbortSignal.timeout(10e3) });
    if (!r.ok) return reply({ error: 'upstream_' + r.status }, 502);
    const j = await r.json();
    body = p.kind === 'departures' ? stoptimes(j) : { stops: stops(j) };
  } catch {
    return reply({ error: 'upstream_failed' }, 502);
  }
  const res = reply(body, 200, TTL[p.kind]);
  if (cache) {
    const kept = new Response(res.clone().body, res);
    kept.headers.set('cache-control', `public, s-maxage=${TTL[p.kind]}`);
    ctx.waitUntil(cache.put(cacheKey, kept));
  }
  return res;
}
