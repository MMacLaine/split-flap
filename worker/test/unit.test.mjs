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
