// Sync rules for accounts (0.5): merge, guest boards, deletes, and whose boards are
// whose on a shared computer. Pure functions, no server.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { merge, adopt, markDirty, markDeleted, pushed, offerable, signOut, switchUser, emptyState, refused, unrefuse, unsynced, strays, settled } from '../src/sync.js';

let n = 0; const newId = () => 'copy' + (++n);
const B = (id, name = id) => ({ id, name, pages: [] });
const R = (id, rev, name = id, deleted = false) => ({ id, rev, deleted, board: deleted ? null : B(id, name) });
const st = (entries, user = 'u1') => ({ user, boards: entries });
const names = r => r.boards.map(b => b.name).sort();

test('only on the server: taken; a tombstone is ignored', () => {
  const r = merge([], [R('a', 3), R('b', 2, 'b', true)], emptyState(), 'u1', { newId });
  assert.deepEqual(names(r), ['a']);
  assert.deepEqual(r.state.boards.a, { rev: 3, dirty: false, owner: 'u1' });
  assert.deepEqual(r.push, []);
});

test('guest boards are never pushed until the account adopts them', () => {
  const g = merge([B('g')], [], emptyState(), 'u1', { newId });
  assert.deepEqual([names(g), g.push], [['g'], []]);
  const s = adopt(emptyState(), ['g'], 'u1');
  const a = merge([B('g')], [], s, 'u1', { newId });
  assert.deepEqual(a.push, ['g']);
});

test('server unchanged: pushed only if changed here', () => {
  const clean = merge([B('a')], [R('a', 4)], st({ a: { rev: 4, dirty: false, owner: 'u1' } }), 'u1', { newId });
  assert.deepEqual(clean.push, []);
  const dirty = merge([B('a', 'edited')], [R('a', 4)], st({ a: { rev: 4, dirty: true, owner: 'u1' } }), 'u1', { newId });
  assert.deepEqual([names(dirty), dirty.push], [['edited'], ['a']]);
});

test('server changed, this browser did not: the server version is taken, or removed', () => {
  const r = merge([B('a', 'old')], [R('a', 5, 'new')], st({ a: { rev: 4, dirty: false, owner: 'u1' } }), 'u1', { newId });
  assert.deepEqual([names(r), r.push], [['new'], []]);
  const d = merge([B('a')], [R('a', 5, 'a', true)], st({ a: { rev: 4, dirty: false, owner: 'u1' } }), 'u1', { newId });
  assert.deepEqual([d.boards.length, d.state.boards.a], [0, undefined]);
});

test('changed in both places: the server keeps the id, the local edit becomes a pushed copy', () => {
  const r = merge([B('a', 'mine')], [R('a', 5, 'theirs')], st({ a: { rev: 4, dirty: true, owner: 'u1' } }), 'u1', { suffix: ' (copy)', newId });
  assert.deepEqual(names(r), ['mine (copy)', 'theirs']);
  const copy = r.boards.find(b => b.name.startsWith('mine'));
  assert.notEqual(copy.id, 'a');
  assert.deepEqual(r.push, [copy.id]);
  // deleted elsewhere while edited here: the edit survives as a copy
  const d = merge([B('a', 'mine')], [R('a', 5, 'a', true)], st({ a: { rev: 4, dirty: true, owner: 'u1' } }), 'u1', { newId });
  assert.deepEqual(names(d), ['mine (copy)']);
});

test('a delete here is sent, unless the board was edited elsewhere since', () => {
  const s = markDeleted(st({ a: { rev: 4, dirty: false, owner: 'u1' } }), 'a');
  const r = merge([], [R('a', 4)], s, 'u1', { newId });
  assert.deepEqual([r.boards.length, r.push], [0, ['a']]);
  assert.equal(pushed(r.state, 'a', 5).boards.a, undefined);         // forgotten once the server has it
  const e = merge([], [R('a', 6, 'edited')], s, 'u1', { newId });
  assert.deepEqual([names(e), e.push], [['edited'], []]);            // the edit wins over the delete
});

test('a guest board with the same id as a server board becomes a copy', () => {
  const r = merge([B('a', 'guest')], [R('a', 2, 'server')], emptyState(), 'u1', { suffix: ' (copy)', newId });
  assert.deepEqual(names(r), ['guest (copy)', 'server']);
  assert.deepEqual(r.push, []);
});

test('sign out keeps only boards that were never synced', () => {
  const s = st({ a: { rev: 2, dirty: false, owner: 'u1' } });
  const r = signOut([B('a'), B('g')], s);
  assert.deepEqual([names(r), r.state], [['g'], emptyState()]);
});

test('another account never gets the last one\'s boards', () => {
  const s = st({ a: { rev: 2, dirty: false, owner: 'u1' }, b: { rev: 3, dirty: true, owner: 'u1' } });
  const boards = [B('a'), B('b'), B('g')];
  assert.deepEqual(offerable(boards, s).map(b => b.id), ['g']);
  const sw = switchUser(boards, s, 'u2');
  assert.deepEqual(names(sw), ['b', 'g']);                           // a is safe on the server; b waits for u1
  assert.equal(sw.state.user, 'u2');
  const m = merge(sw.boards, [], sw.state, 'u2', { newId });
  assert.deepEqual(m.push, []);                                      // u1's board is not pushed to u2
  assert.deepEqual(offerable(sw.boards, sw.state).map(b => b.id), ['g']);
});

test('marking changes only touches synced boards', () => {
  assert.deepEqual(markDirty(emptyState(), 'g'), emptyState());
  assert.equal(markDirty(st({ a: { rev: 1, dirty: false, owner: 'u1' } }), 'a').boards.a.dirty, true);
});

// ---------- 0.5.2: from the review of the build ----------
test('sign out keeps boards whose changes have not reached the account', () => {
  const s = st({ a: { rev: 2, dirty: true, owner: 'u1' }, b: { rev: 3, dirty: false, owner: 'u1' } });
  assert.deepEqual(unsynced(s), ['a']);
  const r = signOut([B('a'), B('b'), B('g')], s);
  assert.deepEqual(names(r), ['a', 'g']);                                // a stays as a guest board, b is safe on the server
  assert.deepEqual(r.state, emptyState());
});

test('edits made while signed out survive a server that moved on, as a copy', () => {
  // the session ran out; the app kept marking the account's boards changed
  const s = markDirty(st({ a: { rev: 4, dirty: false, owner: 'u1' } }), 'a');
  const r = merge([B('a', 'offline edit')], [R('a', 6, 'phone edit')], s, 'u1', { suffix: ' (copy)', newId });
  assert.deepEqual(names(r), ['offline edit (copy)', 'phone edit']);
});

test('a refused board is kept here, skipped, and tried again once it changes', () => {
  let s = st({ a: { rev: 0, dirty: true, owner: 'u1' }, b: { rev: 0, dirty: true, owner: 'u1' } });
  s = refused(s, 'a', 'too_many_boards');
  const r = merge([B('a'), B('b')], [], s, 'u1', { newId });
  assert.deepEqual(r.push, ['b']);                                        // b is not held up by a
  assert.equal(r.state.boards.a.error, 'too_many_boards');
  const again = merge([B('a'), B('b')], [], markDirty(r.state, 'a'), 'u1', { newId });
  assert.ok(again.push.includes('a'));
});

test('boards refused for the limit go again once there is room, other refusals stay', () => {
  let s = st({ a: { rev: 0, dirty: true, owner: 'u1' }, b: { rev: 0, dirty: true, owner: 'u1' } });
  s = refused(refused(s, 'a', 'too_many_boards'), 'b', 'too_big');
  const r = merge([B('a'), B('b')], [], unrefuse(s, 'too_many_boards'), 'u1', { newId });
  assert.deepEqual(r.push, ['a']);
  assert.equal(r.state.boards.b.error, 'too_big');
});

test('after the server is restored to an older copy or delete, the newer board here goes back up in place', () => {
  const s = st({ a: { rev: 5, dirty: false, owner: 'u1' }, b: { rev: 4, dirty: false, owner: 'u1' }, c: { rev: 6, dirty: false, owner: 'u1' } });
  const r = merge([B('a', 'Newer'), B('b', 'Same'), B('c', 'Alive')], [R('a', 3, 'Older'), R('b', 2, 'Same'), R('c', 4, 'c', true)], s, 'u1', { newId });
  assert.deepEqual(names(r), ['Alive', 'Newer', 'Same']);                  // no copies, and c is not removed by the older delete
  assert.deepEqual(r.push.sort(), ['a', 'c']);                             // b has the same content, nothing to send
  assert.deepEqual([r.state.boards.a, r.state.boards.c.rev, r.state.boards.b.dirty], [{ rev: 3, dirty: true, owner: 'u1' }, 4, false]);
});

test('a board made while the account could not be reached is the account\'s, guest boards on offer are not', () => {
  const s = st({ a: { rev: 1, dirty: false, owner: 'u1' } });
  assert.deepEqual(strays([B('a'), B('made-offline'), B('offered'), B('declined')], s, ['offered', 'declined']), ['made-offline']);
  assert.deepEqual(strays([B('x')], emptyState()), []);                  // no account in this browser: a guest
});

test('the first sign-in confirmation ends even when a kept board is deleted before it reaches the server', () => {
  const s = st({ a: { rev: 3, dirty: false, owner: 'u1' }, b: { rev: 0, dirty: true, owner: 'u1', deleted: true }, d: { rev: 0, dirty: true, owner: 'u1' } });
  assert.deepEqual(settled(s, ['a', 'b', 'c', 'd']), { done: ['a'], open: ['d'] });   // b deleted, c forgotten after its delete, d on its way
  assert.deepEqual(settled(pushed(s, 'd', 1), ['a', 'b', 'c', 'd']), { done: ['a', 'd'], open: [] });
});

test('a board deleted before its first push is forgotten, so the status can settle', () => {
  const s = markDeleted(adopt(st({}), ['n'], 'u1'), 'n');
  const r = merge([], [], s, 'u1', { newId });
  assert.deepEqual([r.state.boards.n, r.push], [undefined, []]);
});

test('a guest board that clashes with an account board becomes a copy that is offered, not taken', () => {
  const r = merge([B('a', 'guest')], [R('a', 2, 'server')], emptyState(), 'u1', { suffix: ' (copy)', newId });
  const copy = r.boards.find(b => b.name === 'guest (copy)');
  assert.deepEqual(r.guests, [copy.id]);
  assert.equal(r.state.boards[copy.id], undefined);                      // no entry: still a guest board
});
