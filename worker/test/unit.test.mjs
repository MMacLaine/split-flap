// Worker checks that need no running server.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { devTest, logFailure, routeName } from '../src/index.js';

test('the test-only session route cannot open with the production settings', async () => {
  const { readFileSync } = await import('node:fs');
  const toml = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
  const base = /\[vars\][^[]*BASE_URL = "([^"]+)"/.exec(toml)[1];
  assert.equal(base, 'https://maclaine.se');
  assert.ok(!/DEV_TEST/.test(toml.replace(/#.*$/gm, '')), 'DEV_TEST must never be set in wrangler.toml');
  assert.equal(devTest({ BASE_URL: base, DEV_TEST: '1' }), false);          // even with the flag, not on maclaine.se
  assert.equal(devTest({ BASE_URL: 'http://localhost:8787' }), false);      // not without the flag
  assert.equal(devTest({ BASE_URL: 'http://localhost:8787', DEV_TEST: '1' }), true);
});

test('D1 enforces that a board belongs to an account, so a deleted account cannot gain boards', () => {
  const run = sql => execFileSync('npx', ['wrangler', 'd1', 'execute', 'split-flap', '--local', '--env', 'dev', '--command', sql], { cwd: new URL('..', import.meta.url).pathname, stdio: 'pipe' }).toString();
  assert.throws(() => run("INSERT INTO board (user_id, id, rev, updated, deleted, json) VALUES ('no-such-user', 'x', 1, 0, 0, '{}')"), /FOREIGN KEY/);
});

test('a failed request is logged with its route, status and code, and nothing about the user', async () => {
  const req = (method, path) => [new Request('https://maclaine.se/split-flap/api' + path, { method }), new URL('https://maclaine.se/split-flap/api' + path)];
  const res = (status, body, headers = {}) => new Response(body ? JSON.stringify(body) : null, { status, headers });
  const quiet = console.warn; console.warn = () => {};
  try {
    assert.deepEqual(await logFailure(...req('PUT', '/boards/b-secret-id'), res(413, { error: 'too_many_boards' })),
      { failed: '/boards/:id', method: 'PUT', status: 413, error: 'too_many_boards' });
    assert.equal(await logFailure(...req('GET', '/me'), res(401, { error: 'signed_out' })), null);        // a guest, not a failure
    assert.equal(await logFailure(...req('GET', '/boards'), res(200, { boards: [] })), null);
    assert.deepEqual(await logFailure(...req('GET', '/auth/callback/google'), res(302, null, { location: '/split-flap/api/auth/error?error=state_mismatch' })),
      { failed: '/auth/callback', method: 'GET', status: 302, error: 'state_mismatch' });
    assert.equal(await logFailure(...req('GET', '/auth/callback/google'), res(302, null, { location: '/split-flap/' })), null);
  } finally { console.warn = quiet; }
  assert.equal(routeName('/export'), '/export');
  assert.equal(routeName('/blueprints/m-secret'), '/blueprints/:id');   // blueprint ids are not logged either
  assert.equal(routeName('/anything-typed/by-someone'), 'unknown');
  assert.equal(routeName('/auth/sign-in'), '/auth/sign-in');
});

test('the production route is a top-level key, above every [table] in wrangler.toml', async () => {
  const { readFileSync } = await import('node:fs');
  const toml = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8').replace(/#.*$/gm, '');
  const top = toml.split(/^\[/m)[0];                  // TOML puts every key after a [header] inside that table
  assert.match(top, /^routes = \[\{ pattern = "maclaine\.se\/split-flap\/api\/\*"/m);
});

test('live data: only checked parameters reach the upstream, and a switched-off source answers 503', async () => {
  const { parseData, data, offList } = await import('../src/data.js');
  const q = s => new URLSearchParams(s);
  assert.equal(parseData('/data/transit/departures', q('stop=gb-great-britain_910GKNGX&n=12')).url,
    'https://api.transitous.org/api/v5/stoptimes?stopId=gb-great-britain_910GKNGX&n=12&language=en');
  assert.equal(parseData('/data/transit/departures', q('stop=../../etc&n=12')), null);
  assert.equal(parseData('/data/transit/departures', q('stop=https://evil.example/&n=12')), null);
  assert.equal(parseData('/data/transit/departures', q('stop=abc&n=500')), null);
  assert.equal(parseData('/data/transit/search', q('text=a')), null);                       // too short to be a search
  assert.equal(parseData('/data/transit/near', q('lat=59.34391&lon=18.04989')).key, 'n/59.344/18.05');   // rounded, so neighbours share
  assert.equal(parseData('/data/transit/near', q('lat=95&lon=0')), null);
  assert.equal(parseData('/data/fetch', q('url=https://example.com')), null);                // no fetch-anything route
  assert.deepEqual(offList({ SOURCES_OFF: ' transit, ' }), ['transit']);
  const call = (path, env) => data(new Request('https://maclaine.se/split-flap/api' + path), env, { waitUntil() {} }, new URL('https://maclaine.se/split-flap/api' + path));
  assert.equal((await call('/data/transit/departures?stop=abc&n=5', { SOURCES_OFF: 'transit' })).status, 503);
  assert.deepEqual(await (await call('/data/status', { SOURCES_OFF: 'transit' })).json(), { off: ['transit'] });
  assert.equal(parseData('/data/transit/departures', q('stop=abc')).key, 'd/abc/12');         // n defaults to 12
});

test('live data: a Transitous reply becomes the departures shape every tile reads', async () => {
  const { stoptimes, stops } = await import('../../src/transit.js');
  const dep = { place: { name: 'Łódź Fabryczna', tz: 'Europe/Warsaw', departure: '2026-09-29T10:05:00Z', scheduledDeparture: '2026-09-29T10:02:00Z', track: '3',
    alerts: [{ headerText: 'Utrudnienia na linii' }] }, mode: 'REGIONAL_RAIL', realTime: true, headsign: 'Warszawa Centralna', routeShortName: 'IC 1300', cancelled: false };
  const r = stoptimes({ stopTimes: [dep, { place: {} }, { ...dep, mode: 'SUBWAY', routeShortName: '', displayName: 'M1', tripCancelled: true }] });
  assert.equal(r.tz, 'Europe/Warsaw');
  assert.equal(r.alert, 'UTRUDNIENIA NA LINII');
  assert.deepEqual(r.deps[0], { line: 'IC 130', dest: 'WARSZAWA CENTRALNA', time: '2026-09-29T10:05:00Z', sched: '2026-09-29T10:02:00Z', platform: '3', cancelled: false, mode: 'TRAIN', rt: true });
  assert.equal(r.deps.length, 2);                                                            // the one with no time is dropped
  assert.deepEqual([r.deps[1].line, r.deps[1].mode, r.deps[1].cancelled], ['M1', 'METRO', true]);
  const s = stops([{ type: 'STOP', id: 'se-Trafiklab_740021013', name: 'Odenplan T-bana', lat: 59.342957, lon: 18.049704, tz: 'Europe/Stockholm', country: 'SE', modes: ['SUBWAY', 'BUS'], areas: [{ name: 'Stockholms kommun', default: true }] },
    { type: 'STOP', id: 'se-Trafiklab_740021014', name: 'Odenplan T-bana' }, { type: 'ADDRESS', id: 'x', name: 'Odengatan 1' }, { type: 'STOP', id: 'bad id!', name: 'Nope' }]);
  assert.deepEqual(s, [{ id: 'se-Trafiklab_740021013', name: 'Odenplan T-bana', note: 'Stockholms kommun', modes: ['METRO', 'BUS'], lat: 59.343, lon: 18.0497, tz: 'Europe/Stockholm', cc: 'SE' }]);
});

test('markets: only listed symbols, up to eight, and a switched-off source answers 503', async () => {
  const { parseData } = await import('../src/data.js');
  const q = s => new URLSearchParams(s);
  assert.deepEqual(parseData('/data/markets', q('s=SPY,ISF.LON')).symbols, ['SPY', 'ISF.LON']);
  assert.equal(parseData('/data/markets', q('s=ISF.LON,SPY')).key, parseData('/data/markets', q('s=SPY,ISF.LON')).key);   // one cache entry for either order
  assert.equal(parseData('/data/markets', q('s=SPY,MADEUP')), null);                        // not on the list: never reaches the key
  assert.equal(parseData('/data/markets', q('s=' + Array(9).fill('SPY').map((x, i) => ['SPY', 'QQQ', 'DIA', 'IWM', 'VT', 'EWD', 'EWU', 'EWG', 'EWJ'][i]).join(','))), null);
  const { data } = await import('../src/data.js');
  const call = path => data(new Request('https://maclaine.se/split-flap/api' + path), { SOURCES_OFF: 'markets' }, { waitUntil() {} }, new URL('https://maclaine.se/split-flap/api' + path));
  assert.equal((await call('/data/markets?s=SPY')).status, 503);
});

// A fake Durable Object storage and clock, so the object's rules run without Cloudflare.
function fakeObject(env, replies) {
  const map = new Map(); let alarm = null;
  const storage = { get: async k => map.get(k), put: async (k, v) => { map.set(k, v); }, getAlarm: async () => alarm, setAlarm: async t => { alarm = t; } };
  return import('../src/markets.js').then(({ Markets }) => {
    const m = new Markets({ storage }, env), calls = [];
    m.fetchImpl = async url => { calls.push(url); const r = replies.shift(); return new Response(JSON.stringify(r), { status: 200 }); };
    return { m, map, calls, alarm: () => alarm, clearAlarm: () => { alarm = null; } };
  });
}
const DAILY = { 'Time Series (Daily)': { '2026-09-25': { '4. close': '100' }, '2026-09-28': { '4. close': '101.5' } } };

test('markets object: one copy for the world, one call per symbol a day, and the allowance kept', async () => {
  const realNow = Date.now;
  Date.now = () => Date.parse('2026-09-29T10:00:00Z');   // New York last closed 28 Sep 20:00 UTC
  try {
    const o = await fakeObject({ AV_PER_DAY: '2', AV_PER_MIN: '5', ALPHAVANTAGE_KEY: 'k' }, [DAILY, DAILY, { Information: 'standard API rate limit is 25 requests per day' }]);
    const ask = syms => o.m.fetch(new Request('https://x/', { method: 'POST', body: JSON.stringify({ symbols: syms.map(s => ({ s, ex: 'US' })) }) })).then(r => r.json());
    let r = await ask(['SPY', 'QQQ', 'DIA']);
    assert.deepEqual(r.data.SPY, { closes: null, at: null, status: 'queued' });       // nothing yet, and queued
    assert.equal(r.left, 2);
    await o.m.alarm(); await o.m.alarm();                                              // two calls: the day's allowance
    await o.m.alarm();                                                                 // the third waits for tomorrow
    assert.equal(o.calls.length, 2);
    assert.ok(o.alarm() > Date.parse('2026-09-30T00:00:00Z'));
    r = await ask(['SPY', 'QQQ', 'DIA']);
    assert.deepEqual(r.data.SPY.closes, [{ d: '2026-09-25', c: 100 }, { d: '2026-09-28', c: 101.5 }]);
    assert.equal(r.data.DIA.closes, null); assert.equal(r.left, 0);
    assert.equal(r.data.DIA.status, 'budget'); assert.ok(r.data.DIA.next > Date.parse('2026-09-30T00:00:00Z'));   // says why, and when
    // asked again the same day: nothing is due, so no calls
    const before = o.calls.length; await ask(['SPY']); await o.m.alarm();
    assert.equal(o.calls.length, before);
    assert.ok(!o.calls.some(u => /apikey=(?!k)/.test(u)));
  } finally { Date.now = realNow; }
});

test('markets object: a reply saying the key\'s limit is reached ends the day and keeps the symbol queued', async () => {
  const realNow = Date.now;
  Date.now = () => Date.parse('2026-09-29T10:00:00Z');
  try {
    const o = await fakeObject({ AV_PER_DAY: '25', ALPHAVANTAGE_KEY: 'k' }, [{ Information: 'Thank you for using Alpha Vantage! Please consider spreading out your free API requests' }]);
    await o.m.fetch(new Request('https://x/', { method: 'POST', body: JSON.stringify({ symbols: [{ s: 'SPY', ex: 'US' }] }) }));
    await o.m.alarm();
    assert.equal(o.map.get('used:2026-09-29'), 25);
    assert.deepEqual(Object.keys(o.map.get('queue2')), [JSON.stringify({ s: 'SPY', ex: 'US' })]);
    assert.equal(o.map.get('d:SPY'), undefined);
  } finally { Date.now = realNow; }
});

test('markets object: the most asked-for symbol goes first, and a symbol queued mid-call is kept', async () => {
  const realNow = Date.now;
  Date.now = () => Date.parse('2026-09-29T10:00:00Z');
  try {
    let o;
    o = await fakeObject({ AV_PER_DAY: '25', ALPHAVANTAGE_KEY: 'k' }, [DAILY, DAILY]);
    const ask = syms => o.m.fetch(new Request('https://x/', { method: 'POST', body: JSON.stringify({ symbols: syms.map(s => ({ s, ex: 'US' })) }) }));
    await ask(['QQQ']); await ask(['SPY']); await ask(['SPY']); await ask(['SPY']);
    // while the call for SPY is on its way, another board asks for DIA
    const fetchFirst = o.m.fetchImpl;
    o.m.fetchImpl = async url => { await ask(['DIA']); return fetchFirst(url); };
    await o.m.alarm();
    assert.ok(o.calls[0].includes('symbol=SPY'), o.calls[0]);                      // three screens asked for SPY, one for QQQ
    assert.deepEqual(Object.keys(o.map.get('queue2')).map(k => JSON.parse(k).s).sort(), ['DIA', 'QQQ']);   // DIA was not lost
  } finally { Date.now = realNow; }
});

test('markets object: a close Alpha Vantage has not posted yet is asked again, twice at most, two hours apart', async () => {
  const realNow = Date.now; let t = Date.parse('2026-09-29T20:40:00Z');   // New York closed at 20:00 UTC; settled at 20:30
  Date.now = () => t;
  try {
    const OLD = { 'Time Series (Daily)': { '2026-09-28': { '4. close': '101' } } }, NEW = { 'Time Series (Daily)': { '2026-09-28': { '4. close': '101' }, '2026-09-29': { '4. close': '102' } } };
    const o = await fakeObject({ AV_PER_DAY: '25', ALPHAVANTAGE_KEY: 'k' }, [OLD, OLD, OLD, NEW]);
    const ask = () => o.m.fetch(new Request('https://x/', { method: 'POST', body: JSON.stringify({ symbols: [{ s: 'SPY', ex: 'US' }] }) })).then(r => r.json());
    await ask(); await o.m.alarm();                                  // first try: still Monday's bar
    assert.equal(o.calls.length, 1);
    t += 60 * 60e3; await ask(); await o.m.alarm();                  // an hour later: too soon to ask again
    assert.equal(o.calls.length, 1);
    t += 61 * 60e3; await ask(); await o.m.alarm();                  // two hours after the first: the second try
    t += 121 * 60e3; await ask(); await o.m.alarm();                 // the third and last
    t += 121 * 60e3; await ask(); await o.m.alarm();                 // no fourth, whatever it would say
    assert.equal(o.calls.length, 3);
    const r = await ask();
    assert.equal(r.data.SPY.closes.at(-1).d, '2026-09-28');          // shown with its own, older date
    assert.equal(r.data.SPY.status, 'ok'); assert.ok(r.data.SPY.next > t);
  } finally { Date.now = realNow; }
});

test('markets route: the answer is cached a minute only while something is on its way', async () => {
  const { data } = await import('../src/data.js');
  const put = []; const cache = { match: async () => null, put: async (k, v) => { put.push(v.headers.get('cache-control')); } };
  globalThis.caches = { default: cache };
  try {
    const obj = body => ({ idFromName: () => 'id', get: () => ({ fetch: async () => new Response(JSON.stringify(body)) }) });
    const call = async body => { const url = new URL('https://maclaine.se/split-flap/api/data/markets?s=SPY'); const waits = []; await data(new Request(url), { MARKETS: obj(body) }, { waitUntil: p => waits.push(p) }, url); await Promise.all(waits); };
    await call({ data: { SPY: { closes: null, status: 'queued' } }, left: 10 });
    await call({ data: { SPY: { closes: null, status: 'budget', next: Date.now() + 5 * 3600e3 } }, left: 0 });
    await call({});                                                       // an odd answer from the object: names, no crash
    assert.deepEqual(put, ['public, s-maxage=60', 'public, s-maxage=900', 'public, s-maxage=60']);
  } finally { delete globalThis.caches; }
});

test('seal: a value opens for its row and account only, and there is no key without CONN_KEY', async () => {
  const { sealKey, seal, unseal } = await import('../src/seal.js');
  assert.equal(await sealKey({}), null);
  assert.equal(await sealKey({ CONN_KEY: btoa('too short') }), null);          // not 32 bytes
  const key = await sealKey({ CONN_KEY: btoa(String.fromCharCode(...new Uint8Array(32).map((_, i) => i))) });
  const s1 = await seal(key, 'user1', 'c1', 'MYSECRETKEY'), s2 = await seal(key, 'user1', 'c1', 'MYSECRETKEY');
  assert.ok(s1.startsWith('v1:') && !s1.includes('MYSECRET'));
  assert.notEqual(s1, s2);                                                    // a new IV each time
  assert.equal(await unseal(key, 'user1', 'c1', s1), 'MYSECRETKEY');
  assert.equal(await unseal(key, 'user2', 'c1', s1), null);                   // another account
  assert.equal(await unseal(key, 'user1', 'c2', s1), null);                   // another row
  assert.equal(await unseal(key, 'user1', 'c1', 'MYSECRETKEY'), null);        // never plain text
});

test('feeds: redirects are checked like the first address, and only feeds come back', async () => {
  const { fetchFeed } = await import('../src/feeds.js');
  const hop = (to) => new Response(null, { status: 302, headers: { location: to } });
  const ok = body => new Response(body, { status: 200 });
  const seq = list => { let i = 0; return async () => list[i++]; };
  assert.equal((await fetchFeed('https://a.example/f', seq([hop('http://a.example/f')]))).error, 'bad_address');        // to plain http
  assert.equal((await fetchFeed('https://a.example/f', seq([hop('https://127.0.0.1/admin')]))).error, 'bad_address');   // to a private address
  assert.equal((await fetchFeed('https://a.example/f', seq([hop('https://maclaine.se/split-flap/api/connections')]))).error, 'bad_address');
  assert.equal((await fetchFeed('https://a.example/f', seq([hop('/1'), hop('/2'), hop('/3'), hop('/4')]))).error, 'too_many_redirects');
  assert.equal((await fetchFeed('https://a.example/f', seq([ok('<!DOCTYPE html><script>x</script>')]))).error, 'not_a_feed');
  assert.equal((await fetchFeed('https://a.example/f', seq([hop('https://b.example/rss'), ok('<rss><channel></channel></rss>')]))).text, '<rss><channel></channel></rss>');
  assert.equal((await fetchFeed('https://a.example/f', seq([new Response('x'.repeat(10), { headers: { 'content-length': String(2 << 20) } })]))).error, 'too_big');
});

test('feeds: an XHTML page with a script comes back as plain text in a sandbox, never as a page', async () => {
  const { feed } = await import('../src/feeds.js');
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><script>alert(document.cookie)</script></html>', { status: 200, headers: { 'content-type': 'application/xhtml+xml' } });
  try {
    const url = new URL('https://maclaine.se/split-flap/api/data/feed?u=' + encodeURIComponent('https://feeds.bbci.co.uk/news/rss.xml'));   // a built-in feed: no account needed
    const r = await feed(new Request(url), {}, { waitUntil() {} }, url, []);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type'), 'text/plain; charset=utf-8');
    assert.equal(r.headers.get('content-security-policy'), "sandbox; default-src 'none'");
    assert.equal(r.headers.get('content-disposition'), 'attachment');
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    const off = await feed(new Request(url), {}, { waitUntil() {} }, url, ['feeds']);
    assert.equal(off.status, 503);
  } finally { globalThis.fetch = realFetch; }
});

test('feeds: a body sent without a length is cut off, and the stream cancelled, once it passes 1 MB', async () => {
  const { fetchFeed } = await import('../src/feeds.js');
  let sent = 0, cancelled = false;
  const chunk = new TextEncoder().encode('<rss>' + 'x'.repeat(64 * 1024 - 5));
  const body = new ReadableStream({ pull(c) { if (sent >= 32) { c.close(); return; } sent++; c.enqueue(chunk); }, cancel() { cancelled = true; } });   // 32 x 64 KB = 2 MB
  const r = await fetchFeed('https://a.example/f', async () => new Response(body, { status: 200 }));
  assert.equal(r.error, 'too_big');
  assert.ok(cancelled, 'the stream was cancelled');
  assert.ok(sent <= 18, `read ${sent} chunks, not the whole 32`);
});
