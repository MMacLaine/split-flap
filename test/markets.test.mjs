// 0.9: the line chart in half flaps, market hours, the Markets panel, a published sheet
// and the line it builds. Expected values are worked out by hand in the comments.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineChart, marketState, marketsCells, price, exchangeOf, currentSymbol, inPeriod, avDaily, lastClose } from '../src/markets.js';
import { parseSheet, num, recordPoint, historyOf, ownKeyStep } from '../src/connections.js';
import { refresh } from '../src/markets.js';
import { HALF } from '../src/charset.js';
import { sanitizeBoard } from '../src/store.js';

const G = HALF;
const show = g => g.map(r => r.map(c => ({ [G.gTop]: 'G', [G.gBottom]: 'g', [G.rTop]: 'R', [G.rBottom]: 'r', [G.fTop]: 'F', [G.fBottom]: 'f', g: '#', r: '%', f: '=' }[c] || (c.startsWith('~') ? '.' : c))).join(''));

test('a rising line: each column climbs into the next half flap, in green', () => {
  // 2 rows = 4 levels. Values 0..3 map straight to levels 0..3.
  // Column 0 starts at level 0 (bottom half of the bottom row) in the glyph colour.
  // Column 1 fills level 1 (top half, bottom row), column 2 level 2 (bottom half, top row),
  // column 3 level 3 (top half, top row), each green because it is higher than the last.
  assert.deepEqual(show(lineChart([0, 1, 2, 3], 2, 4)), ['  gG', 'fG  ']);
});

test('a jump fills every level in between, so the line never breaks; a fall is red', () => {
  // Levels 0, 3, 0 on 2 rows. Column 1 fills levels 1..3: the bottom row's top half
  // and both halves of the top row (a whole green flap). Column 2 falls from 3 to 0 and
  // fills 0..2: the whole bottom row and the top row's bottom half, in red.
  assert.deepEqual(show(lineChart([0, 3, 0], 2, 3)), [' #r', 'fG%']);
});

test('flat is the glyph colour, a short series sits at the right, and one point is drawn', () => {
  // flat: hi === lo, so every point is the middle level floor(3/2) = 1: the top half of the bottom row
  assert.deepEqual(show(lineChart([5, 5, 5], 2, 3)), ['   ', 'FFF']);
  assert.deepEqual(show(lineChart([1, 2], 1, 4)), ['  fG']);
  assert.deepEqual(show(lineChart([7], 1, 3)), ['  f']);   // one row is two levels: the middle, floor(1 / 2) = 0, is the bottom half
  assert.deepEqual(show(lineChart([], 2, 2)), ['  ', '  ']);
});

test('thick draws whole flaps, and the reference line marks the first price faintly', () => {
  assert.deepEqual(show(lineChart([0, 1, 2, 3], 2, 4, { thick: true })), ['  ##', '=#  ']);
  // levels 0, 3, 3, 3: the jump fills 1..3, then the flat stretch draws its own level (the top
  // row's top half) in the glyph colour. The first price, level 0, is marked faintly where the line is not.
  assert.deepEqual(show(lineChart([0, 3, 3, 3], 2, 4, { ref: true })), [' #FF', 'fG..']);
});

test('a long series is sampled to the width, keeping the first and the latest price', () => {
  // 11 values on 3 columns: indices round(i * 10 / 2) = 0, 5, 10, so 0, 50, 100
  const s = Array.from({ length: 11 }, (_, i) => i * 10);
  assert.deepEqual(show(lineChart(s, 1, 3)), ['fGF']);   // 0 -> level 0, 50 -> round(0.5) = 1, 100 -> 1: flat, drawn in the glyph colour
});

test('market hours: London, New York, Tokyo\'s lunch, the weekend and a holiday', () => {
  // Tue 29 Sep 2026, 10:00 UTC. London is BST (UTC+1): 11:00, open until 16:30 = 15:30 UTC.
  const t = Date.parse('2026-09-29T10:00:00Z');
  assert.deepEqual(marketState('LON', t), { open: true, until: Date.parse('2026-09-29T15:30:00Z') });
  // New York is EDT (UTC-4): 06:00, opens 09:30 = 13:30 UTC.
  assert.deepEqual(marketState('US', t), { open: false, next: Date.parse('2026-09-29T13:30:00Z') });
  // Tokyo (UTC+9) at 02:45 UTC is 11:45, in the lunch break: opens again 12:30 = 03:30 UTC.
  assert.deepEqual(marketState('TYO', Date.parse('2026-09-29T02:45:00Z')), { open: false, next: Date.parse('2026-09-29T03:30:00Z') });
  // Sat 3 Oct 2026, noon UTC: London next opens Monday 5 Oct 08:00 BST = 07:00 UTC.
  assert.deepEqual(marketState('LON', Date.parse('2026-10-03T12:00:00Z')), { open: false, next: Date.parse('2026-10-05T07:00:00Z') });
  // Christmas Day 2026 is a Friday: closed, next open Monday 28 Dec (GMT, UTC+0) 08:00 = 08:00 UTC,
  // if the 28th is not a holiday too (it is, Boxing Day moved), then Tuesday 29 Dec.
  const hol = new Set(['2026-12-25', '2026-12-28']);
  assert.deepEqual(marketState('LON', Date.parse('2026-12-25T12:00:00Z'), d => hol.has(d)), { open: false, next: Date.parse('2026-12-29T08:00:00Z') });
  assert.deepEqual(marketState('CRYPTO', t), { open: true, always: true });
  // the last close: London's on Monday 28 Sep at 16:30 BST, when asked on Tuesday morning
  assert.equal(lastClose('LON', Date.parse('2026-09-29T06:00:00Z')), Date.parse('2026-09-28T15:30:00Z'));
});

test('the ticker panel: name, where, price, the day in a chip, open or closed, in the Place\'s time', () => {
  // 30 closes rising by 1 from 100: last 129, the one before 128, so +0.78% (1 / 128 = 0.0078125)
  const now = Date.parse('2026-09-29T10:00:00Z'), closes = Array.from({ length: 30 }, (_, i) => ({ d: new Date(now - (30 - i) * 864e5).toISOString().slice(0, 10), c: 100 + i }));
  const live = { mk: { 'built:ISF.LON': { name: 'FTSE 100 ETF', ex: 'LON', cur: 'GBX', closes, closeOnly: true, price: 129, prev: 128 } } };
  const g = marketsCells({ symbols: [{ s: 'ISF.LON' }], period: '1m' }, { h: 12, w: 40 }, now, live, { lang: 'en', tz: 'Europe/Stockholm' });
  const panel = g.map(r => r.slice(26).join('').trimEnd()).filter(Boolean);
  // the chart is 40 - 14 - 1 = 25 flaps; the panel from column 26, centred in 12 rows
  assert.deepEqual(panel, ['FTSE 100 ETF', 'LONDON', '129.00 GBX', 'g +0.78%', 'CLOSE', 'MON 28/9', '1 MONTH']);
  assert.equal(g[3 + 2][26], 'g');   // a green chip, not the letter
  // without data: SAMPLE and dashes, never a made-up price
  const s = marketsCells({ symbols: [{ s: 'SPY' }] }, { h: 12, w: 40 }, now, { mk: {} }, { lang: 'sv' }).map(r => r.slice(26).join('').trim()).filter(Boolean);
  assert.deepEqual(s, ['EXEMPEL', 'SPY', '-----', 'LADDAR']);
});

test('symbols take turns, prices print in the page\'s style, periods cut the series', () => {
  const o = { symbols: [{ s: 'A' }, { s: 'B' }, { s: 'C' }], every: 10 };
  assert.equal(currentSymbol(o, 0).s, 'A'); assert.equal(currentSymbol(o, 10e3).s, 'B'); assert.equal(currentSymbol(o, 35e3).s, 'A');
  assert.equal(price(1038.6, null, 'en'), '1 039');        // four figures and more: whole
  assert.equal(price(83.456, null, 'sv'), '83,46');
  assert.equal(price(0.12345, null, 'en'), '0.1235');
  assert.equal(exchangeOf('0NC6.LON'), 'LON'); assert.equal(exchangeOf('AAPL'), 'US'); assert.equal(exchangeOf('IVS.FRK'), 'FRK');
  const now = Date.parse('2026-09-29T10:00:00Z'), c = [{ d: '2026-09-01', c: 1 }, { d: '2026-09-25', c: 2 }, { d: '2026-09-28', c: 3 }];
  assert.deepEqual(inPeriod(c, '1w', now).map(x => x.c), [2, 3]);   // from 22 Sep on
});

test('Alpha Vantage: a daily series becomes closes, and a note about the limit is not data', () => {
  assert.deepEqual(avDaily({ 'Time Series (Daily)': { '2026-09-28': { '4. close': '101.5' }, '2026-09-25': { '4. close': '100' } } }), { closes: [{ d: '2026-09-25', c: 100 }, { d: '2026-09-28', c: 101.5 }] });
  assert.deepEqual(avDaily({ Information: 'our standard API rate limit is 25 requests per day' }), { error: 'limit' });
  assert.deepEqual(avDaily({ 'Error Message': 'Invalid API call' }), { error: 'no_data' });
});

test('a published sheet: headers in any order, Swedish numbers, quoted names', () => {
  const csv = 'Namn,Symbol,Price,Change %,Currency\r\n"Ericsson, B",ERIC-B,"78,42",-1.2,SEK\r\nOMX Stockholm 30,OMXS30,2 512.40,0.8%,SEK\r\n,,,\r\nBroken,BAD,#N/A,,\r\n';
  assert.deepEqual(parseSheet(csv), {
    'ERIC-B': { name: 'Ericsson, B', price: 78.42, pct: -1.2, cur: 'SEK', ex: '' },
    OMXS30: { name: 'OMX Stockholm 30', price: 2512.4, pct: 0.8, cur: 'SEK', ex: '' }
  });
  assert.equal(num('1.234,5'), 1234.5); assert.equal(num('1,234.5'), 1234.5); assert.equal(num('#N/A'), null);
});

test('the line a sheet builds: today\'s prices as points, earlier days as their last price', () => {
  const h = {}, t0 = Date.parse('2026-09-28T09:00:00Z');
  recordPoint(h, 'X', 10, t0); recordPoint(h, 'X', 10, t0 + 5 * 60e3);   // the same price again is not a new point
  recordPoint(h, 'X', 11, t0 + 10 * 60e3);
  recordPoint(h, 'X', 12, Date.parse('2026-09-29T09:00:00Z'));           // the next day: yesterday closes at 11
  assert.deepEqual(historyOf(h, 'X'), [{ d: '2026-09-28', c: 11 }, { d: '2026-09-29T09:00:00.000Z', c: 12 }]);
});

test('the sanitiser keeps a Markets zone\'s options and drops anything else, like a key', () => {
  const b = sanitizeBoard({ pages: [{ layout: 'full', zones: [{ ch: 'markets', o: { source: 'key', apikey: 'SECRET', key: 'SECRET', symbols: [{ s: 'IBM', name: 'IBM' }, { s: 'bad sym' }, { s: 'ERIC-B.STO' }], period: '3m', every: 3, line: 'thick', ref: true, cur: 'SEK' } }] }] });
  assert.deepEqual(b.pages[0].zones[0].o, { source: 'key', symbols: [{ s: 'IBM', name: 'IBM' }, { s: 'ERIC-B.STO' }], period: '3m', every: 5, line: 'thick', ref: true, cur: 'SEK' });
  assert.ok(!JSON.stringify(b).includes('SECRET'));
});

test('your own key: a symbol with no data is asked once per close, and never holds up the next', async () => {
  const now = Date.parse('2026-09-29T10:00:00Z'), calls = [];
  const replies = { TYPO: { 'Error Message': 'Invalid API call' }, IBM: { 'Time Series (Daily)': { '2026-09-28': { '4. close': '250' } } } };
  const getJson = async url => { const s = /symbol=([^&]+)/.exec(url)[1]; calls.push(s); return replies[s]; };
  let cache = {};
  cache = await ownKeyStep(cache, ['TYPO', 'IBM'], 'KEY', now, getJson);            // TYPO first: no data
  cache = await ownKeyStep(cache, ['TYPO', 'IBM'], 'KEY', now + 15e3, getJson);     // the next turn asks IBM, not TYPO again
  cache = await ownKeyStep(cache, ['TYPO', 'IBM'], 'KEY', now + 30e3, getJson);     // nothing is due
  assert.deepEqual(calls, ['TYPO', 'IBM']);
  assert.equal(cache.TYPO.error, 'no_data'); assert.equal(cache.IBM.closes[0].c, 250);
  // a limit reply stops the key until the next UTC day
  const lim = await ownKeyStep({}, ['X', 'Y'], 'KEY', now, async () => ({ Information: 'rate limit is 25 requests per day' }));
  assert.equal(lim._limit, '2026-09-29');
  const after = []; await ownKeyStep(lim, ['X', 'Y'], 'KEY', now + 60e3, async u => { after.push(u); return {}; });
  assert.equal(after.length, 0);
});

test('the refresh rule: fresh when the last bar is the last trading day, else a capped retry', () => {
  // Tue 29 Sep 10:00 UTC: New York last closed (and settled) on Mon 28 Sep
  const t = Date.parse('2026-09-29T10:00:00Z');
  assert.equal(refresh({ closes: [{ d: '2026-09-28', c: 1 }] }, 'US', t).due, false);
  assert.equal(refresh({ closes: [{ d: '2026-09-25', c: 1 }] }, 'US', t).due, true);                       // Friday's: ask
  assert.equal(refresh({ closes: [{ d: '2026-09-25', c: 1 }], lc: Date.parse('2026-09-28T20:00:00Z'), tries: 3, tried: t - 5 * 36e5 }, 'US', t).due, false);   // three tries: wait for the next close
  assert.equal(refresh({ error: 'no_data', lc: Date.parse('2026-09-28T20:00:00Z'), tries: 1, tried: t - 5 * 36e5 }, 'US', t).due, false);
});

test('an English sheet\'s thousands, and a sheet\'s day in the exchange\'s own time zone', () => {
  assert.equal(num('5,432'), 5432); assert.equal(num('1,234,567'), 1234567); assert.equal(num('78,42'), 78.42); assert.equal(num('5,4321'), 5.4321);
  // 23:30 UTC on 28 Sep is 08:30 on 29 Sep in Tokyo: that is Tokyo's 29th, not a price from the 28th
  const h = {};
  recordPoint(h, 'T', 100, Date.parse('2026-09-28T23:30:00Z'), 'Asia/Tokyo');
  assert.equal(h.T.day, '2026-09-29');
});
