// 0.11.2: the Meter board's engine, the amber half flaps, and the meter as a channel.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Meter, restGrid, overlayFor, bandsOf, STYLES } from '../src/meter.js';
import { HALF, HALVES, DRUM, VB_FROM_CHAR, isChip, cellChar } from '../src/charset.js';
import { compose } from '../src/content.js';
import { sanitizeBoard } from '../src/store.js';
import { METER } from '../src/looks.js';

const words = { idle: ['MUSIC METER', '', 'PRESS LISTEN'], listening: 'LISTENING', stopped: 'STOPPED', refused: ['NO MICROPHONE', '', 'PRESS LISTEN TO ASK AGAIN'], noMic: ['NO MICROPHONE'] };
const col = (g, c) => g.map(r => r[c]);

test('13 bands of two columns across 40, centred', () => {
  const m = new Meter(12, 40);
  assert.equal(m.nb, 13); assert.equal(m.off, 1);
  assert.deepEqual(STYLES, ['mixer', 'bars', 'mirror']);
});

test('at rest every cell is a faint flap of its zone: green, then amber, then red at the top', () => {
  const g = new Meter(12, 40).grid([], 0, 'mixer');
  const c = col(g, 1);
  assert.equal(c[11], '~g'); assert.equal(c[5], '~g');   // the bottom 60 % green
  assert.equal(c[3], '~y'); assert.equal(c[2], '~y');    // to 85 % amber
  assert.equal(c[1], '~r'); assert.equal(c[0], '~r');
  assert.equal(g[0][0], ' '); assert.equal(g[0][3], ' ');   // the gaps between bands stay blank
});

test('each column\'s top moves at most one cell a tick, two half cells, up and down', () => {
  const m = new Meter(12, 40), loud = new Float32Array(15).fill(1);
  let g = m.grid(loud, 0, 'mixer');
  assert.equal(col(g, 1)[11], 'g'); assert.equal(col(g, 1)[10], '~g');   // one cell lit
  g = m.grid(loud, 90, 'mixer');
  assert.equal(col(g, 1)[10], 'g'); assert.equal(col(g, 1)[9], '~g');
  for (let i = 2; i < 12; i++) g = m.grid(loud, i * 90, 'mixer');
  assert.deepEqual(col(g, 1), ['r', 'r', 'y', 'y', 'y', 'g', 'g', 'g', 'g', 'g', 'g', 'g']);
  // silence: it falls a cell a tick, never all at once, with the peak held as a half flap
  g = m.grid(new Float32Array(15), 12 * 90, 'mixer');
  assert.equal(col(g, 1)[0], HALF.rTop); assert.equal(col(g, 1)[1], 'r');   // the top cell is the peak, held as a half flap
});

test('a half step is a half flap in its zone\'s colour, amber included', () => {
  const m = new Meter(12, 40), b = new Float32Array(15).fill(15 / 24);   // 15 half cells: seven whole and a half, the half in amber
  let g; for (let i = 0; i < 8; i++) g = m.grid(b, i * 90, 'mixer');
  const c = col(g, 1);
  assert.equal(c[5], 'g'); assert.equal(c[6], 'g'); assert.equal(c[4], HALF.yBottom);
  const peak = new Meter(12, 40); for (let i = 0; i < 12; i++) peak.grid(new Float32Array(15).fill(1), i * 90, 'mixer');
  for (let i = 0; i < 4; i++) g = peak.grid(new Float32Array(15).fill(0.5), 1080 + i * 90, 'mixer');
  assert.ok(col(g, 1).some(ch => ch === HALF.rTop || ch === HALF.yTop), col(g, 1).join(','));   // the peak hold
});

test('Bars are one colour, Mirror grows from the middle', () => {
  const loud = new Float32Array(15).fill(1);
  let m = new Meter(12, 40), g; for (let i = 0; i < 12; i++) g = m.grid(loud, i * 90, 'bars');
  assert.ok(col(g, 1).every(ch => ch === 'f'));
  m = new Meter(12, 40); g = m.grid(loud, 0, 'mirror');
  assert.equal(col(g, 1)[5], 'f'); assert.equal(col(g, 1)[6], 'f'); assert.equal(col(g, 1)[0], '~f');
});

test('the words over the meter, for each state', () => {
  const g = restGrid(12, 40, 'mixer', 'idle', words);
  assert.ok(g.map(r => r.join('')).join('|').includes('MUSIC METER'));
  assert.ok(g.map(r => r.join('')).join('|').includes('PRESS LISTEN'));
  assert.deepEqual(overlayFor('quiet', 12, words), [{ row: 0, text: 'LISTENING' }]);
  assert.deepEqual(overlayFor('stopped', 12, words), [{ row: 5, text: 'STOPPED' }]);
  assert.equal(overlayFor('listening', 12, words), null);
  assert.equal(overlayFor('refused', 12, words)[2].text, 'PRESS LISTEN TO ASK AGAIN');
});

test('the analyser\'s 15 log bands: silence is nothing, a loud low tone lights the bass only', () => {
  const quiet = new Uint8Array(1024);
  assert.ok(bandsOf(quiet, 48000, 2048).every(v => v === 0));
  const tone = new Uint8Array(1024); for (let i = 2; i < 6; i++) tone[i] = 255;   // about 50 to 140 Hz
  const b = bandsOf(tone, 48000, 2048);
  assert.ok(b[0] > 0.5 && b[14] === 0, [...b].join());
});

test('amber halves sit on the drum after the 0.9 halves, and go to a Vestaboard as whole amber', () => {
  assert.equal(HALF.yTop, ''); assert.equal(HALF.yBottom, '');
  assert.deepEqual(HALVES[''], ['y', 'top']);
  assert.equal(DRUM.indexOf(''), DRUM.indexOf('') + 1);
  assert.equal(VB_FROM_CHAR[''], 65); assert.equal(VB_FROM_CHAR[''], 65);
  assert.ok(isChip('')); assert.equal(cellChar('~'), '~');
});

test('the meter as a channel: the unlit meter with its words, in the board\'s language, and Listen\'s grid while it runs', () => {
  const page = { layout: 'full', zones: [{ ch: 'meter', o: {} }] };
  const en = compose(page, 12, 40, 0, 'en', {}).map(r => r.join('')).join('|');
  assert.ok(en.includes('MUSIC METER') && en.includes('~g'));
  const sv = compose(page, 12, 40, 0, 'sv', {}).map(r => r.join('')).join('|');
  assert.ok(sv.includes('MUSIKMÄTARE') && sv.includes('TRYCK PÅ LYSSNA'));
  const fake = { running: () => true, state: 'listening', gridFor: (R, C) => Array.from({ length: R }, () => Array(C).fill('g')) };
  assert.equal(compose(page, 12, 40, 0, 'en', { listen: fake })[0][0], 'g');
  const refused = compose(page, 12, 40, 0, 'en', { listen: { running: () => false, state: 'refused' } }).map(r => r.join('')).join('|');
  assert.ok(refused.includes('NO MICROPHONE'));
});

test('a Meter board keeps its style through the store, and Mixer is the default', () => {
  const b = { id: 'b1', name: 'M', pages: [{ id: 'p1', name: 'M', layout: 'full', dur: 60, zones: [{ ch: 'meter', o: { style: 'mirror' } }] }] };
  assert.equal(sanitizeBoard(b).pages[0].zones[0].ch, 'meter');
  assert.equal(sanitizeBoard(b).pages[0].zones[0].o.style, 'mirror');
  b.pages[0].zones[0].o.style = 'disco';
  assert.equal(sanitizeBoard(b).pages[0].zones[0].o.style, undefined);
  assert.equal(METER.tick, 90);
});
