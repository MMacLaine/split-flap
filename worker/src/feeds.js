// Feeds through the Worker (0.9.3, following Fable's review of the 0.9.2 plan).
//
// GET /split-flap/api/data/feed?u=<address> fetches a feed for a screen, signed in or not,
// but only an address some account has added as a feed connection: the Worker looks for
// a connection row whose lookup is the HMAC of the address. A free Google account is
// enough to add one, so this is a relay with a sign-in step, not a closed one; its limits
// are what make it acceptable:
//   https on port 443 to a real host name only, never an IP, localhost, maclaine.se or
//   workers.dev, checked again on every redirect (at most three, followed by hand)
//   the body must start like a feed (XML, RSS, Atom or JSON), 1 MB at most, 10 seconds
//   20 feeds per account, and a daily cap on addresses new to everyone (FEEDS_PER_DAY)
//   the DATA rate limit on uncached requests, 15 minutes at the edge
// The body always goes back as text/plain with a sandbox policy and as an attachment, so
// even a feed that is really an XHTML page with a script cannot run on maclaine.se.

import { feedUrl, looksLikeFeed } from '../../src/feeds.js';
import BUILT from '../../data/feeds.json' with { type: 'json' };

// the built-in feeds (data/feeds.json): fetched for anyone, so the templates need no account
export const BUILT_IN = new Set(BUILT.feeds.map(f => feedUrl(f.url)).filter(Boolean));

const enc = new TextEncoder();
const UA = 'split-flap/0.9 (+https://maclaine.se/en/split-flap; github.com/MMacLaine/split-flap)';
const MAX = 1 << 20, TTL = 900;
export const FEEDS_PER_ACCOUNT = 20;

// The lookup key: derived from CONN_KEY with HKDF, labelled, so it is not the sealing key.
let lk = null, lkFor = null;
async function lookupKey(env) {
  if (!env.CONN_KEY) return null;
  if (lkFor === env.CONN_KEY) return lk;
  let raw; try { raw = Uint8Array.from(atob(env.CONN_KEY.trim()), c => c.charCodeAt(0)); } catch { return null; }
  if (raw.length !== 32) return null;
  const base = await crypto.subtle.importKey('raw', raw, 'HKDF', false, ['deriveKey']);
  lk = await crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: enc.encode('split-flap feed lookup') }, base, { name: 'HMAC', hash: 'SHA-256', length: 256 }, false, ['sign']);
  lkFor = env.CONN_KEY;
  return lk;
}
export async function lookupOf(env, url) {
  const k = await lookupKey(env), u = feedUrl(url);
  if (!k || !u) return null;
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(u)));
  return [...sig].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Before a feed connection is saved: its address is one we may fetch, the account has
// room, and a new address fits today's cap. Returns an error code, or null to go on.
export async function beforeFeed(env, userId, id, conn) {
  if (conn.kind !== 'feed' && conn.kind !== 'json') return null;
  if (!feedUrl(conn.value)) return 'bad_feed';
  const { n } = await env.DB.prepare(`SELECT COUNT(*) AS n FROM connection WHERE user_id = ? AND deleted = 0 AND lookup IS NOT NULL AND id != ?`).bind(userId, id).first();
  if (n >= FEEDS_PER_ACCOUNT) return 'too_many_feeds';
  const look = await lookupOf(env, conn.value);
  const known = await env.DB.prepare(`SELECT 1 FROM connection WHERE lookup = ? AND deleted = 0 LIMIT 1`).bind(look).first();
  if (!known) {
    const day = new Date().toISOString().slice(0, 10), cap = Math.max(1, +env.FEEDS_PER_DAY || 200);
    // counted before the save, so a save that then fails (409, 413) still uses one of the day's; harmless at this size
    const row = await env.DB.prepare(`INSERT INTO feed_day (day, n) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET n = n + 1 WHERE n < ? RETURNING n`).bind(day, cap).first();
    if (!row) return 'feeds_full_today';
  }
  return null;
}
// After a save: the row's lookup, set for a feed and cleared for anything else.
export async function afterSave(env, userId, id, conn) {
  const look = conn && (conn.kind === 'feed' || conn.kind === 'json') ? await lookupOf(env, conn.value) : null;
  await env.DB.prepare(`UPDATE connection SET lookup = ? WHERE user_id = ? AND id = ?`).bind(look, userId, id).run();
}

const answer = (body, status, maxAge) => new Response(body, { status, headers: {
  'content-type': 'text/plain; charset=utf-8', 'x-content-type-options': 'nosniff',
  'content-security-policy': "sandbox; default-src 'none'", 'content-disposition': 'attachment',
  'cache-control': status === 200 ? `public, max-age=${Math.min(maxAge || 60, 60)}` : 'no-store'
} });

// Fetch by hand so each redirect's address can be checked like the first.
export async function fetchFeed(url, fetchImpl = fetch) {
  let at = url;
  for (let hop = 0; hop <= 3; hop++) {
    if (!feedUrl(at)) return { error: 'bad_address', status: 400 };
    const r = await fetchImpl(at, { redirect: 'manual', headers: { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, application/feed+json, application/xml, text/xml;q=0.9, */*;q=0.1' }, signal: AbortSignal.timeout(10e3) });
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { at = new URL(r.headers.get('location'), at).toString(); continue; }
    if (!r.ok) return { error: 'upstream_' + r.status, status: 502 };
    const len = +r.headers.get('content-length') || 0;
    if (len > MAX) return { error: 'too_big', status: 502 };
    // read with a cap: a body sent without a length stops the moment it passes 1 MB
    const text = await capped(r);
    if (text == null) return { error: 'too_big', status: 502 };
    if (!looksLikeFeed(text)) return { error: 'not_a_feed', status: 502 };
    return { text };
  }
  return { error: 'too_many_redirects', status: 502 };
}

export async function capped(r, max = MAX) {
  if (!r.body) return '';
  const reader = r.body.getReader(), parts = []; let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.byteLength;
    if (n > max) { await reader.cancel().catch(() => {}); return null; }
    parts.push(value);
  }
  const all = new Uint8Array(n); let at = 0;
  for (const p of parts) { all.set(p, at); at += p.byteLength; }
  return new TextDecoder().decode(all);
}

export async function feed(req, env, ctx, url, off) {
  if (off.includes('feeds')) return answer('source_off', 503);
  const u = feedUrl(url.searchParams.get('u'));
  if (!u) return answer('bad_request', 400);
  const cacheKey = new Request('https://split-flap-data.internal/f/' + encodeURIComponent(u));
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const hit = cache && await cache.match(cacheKey);
  if (hit) return hit;
  if (!BUILT_IN.has(u)) {
    const look = await lookupOf(env, u);
    if (!look) return answer('not_configured', 503);
    const known = await env.DB.prepare(`SELECT 1 FROM connection WHERE lookup = ? AND deleted = 0 LIMIT 1`).bind(look).first();
    if (!known) return answer('not_found', 404);
  }
  if (env.DATA && !(await env.DATA.limit({ key: req.headers.get('cf-connecting-ip') || 'anon' })).success) return answer('rate_limited', 429);
  let got;
  try { got = await fetchFeed(u); } catch { got = { error: 'upstream_failed', status: 502 }; }
  if (got.error) return answer(got.error, got.status);
  const res = answer(got.text, 200, TTL);
  if (cache) { const kept = new Response(res.clone().body, res); kept.headers.set('cache-control', `public, s-maxage=${TTL}`); ctx.waitUntil(cache.put(cacheKey, kept)); }
  return res;
}
