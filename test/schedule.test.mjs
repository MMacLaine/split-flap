// When pages show, from 0.3: several windows per page, windows on a date, Show alone,
// and the upgrade of boards saved by 0.2. Run with TZ=Europe/Stockholm (npm test sets it).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inWindow, inWindows, pageWins, nextPage } from '../src/schedule.js';
import { sanitizeBoard, encodeBoard, decodeBoard } from '../src/store.js';

// 29 September 2026 is a Tuesday, 3 October a Saturday.
const at = (m, d, hh, mm = 0, y = 2026) => new Date(y, m - 1, d, hh, mm).getTime();
const board = pages => ({ id: 'b1', name: 'B', pages: pages.map((p, i) => Object.assign({ id: 'p' + i, name: 'P' + i, layout: 'full', dur: 10, zones: [{ ch: 'clock', o: {} }] }, p)) });

test('two windows on one page open and close at the right minutes', () => {
  const wins = [{ from: '06:30', to: '07:15', days: [1, 2, 3, 4, 5] }, { from: '09:00', to: '11:00', days: [6] }];
  assert.equal(inWindows(wins, at(9, 29, 6, 29)), false);
  assert.equal(inWindows(wins, at(9, 29, 6, 30)), true);
  assert.equal(inWindows(wins, at(9, 29, 7, 14)), true);
  assert.equal(inWindows(wins, at(9, 29, 7, 15)), false);
  assert.equal(inWindows(wins, at(9, 29, 10)), false);    // Tuesday, not the Saturday window
  assert.equal(inWindows(wins, at(10, 3, 10)), true);     // Saturday 10:00
  assert.equal(inWindows(wins, at(10, 3, 6, 45)), false); // Saturday morning, not a weekday
  assert.equal(inWindows([], at(10, 3, 3)), true);        // no windows: any time
});

test('a 0.2 board upgrades: one window becomes a list of one, a switched off window none', () => {
  const b = sanitizeBoard(board([
    { win: { on: true, from: '06:30', to: '07:15', days: [1, 2, 3, 4, 5] } },
    { win: { on: false, from: '08:00', to: '09:00', days: [] } },
    { win: null }, {}
  ]));
  assert.deepEqual(b.pages[0].wins, [{ from: '06:30', to: '07:15', days: [1, 2, 3, 4, 5] }]);
  assert.deepEqual(b.pages[1].wins, []);
  assert.deepEqual(b.pages[2].wins, []);
  assert.deepEqual(b.pages[3].wins, []);
  // a legacy page object (never sanitized) still schedules the same way
  assert.deepEqual(pageWins({ win: { on: true, from: '06:00', to: '07:00' } }), [{ on: true, from: '06:00', to: '07:00' }]);
  assert.deepEqual(pageWins({ win: { on: false, from: '06:00', to: '07:00' } }), []);
});

test('the list is cut at eight windows, and bad times fall back', () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ from: `0${i % 10}:00`, to: '23:00', days: [i % 7] }));
  const b = sanitizeBoard(board([{ wins: many }, { wins: [{ from: 'soon', to: '25:99', days: [9, 'x', 3, 3] }] }]));
  assert.equal(b.pages[0].wins.length, 8);
  assert.deepEqual(b.pages[1].wins, [{ from: '07:00', to: '09:00', days: [3] }]);
});

test('0.2 wall screens still read the first window', () => {
  const b = sanitizeBoard(board([{ wins: [{ from: '06:30', to: '07:15', days: [1] }, { from: '17:00', to: '18:00', days: [] }] }, { wins: [] }]));
  assert.deepEqual(b.pages[0].win, { on: true, from: '06:30', to: '07:15', days: [1] });
  assert.equal(b.pages[1].win, null);
});

test('a link carries the windows as the editor left them', async () => {
  const raw = board([{ wins: [{ from: '06:30', to: '07:15', days: [1] }], win: { on: true, from: '01:00', to: '02:00', days: [] } }]);
  const back = await decodeBoard(await encodeBoard(raw));
  assert.deepEqual(back.pages[0].wins, [{ from: '06:30', to: '07:15', days: [1] }]);
  assert.equal(back.pages[0].win.from, '06:30');           // the old copy follows the list
});

test('the playlist uses every window of a page', () => {
  const pages = [{ dur: 10, wins: [{ from: '06:00', to: '07:00', days: [] }, { from: '18:00', to: '19:00', days: [] }] }];
  assert.equal(nextPage(pages, -1, 0, at(9, 29, 18, 30)).idx, 0);
  assert.equal(nextPage(pages, -1, 0, at(9, 29, 12)).idx, -1);
  assert.equal(inWindow({ from: '06:00', to: '07:00', days: [] }, at(9, 29, 6, 30)), true);   // no on flag needed
});

test('a yearly date shows on its day every year, a one-off only in its year', () => {
  const bday = { from: '00:00', to: '00:00', date: '2026-03-14', yearly: true };
  assert.equal(inWindow(bday, at(3, 14, 12)), true);
  assert.equal(inWindow(bday, at(3, 14, 12, 0, 2029)), true);
  assert.equal(inWindow(bday, at(3, 15, 12)), false);
  const once = { from: '09:00', to: '17:00', date: '2027-03-14' };
  assert.equal(inWindow(once, at(3, 14, 12, 0, 2027)), true);
  assert.equal(inWindow(once, at(3, 14, 12, 0, 2028)), false);
  assert.equal(inWindow(once, at(3, 14, 8, 0, 2027)), false);
});

test('a date window crossing midnight belongs to the day it starts', () => {
  const eve = { from: '22:00', to: '02:00', date: '2026-12-24', yearly: true };
  assert.equal(inWindow(eve, at(12, 24, 23)), true);
  assert.equal(inWindow(eve, at(12, 25, 1)), true);        // 01:00 on the 25th, still the 24th's window
  assert.equal(inWindow(eve, at(12, 25, 23)), false);
  assert.equal(inWindow(eve, at(12, 24, 1)), false);       // the 23rd's night is not the 24th
});

test('29 February only matches in leap years', () => {
  const leap = { from: '00:00', to: '00:00', date: '2028-02-29', yearly: true };
  assert.equal(inWindow(leap, at(2, 29, 12, 0, 2032)), true);
  assert.equal(inWindow(leap, at(3, 1, 12, 0, 2029)), false);   // not moved to 1 March in 2029
  assert.equal(inWindow(leap, at(2, 28, 12, 0, 2029)), false);
});

test('the sanitizer keeps real dates only, and a date replaces the days', () => {
  const b = sanitizeBoard(board([{ wins: [
    { from: '08:00', to: '09:00', date: '2026-03-14', yearly: true, days: [1, 2] },
    { from: '08:00', to: '09:00', date: '2026-04-31' },
    { from: '08:00', to: '09:00', date: '2026-02-29', yearly: 'yes' },
    { from: '08:00', to: '09:00', date: '2028-02-29', yearly: 1 }
  ] }]));
  const w = b.pages[0].wins;
  assert.deepEqual(w[0], { from: '08:00', to: '09:00', days: [], date: '2026-03-14', yearly: true });
  assert.equal(w[1].date, undefined);       // 31 April does not exist
  assert.equal(w[2].date, undefined);       // 2026 is not a leap year
  assert.deepEqual(w[3], { from: '08:00', to: '09:00', days: [], date: '2028-02-29' });   // yearly must be true, not truthy
  assert.equal(sanitizeBoard(board([{ wins: [w[0]] }])).pages[0].win, null);   // no 0.2 shape for a dated window
});

test('Show alone: the morning trains own their slot', () => {
  const trains = { dur: 10, alone: true, wins: [{ from: '06:30', to: '07:15', days: [1, 2, 3, 4, 5] }] };
  const weather = { dur: 10, wins: [] };
  const evening = { dur: 10, wins: [{ from: '17:00', to: '22:00', days: [] }] };
  const pages = [trains, weather, evening];
  const seen = now => { const out = new Set(); let idx = -1, start = 0; for (let i = 0; i < 6; i++) { const n = nextPage(pages, idx, start, now + i * 11000); idx = n.idx; start = n.start; out.add(idx); } return [...out].sort(); };
  assert.deepEqual(seen(at(9, 29, 6, 45)), [0]);            // Tuesday 06:45: trains only
  assert.deepEqual(seen(at(9, 29, 7, 20)), [1]);            // after the window: weather (evening is shut)
  assert.deepEqual(seen(at(10, 3, 6, 45)), [1]);            // Saturday: the window is shut, weather shows
  // the current page is dropped at once when a Show alone window opens
  assert.equal(nextPage(pages, 1, at(9, 29, 6, 30) - 2000, at(9, 29, 6, 30)).idx, 0);
});

test('two Show alone pages whose windows overlap both show; other windowed pages in their window too', () => {
  const a = { dur: 10, alone: true, wins: [{ from: '06:00', to: '08:00', days: [] }] };
  const b = { dur: 10, alone: true, wins: [{ from: '07:00', to: '09:00', days: [] }] };
  const c = { dur: 10, wins: [{ from: '07:00', to: '07:30', days: [] }] };
  const d = { dur: 10, wins: [] };
  let idx = -1, start = 0; const shown = new Set(), now = at(9, 29, 7, 10);
  for (let i = 0; i < 8; i++) { const n = nextPage([a, b, c, d], idx, start, now + i * 11000); idx = n.idx; start = n.start; shown.add(idx); }
  assert.deepEqual([...shown].sort(), [0, 1, 2]);
});

test('without Show alone a board behaves as in 0.2', () => {
  const pages = [{ dur: 10, wins: [{ from: '06:30', to: '07:15', days: [] }] }, { dur: 10, wins: [] }];
  let idx = -1, start = 0; const shown = new Set(), now = at(9, 29, 6, 45);
  for (let i = 0; i < 4; i++) { const n = nextPage(pages, idx, start, now + i * 11000); idx = n.idx; start = n.start; shown.add(idx); }
  assert.deepEqual([...shown].sort(), [0, 1]);
  const b = sanitizeBoard(board([{ alone: true, wins: [] }, { alone: 'yes', wins: [{ from: '06:00', to: '07:00' }] }, { alone: true, wins: [{ from: '06:00', to: '07:00' }] }]));
  assert.deepEqual(b.pages.map(p => !!p.alone), [false, false, true]);   // only with a window, only a real true
});

test('a page keeps a valid transition of its own and drops a bad one', () => {
  const b = sanitizeBoard(board([{ tr: 'wave' }, { tr: 'explode' }, {}]));
  assert.deepEqual(b.pages.map(p => p.tr), ['wave', undefined, undefined]);
});

test('hearts from a phone become the heart flap, and 0.2 boards are unchanged', async () => {
  const { textToCells, cleanChar } = await import('../src/charset.js');
  assert.deepEqual(textToCells('I ❤️ U'), ['I', ' ', '♥', ' ', 'U']);
  assert.deepEqual(textToCells('♡♥'), ['♥', '♥']);
  assert.deepEqual(cleanChar('❤'), { ch: '♥', valid: true });
  const old = board([{ zones: [{ ch: 'message', o: { cells: [['H', 'E', 'J', 'r', '°']] } }] }]);
  const once = sanitizeBoard(old), twice = sanitizeBoard(JSON.parse(JSON.stringify(once)));
  assert.deepEqual(twice, once);
  assert.deepEqual(once.pages[0].zones[0].o.cells[0].slice(0, 5), ['H', 'E', 'J', 'r', '°']);
});

test('coloured squares place chips in the composer, and only there', async () => {
  const { composerInput, textToCells } = await import('../src/charset.js');
  assert.deepEqual(composerInput('🟥🟧🟨🟩🟦🟪⬜⬛'), { cells: ['r', 'o', 'y', 'g', 'b', 'v', 'w', 'k'], invalid: [] });
  assert.deepEqual(composerInput('⬜️A'), { cells: ['w', 'A'], invalid: [] });            // with the presentation selector
  assert.deepEqual(composerInput('🟫'), { cells: [' '], invalid: ['🟫'] });              // brown has no chip
  assert.deepEqual(textToCells('🟥'), [' ']);                                           // free text: never a chip
});

test('rolls are kept when switched on and dropped otherwise', () => {
  const pick = roll => sanitizeBoard(Object.assign(board([{}]), { roll })).roll;
  assert.deepEqual(pick({ start: true, hourly: false }), { start: true, hourly: false });
  assert.deepEqual(pick({ start: 'yes', hourly: true }), { start: false, hourly: true });
  assert.equal(pick({ start: false, hourly: false }), undefined);
  assert.equal(pick('fast'), undefined);
});

test('the version is read from the text of changelog.js itself', async () => {
  const { readFileSync } = await import('node:fs');
  const { versionIn, VERSION } = await import('../src/changelog.js');
  const text = readFileSync(new URL('../src/changelog.js', import.meta.url), 'utf8');
  assert.equal(versionIn(text), VERSION);
  assert.equal(versionIn("  {\n    v: '0.9', date: '2027-01-01',\n  },\n  {\n    v: '0.8',"), '0.9');
  assert.equal(versionIn('<html>502 Bad Gateway</html>'), null);
});

// 0.11.4: the drag rules shared by the Week view and a board's own strip
test('movedWin: move, start and end, never inverted, and a move past midnight changes the day', async () => {
  const { movedWin, newWin } = await import('../src/schedule.js');
  const w = { from: '09:00', to: '10:00', days: [1] };
  assert.deepEqual(movedWin(w, 'move', 30), { from: '09:30', to: '10:30', days: [1] });
  assert.deepEqual(movedWin(w, 'start', -60), { from: '08:00', to: '10:00', days: [1] });
  assert.deepEqual(movedWin(w, 'start', 120), { from: '09:45', to: '10:00', days: [1] });   // stops a step before the end
  assert.deepEqual(movedWin(w, 'end', -120), { from: '09:00', to: '09:15', days: [1] });
  assert.deepEqual(movedWin(w, 'move', 0, 2), { from: '09:00', to: '10:00', days: [3] });
  assert.deepEqual(movedWin({ from: '23:00', to: '23:30', days: [5] }, 'move', 90), { from: '00:30', to: '01:00', days: [6] });
  assert.deepEqual(movedWin({ from: '09:00', to: '10:00', date: '2026-10-05' }, 'move', 0, 1), { from: '09:00', to: '10:00', date: '2026-10-06' });
  assert.deepEqual(w, { from: '09:00', to: '10:00', days: [1] });   // a copy
  assert.deepEqual(newWin(new Date(2026, 9, 7), 540, 600), { from: '09:00', to: '10:00', days: [3] });
  assert.deepEqual(newWin(new Date(2026, 9, 7), 1380, 1440), { from: '23:00', to: '00:00', days: [3] });
});

test('a time made by newWin is open on the wall exactly when the strip draws it', async () => {
  const { newWin, inWindow, blocksFor } = await import('../src/schedule.js');
  const day = new Date(2026, 9, 7), w = newWin(day, 600, 690), pages = [{ wins: [w] }];
  const b = blocksFor(pages, day);
  assert.deepEqual([b[0].s, b[0].e], [600, 690]);
  assert.equal(inWindow(w, new Date(2026, 9, 7, 10, 0).getTime()), true);
  assert.equal(inWindow(w, new Date(2026, 9, 7, 11, 30).getTime()), false);
  assert.equal(inWindow(w, new Date(2026, 9, 8, 10, 0).getTime()), false);
});
