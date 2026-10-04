// 0.11.1: the ring, the sky and the contrast rule (src/looks.js, src/ambient.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as L from '../src/looks.js';
import { wxKind, skyInputs } from '../src/ambient.js';

test('the ring: five effects, the palettes, three stops each', () => {
  assert.deepEqual(L.RING_FX, ['off', 'glow', 'breathe', 'chase', 'flash']);
  const r = L.ringFor(L.partsOf('backlit'), null, null);
  assert.equal(r.fx, 'flash'); assert.deepEqual(r.colours, L.RING.palettes.warm.c); assert.equal(r.bright, 0.75); assert.equal(r.size, 1);
  const p = L.sanitizeParts({ material: 'flap', ring: { fx: 'chase', pal: 'ocean', speed: 'quick', bright: 'high', size: 'wide' } });
  assert.deepEqual(p.ring, { fx: 'chase', pal: 'ocean', speed: 'quick', bright: 'high', size: 'wide' });
  assert.equal(L.sanitizeParts({ material: 'flap', ring: { fx: 'music', pal: 'neon', speed: 11 } }).ring.fx, 'off');   // Music waits for Listen (0.11.2)
});

test('From the board: the chip most on the board, red over any number of greens, amber with none', () => {
  assert.equal(L.boardChip([['g', 'g', 'g', 'r']]), 'r');
  assert.equal(L.boardChip([['g', 'g', 'y'], ['']]), 'g');
  assert.equal(L.boardChip([['A', 'B']]), null);
  const sig = L.partsOf('signal');
  assert.equal(L.ringFor(sig, null, [['g', 'r']]).colours[0], '#D5352B');
  assert.deepEqual(L.ringFor(sig, null, [['A']]).colours, L.RING.palettes.amber.c);
});

test('Classic RGB: Classic with a rainbow ring that chases, drawn as Classic, legacy black', () => {
  const p = L.partsOf('rgb');
  assert.deepEqual(p.ring, { fx: 'chase', pal: 'rainbow', speed: 'medium', bright: 'medium', size: 'medium' });
  assert.equal(L.drawFor({ id: 'rgb' }).id, 'black'); assert.equal(L.LOOKS.rgb.legacy, 'black');
  assert.equal(L.ORDER[L.ORDER.indexOf('backlit') + 1], 'rgb');
  assert.equal(L.accentOf({ id: 'rgb' }), '#C8974A');
});

test('the sky across a day, for each kind of weather, from sunrise and sunset', () => {
  for (const wx of L.SKY.weather) {
    const at = m => L.skyAt({ minute: m, rise: 390, set: 1110, wx });
    assert.equal(at(120).phase, 'night'); assert.equal(at(390).phase, 'dawn'); assert.equal(at(720).phase, 'day');
    assert.equal(at(1095).phase, 'golden'); assert.equal(at(1135).phase, 'dusk');
    assert.equal(at(720).wx, wx); assert.equal(at(720).storm, wx === 'storm');
    assert.equal(at(720).layer, L.SKY.states.day[wx].layer);
  }
  assert.equal(L.skyAt({ minute: 720, wx: 'rain', stale: true }).wx, 'clear');   // stale weather: the sun alone
});

test('the sky\'s inputs: no place, fresh weather, stale weather, WMO codes', () => {
  const now = Date.UTC(2026, 9, 5, 12);
  const none = skyInputs(null, now, null);
  assert.deepEqual([none.rise, none.set, none.wx, none.none], [390, 1110, 'clear', true]);
  const lon = { lat: 51.5, lon: -0.12, tz: 'Europe/London' };
  const fresh = skyInputs(lon, now, { t: 12, code: 61, at: now - 3600e3 });
  assert.equal(fresh.wx, 'rain'); assert.equal(fresh.stale, false);
  // the sky's own clock: sunrise at 06:30, sunset after the day's real length, now in between
  assert.equal(fresh.rise, 390); assert.ok(fresh.set > 1010 && fresh.set < 1080, `${fresh.set}`);
  assert.ok(fresh.minute > 700 && fresh.minute < 820, `${fresh.minute}`);
  assert.equal(L.skyAt(fresh).phase, 'day');
  const old = skyInputs(lon, now, { t: 12, code: 61, at: now - 4 * 3600e3 });
  assert.deepEqual([old.wx, old.stale, old.hours], ['clear', true, 4]);
  assert.deepEqual([0, 2, 45, 63, 73, 95, 81, 86].map(wxKind), ['clear', 'cloud', 'fog', 'rain', 'snow', 'storm', 'rain', 'snow']);
});

test('the sky in epoch ms: a place nine hours east is in its own night, before and after midnight', () => {
  const tokyo = { lat: 35.68, lon: 139.69, tz: 'Asia/Tokyo' };
  const at = (h) => skyInputs(tokyo, Date.UTC(2026, 9, 5, h), null);
  assert.equal(L.skyAt(at(12)).phase, 'night');    // 21:00 in Tokyo, noon in London
  assert.equal(L.skyAt(at(17)).phase, 'night');    // 02:00 the next day
  assert.equal(L.skyAt(at(3)).phase, 'day');       // noon in Tokyo
  for (let h = 0; h < 24; h++) { const i = at(h); assert.ok(i.minute >= 0 && i.minute < 1440, `${h}: ${i.minute}`); }
});

test('the sky at the edges: polar day and night at 68° N, midsummer in Stockholm', () => {
  const north = { lat: 68, lon: 20, tz: 'Europe/Stockholm' };
  const june = skyInputs(north, Date.UTC(2026, 5, 21, 23), null), dec = skyInputs(north, Date.UTC(2026, 11, 21, 11), null);
  assert.equal(L.skyAt(june).phase, 'day'); assert.equal(L.skyAt(dec).phase, 'night');
  const sto = { lat: 59.33, lon: 18.07, tz: 'Europe/Stockholm' };
  for (let h = 0; h < 24; h++) {
    const i = skyInputs(sto, Date.UTC(2026, 5, 21, h), null), sk = L.skyAt(i);
    assert.ok(i.set <= 1440 && sk.phase && /^#[0-9A-F]{6}$/i.test(sk.a), `${h}: ${i.set} ${sk.phase}`);
  }
  // keys pushed past the day stay inside it and in order: a sunset at 23:59 still blends
  for (const m of [0, 300, 1300, 1439]) assert.ok(L.skyAt({ minute: m, rise: 30, set: 1439, wx: 'clear' }).phase, `${m}`);
  assert.equal(L.phaseAt(720, 0, 1440).near, 'day');
});

test('a day of Outside makes only a few letter faces: the ink tint in steps', () => {
  for (const wx of L.SKY.weather) {
    const ids = new Set();
    for (let m = 0; m < 1440; m++) ids.add(L.drawFor({ id: 'outside' }, L.skyAt({ minute: m, rise: 390, set: 1110, wx })).id);
    assert.ok(ids.size <= 18, `${wx}: ${ids.size}`);
  }
});

test('From the board on a markets chart: red half flaps count by majority, not as a warning', () => {
  const up = '\uE000', down = '\uE002';
  assert.equal(L.boardChip([[up, up, up, down]]), 'g');
  assert.equal(L.boardChip([[up, down, down]]), 'r');
  assert.equal(L.boardChip([[up, up, up, 'r']]), 'r');   // a whole red chip still wins
});

test('the contrast rule: every row of the handover\'s fixture, worked out by the built code', () => {
  const rows = readFileSync(new URL('./fixtures/contrast-0.11.csv', import.meta.url), 'utf8').trim().split('\n').slice(1).map(r => r.split(','));
  for (const [look, sky, , after, smoke] of rows) {
    const sk = sky === '-' ? null : L.SKY.states[sky.split('/')[0]][sky.split('/')[1]];
    const c = L.letterContrast(L.partsOf(look), sk);
    assert.ok(Math.abs(c.ratio - +after) < 0.02, `${look} ${sky}: ${c.ratio.toFixed(2)} for ${after}`);
    assert.equal(c.smoke, +smoke, `${look} ${sky} smoke`);
    assert.ok(c.ratio >= 4.5, `${look} ${sky}`);
  }
});

test('the sky option: Paper takes the wall only, at A hint', () => {
  const p = L.sanitizeParts({ material: 'paper', sky: { on: true, ring: true, ink: true, strength: 'weather' } });
  assert.deepEqual(p.sky, { on: true, wall: true, ring: false, ink: false, strength: 'hint' });
  const g = L.sanitizeParts({ material: 'glass', sky: { on: true, strength: 'weather' } });
  assert.equal(g.sky.strength, 'weather'); assert.equal(g.sky.ink, true);
  const sk = L.skyAt({ minute: 720, wx: 'rain' }), d = L.drawFor({ id: 'outside' }, sk);
  assert.equal(d.wall.layer, 'rain'); assert.ok(d.wall.layerOpacity > 0);
  assert.equal(L.drawFor({ id: 'outside' }, null).wall.layer, null);
});
