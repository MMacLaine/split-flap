// The boards API end to end, against `wrangler dev --env dev` on localhost:8787 with
// DEV_TEST=1 and a local D1 (see worker/README.md). Sessions come from the test-only
// /dev/session route, so Google is not involved; Google sign-in is checked by hand.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.API || 'http://localhost:8787', API = BASE + '/split-flap/api', ORIGIN = new URL(BASE).origin;
const run = Math.random().toString(36).slice(2, 8);

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
  assert.deepEqual(ex.body.boards.map(b => b.name), ['Keep']);
  const del = await call(c, 'DELETE', '/account');
  assert.equal(del.status, 200, JSON.stringify(del.body));
  assert.equal((await call(c, 'GET', '/me')).status, 401);
  const again = await session(email);                                  // a new account with the same email starts empty
  assert.deepEqual((await call(again, 'GET', '/boards')).body.boards, []);
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
  assert.deepEqual((await call(c, 'GET', '/export')).body.blueprints.map(b => b.name), ['Keep']);
  assert.equal((await call(c, 'DELETE', '/account')).status, 200);
  const again = await session(email);
  assert.deepEqual((await call(again, 'GET', '/blueprints')).body.blueprints, []);
});
