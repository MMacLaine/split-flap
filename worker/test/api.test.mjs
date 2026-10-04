// The boards API end to end, against `wrangler dev --env dev` on localhost:8787 with
// DEV_TEST=1 and a local D1 (see worker/README.md). Sessions come from the test-only
// /dev/session route, so Google is not involved; Google sign-in is checked by hand.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.API || 'http://localhost:8787', API = BASE + '/split-flap/api', ORIGIN = new URL(BASE).origin;
const run = Math.random().toString(36).slice(2, 8);
// a connection row as D1 holds it, through the DEV_TEST route (0.11.3: no wrangler d1 execute
// against the database the dev server has open)
const row = async (q, id) => JSON.stringify((await (await fetch(API + '/dev/row', { method: 'POST', headers: { origin: ORIGIN, 'content-type': 'application/json' }, body: JSON.stringify({ q, id }) })).json()).row);

async function session(email) {
  const r = await fetch(API + '/dev/session', { method: 'POST', headers: { origin: ORIGIN, 'content-type': 'application/json' }, body: JSON.stringify({ email, name: 'Ada Lovelace' }) });
  assert.equal(r.status, 200);
  return r.headers.get('set-cookie').split(';')[0];
}
const call = (cookie, method, path, body, origin = ORIGIN) => fetch(API + path, {
  method, headers: Object.assign({ cookie, 'content-type': 'application/json' }, origin ? { origin } : {}), body: body == null ? undefined : JSON.stringify(body)
}).then(async r => ({ status: r.status, body: await r.json().catch(() => null), headers: r.headers }));
const board = (id, name = 'Board') => ({ id, name, pages: [{ id: 'p1', name: 'P', layout: 'full', dur: 10, wins: [], zones: [{ ch: 'clock', o: {} }] }], future: { field: 'kept' } });

test('signed out is 401, and writes need the app origin', async () => {
  assert.equal((await call('', 'GET', '/me')).status, 401);
  const c = await session(`o-${run}@example.com`);
  assert.equal((await call(c, 'PUT', '/boards/b1', { board: board('b1'), baseRev: 0 }, 'https://evil.example')).status, 403);
  assert.equal((await call(c, 'PUT', '/boards/b1', { board: board('b1'), baseRev: 0 }, null)).status, 403);
});

test('me gives the first name and email, and never caches', async () => {
  const c = await session(`me-${run}@example.com`), r = await call(c, 'GET', '/me');
  assert.equal(r.status, 200);
  assert.deepEqual([r.body.name, r.body.email], ['Ada', `me-${run}@example.com`]);
  assert.equal(r.headers.get('cache-control'), 'no-store');
});

test('create, update, stale update, delete, and a second device sees the tombstone', async () => {
  const email = `b-${run}@example.com`, a = await session(email), b = await session(email);
  let r = await call(a, 'PUT', '/boards/b1', { board: board('b1', 'One'), baseRev: 0 });
  assert.deepEqual([r.status, r.body.rev], [200, 1]);
  r = await call(a, 'PUT', '/boards/b1', { board: board('b1', 'Two'), baseRev: 1 });
  assert.deepEqual([r.status, r.body.rev], [200, 2]);
  r = await call(b, 'PUT', '/boards/b1', { board: board('b1', 'Stale'), baseRev: 1 });
  assert.equal(r.status, 409);
  assert.deepEqual([r.body.current.rev, r.body.current.board.name], [2, 'Two']);
  r = await call(b, 'GET', '/boards');
  assert.equal(r.body.boards[0].board.future.field, 'kept');         // stored as sent, not stripped
  r = await call(a, 'DELETE', '/boards/b1', { baseRev: 2 });
  assert.deepEqual([r.status, r.body.rev], [200, 3]);
  r = await call(b, 'GET', '/boards');
  assert.deepEqual([r.body.boards[0].deleted, r.body.boards[0].rev, r.body.boards[0].board], [true, 3, null]);
  r = await call(b, 'PUT', '/boards/b1', { board: board('b1', 'Back'), baseRev: 3 });   // brought back on purpose
  assert.deepEqual([r.status, r.body.rev], [200, 4]);
});

test('one account never sees another\'s boards', async () => {
  const a = await session(`x-${run}@example.com`), b = await session(`y-${run}@example.com`);
  await call(a, 'PUT', '/boards/own', { board: board('own'), baseRev: 0 });
  assert.deepEqual((await call(b, 'GET', '/boards')).body.boards, []);
  assert.equal((await call(b, 'PUT', '/boards/own', { board: board('own'), baseRev: 1 })).status, 409);   // no such board for b
});

test('bad boards are refused, big ones too', async () => {
  const c = await session(`bad-${run}@example.com`);
  assert.equal((await call(c, 'PUT', '/boards/b1', { board: { id: 'b1' }, baseRev: 0 })).status, 400);          // no pages
  assert.equal((await call(c, 'PUT', '/boards/b2', { board: board('other'), baseRev: 0 })).status, 400);         // id mismatch
  const big = board('b3'); big.pages[0].name = 'x'.repeat(300000);
  assert.equal((await call(c, 'PUT', '/boards/b3', { board: big, baseRev: 0 })).status, 413);
});

test('export has the account and live boards; delete account removes everything', async () => {
  const email = `d-${run}@example.com`, c = await session(email);
  await call(c, 'PUT', '/boards/k1', { board: board('k1', 'Keep'), baseRev: 0 });
  await call(c, 'PUT', '/boards/k2', { board: board('k2', 'Gone'), baseRev: 0 });
  await call(c, 'DELETE', '/boards/k2', { baseRev: 1 });
  const ex = await call(c, 'GET', '/export');
  assert.equal(ex.body.account.email, email);
  assert.deepEqual(ex.body.storyboards.map(b => b.name), ['Keep']);   // the rows from before 0.10.1, as they were
  assert.deepEqual(ex.body.playlists.map(b => b.name), ['Keep']);     // and what they became
  assert.deepEqual(ex.body.boards.map(b => b.name), ['P']);
  const del = await call(c, 'DELETE', '/account');
  assert.equal(del.status, 200, JSON.stringify(del.body));
  assert.equal((await call(c, 'GET', '/me')).status, 401);
  const again = await session(email);                                  // a new account with the same email starts empty
  assert.deepEqual((await call(again, 'GET', '/boards')).body.boards, []);
  assert.deepEqual((await call(again, 'GET', '/playlists')).body.playlists, []);
});

// My boards (0.7.1): blueprints follow the same rules in their own table.
const blueprint = (id, name = 'Welcome sign') => ({ id, name, rows: 6, cols: 22, theme: 'black', page: { id: 'p1', name, layout: 'full', dur: 10, zones: [{ ch: 'clock', o: {} }] } });

test('blueprints: create, update, stale update, delete, and kept apart from storyboards', async () => {
  const c = await session(`bp-${run}@example.com`);
  assert.deepEqual((await call(c, 'GET', '/blueprints')).body.blueprints, []);
  const a = await call(c, 'PUT', '/blueprints/m1', { board: blueprint('m1'), baseRev: 0 });
  assert.equal(a.status, 200); assert.equal(a.body.rev, 1);
  assert.equal((await call(c, 'PUT', '/blueprints/m1', { board: blueprint('m1', 'Renamed'), baseRev: 1 })).body.rev, 2);
  const stale = await call(c, 'PUT', '/blueprints/m1', { board: blueprint('m1', 'Old'), baseRev: 1 });
  assert.equal(stale.status, 409); assert.equal(stale.body.current.board.name, 'Renamed');
  assert.deepEqual((await call(c, 'GET', '/boards')).body.boards, []);                 // not a storyboard
  assert.equal((await call(c, 'PUT', '/blueprints/m2', { board: board('m2'), baseRev: 0 })).status, 400);   // a storyboard is not a blueprint
  assert.equal((await call(c, 'PUT', '/boards/m3', { board: blueprint('m3'), baseRev: 0 })).status, 400);   // and the other way round
  assert.equal((await call(c, 'DELETE', '/blueprints/m1', { baseRev: 2 })).body.deleted, true);
  const list = (await call(c, 'GET', '/blueprints')).body.blueprints;
  assert.deepEqual(list.map(x => [x.id, x.deleted, x.rev]), [['m1', true, 3]]);
});

test('export includes live blueprints, and deleting the account removes them', async () => {
  const email = `bpd-${run}@example.com`, c = await session(email);
  await call(c, 'PUT', '/blueprints/m1', { board: blueprint('m1', 'Keep'), baseRev: 0 });
  await call(c, 'PUT', '/blueprints/m2', { board: blueprint('m2', 'Gone'), baseRev: 0 });
  await call(c, 'DELETE', '/blueprints/m2', { baseRev: 1 });
  assert.deepEqual((await call(c, 'GET', '/export')).body.boards.map(b => b.name), ['Keep']);   // 0.10.1: the blueprints are your Boards
  assert.equal((await call(c, 'DELETE', '/account')).status, 200);
  const again = await session(email);
  assert.deepEqual((await call(again, 'GET', '/blueprints')).body.blueprints, []);
});

// Connections (0.9.2): sealed at rest, opened for their owner only, never in an export.
test('connections: stored sealed, read back by their owner, invisible to another account', async () => {
  const email = `cn-${run}@example.com`, a = await session(email), other = await session(`cx-${run}@example.com`);
  const conn = { id: 'c' + run + 'k', kind: 'av', name: 'My key', value: 'SECRETKEY' + run.toUpperCase().replace(/[^A-Z0-9]/g, 'X'), updated: 1 };
  let r = await call(a, 'PUT', '/connections/' + conn.id, { board: conn, baseRev: 0 });
  assert.deepEqual([r.status, r.body.rev], [200, 1]);
  r = await call(a, 'GET', '/connections');
  assert.equal(r.body.connections.find(x => x.id === conn.id).board.value, conn.value);
  // in D1 the value is ciphertext, never the key itself
  const raw = await row('json', conn.id);
  assert.ok(raw.includes('v1:') && !raw.includes(conn.value), 'sealed at rest');
  r = await call(other, 'GET', '/connections');
  assert.ok(!r.body.connections.some(x => x.id === conn.id));
  // a bad value is refused before anything is sealed
  r = await call(a, 'PUT', '/connections/cbad' + run, { board: { id: 'cbad' + run, kind: 'sheet', name: 'x', value: 'http://not-https.example/x' }, baseRev: 0 });
  assert.equal(r.status, 400);
  // the export names it, without its value
  r = await call(a, 'GET', '/export');
  assert.deepEqual(r.body.connections.find(x => x.id === conn.id), { id: conn.id, kind: 'av', name: 'My key' });
  assert.ok(!JSON.stringify(r.body).includes(conn.value));
  // deleting the account removes them
  await call(a, 'DELETE', '/account', {});
  const left = await row('count', conn.id);
  assert.match(left, /"n":\s*0/);
});

test('rates route: only the Bank of England and the Riksbank, and every data answer is data, not a page', async () => {
  const r = await fetch(API + '/data/rates?b=nope');
  assert.equal(r.status, 400);
  assert.equal(r.headers.get('content-security-policy'), "sandbox; default-src 'none'");
  assert.equal(r.headers.get('content-disposition'), 'attachment');
  assert.equal((await fetch(API + '/data/status')).headers.get('x-content-type-options'), 'nosniff');
});

test('feeds: an address no account has added is not fetched; adding one sets its lookup, deleting clears it', async () => {
  const addr = `https://feeds-${run}.example/rss.xml`;
  let r = await fetch(API + '/data/feed?u=' + encodeURIComponent(addr));
  assert.equal(r.status, 404);                                                 // nobody has added it
  assert.equal(r.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal((await fetch(API + '/data/feed?u=' + encodeURIComponent('https://127.0.0.1/x'))).status, 400);
  const a = await session(`fd-${run}@example.com`), id = 'cf' + run;
  r = await call(a, 'PUT', '/connections/' + id, { board: { id, kind: 'feed', name: 'Test feed', value: addr }, baseRev: 0 });
  assert.equal(r.status, 200);
  assert.match(await row('lookup', id), /"lookup":\s*"[0-9a-f]{64}"/);
  assert.ok(!(await row('lookup', id)).includes(addr));   // neither the lookup nor the row holds the address in plain text
  r = await call(a, 'PUT', '/connections/cx' + run, { board: { id: 'cx' + run, kind: 'feed', name: 'x', value: 'https://localhost/feed' }, baseRev: 0 });
  assert.equal(r.status, 400);
  r = await call(a, 'DELETE', '/connections/' + id, { baseRev: 1 });
  assert.equal(r.status, 200);
  assert.match(await row('lookup', id), /"lookup":\s*null/);
});

// 0.10.1: playlists point at boards. The first request for them moves the storyboards over.
const playlist = (id, name, ids) => ({ id, name, transition: 'classic', speed: 'fast', sound: false, quiet: { on: false, from: '23:00', to: '07:00', mode: 'dim' }, items: ids.map(x => ({ id: x, dur: 10, wins: [] })) });
test('playlists: the first request moves the storyboards over, once', async () => {
  const c = await session(`pl-${run}@example.com`);
  await call(c, 'PUT', '/boards/s1', { board: board('s1', 'Morning'), baseRev: 0 });
  let r = await call(c, 'GET', '/playlists');
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.playlists.map(x => [x.id, x.rev, x.board.items.map(i => i.id)]), [['s1', 1, ['p1']]]);
  r = await call(c, 'GET', '/blueprints');
  assert.deepEqual(r.body.blueprints.map(x => [x.id, x.rev]), [['p1', 1]]);
  await call(c, 'PUT', '/boards/s2', { board: board('s2', 'Late'), baseRev: 0 });   // an old tab, after the move
  assert.equal((await call(c, 'GET', '/playlists')).body.playlists.length, 1);
  r = await call(c, 'PUT', '/playlists/s1', { board: playlist('s1', 'Morning', ['p1', 'p2']), baseRev: 1 });
  assert.deepEqual([r.status, r.body.rev], [200, 2]);
  assert.equal((await call(c, 'PUT', '/playlists/s1', { board: { id: 's1', name: 'x' }, baseRev: 2 })).status, 400);   // no items: not a playlist
  r = await call(c, 'DELETE', '/playlists/s1', { baseRev: 2 });
  assert.deepEqual([r.status, r.body.deleted], [200, true]);
});

test('settings: home and last only, kept per account', async () => {
  const c = await session(`st-${run}@example.com`);
  let r = await call(c, 'PUT', '/settings/home', { board: { id: 'home', stops: [], cur: 'GBP' }, baseRev: 0 });
  assert.equal(r.status, 200);
  assert.equal((await call(c, 'PUT', '/settings/theme', { board: { id: 'theme' }, baseRev: 0 })).status, 400);
  r = await call(c, 'GET', '/settings');
  assert.deepEqual(r.body.settings.map(x => [x.id, x.board.cur]), [['home', 'GBP']]);
});

// 0.11.0: a default look in the account's settings, checked against MATRIX; a board's look stored as sent
test('the default look: a valid one is kept, parts MATRIX does not allow are refused, and a board keeps its look', async () => {
  const c = await session(`lk-${run}@example.com`);
  assert.equal((await call(c, 'PUT', '/settings/look', { board: { id: 'look', look: 'calm' }, baseRev: 0 })).status, 200);
  assert.equal((await call(c, 'PUT', '/settings/look', { board: { id: 'look', look: 'custom', parts: { material: 'metal' } }, baseRev: 1 })).status, 400);
  let r = await call(c, 'GET', '/settings');
  assert.deepEqual(r.body.settings.map(x => [x.id, x.board.look]), [['look', 'calm']]);
  const bp = { id: 'lk1', name: 'Dep', rows: 6, cols: 22, theme: 'black', look: 'calm', page: { id: 'lk1', name: 'Dep', layout: 'full', dur: 10, zones: [{ ch: 'clock', o: {} }] } };
  assert.equal((await call(c, 'PUT', '/blueprints/lk1', { board: bp, baseRev: 0 })).status, 200);
  r = await call(c, 'GET', '/blueprints');
  assert.deepEqual([r.body.blueprints[0].board.look, r.body.blueprints[0].board.theme], ['calm', 'black']);
});

test('usage counts: no sign-in needed, the app origin only, junk refused', async () => {
  const body = { c: { d: 'desktop', l: 'en', v: '0.11.5' }, e: [{ n: 'open', a: 'first' }] };
  const post = (b, origin = ORIGIN) => fetch(API + '/e', { method: 'POST', headers: Object.assign({ 'content-type': 'text/plain' }, origin ? { origin } : {}), body: typeof b === 'string' ? b : JSON.stringify(b) });
  assert.equal((await post(body)).status, 204);
  assert.equal((await post(body, 'https://evil.example')).status, 403);
  assert.equal((await post(body, null)).status, 403);
  assert.equal((await post('not json')).status, 400);
  assert.equal((await post({ e: 'x' })).status, 400);
  assert.equal((await post('x'.repeat(20000))).status, 413);
});
