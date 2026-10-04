// 0.10.2: tiles laid out for a big zone (QA C-H1), worked out by hand from the layouts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compose, isBig, wxKey } from '../src/content.js';

const at = Date.UTC(2026, 9, 5, 6, 41);   // Monday 5 October, 08:41 in Stockholm
const grid = (ch, o, live = {}, R = 12, C = 40) => compose({ layout: 'full', zones: [{ ch, o }] }, R, C, at, 'en', live);
const rows = g => g.map(r => r.join(''));
const used = g => g.filter(r => r.some(c => c !== ' ')).length;

test('a big zone is 9 rows by 30 columns or more', () => {
  assert.equal(isBig({ h: 12, w: 40 }), true); assert.equal(isBig({ h: 11, w: 40 }), true);
  assert.equal(isBig({ h: 6, w: 22 }), false); assert.equal(isBig({ h: 12, w: 20 }), false);
});

test('the clock at 12 x 40 is digits two flaps a pixel, with the date under them', () => {
  const g = grid('clock', { fmt: '24' });
  assert.equal(used(g), 11);                                   // ten rows of digits and the date
  assert.equal(rows(g)[10].trim(), 'MONDAY 5 OCT');
  assert.deepEqual(rows(grid('clock', { fmt: '24' }, {}, 6, 22)).map(r => r.trim()).filter(Boolean), ['MONDAY', '5 OCT', '08:41']);   // 6 x 22 as before
});

test('the big clock tile draws twice the size where it fits', () => {
  const big = grid('bigclock', { fmt: '24', color: 'f' }), small = grid('bigclock', { fmt: '24', color: 'f' }, {}, 6, 22);
  assert.equal(used(big), 10); assert.equal(used(small), 5);
});

test('the world clock has a column a city', () => {
  const g = rows(grid('worldtime', { places: [{ city: 'London', tz: 'Europe/London' }, { city: 'New York', tz: 'America/New_York' }, { city: 'Tokyo', tz: 'Asia/Tokyo' }] }));
  const names = g.find(r => r.includes('LONDON')), times = g.find(r => r.includes('07:41'));
  assert.ok(names.includes('NEW YORK') && names.includes('TOKYO'));
  assert.ok(times.includes('02:41') && times.includes('15:41'));
  assert.ok(names.indexOf('NEW YORK') >= 13 && names.indexOf('TOKYO') >= 26);   // 13 columns each
});

test('currency at 12 x 40 is two columns, a blank row between pairs', () => {
  const live = { fx: { GBP: { rates: { EUR: 1.25, USD: 1.25, SEK: 12.5, JPY: 200, CHF: 1.25, NOK: 12.5 } } } };
  const g = rows(grid('currency', { base: 'GBP', pairs: ['EUR', 'USD', 'SEK', 'JPY', 'CHF', 'NOK'] }, live));
  const lines = g.filter(r => r.trim());
  assert.equal(lines.length, 3);
  assert.ok(lines[0].includes('1 EUR') && lines[0].includes('100 JPY'));        // EUR at 1.25 is 0.80 GBP; JPY at 200 per pound is quoted per 100
  assert.ok(lines[0].includes('0.80 GBP') && lines[0].includes('0.50 GBP'));
  assert.equal(g.indexOf(lines[1]) - g.indexOf(lines[0]), 2);
});

test('a menu at 12 x 40 is its title and two columns of items', () => {
  const g = rows(grid('menu', { title: 'TODAY', items: ['COFFEE 3', 'TEA 2', 'CAKE 4', 'SOUP 7'], suffix: '' }));
  assert.equal(g[0].trim(), 'TODAY');
  const r = g.find(x => x.includes('COFFEE'));
  assert.ok(r.includes('CAKE'), r);
});

test('weather at 12 x 40 is now on top, the hours and three days under it', () => {
  const pl = { city: 'London', lat: 51.5, lon: -0.12 };
  const hourly = Array.from({ length: 12 }, (_, i) => ({ time: `2026-10-05T${String(8 + i).padStart(2, '0')}:00`, t: 12, code: 3, pp: 0 }));
  const daily = [0, 1, 2, 3].map(i => ({ date: `2026-10-0${5 + i}`, max: 15, min: 8, code: 3, pp: 20, sum: 1, sunrise: '2026-10-05T07:12', sunset: '2026-10-05T18:30' }));
  const g = rows(grid('weather', pl, { wx: { [wxKey(pl)]: { t: 13, code: 3, feels: 11, wind: 4, hourly, daily } } }));
  assert.equal(g.filter(r => r.includes('LONDON')).length, 1);              // the city once
  assert.ok(g.some(r => r.includes('08 09 10')) && g.some(r => r.includes('TODAY')) && g.some(r => r.includes('WED')));
  assert.equal(grid('weather', pl, {}).map(r => r.join('')).filter(r => r.includes('LOADING')).length, 1);   // still loading: as before
});

// 0.10.2 review
test('currency at 12 x 40 says LOADING until the rates are in, as the small layout does', () => {
  const g = rows(grid('currency', { base: 'GBP', pairs: ['EUR', 'USD', 'SEK', 'JPY'] }, {}));
  assert.equal(g.filter(r => r.includes('LOADING')).length, 1);
  assert.equal(g.filter(r => r.includes('GBP')).length, 1);
});

test('a world clock of six cities shows all six, in two rows, with names whole', () => {
  const places = ['London:Europe/London', 'New York:America/New_York', 'Tokyo:Asia/Tokyo', 'Johannesburg:Africa/Johannesburg', 'Los Angeles:America/Los_Angeles', 'Sydney:Australia/Sydney'].map(x => ({ city: x.split(':')[0], tz: x.split(':')[1] }));
  const g = rows(grid('worldtime', { places }));
  for (const n of ['LONDON', 'NEW YORK', 'TOKYO', 'JOHANNESBURG', 'LOS ANGELES', 'SYDNEY']) assert.ok(g.some(r => r.includes(n)), n);
});

test('a menu with an item too long for half the board stays in one column', () => {
  const g = rows(grid('menu', { title: 'TODAY', items: ['Smoked salmon bagel 85', 'Soup 65', 'Tea 20', 'Cake 40'], suffix: ' KR' }));
  assert.ok(g.some(r => r.includes('SMOKED SALMON BAGEL')));
  assert.ok(!g.some(r => r.includes('SOUP') && r.includes('TEA')));
});

test('the 12-hour big clock says AM or PM, and 12 x 30 still gets big digits', () => {
  assert.ok(rows(grid('clock', { fmt: '12' })).some(r => /MONDAY 5 OCT +AM/.test(r)));
  assert.equal(used(grid('clock', { fmt: '24' }, {}, 12, 30)), 11);
});

// 0.10.3
import { TEMPLATES, fromTemplate, fitOf } from '../src/templates.js';
test('every template has a recommended size, and is made at it', () => {
  for (const tp of TEMPLATES) {
    assert.ok(tp.fit, tp.id);
    const b = fromTemplate(tp.id, 'en'), want = tp.fit === 'fill' ? 'fill' : tp.fit;
    assert.equal(b.size === 'custom' ? `${b.rows}x${b.cols}` : b.size, want, tp.id);
  }
  assert.equal(fitOf('station'), '10x32'); assert.equal(fitOf('weather'), '12x40'); assert.equal(fitOf('blank'), '6x22');
  const picked = fromTemplate('weather', 'en', null, null, '6x22');
  assert.deepEqual([picked.size, picked.rows, picked.cols], ['6x22', 6, 22]);   // a size picked in the preview wins
});

test('no board a template makes tells anyone to type or press on the wall', () => {
  for (const lang of ['en', 'sv']) for (const tp of TEMPLATES) {
    const b = fromTemplate(tp.id, lang, null, { city: 'London', lat: 51.5, lon: -0.1, cc: 'GB', tz: 'Europe/London' });
    const text = JSON.stringify(b.pages.map(p => p.zones.map(z => z.o)));
    assert.ok(!/TYPE|SKRIV HÄR|PRESS|TRYCK|TAP |YOUR TICKER|DIN LÖPTEXT|PICK|VÄLJ|\bADD\b|LÄGG TILL|CHOOSE|SET UP/i.test(text), `${tp.id} ${lang}`);
  }
  assert.equal(fromTemplate('blank', 'en').name, 'New playlist'); assert.equal(fromTemplate('blank', 'sv').name, 'Ny spellista');
});

// 0.10.3: a tile with nothing set prints its name and a dash, in both languages; what to do is
// said in the editor
import { unsetOf } from '../src/content.js';
test('no unset tile tells anyone to pick, add, choose, set up, type or press on the wall', () => {
  const BAD = /TYPE|PRESS|TAP |PICK|\bADD\b|CHOOSE|SET UP|SIGN IN|VÄLJ|LÄGG TILL|SKRIV|TRYCK|LOGGA IN/;
  const tiles = ['weather', 'rotating', 'url', 'sl', 'headlines', 'worldtime', 'departures', 'markets', 'rates', 'message', 'clock', 'today', 'currency', 'quote', 'menu', 'countdown'];
  for (const lang of ['en', 'sv']) for (const ch of tiles) for (const [R, C] of [[6, 22], [12, 40], [3, 15]]) {
    const g = compose({ layout: 'full', zones: [{ ch, o: {} }] }, R, C, Date.UTC(2026, 9, 5, 8), lang, {}).map(r => r.join('')).join('|');
    assert.ok(!BAD.test(g), `${ch} ${lang} ${R}x${C}: ${g.replace(/\s+/g, ' ')}`);
  }
  for (const ch of ['weather', 'rotating', 'url', 'sl', 'headlines', 'worldtime', 'departures', 'markets', 'rates']) assert.ok(unsetOf({ ch, o: {} }, {}), ch);
  assert.equal(unsetOf({ ch: 'weather', o: { lat: 1, lon: 2 } }, {}), null);
  const sl = compose({ layout: 'full', zones: [{ ch: 'weather', o: {} }] }, 6, 22, 0, 'en', {}).map(r => r.join('').trim()).filter(Boolean);
  assert.deepEqual(sl, ['WEATHER', '-']);
});
