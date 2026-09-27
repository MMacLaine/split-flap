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
