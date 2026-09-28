// My boards (0.7.1): blueprints, copies of another size, and pasted Vestaboard messages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeBlueprint, sanitizeBoard, loadBoards, loadBlueprints } from '../src/store.js';
import { fixedCut, vestaboard, blank } from '../src/content.js';

test('a blueprint is one board with its size and theme, and no times', () => {
  const bp = sanitizeBlueprint({ id: 'm1', name: 'Welcome sign', rows: 6, cols: 22, theme: 'white', from: { kind: 'template', id: 'cafe' },
    page: { id: 'p1', name: 'Welcome', layout: 'full', dur: 12, wins: [{ from: '07:00', to: '08:00', days: [] }], alone: true, hue: 35, zones: [{ ch: 'clock', o: {} }] } });
  assert.equal(bp.theme, 'white'); assert.deepEqual(bp.from, { kind: 'template', id: 'cafe' });
  assert.equal(bp.page.hue, 35); assert.equal(bp.page.wins, undefined); assert.equal(bp.page.alone, undefined);
  assert.equal(sanitizeBlueprint({ name: 'x' }), null);
  assert.equal(sanitizeBlueprint({ page: {}, from: { kind: 'somewhere', id: 'x' } }).from, undefined);   // an unknown origin is dropped
});

test('a board keeps its hue and where it came from; boards from before 0.7.1 are unchanged', () => {
  const b = sanitizeBoard({ id: 'b', name: 'B', pages: [{ id: 'p', layout: 'full', hue: 190, from: { kind: 'blueprint', id: 'm1' }, zones: [] }, { id: 'q', layout: 'full', hue: 400, zones: [] }] });
  assert.equal(b.pages[0].hue, 190); assert.deepEqual(b.pages[0].from, { kind: 'blueprint', id: 'm1' });
  assert.equal('hue' in b.pages[1], false);
  const old = sanitizeBoard({ id: 'b', name: 'B', pages: [{ id: 'p', layout: 'full', zones: [] }] });
  assert.deepEqual(Object.keys(old.pages[0]), ['id', 'name', 'layout', 'dur', 'wins', 'win', 'zones']);
});

test('a copy to a smaller storyboard keeps typed cells centred and counts what is cut', () => {
  const cells = blank(6, 22); 'HELLO'.split('').forEach((c, i) => { cells[2][8 + i] = c; }); cells[0][0] = 'r'; cells[5][21] = 'b';
  const page = { layout: 'full', zones: [{ ch: 'message', o: { cells } }] };
  const same = fixedCut(page, 6, 22, 6, 22);
  assert.equal(same.lost, 0);
  const small = fixedCut(page, 6, 22, 3, 15);
  assert.equal(small.lost, 2);                                            // the two corner chips fall outside
  assert.equal(small.zones[0].o.cells.length, 3); assert.equal(small.zones[0].o.cells[0].length, 15);
  assert.equal(small.zones[0].o.cells[1].join('').trim(), 'HELLO');
  const lines = fixedCut({ layout: 'full', zones: [{ ch: 'message', o: { lines: ['A VERY LONG LINE OF TEXT'] } }] }, 6, 22, 3, 15);
  assert.equal(lines.lost, 0);                                            // lines are laid out again, never cut
});

test('a pasted Vestaboard message becomes one centred line per row', () => {
  const p = vestaboard('back at 14:00\n\nkeys in the\nblue bowl\n\n', 6, 22);
  assert.deepEqual(p.zones[0].o.lines, ['BACK AT 14:00', '', 'KEYS IN THE', 'BLUE BOWL']);
  assert.equal(vestaboard('a\nb\nc\nd', 3, 15).zones[0].o.lines.length, 3);
});

test('one damaged entry is dropped on its own, and the rest still load', () => {
  assert.equal(sanitizeBoard({ id: 'x', pages: [null] }).pages.length, 1);   // a null page no longer throws
  const store = { sf_boards: JSON.stringify([{ id: 'bad', pages: [null, { id: 'p', layout: 'full', zones: [] }] }, { id: 'good', name: 'Good', pages: [{ id: 'q', layout: 'full', zones: [] }] }, 7]),
    sf_myboards: JSON.stringify([null, { id: 'm1', name: 'Kept', page: { layout: 'full', zones: [] } }]) };
  globalThis.window = { localStorage: { getItem: k => store[k] ?? null, setItem: () => {} } };
  try {
    assert.deepEqual(loadBoards().boards.map(b => b.id), ['bad', 'good']);
    assert.deepEqual(loadBlueprints().map(b => b.name), ['Kept']);
  } finally { delete globalThis.window; }
});

test('where a board came from keeps the board it names', () => {
  assert.deepEqual(sanitizeBlueprint({ page: {}, from: { kind: 'storyboard', id: 'b1', board: 'p2' } }).from, { kind: 'storyboard', id: 'b1', board: 'p2' });
});
