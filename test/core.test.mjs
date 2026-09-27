// Unit tests for the pure modules. Zero dependencies: node --test.
// Expected values are worked out by hand (the working is in the comments), never
// copied from the implementation's own expressions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRUM, cleanChar, drumPath, textToCells, fromVestaboardText, VB_CODES } from '../src/charset.js';
import { inWindow, inQuiet, nextPage } from '../src/schedule.js';
import { wrap, toCells, depMinutes, channelLines, compose, zonesFor } from '../src/content.js';
import { sanitizeBoard, encodeBoard, decodeBoard } from '../src/store.js';

// ---------- charset ----------
test('drum holds 73 flaps', () => {
  // 1 blank + 26 letters + 7 Nordic (Å Ä Ö Æ Ø Ü É) + 10 digits + 20 punctuation + 9 chips
  assert.equal(DRUM.length, 73);
});

test('Z to B goes forward the long way round', () => {
  // Z is flap 26, B is flap 2. Forward from 26 to 2 wraps: (2 - 26) mod 73 = 49 steps.
  const full = drumPath('Z', 'B');
  assert.equal(full.length, 49);
  assert.equal(full[0], 'Å');                 // flap 27, the one after Z
  assert.deepEqual(full.slice(-3), [' ', 'A', 'B']);
});

test('fast speed shows only the last 10 flaps before the target', () => {
  // Last 10 flaps ending at B (flap 2): flaps 66..72 are chips y g b v w k f, then 0 1 2.
  assert.deepEqual(drumPath('Z', 'B', 10), ['y', 'g', 'b', 'v', 'w', 'k', 'f', ' ', 'A', 'B']);
});

test('same flap to itself is a full turn (73)', () => {
  assert.equal(drumPath('A', 'A').length, 73);
});

test('typing: lowercase prints as capitals, Nordic letters stay themselves', () => {
  assert.deepEqual(cleanChar('ø'), { ch: 'Ø', valid: true });
  assert.deepEqual(cleanChar('é'), { ch: 'É', valid: true });
  assert.deepEqual(cleanChar('r'), { ch: 'R', valid: true });    // not the red chip
  assert.deepEqual(cleanChar('è'), { ch: 'E', valid: true });    // stand-in
  assert.deepEqual(cleanChar('~'), { ch: ' ', valid: false });   // blank, flagged
  assert.deepEqual(textToCells('Straße'), ['S', 'T', 'R', 'A', 'S', 'S', 'E']);
});

test('Vestaboard codes import', () => {
  assert.equal(VB_CODES[27], '1'); assert.equal(VB_CODES[36], '0');
  assert.equal(VB_CODES[40], '$'); assert.equal(VB_CODES[63], 'r'); assert.equal(VB_CODES[71], 'f');
  assert.deepEqual(fromVestaboardText('Hi {63}'), ['H', 'I', ' ', 'r']);
});

// ---------- schedule ----------
// 27 Sep 2026 is a Sunday, so Friday is 2 Oct and Saturday 3 Oct (local time).
const at = (d, hh, mm = 0) => new Date(2026, 9, d, hh, mm).getTime();

test('window crossing midnight belongs to the day it starts', () => {
  const fri = { on: true, from: '22:00', to: '02:00', days: [5] };
  assert.equal(inWindow(fri, at(2, 23)), true);    // Friday 23:00
  assert.equal(inWindow(fri, at(3, 1)), true);     // Saturday 01:00, still Friday's window
  assert.equal(inWindow(fri, at(3, 23)), false);   // Saturday's own evening: not a Friday
  assert.equal(inWindow(fri, at(2, 21, 59)), false);
  assert.equal(inWindow(fri, at(3, 2)), false);    // 02:00 is the end, exclusive
});

test('window with no days is every day; off is always', () => {
  const w = { on: true, from: '07:00', to: '09:00', days: [] };
  assert.equal(inWindow(w, at(3, 8)), true);
  assert.equal(inWindow(w, at(3, 9)), false);
  assert.equal(inWindow({ on: false, from: '07:00', to: '09:00' }, at(3, 12)), true);
  assert.equal(inWindow(null, at(3, 12)), true);
});

test('quiet hours', () => {
  const q = { on: true, from: '23:00', to: '07:00', mode: 'dim' };
  assert.equal(inQuiet(q, at(3, 3)), true);
  assert.equal(inQuiet(q, at(3, 12)), false);
  assert.equal(inQuiet({ ...q, on: false }, at(3, 3)), false);
});

test('playlist skips pages outside their window, falls back when none open', () => {
  const pages = [{ dur: 10, win: null }, { dur: 5, win: { on: true, from: '06:00', to: '07:00' } }];
  const noon = at(3, 12);
  // page 0 has run 11 s of its 10: expired. Page 1 is shut at noon, so back to page 0.
  assert.deepEqual(nextPage(pages, 0, noon - 11000, noon), { idx: 0, start: noon });
  // page 0 has run 4 s: keeps going
  assert.deepEqual(nextPage(pages, 0, noon - 4000, noon), { idx: 0, start: noon - 4000 });
  const shut = [{ dur: 10, win: { on: true, from: '06:00', to: '07:00' } }];
  assert.equal(nextPage(shut, 0, noon, noon).idx, -1);
  assert.equal(nextPage([], 0, noon, noon).idx, -1);
});

// ---------- content ----------
test('wrap', () => {
  assert.deepEqual(wrap('THE QUICK BROWN FOX', 9), ['THE QUICK', 'BROWN FOX']);
  assert.deepEqual(wrap('ABCDEFGHIJ', 4), ['ABCD', 'EFGH', 'IJ']);   // long word hard-cut
});

test('centred lines land in the middle', () => {
  // 3 rows x 6 cols, one line "HI": top = floor((3 - 1) / 2) = 1, left = floor((6 - 2) / 2) = 2
  const g = toCells({ lines: ['HI'] }, 3, 6);
  assert.equal(g[1].join(''), '  HI  ');
  assert.equal(g[0].join(''), '      ');
});

test('departure minutes are counted in Stockholm time', () => {
  // 03:00 UTC on 27 Sep 2026 is 05:00 in Stockholm (summer time, UTC+2).
  // A train expected at 05:07:30 Stockholm is 7.5 min away, shown as 7.
  const now = Date.UTC(2026, 8, 27, 3, 0, 0);
  assert.equal(depMinutes('2026-09-27T05:07:30', now), 7);
  assert.equal(depMinutes('2026-09-27T04:59:00', now), -1);
});

test('SL rows: line, destination, minutes right aligned', () => {
  const now = Date.UTC(2026, 8, 27, 3, 0, 0);
  const live = { sl: { 9117: { deps: [
    { line: '17', dest: 'Åkeshov', expected: '2026-09-27T05:04:10', mode: 'METRO' },
    { line: '4', dest: 'Gullmarsplan', expected: '2026-09-27T05:01:00', mode: 'BUS' }
  ] } } };
  const z = { r: 0, c: 0, h: 3, w: 22 };   // usable width 22 - 2 = 20
  const res = channelLines('sl', { site: 9117, name: 'Odenplan', modes: ['METRO'] }, z, now, 'en', live);
  // "17 " + "ÅKESHOV" = 10 chars, padded to 20 - 5 = 15, then "4 MIN"
  assert.deepEqual(res.lines, ['ODENPLAN', '17 ÅKESHOV     4 MIN']);
});

test('header layout: clock row plus body', () => {
  assert.deepEqual(zonesFor('header', 6, 22), [{ r: 0, c: 0, h: 1, w: 22 }, { r: 1, c: 0, h: 5, w: 22 }]);
  const g = compose({ layout: 'full', zones: [{ ch: 'message', o: { text: 'hello' } }] }, 3, 7, 0, 'en', {});
  assert.equal(g[1].join(''), ' HELLO ');
});

// ---------- store ----------
test('sanitizeBoard rebuilds hostile input into a valid board', () => {
  assert.equal(sanitizeBoard({ name: 'x' }), null);           // no pages
  const b = sanitizeBoard({
    name: 'Mine', theme: 'neon', rows: 99, size: 'custom', speed: 'authentic',
    pages: [{ layout: 'split', dur: 1, zones: [{ ch: 'message', o: { cells: [['<', 'a', 'r']] } }, { ch: 'evil' }] }]
  });
  assert.equal(b.theme, 'black');
  assert.equal(b.rows, 24);                                   // clamped
  assert.equal(b.speed, 'authentic');
  assert.equal(b.pages[0].dur, 3);                            // minimum 3 s
  assert.deepEqual(b.pages[0].zones[0].o.cells[0], [' ', 'A', 'r']);   // '<' blank, 'a' capital, 'r' chip
  assert.equal(b.pages[0].zones[1].ch, 'message');            // unknown channel replaced
});

test('board link round trip', async () => {
  const b = sanitizeBoard({ id: 'b1', name: 'Kök', pages: [{ id: 'p1', layout: 'full', zones: [{ ch: 'message', o: { lines: ['HEJ Ö'] } }] }] });
  const code = await encodeBoard(b);
  assert.match(code, /^[A-Za-z0-9_-]+$/);                     // URL safe
  assert.deepEqual(await decodeBoard(code), b);
  assert.equal(await decodeBoard('not-a-board'), null);
});
