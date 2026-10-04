// 0.8: the Place, departures anywhere, holidays by country, the world clock, currency
// with any base, rain in the next hour, and templates built for a place. Recorded
// replies only: nothing here calls a live source. Expected values are worked by hand.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeOf, formatsFor, priceMark, browserCountry, CURRENCY_OF, tzDiffers, wallIn } from '../src/place.js';
import { compose, channelLines, holidayOn, nextHoliday, depStops, CHANNELS } from '../src/content.js';
import { sanitizeBoard } from '../src/store.js';
import { fromTemplate, TEMPLATES, availableFor } from '../src/templates.js';
import { SOURCES } from '../src/sources.js';
import { TILES } from '../src/catalogue.js';

const rows = g => g.map(r => r.join(''));
const one = (ch, o, R, C, now, live, lang = 'en') => rows(compose({ layout: 'full', zones: [{ ch, o }] }, R, C, now, lang, live));
const LONDON = { city: 'London', lat: 51.509, lon: -0.126, cc: 'GB', tz: 'Europe/London' };

test('a place gives the formats a new tile starts with', () => {
  assert.deepEqual(formatsFor({ cc: 'US' }), { fmt: '12', units: 'f', currency: 'USD' });
  assert.deepEqual(formatsFor({ cc: 'GB' }), { fmt: '24', units: 'c', currency: 'GBP' });
  assert.deepEqual(formatsFor({ cc: 'DE' }), { fmt: '24', units: 'c', currency: 'EUR' });
  assert.deepEqual(formatsFor(null), { fmt: '24', units: 'c', currency: null });
  assert.equal(CURRENCY_OF.XK, 'EUR'); assert.equal(CURRENCY_OF.LI, 'CHF'); assert.equal(CURRENCY_OF.GL, 'DKK');
  // the drum has $ but no € or £
  assert.deepEqual(priceMark('USD'), { prefix: '$', suffix: '' });
  assert.deepEqual(priceMark('NOK'), { prefix: '', suffix: ' KR' });
  assert.deepEqual(priceMark('EUR'), { prefix: '', suffix: ' EUR' });
});

test('with no city the place is the browser\'s country, and a pre-0.8 city has none until picked again', () => {
  assert.equal(browserCountry(['en-GB', 'en']), 'GB');
  assert.equal(browserCountry(['sv']), 'SE');                 // a language alone, maximised
  assert.deepEqual(placeOf({}, { langs: ['de-AT'], tz: 'Europe/Vienna' }), { city: '', lat: null, lon: null, cc: 'AT', tz: 'Europe/Vienna', set: false });
  assert.equal(placeOf({ loc: { city: 'Stockholm', lat: 59.33, lon: 18.07 } }, { langs: ['en-US'] }).cc, null);   // not guessed from the browser
  assert.equal(placeOf({ loc: LONDON }).tz, 'Europe/London');
  assert.equal(tzDiffers(LONDON, 'Europe/Stockholm'), true);
  assert.equal(tzDiffers({ tz: 'Europe/Oslo' }, 'Europe/Stockholm'), false);   // other name, same clock
});

test('the stored place keeps its country and time zone, and drops a bad one', () => {
  const b = sanitizeBoard({ loc: { ...LONDON }, pages: [{ layout: 'full', zones: [{ ch: 'clock', o: {} }] }] });
  assert.deepEqual(b.loc, { lat: 51.509, lon: -0.126, city: 'London', cc: 'GB', tz: 'Europe/London' });
  const bad = sanitizeBoard({ loc: { lat: 1, lon: 2, city: 'X', cc: 'gb; drop', tz: 'Not/AZone' }, pages: [{ layout: 'full', zones: [{ ch: 'clock', o: {} }] }] });
  assert.deepEqual(bad.loc, { lat: 1, lon: 2, city: 'X' });
});

// Transitous departures in the shape transit.js makes, for a stop in Warsaw's time zone
// (UTC+2 in September): 10:05 UTC prints as 12:05.
const NOW = Date.parse('2026-09-29T10:00:00Z');
const TR = { tr: { w: { tz: 'Europe/Warsaw', alert: 'ZMIANA PERONU', deps: [
  { line: 'IC 1300', dest: 'WARSZAWA CENTRALNA', time: '2026-09-29T10:05:00Z', sched: '2026-09-29T10:02:00Z', platform: '3', cancelled: false, mode: 'TRAIN' },
  { line: 'R2', dest: 'KUTNO', time: '2026-09-29T10:12:00Z', sched: '2026-09-29T10:12:00Z', platform: '1', cancelled: true, mode: 'TRAIN' },
  { line: '74', dest: 'STOKI', time: '2026-09-29T10:14:00Z', sched: '2026-09-29T10:14:00Z', platform: '', cancelled: false, mode: 'BUS' }] } } };
const LODZ = [{ src: 'tr', id: 'w', name: 'Łódź Fabryczna' }];

test('departures anywhere: minutes, the stop\'s own clock, cancelled trains, filters', () => {
  // the line column is as wide as the longest line shown, 6 for IC 130(0): "IC 130 " is 7, then the destination
  assert.deepEqual(one('departures', { stops: LODZ }, 4, 22, NOW, TR), [
    ' LODZ FABRYCZNA       ', ' IC 130 WARSZAW 5 MIN ', ' R2     KUTNO    CANC ', ' 74     STOKI  14 MIN ']);
  assert.equal(one('departures', { stops: LODZ, eta: 'clock' }, 4, 22, NOW, TR)[1], ' IC 130 WARSZAW 12:05 ');
  assert.deepEqual(one('departures', { stops: LODZ, modes: ['BUS'] }, 3, 22, NOW, TR).slice(1, 2), [' 74 STOKI      14 MIN ']);
  assert.equal(one('departures', { stops: LODZ, cancelled: 'hide', modes: ['TRAIN'] }, 3, 22, NOW, TR)[2].trim(), '');
  assert.equal(one('departures', { stops: LODZ, lines: 'r2, 74' }, 4, 22, NOW, TR)[1], ' R2 KUTNO        CANC ');
  assert.equal(one('departures', { stops: LODZ, walk: 10 }, 3, 22, NOW, TR)[1], ' R2 KUTNO        CANC ');   // the 12-minute train is past the walk, cancelled or not
  assert.equal(one('departures', { stops: LODZ, alert: true }, 6, 22, NOW, TR).find(r => r.includes('ZMIANA')), ' ZMIANA PERONU        ');
});

test('the station board leads with the time and destination, and every row keeps its platform', () => {
  // 32 flaps, 30 inside the margins. The right side is the platform (4), a space and the
  // remark (7): 12. "12:02 " is 6, so the destination has 30 - 12 - 1 - 6 = 11: WARSZAWA CE.
  assert.deepEqual(one('departures', { stops: LODZ, view: 'board' }, 4, 32, NOW, TR), [
    ' LODZ FABRYCZNA    PLAT         ', ' 12:02 WARSZAWA CE    3 12:05   ', ' 12:12 KUTNO          1 CANC    ', ' 12:14 STOKI            ON TIME ']);
  // from 38 inside the margins the line goes in, and CANCELLED is spelled out
  assert.equal(one('departures', { stops: LODZ, view: 'board' }, 4, 44, NOW, TR)[2], ' 12:12 R2     KUTNO             1 CANCELLED ');
});

test('a stop that has not answered says so, and a board built for a place follows its nearest stop', () => {
  assert.deepEqual(one('departures', { stops: [{ src: 'tr', id: 'x', name: 'Oslo S' }] }, 3, 22, NOW, {}).map(s => s.trim()), ['OSLO S', '', 'LOADING']);
  assert.deepEqual(one('departures', {}, 2, 22, NOW, {}).map(s => s.trim()), ['DEPARTURES', '-']);   // 0.10.3: a dash, never an instruction
  const live = { loc: LONDON, near: { '51.509,-0.126': { stops: [{ id: 'bus1', name: 'Trafalgar Square', modes: ['BUS'] }, { id: 'rail1', name: 'Charing Cross', modes: ['TRAIN', 'METRO'] }] } } };
  assert.deepEqual(depStops({ near: true }, live), [{ src: 'tr', id: 'bus1', name: 'Trafalgar Square' }]);
  assert.deepEqual(depStops({ near: 'rail' }, live), [{ src: 'tr', id: 'rail1', name: 'Charing Cross' }]);
  assert.deepEqual(depStops({ near: true, stops: [{ src: 'sl', id: 9117, name: 'Odenplan' }] }, live), [{ src: 'sl', id: 9117, name: 'Odenplan' }]);   // a picked stop wins
});

test('holidays: Sweden\'s own, and any other country\'s from Nager.Date', () => {
  const de = { cc: 'DE', hol: { DE: { days: { '2026-10-03': { en: 'German Unity Day', local: 'Tag der Deutschen Einheit' }, '2026-12-25': { en: 'Christmas Day', local: 'Erster Weihnachtstag' } } } } };
  assert.deepEqual(holidayOn(new Date(2026, 9, 3), 'en', de), { name: 'GERMAN UNITY DAY', red: true, flag: false });
  assert.equal(holidayOn(new Date(2026, 9, 3), 'sv', de).name, 'TAG DER DEUTSCHEN EINHEIT');   // no Swedish name, so the local one
  assert.equal(holidayOn(new Date(2026, 5, 6), 'sv', {}).name, 'NATIONALDAGEN');                // no country: Sweden, as before
  assert.equal(holidayOn(new Date(2026, 5, 6), 'en', de), null);
  assert.deepEqual(nextHoliday(new Date(2026, 8, 29, 12).getTime(), 'en', de), { date: '2026-10-03', name: 'GERMAN UNITY DAY' });
  // Sweden: from 29 September the next red day is All Saints' Day, the Saturday from 31 October: 31 October 2026
  assert.deepEqual(nextHoliday(new Date(2026, 8, 29, 12).getTime(), 'en', { cc: 'SE' }), { date: '2026-10-31', name: "ALL SAINTS' DAY" });
  // the countdown names it: 29 Sep noon to 3 Oct midnight is 3.5 days, rounded up to 4
  assert.deepEqual(one('countdown', { to: 'holiday' }, 4, 22, new Date(2026, 8, 29, 12).getTime(), de).map(s => s.trim()), ['GERMAN UNITY DAY', '', '4 DAYS', 'TO GO']);
});

test('the world clock: each city\'s own time, and +1 or -1 when its day differs from this screen\'s', () => {
  // 29 Sep 2026 22:30 UTC: Stockholm (the tests' zone) is 00:30 on the 30th, Tokyo 07:30 on the 30th, New York 18:30 on the 29th
  const t = Date.parse('2026-09-29T22:30:00Z');
  assert.deepEqual(wallIn('Asia/Tokyo', t), { h: 7, m: 30, dow: 3 });
  const out = one('worldtime', { places: [{ city: 'Tokyo', tz: 'Asia/Tokyo' }, { city: 'New York', tz: 'America/New_York' }, { city: 'São Paulo', tz: 'America/Sao_Paulo' }] }, 3, 22, t, {});
  assert.deepEqual(out, [' TOKYO          07:30 ', ' NEW YORK    18:30 -1 ', ' SAO PAULO   19:30 -1 ']);
  assert.equal(one('worldtime', { places: [{ city: 'New York', tz: 'America/New_York' }], fmt: '12' }, 1, 22, t, {})[0], ' NEW YORK 6:30 PM -1  '.slice(0, 22).padEnd(22));
});

test('currency in any base, and coins with a green or red flap for their day', () => {
  // GBP base: 1 EUR is 1 / 1.16 = 0.862 GBP; bitcoin at 61 234.5 prints whole, grouped
  const live = { fx: { GBP: { rates: { EUR: 1.16, USD: 1.33 } } }, coin: { GBP: { prices: { bitcoin: { price: 61234.5, change: -1.2 }, ethereum: { price: 2345.6, change: 0.4 } } } } };
  const out = compose({ layout: 'full', zones: [{ ch: 'currency', o: { base: 'GBP', pairs: ['EUR', 'BTC', 'ETH'] } }] }, 3, 22, NOW, 'en', live);
  assert.deepEqual(rows(out), [' 1 EUR       0.86 GBP ', ' r 1 BTC   61 235 GBP ', ' g 1 ETH    2 346 GBP ']);
  assert.equal(out[1][1], 'r');   // a chip, not the letter
  // coins only: no exchange rates needed (a one-row zone is laid out as four rows and packed)
  assert.equal(rows(compose({ layout: 'full', zones: [{ ch: 'currency', o: { base: 'GBP', pairs: ['BTC'] } }] }, 1, 22, NOW, 'en', { coin: live.coin }))[0].trim(), '1 BTC 61 235 GBP');
});

test('rain in the next hour from the 15-minute forecast', () => {
  const wx = (soon, at = NOW) => ({ wx: { '51.51,-0.13': { t: 12, feels: 10, code: 3, wind: 4, daily: [{ pp: 60, sum: 3 }], soon, at } } });
  const five = s => one('weather', { city: 'London', lat: 51.509, lon: -0.126 }, 6, 22, NOW, s)[4].trim();
  assert.equal(five(wx([{ min: 0, mm: 0 }, { min: 15, mm: 0 }, { min: 30, mm: 0.6 }])), 'RAIN IN 30 MIN');
  assert.equal(five(wx([{ min: 0, mm: 1.2 }, { min: 15, mm: 0.8 }, { min: 30, mm: 0 }])), 'DRY IN 30 MIN');
  assert.equal(five(wx([{ min: 0, mm: 0 }, { min: 30, mm: 0.6 }], NOW - 10 * 60e3)), 'RAIN IN 20 MIN');   // fetched ten minutes ago
  assert.equal(five(wx([{ min: 0, mm: 0 }, { min: 15, mm: 0.1 }])), 'RAIN 60%  3.0 MM');                   // a stray drop is not rain
  assert.equal(one('weather', { city: 'London', lat: 51.509, lon: -0.126, soon: false }, 6, 22, NOW, wx([{ min: 0, mm: 0 }, { min: 30, mm: 1 }]))[4].trim(), 'RAIN 60%  3.0 MM');
});

test('templates built for London: its weather and nearest stop, pounds, no Odenplan or midsummer', () => {
  for (const tp of TEMPLATES) {
    const b = sanitizeBoard(fromTemplate(tp.id, 'en', null, LONDON)), s = JSON.stringify(b);
    assert.ok(b, tp.id);
    assert.ok(!/Odenplan|T-Centralen|MIDSOMMAR|KANELBULLE|"sl"/.test(s), tp.id + ' still Swedish: ' + s.match(/Odenplan|T-Centralen|MIDSOMMAR|KANELBULLE|"sl"/));
    if (b.pages.some(p => p.zones.some(z => z.ch === 'weather'))) assert.equal(b.loc && b.loc.cc, 'GB', tp.id);
  }
  assert.equal(fromTemplate('cafe', 'en', null, LONDON).pages[0].zones[0].o.suffix, ' GBP');
  assert.equal(fromTemplate('cafe', 'en', null, { ...LONDON, cc: 'US', tz: 'America/New_York' }).pages[0].zones[0].o.prefix, '$');
  assert.equal(fromTemplate('home', 'en', null, { ...LONDON, cc: 'US', tz: 'America/New_York' }).pages[0].zones[0].o.fmt, '12');
  // with no place, and in Stockholm, the Swedish boards they always were
  assert.ok(JSON.stringify(fromTemplate('home', 'sv', null, null)).includes('Odenplan'));
  assert.ok(JSON.stringify(fromTemplate('home', 'sv', null, { city: 'Stockholm', lat: 59.33, lon: 18.07, cc: 'SE', tz: 'Europe/Stockholm' })).includes('"ch":"sl"'));
  assert.ok(!JSON.stringify(fromTemplate('home', 'sv', null, { city: 'Göteborg', lat: 57.71, lon: 11.97, cc: 'SE', tz: 'Europe/Stockholm' })).includes('"ch":"sl"'));   // not SL's area
});

test('Explore: every template says where it works, and a switched-off source hides only its own', () => {
  for (const tp of TEMPLATES) assert.ok(tp.section && tp.works && Array.isArray(tp.needs), tp.id);
  const hidden = TEMPLATES.filter(tp => !availableFor(tp, LONDON, ['transit'])).map(tp => tp.id);
  assert.deepEqual(hidden, ['demo', 'home', 'morning', 'station']);
});

test('every tile with an outside source credits it, and every source says who to ask', () => {
  for (const [id, s] of Object.entries(SOURCES)) assert.ok(s.credit.en && s.credit.sv && s.link && s.checked && s.contact && s.tiles.length, id);
  for (const t of TILES.filter(t => ['departures', 'currency', 'weather'].includes(t.id))) assert.ok(t.fields.some(f => f.t === 'credit'), t.id);
  for (const ch of ['departures', 'worldtime']) assert.ok(CHANNELS.includes(ch));
  // an unknown stop source, an id with a slash, and a bad time zone are all dropped
  const b = sanitizeBoard({ pages: [{ layout: 'full', zones: [{ ch: 'departures', o: { stops: [{ src: 'tr', id: 'ok_1' }, { src: 'tr', id: '../x' }, { src: 'evil', id: 'a' }, { src: 'sl', id: '9117' }], near: 'rail' } }] },
    { layout: 'full', zones: [{ ch: 'worldtime', o: { places: [{ city: 'Tokyo', tz: 'Asia/Tokyo' }, { city: 'X', tz: 'Mars/Olympus' }] } }] }] });
  assert.deepEqual(b.pages[0].zones[0].o.stops, [{ src: 'tr', id: 'ok_1', name: '' }, { src: 'sl', id: 9117, name: '' }]);
  assert.equal(b.pages[0].zones[0].o.near, 'rail');
  assert.deepEqual(b.pages[1].zones[0].o.places, [{ city: 'Tokyo', tz: 'Asia/Tokyo' }]);
});
