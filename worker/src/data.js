// Live data through the Worker (0.8): sources that want one polite caller instead of
// every screen asking on its own. Each answer is kept in Cloudflare's edge cache, so a
// hundred screens watching one stop cost one upstream request a minute.
//
// Routes (under /split-flap/api/data):
//   GET /status                           which sources are switched off
//   GET /transit/departures?stop=&n=      the next departures from a stop
//   GET /transit/search?text=&lang=       stops by name
//   GET /transit/near?lat=&lon=           the stops nearest a place
//   GET /markets?s=SPY,ISF.LON             daily closes for listed symbols (0.9, markets.js)
//   GET /rates?b=boe|riks&y=1|5           a central bank's policy rate (0.9.2, src/rates.js)
//
// Only known sources with checked parameters are fetched; this is not a relay for
// arbitrary addresses. SOURCES_OFF (a Worker variable, comma separated) switches a source
// off without a release: its routes answer 503 source_off and the app hides its tiles.

import { stoptimes, stops, upstream, STOP_ID, roundLL } from '../../src/transit.js';
import LIST from '../../data/markets.json' with { type: 'json' };
import { upstream as rateUrl, boeSeries, riksSeries } from '../../src/rates.js';

// The built-in symbols (0.9): only these reach Split-Flap's Alpha Vantage key, so no one
// can spend its allowance on symbols of their own. Up to eight per request, one board.
export const LISTED = new Map(LIST.symbols.map(x => [x.s, x]));

const UA = 'split-flap/0.8 (+https://maclaine.se/en/split-flap; github.com/MMacLaine/split-flap)';
const TTL = { departures: 60, search: 86400, near: 86400, markets: 900, rates: 86400 };
export const offList = env => String(env.SOURCES_OFF || '').split(',').map(s => s.trim()).filter(Boolean);

// Every answer is data, never a document (0.9.2 review): even opened directly in a tab it
// cannot run script on maclaine.se.
const reply = (body, status, maxAge) => new Response(JSON.stringify(body), { status, headers: {
  'content-type': 'application/json; charset=utf-8', 'x-content-type-options': 'nosniff',
  'content-security-policy': "sandbox; default-src 'none'", 'content-disposition': 'attachment',
  'cache-control': status === 200 && maxAge ? `public, max-age=${Math.min(maxAge, 60)}` : 'no-store'
} });

// The checked request, or null: each route names its parameters and their shapes.
export function parseData(path, q) {
  if (path === '/data/status') return { kind: 'status' };
  if (path === '/data/rates') {
    const b = q.get('b'), y = q.get('y') === '1' ? 1 : 5;
    if (b !== 'boe' && b !== 'riks') return null;
    const to = new Date().toISOString().slice(0, 10), from = new Date(Date.now() - y * 366 * 864e5).toISOString().slice(0, 10);
    return { kind: 'rates', src: 'rates', bank: b, key: `r/${b}/${y}/${to}`, url: b === 'boe' ? rateUrl.boe(from) : rateUrl.riks(from, to) };
  }
  if (path === '/data/markets') {
    const list = [...new Set((q.get('s') || '').split(',').map(x => x.trim()).filter(Boolean))];
    if (!list.length || list.length > 8 || !list.every(x => LISTED.has(x))) return null;
    return { kind: 'markets', src: 'markets', key: 'm/' + list.slice().sort().join(','), symbols: list };
  }
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
  if (off.includes(p.src || 'transit')) return reply({ error: 'source_off' }, 503);
  // one address per question, whatever the order or spelling of the parameters
  const cacheKey = new Request(`https://split-flap-data.internal/${p.key}`);
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const hit = cache && await cache.match(cacheKey);
  if (hit) return hit;
  if (env.DATA && !(await env.DATA.limit({ key: req.headers.get('cf-connecting-ip') || 'anon' })).success) return reply({ error: 'rate_limited' }, 429);
  if (p.kind === 'markets') return markets(p, env, ctx, cache, cacheKey);
  let body;
  try {
    // the Riksbank's SWEA answers an empty 200 unless asked for JSON by name: keep this accept
    const r = await fetch(p.url, { headers: { 'user-agent': UA, accept: p.bank === 'boe' ? 'text/csv, */*' : 'application/json' }, signal: AbortSignal.timeout(10e3) });
    if (!r.ok) return reply({ error: 'upstream_' + r.status }, 502);
    if (p.kind === 'rates') {
      const series = p.bank === 'boe' ? boeSeries(await r.text()) : riksSeries(await r.json());
      if (!series.length) return reply({ error: 'no_data' }, 502);
      body = { series };
    } else {
      const j = await r.json();
      body = p.kind === 'departures' ? stoptimes(j) : { stops: stops(j) };
    }
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

// Markets: the object's world copy, with each symbol's name, exchange and currency from
// the list. Kept at the edge for 15 minutes, or one while anything is still on its way.
async function markets(p, env, ctx, cache, cacheKey) {
  if (!env.MARKETS) return reply({ error: 'not_configured' }, 503);
  let got;
  try {
    const stub = env.MARKETS.get(env.MARKETS.idFromName('av'));
    const r = await stub.fetch('https://markets.internal/', { method: 'POST', body: JSON.stringify({ symbols: p.symbols.map(s => ({ s, ex: LISTED.get(s).ex })) }) });
    got = await r.json();
  } catch { return reply({ error: 'markets_failed' }, 502); }
  const data = {}, from = (got && got.data) || {}, now = Date.now();
  for (const s of p.symbols) { const L = LISTED.get(s), d = from[s] || {}; data[s] = { name: L.name, ex: L.ex, cur: L.cur || '', ...(L.via ? { via: L.via } : {}), closes: d.closes || null, at: d.at || null, status: d.status || 'queued', ...(d.next ? { next: d.next } : {}) }; }
  // a minute while something is on its way and there are calls left; otherwise until the
  // soonest time anything will change, at most 15 minutes (0.9.0 review)
  const busy = !(got && got.data) || (p.symbols.some(s => data[s].status === 'queued') && got.left > 0);   // an odd answer is kept a minute too
  const soonest = Math.min(...p.symbols.map(s => data[s].next || Infinity));
  const ttl = busy ? 60 : Math.max(60, Math.min(TTL.markets, Math.round((soonest - now) / 1000) || TTL.markets));
  const res = reply({ data }, 200, ttl);
  if (cache) { const kept = new Response(res.clone().body, res); kept.headers.set('cache-control', `public, s-maxage=${ttl}`); ctx.waitUntil(cache.put(cacheKey, kept)); }
  return res;
}
