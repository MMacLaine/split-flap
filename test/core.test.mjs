// Unit tests for the pure modules. Zero dependencies: node --test.
// Expected values are worked out by hand (the working is in the comments), never
// copied from the implementation's own expressions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRUM, cleanChar, drumPath, textToCells, fromVestaboardText, VB_CODES, boardText, printable, composerInput } from '../src/charset.js';
import { inWindow, inQuiet, nextPage } from '../src/schedule.js';
import { wrap, toCells, depMinutes, channelLines, compose, zonesFor } from '../src/content.js';
import { sanitizeBoard, encodeBoard, decodeBoard } from '../src/store.js';

// ---------- charset ----------
test('drum holds 82 flaps', () => {
  // 1 blank + 26 letters + 7 Nordic (Å Ä Ö Æ Ø Ü É) + 10 digits + 20 punctuation + the heart + 9 chips + 6 half flaps (0.9) + 2 amber halves (0.11.2)
  assert.equal(DRUM.length, 82);
  assert.deepEqual(DRUM.slice(-2), '\uE006\uE007');
});

// Names from the places 0.8's sources cover, and what the flaps print for each (worked
// out by hand: accents the drum lacks are dropped, Nordic letters and Ü É keep their
// flaps, Greek and Cyrillic are spelled letter by letter in Latin).
test('place names across Europe print without gaps', () => {
  const T = [
    ['München', 'MÜNCHEN'], ['Zürich HB', 'ZÜRICH HB'], ['Ålesund', 'ÅLESUND'], ['Kraków', 'KRAKOW'], ['Reykjavík', 'REYKJAVIK'],
    ['Łódź Fabryczna', 'LODZ FABRYCZNA'], ['Plzeň', 'PLZEN'], ['İstanbul', 'ISTANBUL'], ['Brașov', 'BRASOV'], ['Timișoara', 'TIMISOARA'],
    ['Győr', 'GYÖR'], ['Debrecen', 'DEBRECEN'], ['Šiauliai', 'SIAULIAI'], ['Rīga', 'RIGA'], ['Tallinn Balti jaam', 'TALLINN BALTI JAAM'],
    ['Þingvellir', 'THINGVELLIR'], ['Øresund', 'ØRESUND'], ['Æbeltoft', 'ÆBELTOFT'], ['Straße', 'STRASSE'], ['Château-d\'Œx', "CHATEAU-D'OEX"],
    ['São Paulo', 'SAO PAULO'], ['Kōbe', 'KOBE'], ['Split', 'SPLIT'], ['Đakovo', 'DAKOVO'], ['Paris Gare de l’Est', "PARIS GARE DE L'EST"],
    ['Αθήνα', 'ATHINA'], ['Θεσσαλονίκη', 'THESSALONIKI'], ['Μουσείο', 'MOUSEIO'],
    ['Москва', 'MOSKVA'], ['Санкт-Петербург', 'SANKT-PETERBURG'], ['Шереметьево', 'SHEREMETEVO'], ['Београд', 'BEOGRAD'], ['Ярославль', 'YAROSLAVL']
  ];
  for (const [name, want] of T) assert.equal(boardText(name), want, name);
});

test('a name the drum cannot carry falls through to the next, never to blanks', () => {
  assert.equal(printable('東京', 'Tokyo'), 'TOKYO');
  assert.equal(printable('القاهرة', 'Cairo'), 'CAIRO');
  assert.equal(printable('Москва', 'Moscow'), 'MOSKVA');   // Cyrillic prints, so it is kept
  assert.equal(printable('東京', '', null), '');
  assert.equal(printable('9022 東京駅', '1234'), '1234');     // mostly unprintable
});

test('half flaps: on the drum, kept in stored cells, never made from typed text', async () => {
  const { HALF, isChip, cellChar } = await import('../src/charset.js');
  assert.equal(cellChar(HALF.gTop), HALF.gTop);                       // a stored cell keeps it
  assert.equal(cleanChar(HALF.rBottom).valid, false);                 // typing one gives a blank
  assert.deepEqual(textToCells('a' + HALF.fTop), ['A', ' ']);
  assert.ok(isChip(HALF.gBottom));                                    // blank in a ticker row, never read aloud
  assert.equal(VB_CODES[(await import('../src/charset.js')).VB_FROM_CHAR[HALF.gTop]], 'g');   // a Vestaboard gets the whole green chip
});

test('the composer expands stand-ins of several letters', () => {
  assert.deepEqual(composerInput('ßЖ'), { cells: ['S', 'S', 'Z', 'H'], invalid: [] });
  assert.deepEqual(composerInput('東'), { cells: [' '], invalid: ['東'] });
});

test('Z to B goes forward the long way round', () => {
  // Z is flap 26, B is flap 2. Forward from 26 to 2 wraps: (2 - 26) mod 80 = 56 steps. The amber
  // halves (0.11.2) are only on the way to or from one, so this turn is 0.10's.
  const full = drumPath('Z', 'B');
  assert.equal(full.length, 56);
  assert.equal(full[0], 'Å');                 // flap 27, the one after Z
  assert.deepEqual(full.slice(-3), [' ', 'A', 'B']);
});

test('fast speed shows only the last 10 flaps before the target', () => {
  // Last 10 flaps ending at B (flap 2): flap 73 is the filled chip, 74..79 the six half flaps, then 0 1 2.
  assert.deepEqual(drumPath('Z', 'B', 10), ['f', '\uE000', '\uE001', '\uE002', '\uE003', '\uE004', '\uE005', ' ', 'A', 'B']);
  // to an amber half the drum has them, after the 0.9 halves
  assert.deepEqual(drumPath('A', '\uE007', 3), ['\uE005', '\uE006', '\uE007']);
  assert.deepEqual(drumPath('\uE006', 'A', 3), ['\uE007', ' ', 'A']);
});

test('same flap to itself is a full turn (80)', () => {
  assert.equal(drumPath('A', 'A').length, 80);
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

// ---------- round 2: pixels, weather chips, SL home, search ----------
import { pixelWidth, drawPattern } from '../src/pixels.js';
import { weatherChip, slSource, blank } from '../src/content.js';

test('pixel font widths and the big clock position', () => {
  // "12:34": digits are 3 wide, the colon 1, with one gap between glyphs: 3+1+3+1+1+1+3+1+3 = 17
  assert.equal(pixelWidth('12:34'), 17);
  // On 6 x 22 the clock sits at row floor((6 - 5) / 2) = 0, column floor((22 - 17) / 2) = 2.
  // Glyph "1" top row is .#. so column 2 is empty and column 3 is filled.
  const at1234 = new Date(2026, 9, 3, 12, 34).getTime();
  const g = compose({ layout: 'full', zones: [{ ch: 'bigclock', o: { color: 'f' } }] }, 6, 22, at1234, 'en', {});
  assert.equal(g[0][2], ' ');
  assert.equal(g[0][3], 'f');
  assert.equal(g[5].join('').trim(), '');          // row 6 stays blank
});

test('big clock on a 3-row board falls back to printed time', () => {
  const at = new Date(2026, 9, 3, 9, 5).getTime();
  const g = compose({ layout: 'full', zones: [{ ch: 'bigclock', o: {} }] }, 3, 15, at, 'en', {});
  assert.ok(g.map(r => r.join('')).join('|').includes('09:05'));
});

test('Swedish flag pattern: blue field, yellow cross', () => {
  const g = blank(6, 22);
  drawPattern(g, { r: 0, c: 0, h: 6, w: 22 }, 'nordic', 0, 5);   // frame 0 is Sweden
  // cross row: round(6 * 0.2) = 1 row at floor((6 - 1) / 2) = 2; cross column from round(22 * 5 / 16) = 7
  assert.equal(g[0][0], 'b');
  assert.equal(g[2][0], 'y');
  assert.equal(g[0][7], 'y');
});

test('weather chips', () => {
  assert.equal(weatherChip(0), 'y');    // clear: yellow
  assert.equal(weatherChip(3), 'f');    // overcast: theme colour, visible on every theme
  assert.equal(weatherChip(63), 'b');   // rain: blue
  assert.equal(weatherChip(95), 'v');   // thunder: violet
});

test('SL zone can follow the SL map home station', () => {
  const live = { home: { name: 'Västra skogen', sites: [9306] } };
  assert.deepEqual(slSource({ home: true }, live), { name: 'Västra skogen', sites: [9306] });
  assert.equal(slSource({ home: true }, {}), null);                       // no home starred yet
  assert.deepEqual(slSource({ site: 9117, name: 'Odenplan' }, live), { name: 'Odenplan', sites: [9117] });  // old boards
});

test('station search forgives spelling', async () => {
  const { readFileSync } = await import('node:fs');
  globalThis.fetch = async u => ({ json: async () => JSON.parse(readFileSync(new URL(u))) });
  globalThis.addEventListener = globalThis.addEventListener || (() => {});
  const { searchStations } = await import('../src/live.js');
  assert.equal((await searchStations('vestra skogen'))[0].name, 'Västra skogen');   // ä typed as e
  assert.equal((await searchStations('tcentralen'))[0].name, 'T-Centralen');        // missing hyphen
  assert.equal((await searchStations('gulmarsplan'))[0].name, 'Gullmarsplan');      // one letter short
});

test('departure times as minutes, 24 h or 12 h clock', () => {
  const now = Date.UTC(2026, 8, 27, 3, 0, 0);   // 05:00 Stockholm
  const live = { sl: { 9306: { deps: [{ line: '11', dest: 'Akalla', expected: '2026-09-27T08:11:00', mode: 'METRO' }] } } };
  const z = { r: 0, c: 0, h: 2, w: 22 }, o = { sites: [9306], name: 'Västra skogen' };
  const line = opts => channelLines('sl', { ...o, ...opts }, z, now, 'en', live).lines[1];
  // Row width 22 - 2 = 20. "11 AKALLA" is 9 characters, so the gap is 20 - 9 - len(right).
  assert.equal(line({ eta: 'min' }), '11 AKALLA    191 MIN');          // 3 h 11 min = 191; gap 20-9-7 = 4
  assert.equal(line({ eta: 'clock' }), '11 AKALLA      08:11');         // gap 20-9-5 = 6
  assert.equal(line({ eta: 'clock', fmt: '12' }), '11 AKALLA    8:11 AM');
  // Alternate: 6 s on minutes, 6 s on the clock. now is an exact hour, so it starts on minutes.
  assert.equal(line({ eta: 'cycle' }), '11 AKALLA    191 MIN');
  assert.equal(channelLines('sl', { ...o, eta: 'cycle' }, z, now + 6000, 'en', live).lines[1], '11 AKALLA      08:11'); // 12 h drops the leading zero, like the clock channel; gap 20-9-7 = 4
});

test('volume is clamped to 0..100 and defaults to 70', () => {
  const mk = volume => sanitizeBoard({ volume, pages: [{ layout: 'full', zones: [{ ch: 'clock' }] }] }).volume;
  assert.equal(mk(undefined), 70);
  assert.equal(mk(250), 100);
  assert.equal(mk(-3), 0);
  assert.equal(mk('35'), 35);
});

// ---------- faint flaps (renderer queue logic, no canvas needed) ----------
test('faint to lit never turns the drum, busy or still', async () => {
  const { retargetFaint } = await import('../src/renderer.js');
  const still = { cur: 'C', q: [], a: null };
  assert.equal(retargetFaint(still, '~C', 5), true);
  assert.deepEqual([still.q.length, still.a.kind, still.a.from, still.a.to], [0, 'fade', 'C', '~C']);
  const queued = { cur: 'A', q: ['B', 'C'], a: null };               // waiting for its stagger
  assert.equal(retargetFaint(queued, '~C', 5), true);
  assert.deepEqual(queued.q, ['B', '~C']);                           // still flips, lands faint
  const flipping = { cur: 'B', q: [], a: { kind: 'flip', from: 'B', to: 'C', final: true } };
  assert.equal(retargetFaint(flipping, '~C', 5), true);
  assert.deepEqual([flipping.q.length, flipping.a.to], [0, '~C']);
  const settling = { cur: 'C', q: [], a: { kind: 'settle', from: 'C', to: 'C' } };
  assert.equal(retargetFaint(settling, '~C', 5), true);
  assert.deepEqual([settling.q.length, settling.a.to], [0, '~C']);
  const real = { cur: 'B', q: [], a: { kind: 'flip', from: 'B', to: 'C' } };
  assert.equal(retargetFaint(real, 'D', 5), false);                  // a new letter: a normal path
  assert.equal(retargetFaint({ cur: 'C', q: [], a: null }, 'C', 5), false);
});

test('a reload is made once per version, even if the page comes back old', async () => {
  const { shouldReload } = await import('../src/changelog.js');
  assert.equal(shouldReload('0.4', '0.4.1', ''), true);
  assert.equal(shouldReload('0.4', '0.4.1', '0.4.1'), false);        // tried already and still old: no loop
  assert.equal(shouldReload('0.4', '0.5', '0.4.1'), true);           // a newer release is tried again
  assert.equal(shouldReload('0.4.1', '0.4.1', ''), false);
  assert.equal(shouldReload('0.4', null, ''), false);
});
