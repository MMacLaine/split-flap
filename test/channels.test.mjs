// The channels added with the editor redesign, the stacked layout, and the calendar
// helpers behind Today. Run with TZ=Europe/Stockholm (npm test sets it).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compose, zonesFor, channelLines, timeInWords, applyTemplate, templateTokens, CHANNELS } from '../src/content.js';
import { sanitizeBoard } from '../src/store.js';
import { easter, swedishDay, isoWeek, sunTimes } from '../src/almanac.js';
import { feedItems } from '../src/live.js';

const Z = (h, w) => ({ r: 0, c: 0, h, w });
const at = (y, m, d, hh = 12, mm = 0) => new Date(y, m - 1, d, hh, mm).getTime();
const page = (layout, zones) => ({ id: 'p', name: '', layout, dur: 10, win: null, zones });
const text = g => g.map(r => r.join('')).join('\n');

test('stacked layout: top half and bottom half', () => {
  assert.deepEqual(zonesFor('stacked', 6, 22), [{ r: 0, c: 0, h: 3, w: 22 }, { r: 3, c: 0, h: 3, w: 22 }]);
  assert.deepEqual(zonesFor('stacked', 7, 22).map(z => z.h), [3, 4]);
});

test('Easter, red days and flag days', () => {
  assert.deepEqual([2024, 2025, 2026, 2027].map(y => easter(y).toDateString()),
    ['Sun Mar 31 2024', 'Sun Apr 20 2025', 'Sun Apr 05 2026', 'Sun Mar 28 2027']);
  const mid = swedishDay(new Date(2026, 5, 20));
  assert.equal(mid.sv, 'MIDSOMMARDAGEN'); assert.ok(mid.red && mid.flag);
  const eve = swedishDay(new Date(2026, 11, 24));
  assert.ok(eve.eve && !eve.red);
  assert.equal(swedishDay(new Date(2026, 8, 13)).sv, 'VALDAGEN');   // election day, second Sunday of September
  assert.equal(swedishDay(new Date(2027, 8, 12)), null);            // no election in 2027
  assert.equal(swedishDay(new Date(2026, 8, 27)), null);
});

test('ISO weeks at the turn of the year', () => {
  assert.equal(isoWeek(new Date(2026, 8, 27)), 39);
  assert.equal(isoWeek(new Date(2027, 0, 1)), 53);   // Friday 1 January 2027 still belongs to week 53
  assert.equal(isoWeek(new Date(2024, 11, 30)), 1);
});

test('sun times in Stockholm, and midnight sun in Kiruna', () => {
  const s = sunTimes(new Date(2026, 8, 27), 59.33, 18.07);
  const hm = t => new Date(t).toTimeString().slice(0, 5);
  assert.ok(hm(s.up) >= '06:35' && hm(s.up) <= '06:50', hm(s.up));
  assert.ok(hm(s.down) >= '18:25' && hm(s.down) <= '18:40', hm(s.down));
  assert.equal(sunTimes(new Date(2026, 5, 21), 67.86, 20.23).polar, 'day');
  assert.equal(sunTimes(new Date(2026, 11, 21), 67.86, 20.23).polar, 'night');
});

test('Today shows the red day with a red chip, and sun times from the board location', () => {
  const live = { loc: { lat: 59.33, lon: 18.07, city: 'Stockholm' } };
  const res = channelLines('today', {}, Z(6, 22), at(2026, 12, 25), 'sv', live);
  assert.equal(res.lines[0], 'FREDAG');
  assert.equal(res.lines[1], '25 DEC 2026');
  assert.deepEqual(res.lines[2].slice(0, 3), ['r', ' ', 'J']);
  assert.equal(res.lines[3], 'VECKA 52');
  assert.match(res.lines[4], /^SOL \d\d:\d\d \d\d:\d\d$/);
  const noLoc = channelLines('today', {}, Z(6, 22), at(2026, 9, 27), 'en', {});
  assert.deepEqual(noLoc.lines, ['SUNDAY', '27 SEP 2026', 'WEEK 39']);
});

test('word clock in both languages', () => {
  assert.equal(timeInWords(new Date(2026, 0, 1, 10, 14), 'en'), 'IT IS QUARTER PAST TEN');
  assert.equal(timeInWords(new Date(2026, 0, 1, 10, 26), 'sv'), 'KLOCKAN ÄR FEM I HALV ELVA');
  assert.equal(timeInWords(new Date(2026, 0, 1, 23, 58), 'en'), "IT IS TWELVE O'CLOCK");
  assert.equal(timeInWords(new Date(2026, 0, 1, 12, 30), 'sv'), 'KLOCKAN ÄR HALV ETT');
});

test('countdown counts up once the date has passed', () => {
  const o = { label: 'SINCE LAUNCH', date: '2026-09-20', dir: 'up' };
  assert.deepEqual(channelLines('countdown', o, Z(6, 22), at(2026, 9, 27), 'en').lines, ['SINCE LAUNCH', '', '7 DAYS']);
  assert.deepEqual(channelLines('countdown', o, Z(6, 22), at(2026, 9, 21, 9), 'en').lines, ['SINCE LAUNCH', '', '1 DAY']);
  // before the date it still counts down
  assert.equal(channelLines('countdown', { ...o, date: '2026-10-01' }, Z(6, 22), at(2026, 9, 27), 'en').lines[3], 'TO GO');
});

test('rotating messages take turns, and shuffle shows each once per pass', () => {
  const o = { messages: ['ONE', 'TWO', 'THREE'], interval: 5 };
  const at0 = 1e12 - (1e12 % 15000);
  assert.deepEqual([0, 5, 10, 15].map(s => channelLines('rotating', o, Z(3, 22), at0 + s * 1000, 'en').lines[0]), ['ONE', 'TWO', 'THREE', 'ONE']);
  const seen = [0, 5, 10].map(s => channelLines('rotating', { ...o, order: 'shuffle' }, Z(3, 22), at0 + s * 1000, 'en').lines[0]);
  assert.deepEqual(seen.slice().sort(), ['ONE', 'THREE', 'TWO']);
});

test('menu lines up prices on the right', () => {
  const res = channelLines('menu', { title: 'TODAY', items: ['Kaffe 30', 'Kanelbulle 35', 'Soup of the day'], suffix: ' KR' }, Z(6, 22), 0, 'en');
  assert.equal(res.lines[0], 'TODAY');
  assert.equal(res.lines[3], 'SOUP OF THE DAY');
  assert.equal(res.lines[1], 'KAFFE          30 KR');
  assert.equal(res.lines[1].length, 20);
});

test('electricity: hourly price with VAT, next hours as coloured chips', () => {
  const hours = Array.from({ length: 24 }, (_, h) => 40 + h * 4);   // öre before VAT, rising through the day
  const live = { el: { SE3: { days: { '2026-09-27': hours } } } };
  const res = channelLines('electricity', { area: 'SE3' }, Z(3, 22), at(2026, 9, 27, 10, 20), 'sv', live);
  assert.equal(res.lines[1], `NU ${Math.round(80 * 1.25)} ÖRE/KWH`);
  assert.equal(res.lines[2].length, 20);
  assert.ok(res.lines[2].every(c => 'gyr '.includes(c)));
  const ex = channelLines('electricity', { area: 'SE3', vat: false }, Z(1, 22), at(2026, 9, 27, 10, 20), 'en', live);
  assert.match(ex.exact, /80 ÖRE$/);
  const chart = channelLines('electricity', { area: 'SE3', view: 'chart' }, Z(6, 22), at(2026, 9, 27, 10), 'en', live);
  assert.equal(chart.cells.length, 6);
  assert.ok(chart.cells[5].every(c => c !== ' '));                  // every hour has a bar
});

test('currency prints the rate the Swedish way in Swedish', () => {
  const live = { fx: { SEK: { rates: { EUR: 0.0886, USD: 0.101 } } } };
  const sv = channelLines('currency', { base: 'SEK', pairs: ['EUR', 'USD'], dec: 2 }, Z(6, 22), 0, 'sv', live);
  assert.deepEqual(sv.lines, ['1 EUR      11,29 SEK', '1 USD       9,90 SEK']);
});

test('Follow a URL: templates, dotted paths, plain text', () => {
  const body = JSON.stringify({ data: { departures: [{ line: '4', dest: 'Radiohuset', min: 3 }, { line: '2', dest: 'Sofia', min: 5 }] } });
  const items = feedItems(body, 'data.departures');
  assert.equal(applyTemplate('{{line}} {{dest}} {{min}} MIN', items[0]), '4 RADIOHUSET 3 MIN');
  assert.deepEqual(feedItems(body, '').length, 1);                   // no path: the first list found, here none at the top
  assert.deepEqual(feedItems('first line\n\nsecond', ''), [{ text: 'first line' }, { text: 'second' }]);
  assert.deepEqual(templateTokens('{{a}} {{b.c}} {{a}}'), ['a', 'b.c']);
  assert.equal(applyTemplate('{{missing}} X', {}), 'X');
  const live = { url: { 'https://x.test/a.json': { items } } };
  const res = channelLines('url', { url: 'https://x.test/a.json', tpl: '{{line}} {{dest}}', max: 1, header: 'Buses' }, Z(6, 22), 0, 'en', live);
  assert.deepEqual(res.lines, ['BUSES', '4 RADIOHUSET']);
});

test('SL: several stations each get a name line and their departures', () => {
  const now = at(2026, 9, 27, 8, 0);
  const dep = (line, dest, mm) => ({ line, dest, expected: `2026-09-27T08:${String(mm).padStart(2, '0')}:00`, mode: 'METRO' });
  const live = { sl: { 1: { deps: [dep('17', 'Åkeshov', 2), dep('18', 'Alvik', 6)] }, 2: { deps: [dep('13', 'Norsborg', 1), dep('14', 'Fruängen', 4)] } } };
  const o = { stations: [{ id: 1, name: 'Odenplan' }, { id: 2, name: 'Slussen' }], eta: 'min' };
  const res = channelLines('sl', o, Z(6, 22), now, 'en', live);
  assert.equal(res.lines[0], 'ODENPLAN');
  assert.equal(res.lines[3], 'SLUSSEN');
  assert.equal(res.lines.length, 6);
  // walk time hides departures sooner than it
  const walk = channelLines('sl', { ...o, stations: [o.stations[0]], walk: 3 }, Z(6, 22), now, 'en', live);
  assert.deepEqual(walk.lines.map(l => l.slice(0, 7)), ['ODENPLA', '18 ALVI']);
});

test('weather in Fahrenheit, falling back to the board location', () => {
  const live = { loc: { lat: 59.33, lon: 18.07, city: 'Stockholm' }, wx: { '59.33,18.07': { t: 10, feels: 8, code: 0, wind: 3, daily: [] } } };
  const res = channelLines('weather', { units: 'f', wind: false }, Z(4, 22), 0, 'en', live);
  assert.equal(res.lines[0], 'STOCKHOLM');
  assert.equal(res.lines[1].slice(2).join(''), '50° CLEAR');
  assert.equal(res.lines[2], 'FEELS 46°');
});

test('sanitizer keeps the new options and drops anything unsafe', () => {
  const b = sanitizeBoard({
    loc: { lat: 59.33, lon: 18.07, city: 'Stockholm' },
    pages: [
      { layout: 'stacked', zones: [{ ch: 'url', o: { url: 'javascript:alert(1)', every: 3, path: 'a.b;c', tpl: '{{x}}' } }, { ch: 'electricity', o: { area: 'SE9', view: 'chart' } }] },
      { layout: 'full', zones: [{ ch: 'sl', o: { stations: [{ id: 9117, name: 'Odenplan' }, { id: 'x' }], rows: 99, walk: 5 } }] },
      { layout: 'full', zones: [{ ch: 'art', o: { pattern: 'rainbow', palette: ['r', 'Q', 'r', 'y'] } }] },
      { layout: 'full', zones: [{ ch: 'currency', o: { pairs: ['EUR', 'BTC'] } }] },
      { layout: 'full', zones: [{ ch: 'message', o: { cells: [['A']], mode: 'photo' } }] }
    ]
  });
  assert.equal(b.pages[0].layout, 'stacked');
  assert.deepEqual(b.pages[0].zones[0].o, { url: '', every: '5', tpl: '{{x}}', path: 'a.bc', max: 4, header: '' });
  assert.deepEqual(b.pages[0].zones[1].o, { area: 'SE3', view: 'chart' });
  assert.deepEqual(b.pages[1].zones[0].o.stations, [{ id: 9117, name: 'Odenplan' }]);
  assert.equal(b.pages[1].zones[0].o.rows, 12);
  assert.deepEqual(b.pages[2].zones[0].o.palette, ['r', 'y']);
  assert.deepEqual(b.pages[3].zones[0].o.pairs, ['EUR']);
  assert.equal(b.pages[4].zones[0].o.mode, 'photo');
  assert.deepEqual(b.loc, { lat: 59.33, lon: 18.07, city: 'Stockholm' });
  for (const ch of CHANNELS) assert.ok(sanitizeBoard({ pages: [{ layout: 'full', zones: [{ ch, o: {} }] }] }), ch);
});

test('every channel composes on every layout without throwing', () => {
  for (const ch of CHANNELS) for (const layout of ['full', 'header', 'split', 'ticker', 'stacked']) {
    const g = compose(page(layout, [{ ch, o: {} }, { ch, o: {} }]), 6, 22, at(2026, 9, 27, 9), 'en', {});
    assert.equal(g.length, 6, `${ch} on ${layout}`);
    assert.ok(g.every(r => r.length === 22), `${ch} on ${layout}`);
  }
  assert.ok(text(compose(page('full', [{ ch: 'wordclock', o: {} }]), 6, 22, at(2026, 9, 27, 9, 0), 'en', {})).includes("NINE O'CLOCK"));
});
