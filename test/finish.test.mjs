// 0.11.3: the keys of before 0.10.1 leave this browser two weeks after this version first
// loads, and a look's material has its own sound only while the playlist's is the default.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { purgeOld, OLD_KEYS } from '../src/store.js';
import { soundFor, PROFILE_IDS } from '../src/sound.js';

const store = init => { const m = new Map(Object.entries(init)); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m }; };
const day = 864e5, t0 = Date.UTC(2026, 9, 10);

test('the old keys: stamped on the first load, kept for 14 days, then removed, the new ones untouched', () => {
  const s = store({ sf_boards: '[]', sf_active: '0', sf_myboards: '[]', sf_sync: '{}', sf_sync_my: '{}', sf_playlists: '[]', sf_library: '[]' });
  assert.equal(purgeOld(t0, s), false); assert.equal(s.getItem('sf_moved_at'), String(t0));
  assert.equal(purgeOld(t0 + 13 * day, s), false); assert.ok(OLD_KEYS.every(k => s.getItem(k) != null));
  assert.equal(purgeOld(t0 + 14 * day, s), true);
  assert.ok(OLD_KEYS.every(k => s.getItem(k) == null)); assert.equal(s.getItem('sf_moved_at'), null);
  assert.ok(OLD_KEYS.includes('sf_sync') && OLD_KEYS.includes('sf_sync_my'));
  assert.equal(s.getItem('sf_playlists'), '[]'); assert.equal(s.getItem('sf_library'), '[]');
  assert.equal(purgeOld(t0 + 20 * day, s), false);
});

test('a browser that has not moved yet keeps its only copy, and one with nothing old is left alone', () => {
  const s = store({ sf_boards: '[]' });
  assert.equal(purgeOld(t0 + 100 * day, s), false); assert.equal(s.getItem('sf_moved_at'), null);
  const n = store({ sf_playlists: '[]' });
  assert.equal(purgeOld(t0, n), false); assert.equal(n.getItem('sf_moved_at'), null);
});

test('the sound: a playlist\'s own choice wins, and on Clack glass, smoke and paper have their own', () => {
  assert.equal(soundFor('clack', 'glass'), 'glass'); assert.equal(soundFor('clack', 'smoke'), 'smoke'); assert.equal(soundFor(undefined, 'paper'), 'paper');
  assert.equal(soundFor('clack', 'flap'), 'clack'); assert.equal(soundFor('clack', 'solari'), 'clack');
  assert.equal(soundFor('heavy', 'glass'), 'heavy'); assert.equal(soundFor('soft', 'paper'), 'soft');
  assert.deepEqual(PROFILE_IDS, ['clack', 'heavy', 'soft', 'tick']);   // the picker offers the same four
});

test('the privacy page, in both languages, has the microphone and the new "how long", and nothing in src/, GLOSSARY.md or README.md repeats them', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const en = readFileSync(new URL('../privacy.html', import.meta.url), 'utf8'), sv = readFileSync(new URL('../site/privacy.sv.html', import.meta.url), 'utf8');
  assert.ok(en.includes('<dt>The microphone</dt>') && en.includes('never sent anywhere or stored') && en.includes('two weeks after version 0.11.3 first reaches your account or, without an account, this browser'));
  assert.ok(sv.includes('<dt>Mikrofonen</dt>') && sv.includes('skickas aldrig någonstans') && sv.includes('två veckor efter att version 0.11.3 först når ditt konto'));
  const src = readdirSync(new URL('../src/', import.meta.url)).filter(f => f.endsWith('.js')).map(f => readFileSync(new URL('../src/' + f, import.meta.url), 'utf8')).concat(['GLOSSARY.md', 'README.md'].map(f => readFileSync(new URL('../' + f, import.meta.url), 'utf8'))).join('\n');
  for (const s of ['never sent anywhere or stored', 'skickas aldrig någonstans', 'first reaches your account', 'först når ditt konto']) assert.ok(!src.includes(s), s);
  // the docs carry no privacy-shaped promises either (0.11.3 review)
  const docs = ['GLOSSARY.md', 'README.md'].map(f => readFileSync(new URL('../' + f, import.meta.url), 'utf8')).join('\n');
  for (const s of ['Never stored', 'never sent', 'never stored', 'not sent anywhere']) assert.ok(!docs.includes(s), s);
});

test('the look sheet\'s specimen: centred, in the board\'s language, with chips, only for an all-blank board', async () => {
  const { specimen, sheetGrid, blank } = await import('../src/content.js');
  const g = specimen(6, 22, 'en').map(r => r.join(''));
  assert.deepEqual(g.map(r => r.trim()), ['', 'HELLO', 'ÅÄÖ ABC 123', '12:34 18°', 'roygbv', '']);
  assert.equal(specimen(6, 22, 'sv')[1].join('').trim(), 'HEJ');
  assert.equal(specimen(3, 15, 'en').length, 3); assert.doesNotThrow(() => specimen(1, 5, 'en'));
  const own = blank(6, 22); own[0][0] = 'A';
  assert.equal(sheetGrid(own, 6, 22, 'en'), own);   // a board with anything on it is drawn as it is
});
