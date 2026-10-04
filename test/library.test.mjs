// 0.10.1: one library of boards and playlists that point at them (src/library.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve, decompose, migrateData, loadModel, usedIn, soloOf, hid, contentKey } from '../src/library.js';
import { sanitizePlaylist, sanitizeSettings, sanitizeBlueprint, sanitizeBoard, sizeOf, dimsOfSize } from '../src/store.js';
import { merge, emptyState } from '../src/sync.js';

const lb = (id, name, extra = {}) => sanitizeBlueprint(Object.assign({ id, name, size: '6x22', rows: 6, cols: 22, theme: 'black', page: { id, name, layout: 'full', dur: 10, zones: [{ ch: 'message', o: { text: name.toUpperCase() } }] } }, extra));
const pl = (id, name, ids, extra = {}) => sanitizePlaylist(Object.assign({ id, name, items: ids.map(x => ({ id: x, dur: 8, wins: [] })) }, extra));

test('a playlist resolves to its boards, each at its own size and theme', () => {
  const lib = new Map([['a', lb('a', 'Weather')], ['b', lb('b', 'Big', { size: '12x40', rows: 12, cols: 40, theme: 'white' })]]);
  const r = resolve(pl('p', 'Morning', ['a', 'b']), lib);
  assert.deepEqual(r.pages.map(p => [p.id, p.size, p.rows, p.cols, p.theme, p.dur]), [['a', '6x22', 6, 22, 'black', 8], ['b', '12x40', 12, 40, 'white', 8]]);
  assert.equal(r.size, '6x22');                          // the playlist reads as its first board
});

test('taking an edited playlist apart changes the board everywhere it is used, and the times only here', () => {
  const lib = new Map([['a', lb('a', 'Weather')], ['b', lb('b', 'Clock')]]);
  const one = resolve(pl('p1', 'Morning', ['a', 'b']), lib), two = pl('p2', 'Office', ['a']);
  one.pages[0].zones[0].o.text = 'RAIN'; one.pages[0].wins = [{ from: '07:00', to: '08:00', days: [] }]; one.pages[1].dur = 30;
  const d = decompose(one, lib);
  assert.deepEqual(d.boards.map(x => x.id), ['a']);      // only the board whose content changed
  assert.equal(d.boards[0].page.dur, 10);                // its own default time is kept; 30 belongs to the playlist
  lib.set('a', d.boards[0]);
  assert.equal(resolve(two, lib).pages[0].zones[0].o.text, 'RAIN');
  assert.deepEqual(resolve(two, lib).pages[0].wins, []);
  assert.deepEqual(d.playlist.items.map(i => [i.id, i.dur, i.wins.length]), [['a', 8, 1], ['b', 30, 0]]);
});

test('a board still on its way keeps its place and is never written back', () => {
  const lib = new Map([['a', lb('a', 'Weather')]]);
  const r = resolve(pl('p', 'Morning', ['a', 'gone']), lib);
  assert.equal(r.pages[1].missing, true);
  const d = decompose(r, lib);
  assert.deepEqual(d.playlist.items.map(i => i.id), ['a', 'gone']); assert.deepEqual(d.boards, []);
  assert.equal(resolve(pl('p', 'Empty', []), lib).pages.length, 1);   // never a playlist with no page to draw
});

test('a new page is a new board at its own size, else its playlist\'s; a page in twice gets a second id', () => {
  const lib = new Map([['a', lb('a', 'Weather')]]);
  const r = resolve(pl('p', 'Morning', ['a']), lib);
  r.pages.push({ id: 'n1', name: 'New', layout: 'full', dur: 10, wins: [], zones: [{ ch: 'clock', o: {} }] });
  r.pages.push({ id: 'n2', name: 'Small', layout: 'full', dur: 10, wins: [], zones: [{ ch: 'clock', o: {} }], size: '3x15', rows: 3, cols: 15, theme: 'solari' });
  r.pages.push(Object.assign({}, r.pages[0]));
  const d = decompose(r, lib);
  assert.deepEqual(d.boards.map(x => [x.id, x.size, x.theme]), [['n1', '6x22', 'black'], ['n2', '3x15', 'solari'], [d.playlist.items[3].id, '6x22', 'black']]);
  assert.notEqual(d.playlist.items[3].id, 'a');
});

test('one-board playlists: solo only with one board, and a second board makes it a playlist', () => {
  assert.equal(pl('p', 'W', ['a'], { solo: true }).solo, true);
  assert.equal(pl('p', 'W', ['a', 'b'], { solo: true }).solo, undefined);
  const lib = new Map([['a', lb('a', 'Weather')], ['b', lb('b', 'Clock')]]);
  const r = resolve(pl('p', 'Weather', ['a'], { solo: true }), lib); r.pages.push(resolve(pl('q', 'x', ['b']), lib).pages[0]);
  assert.equal(decompose(r, lib).playlist.solo, undefined);
  const pls = [pl('p', 'Weather', ['a'], { solo: true }), pl('q', 'Both', ['a', 'b'])];
  assert.deepEqual(usedIn('a', pls).map(x => x.id), ['q']); assert.equal(soloOf('a', pls).id, 'p'); assert.equal(soloOf('b', pls), null);
});

test('sizes by name and by rows and columns', () => {
  assert.equal(sizeOf({ rows: 3, cols: 15 }), '3x15'); assert.equal(sizeOf({ rows: 5, cols: 30 }), 'custom'); assert.equal(sizeOf({ size: 'fill', rows: 6, cols: 22 }), 'fill');
  assert.deepEqual(dimsOfSize({ size: '12x40', rows: 6, cols: 22 }), { rows: 12, cols: 40 });   // the name wins over stale numbers
  const b = sanitizeBoard({ id: 'b', name: 'B', pages: [{ id: 'p', layout: 'full', zones: [], size: '3x15', rows: 3, cols: 15, theme: 'white' }] });
  assert.deepEqual([b.pages[0].size, b.pages[0].rows, b.pages[0].theme], ['3x15', 3, 'white']);   // a link carries each board's size
});

test('settings: Home and what was last shown, nothing else', () => {
  assert.deepEqual(sanitizeSettings({ id: 'home', place: { city: 'London', lat: 51.5, lon: -0.12, cc: 'GB' }, stops: [{ src: 'tr', id: 'x_1', name: 'A' }, { src: 'zz' }], cur: 'GBP' }),
    { id: 'home', place: { city: 'London', lat: 51.5, lon: -0.12, cc: 'GB' }, stops: [{ src: 'tr', id: 'x_1', name: 'A' }], cur: 'GBP' });
  assert.equal(sanitizeSettings({ id: 'other' }), null);
  assert.equal(sanitizeSettings({ id: 'last', pl: 'bad id!' }), null);
});

test('settings never make copies: a change in two places takes the account\'s', () => {
  const home = cur => ({ id: 'home', stops: [], cur });
  const st = { user: 'u', boards: { home: { rev: 1, dirty: true, owner: 'u' } } };
  const m = merge([home('SEK')], [{ id: 'home', rev: 2, board: home('GBP') }], st, 'u', { newId: () => 'x', noCopies: true });
  assert.deepEqual(m.boards, [home('GBP')]); assert.deepEqual(m.push, []);
  const g = merge([home('SEK')], [{ id: 'home', rev: 2, board: home('GBP') }], emptyState(), 'u', { newId: () => 'x', noCopies: true });
  assert.deepEqual([g.boards, g.guests], [[home('GBP')], []]);
});

test('the migration ids are the same everywhere, and a clash gets an id made from where it came from', () => {
  assert.equal(hid('p', 'b1/p1'), hid('p', 'b1/p1')); assert.notEqual(hid('p', 'b1/p1'), hid('p', 'b2/p1'));
  const sb = (id, name, pages) => sanitizeBoard({ id, name, size: '6x22', pages });
  const m = migrateData([sb('b1', 'A', [{ id: 'p1', name: 'X', layout: 'full', zones: [{ ch: 'clock', o: {} }] }, { id: 'p2', name: 'X', layout: 'full', zones: [{ ch: 'clock', o: {} }] }]),
    sb('b2', 'B', [{ id: 'p1', name: 'Y', layout: 'full', zones: [{ ch: 'quote', o: {} }] }])], []);
  assert.deepEqual(m.playlists[0].items.map(i => i.id), ['p1', 'p2']);   // identical twice in one playlist: two boards
  assert.equal(m.playlists[1].items[0].id, hid('p', 'b2/p1'));
  assert.ok(m.library.length === 3 && new Set(m.library.map(contentKey)).size === 2);
});

// A browser's storage, for the guest migration.
function store(init = {}) {
  const ls = new Map(Object.entries(init));
  const json = k => { try { return JSON.parse(ls.get(k)); } catch { return null; } };
  const api = {
    ls, getFlag: k => ls.has(k) ? ls.get(k) : null, setFlag: (k, v) => ls.set(k, v),
    loadBoards: () => { const raw = json('sf_boards') || []; const boards = raw.map(sanitizeBoard).filter(Boolean); const a = +(ls.get('sf_active') || 0); return { boards, active: boards[a] ? a : 0 }; },
    loadBlueprints: () => (json('sf_myboards') || []).map(sanitizeBlueprint).filter(Boolean),
    loadLibrary: () => { const v = json('sf_library'); return Array.isArray(v) ? v.map(sanitizeBlueprint) : null; },
    loadPlaylists: () => { const v = json('sf_playlists'); return Array.isArray(v) ? v.map(sanitizePlaylist) : null; },
    saveLibrary: l => ls.set('sf_library', JSON.stringify(l)), savePlaylists: l => ls.set('sf_playlists', JSON.stringify(l)),
    loadShown: () => ls.get('sf_shown') || '', saveShown: id => ls.set('sf_shown', id)
  };
  return api;
}
const OLD = JSON.stringify([{ id: 'b1', name: 'Morning', size: '6x22', pages: [{ id: 'p1', name: 'Clock', layout: 'full', zones: [{ ch: 'clock', o: {} }] }] }, { id: 'b2', name: 'Two', size: '6x22', pages: [{ id: 'q1', name: 'Q', layout: 'full', zones: [{ ch: 'quote', o: {} }] }, { id: 'q2', name: 'R', layout: 'full', zones: [{ ch: 'art', o: {} }] }] }]);

test('a guest migrates once, reading the old keys and never writing them', () => {
  const s = store({ sf_boards: OLD, sf_active: '1' });
  const a = loadModel(s);
  assert.equal(a.migrated, true); assert.deepEqual(a.playlists.map(p => p.id), ['b1', 'b2']);
  assert.equal(s.ls.get('sf_shown'), 'b2');
  assert.equal(s.ls.get('sf_boards'), OLD);
  s.ls.set('sf_boards', '[]');                          // an old tab writes the old key afterwards
  const b = loadModel(s);
  assert.equal(b.migrated, false); assert.deepEqual(b.playlists, a.playlists);
});

test('two tabs migrating at once write the same thing', () => {
  const one = store({ sf_boards: OLD }), two = store({ sf_boards: OLD });
  loadModel(one); loadModel(two);
  assert.equal(one.ls.get('sf_library'), two.ls.get('sf_library'));
  assert.equal(one.ls.get('sf_playlists'), two.ls.get('sf_playlists'));
});

test('a browser signed in before migrates with sync states in step', () => {
  const s = store({ sf_boards: OLD, sf_sync: JSON.stringify({ user: 'u', boards: { b1: { rev: 4, dirty: false, owner: 'u' } }, declined: [], offer: ['b2'] }) });
  loadModel(s);
  const pl = JSON.parse(s.ls.get('sf_sync_pl')), lib = JSON.parse(s.ls.get('sf_sync_lib'));
  assert.deepEqual(pl.boards, { b1: { rev: 1, dirty: false, owner: 'u' } }); assert.deepEqual(pl.offer, ['b2']);
  assert.deepEqual(lib.boards, { p1: { rev: 1, dirty: false, owner: 'u' } }); assert.deepEqual(lib.offer.sort(), ['q1', 'q2']);
});

test('the migration gives the same ids and content whatever order the storyboards come in', () => {
  const sb = (id, pages) => sanitizeBoard({ id, name: id, size: '6x22', pages });
  const a = sb('b2', [{ id: 'p1', name: 'C', layout: 'full', zones: [{ ch: 'clock', o: { fmt: '12' } }] }]), b = sb('b1', [{ id: 'p1', name: 'C', layout: 'full', zones: [{ ch: 'clock', o: {} }] }]);
  const bp = [lb('m2', 'Two'), lb('m1', 'One')];
  assert.deepEqual(migrateData([a, b], bp), migrateData([b, a], bp.slice().reverse()));
  assert.equal(migrateData([a, b], []).playlists.find(p => p.id === 'b1').items[0].id, 'p1');   // the lowest storyboard id keeps the shared page id
});
