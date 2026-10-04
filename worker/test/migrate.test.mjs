// The 0.10.1 move on the server (migrate in src/index.js), against a real SQLite with the
// same tables as D1: once, twice, two at once, and an old tab still writing board rows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { migrate } from '../src/index.js';
import { migrateData, seedStates } from '../../src/library.js';
import { sanitizeBoard } from '../../src/store.js';

// D1's surface, as migrate uses it: prepare, bind, first, all, run, batch.
function d1() {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE "user" (id TEXT PRIMARY KEY)');
  for (const f of ['0002_board.sql', '0003_blueprint.sql', '0006_playlist.sql']) db.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
  db.exec("INSERT INTO \"user\" (id) VALUES ('u1')");
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => db.prepare(sql).get(...args) || null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...args).changes) } }),
    now: () => db.prepare(sql).run(...args)
  });
  return { db, prepare: sql => stmt(sql), batch: async list => { db.exec('BEGIN'); try { for (const s of list) s.now(); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; } } };
}
const pg = (id, name, zones, extra = {}) => Object.assign({ id, name, layout: 'full', dur: 10, wins: [], zones }, extra);
const sb = (id, name, size, pages, extra = {}) => Object.assign({ id, name, size, rows: 6, cols: 22, theme: 'black', transition: 'classic', speed: 'fast', sound: false, quiet: { on: false, from: '23:00', to: '07:00', mode: 'dim' }, pages }, extra);
const OLD = [
  sb('b1', 'Morning', '6x22', [pg('p1', 'Clock', [{ ch: 'clock', o: {} }]), pg('p2', 'Hello', [{ ch: 'message', o: { text: 'HELLO' } }], { wins: [{ from: '07:00', to: '09:00', days: [1] }] })]),
  sb('b2', 'Kitchen', '3x15', [pg('p1', 'Clock', [{ ch: 'clock', o: {} }])]),
  sb('b3', 'Hello', '6x22', [pg('p9', 'Hello', [{ ch: 'message', o: { text: 'HELLO' } }])])
];
function seed(env) {
  for (const [i, b] of OLD.entries()) env.db.prepare('INSERT INTO board (user_id, id, rev, updated, deleted, json) VALUES (?, ?, ?, 0, 0, ?)').run('u1', b.id, i + 2, JSON.stringify(b));
  env.db.prepare("INSERT INTO blueprint (user_id, id, rev, updated, deleted, json) VALUES ('u1', 'm1', 3, 0, 0, ?)").run(JSON.stringify({ id: 'm1', name: 'Saved', rows: 6, cols: 22, theme: 'black', page: { id: 'px', name: 'Saved', layout: 'full', dur: 10, zones: [{ ch: 'bigtext', o: { text: 'HI' } }] } }));
  env.db.prepare("INSERT INTO blueprint (user_id, id, rev, updated, deleted, json) VALUES ('u1', 'p9', 4, 0, 1, NULL)").run();   // a deleted row with a page's id
}
const dump = env => ({ pl: env.db.prepare('SELECT id, rev, json FROM playlist ORDER BY id').all().map(r => ({ ...r })), bp: env.db.prepare('SELECT id, rev, deleted, json FROM blueprint ORDER BY id').all().map(r => ({ ...r })), board: env.db.prepare('SELECT id, rev, json FROM board ORDER BY id').all().map(r => ({ ...r })) });

test('storyboards become playlists, and their pages boards, once, at revision 1', async () => {
  const env = { DB: d1() }; seed(env.DB);
  assert.equal(await migrate(env, 'u1'), true);
  const d = dump(env.DB), pls = Object.fromEntries(d.pl.map(r => [r.id, JSON.parse(r.json)]));
  assert.deepEqual(Object.keys(pls), ['b1', 'b2', 'b3']);
  assert.ok(d.pl.every(r => r.rev === 1));
  assert.deepEqual(pls.b1.items.map(i => i.id), ['p1', 'p2']);
  assert.deepEqual(pls.b1.items[1].wins, [{ from: '07:00', to: '09:00', days: [1] }]);   // times stay with the playlist
  assert.notEqual(pls.b2.items[0].id, 'p1');                                            // the same id at another size is another board
  assert.deepEqual(pls.b3.items.map(i => i.id), ['p2']);                                // an identical board is shared
  assert.equal(pls.b3.solo, true);                                                      // one board named as its board
  const live = d.bp.filter(r => !r.deleted).map(r => r.id).sort();
  assert.deepEqual(live, ['m1', 'p1', 'p2', pls.b2.items[0].id].sort());
  assert.equal(d.bp.find(r => r.id === 'm1').rev, 3);                                  // an existing board is not touched
  assert.equal(d.bp.find(r => r.id === 'p9').deleted, 1);                              // nor a deleted one, whose id is not reused
  assert.equal(JSON.parse(d.bp.find(r => r.id === pls.b2.items[0].id).json).size, '3x15');
  assert.deepEqual(d.board.map(r => r.rev), [2, 3, 4]);                                 // the old rows stay, as the way back
});

test('run twice, the second does nothing', async () => {
  const env = { DB: d1() }; seed(env.DB);
  await migrate(env, 'u1'); const once = dump(env.DB);
  assert.equal(await migrate(env, 'u1'), false);
  assert.deepEqual(dump(env.DB), once);
});

test('two at once write the same rows, never two copies', async () => {
  const a = { DB: d1() }; seed(a.DB);
  await Promise.all([migrate(a, 'u1'), migrate(a, 'u1'), migrate(a, 'u1')]);
  const b = { DB: d1() }; seed(b.DB); await migrate(b, 'u1');
  const strip = d => ({ pl: d.pl.map(r => [r.id, r.rev, r.json]), bp: d.bp.map(r => [r.id, r.rev, r.json]) });
  assert.deepEqual(strip(dump(a.DB)), strip(dump(b.DB)));
  assert.equal(a.DB.db.prepare('SELECT COUNT(*) AS n FROM migration').get().n, 1);
});

test('an old tab still writing board rows after the move changes nothing in 0.10.1', async () => {
  const env = { DB: d1() }; seed(env.DB);
  await migrate(env, 'u1'); const after = dump(env.DB);
  env.DB.db.prepare("UPDATE board SET rev = rev + 1, json = ? WHERE id = 'b1'").run(JSON.stringify(sb('b1', 'Edited by 0.10.0', '6x22', [pg('p1', 'Clock', [{ ch: 'clock', o: {} }])])));
  env.DB.db.prepare("INSERT INTO board (user_id, id, rev, updated, deleted, json) VALUES ('u1', 'b7', 1, 0, 0, ?)").run(JSON.stringify(sb('b7', 'New in 0.10.0', '6x22', [pg('q1', 'Q', [{ ch: 'clock', o: {} }])])));
  await migrate(env, 'u1');
  const now = dump(env.DB);
  assert.deepEqual(now.pl, after.pl); assert.deepEqual(now.bp, after.bp);
});

test('a browser that syncs with the account migrates to the same ids, in step at revision 1', () => {
  const m = migrateData(OLD.map(sanitizeBoard), []);
  const s = seedStates(m, { user: 'u1', boards: { b1: { rev: 2, dirty: false, owner: 'u1' }, b2: { rev: 3, dirty: true, owner: 'u1' }, b9: { rev: 0, dirty: true, owner: 'u1' } } }, null);
  assert.deepEqual(s.pl.boards.b1, { rev: 1, dirty: false, owner: 'u1' });
  assert.deepEqual(s.pl.boards.b2, { rev: 1, dirty: true, owner: 'u1' });       // changes the server did not get still go up
  assert.equal(s.pl.boards.b3, undefined);                                        // a guest's stays a guest's
  assert.deepEqual(s.lib.boards.p1, { rev: 1, dirty: false, owner: 'u1' });
  assert.equal(s.lib.user, 'u1');
  const again = migrateData(OLD.map(sanitizeBoard), []);
  assert.deepEqual(again, m);                                                     // the same input, the same answer, anywhere
});

test('the order rows arrive in never changes an id: a duplicated storyboard, shuffled three ways (0.10.1 review)', async () => {
  // Morning duplicated to Office before 0.10.1, both with page p1, and Office's clock then set to 12 hours
  const morning = sb('b_zz', 'Morning', '6x22', [pg('p1', 'Clock', [{ ch: 'clock', o: { fmt: '24' } }]), pg('p2', 'Hi', [{ ch: 'message', o: { text: 'HI' } }])]);
  const office = sb('b_aa', 'Office', '6x22', [pg('p1', 'Clock', [{ ch: 'clock', o: { fmt: '12' } }]), pg('p2', 'Hi', [{ ch: 'message', o: { text: 'HI' } }])]);
  const third = sb('b_mm', 'Hall', '6x22', [pg('p1', 'Clock', [{ ch: 'clock', o: { fmt: '24' } }])]);
  const list = [morning, office, third].map(sanitizeBoard), orders = [list, [list[1], list[0], list[2]], [list[2], list[1], list[0]]];
  const runs = orders.map(o => migrateData(o, []));
  for (const r of runs.slice(1)) assert.deepEqual(r, runs[0]);
  // the server, with its rows written in another order, agrees with a browser holding them in list order
  const env = { DB: d1() };
  for (const b of [office, third, morning]) env.DB.db.prepare('INSERT INTO board (user_id, id, rev, updated, deleted, json) VALUES (?, ?, 1, 0, 0, ?)').run('u1', b.id, JSON.stringify(b));
  await migrate(env, 'u1');
  const server = env.DB.db.prepare('SELECT id, json FROM playlist ORDER BY id').all().map(r => [r.id, JSON.parse(r.json).items.map(i => i.id)]);
  const browser = migrateData(OLD.length ? [morning, office, third].map(sanitizeBoard) : [], []).playlists.slice().sort((a, b) => a.id < b.id ? -1 : 1).map(p => [p.id, p.items.map(i => i.id)]);
  assert.deepEqual(server, browser);
  const lib = Object.fromEntries(env.DB.db.prepare('SELECT id, json FROM blueprint').all().map(r => [r.id, JSON.parse(r.json)]));
  for (const b of runs[0].library) assert.deepEqual(lib[b.id], b);   // the same content under each id
});
