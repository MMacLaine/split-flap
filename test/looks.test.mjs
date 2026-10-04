// 0.11.0: looks (src/looks.js), and a board's look carried wherever its theme goes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as L from '../src/looks.js';
import { sanitizeBlueprint, sanitizeBoard, sanitizeSettings, encodeBoard, decodeBoard } from '../src/store.js';
import { resolve, decompose, migrateData, contentKey } from '../src/library.js';
import { fromTemplate } from '../src/templates.js';

test('the fixed legacy reading: black is Default, white is Paper, solari is Solari, whatever the default', () => {
  for (const setting of [null, { id: 'look', look: 'calm' }, { id: 'look', look: 'custom', parts: L.partsOf('calm') }]) {
    assert.equal(L.lookOf({ theme: 'black' }).look, 'default');
    assert.equal(L.lookOf({ theme: 'white' }).look, 'paper');
    assert.equal(L.lookOf({ theme: 'solari' }).look, 'solari');
    assert.equal(L.lookFor({ theme: 'white' }, null, setting, null).id, 'paper');
    assert.equal(L.lookFor({ theme: 'solari' }, null, setting, null).id, 'solari');
  }
  assert.equal(L.lookFor({ theme: 'black' }, null, { id: 'look', look: 'calm' }, null).id, 'calm');   // a Default board follows the default
});

test('what shows on a screen: a preview, then the pin, then the board, then the default, then Classic', () => {
  const board = { look: 'calm' }, def = { id: 'look', look: 'calm' };
  assert.equal(L.lookFor({ look: 'default' }, null, null, null).id, 'classic');
  assert.equal(L.lookFor({ look: 'default' }, null, def, null).id, 'calm');
  assert.equal(L.lookFor({ look: 'classic' }, null, def, null).id, 'classic');
  assert.equal(L.lookFor(board, { id: 'paper' }, def, null).id, 'paper');
  assert.equal(L.lookFor(board, { id: 'paper' }, def, { id: 'classic' }).id, 'classic');   // a preview wins over a pin
  assert.equal(L.lookFor(board, null, null, { id: 'follow' }).id, 'calm');                // Follow the boards is no preview
  const own = L.lookFor({ look: 'custom', lookParts: L.partsOf('calm') }, null, null, null);
  assert.equal(own.id, 'custom'); assert.equal(own.parts.material, 'glass');
});

test('Classic, Paper and Solari draw with the 0.10 themes; any other look is composed', () => {
  assert.equal(L.drawFor({ id: 'classic' }).id, 'black');
  assert.equal(L.drawFor({ id: 'paper' }).id, 'white');
  assert.equal(L.drawFor({ id: 'solari' }).id, 'solari');
  const c = L.drawFor({ id: 'calm' });
  assert.match(c.id, /^L11-glass-serif-/); assert.equal(c.theme.backdrop, null); assert.ok(c.theme.body); assert.ok(c.theme.glow);
  assert.equal(c.wall.kind, 'fields'); assert.deepEqual([c.theme.wallBg.a, c.theme.wallBg.b, c.theme.wallBg.c], ['#1D3B6B', '#2C2457', '#0E4A4E']);
  assert.equal(L.legacyOf('calm'), 'black'); assert.equal(L.legacyOf('paper'), 'white'); assert.equal(L.legacyOf('custom', { material: 'solari' }), 'solari');
  assert.equal(L.legacyOf('default'), 'black');   // a Default board keeps black, so a new default rewrites nothing
});

test('motion: a look with its own wins over the playlist; Classic, Paper and Solari leave it to the playlist', () => {
  assert.equal(L.motionOf({ id: 'classic' }), null); assert.equal(L.motionOf({ id: 'paper' }), null);
  assert.deepEqual(L.motionOf({ id: 'calm' }), { label: 'Gentle', speed: 'gentle', transition: 'drift' });
  assert.equal(L.motionOf({ id: 'custom', parts: Object.assign(L.partsOf('calm'), { motion: 'playlist' }) }), null);
});

test('the contrast rule: every look and every row of the handover fixture reaches 4.5', () => {
  for (const id of ['classic', 'calm', 'paper', 'solari']) assert.ok(L.letterContrast(L.partsOf(id)).ratio >= 4.5, id);
  const rows = readFileSync(new URL('./fixtures/contrast-0.11.csv', import.meta.url), 'utf8').trim().split('\n'), head = rows.shift().split(',');
  const col = head.findIndex(h => /after/i.test(h)); assert.ok(col >= 0, head.join());
  for (const r of rows) { const v = +r.split(',')[col]; assert.ok(v >= 4.5, r); }
  assert.ok(Math.abs(L.letterContrast(L.partsOf('classic')).ratio - 13.69) < 0.01 && Math.abs(L.letterContrast(L.partsOf('calm')).ratio - 7.55) < 0.01);
});

test('Make your own never stores what MATRIX does not allow', () => {
  assert.equal(L.sanitizeParts({ material: 'metal' }), null);            // drawn, not offered yet
  const p = L.sanitizeParts({ material: 'paper', type: 'round', ink: 'lime', lit: true, motion: 'disco', wall: { kind: 'fields' } });
  assert.deepEqual([p.type, p.ink, p.lit, p.motion, p.wall.kind], ['mono', 'ink', false, 'playlist', 'still']);
  const s = L.sanitizeParts({ material: 'solari', type: 'serif', wall: { kind: 'still', base: '#123456' } });
  assert.deepEqual([s.type, s.wall.base], ['grotesk', '#123456']);
  for (const m of L.RELEASED) for (const k of L.MATRIX.walls[m]) assert.equal(L.sanitizeParts({ material: m, wall: L.wallPreset(k, m) }).wall.kind, k);
  assert.deepEqual(L.RELEASED, ['flap', 'solari', 'paper', 'glass', 'smoke']);
});

test('the swatch: the wall, a face and the letters, lit where they are lit', () => {
  const c = L.swatch(L.partsOf('calm')), k = L.swatch(L.partsOf('classic'));
  assert.match(c.wall, /^linear-gradient/); assert.equal(c.lit, true); assert.equal(c.ink, '#FFFFFF');
  assert.equal(k.wall, '#0A0A0C'); assert.equal(k.lit, false); assert.equal(k.ink, '#EDE6D6');
});

test('a look travels with a board: stored, in a link, resolved, taken apart, copied, merged', async () => {
  const bp = sanitizeBlueprint({ id: 'a', name: 'Dep', size: '6x22', rows: 6, cols: 22, theme: 'black', look: 'calm', page: { id: 'a', layout: 'full', zones: [] } });
  assert.equal(bp.look, 'calm');
  const own = sanitizeBlueprint({ id: 'b', name: 'B', rows: 6, cols: 22, look: 'custom', lookParts: { material: 'glass', type: 'serif', ink: 'rose' }, page: { layout: 'full', zones: [] } });
  assert.equal(own.lookParts.ink, 'rose');
  assert.equal(sanitizeBlueprint({ id: 'c', name: 'C', rows: 6, cols: 22, look: 'nonsense', page: { layout: 'full', zones: [] } }).look, undefined);
  const lib = new Map([['a', bp]]), pl = { id: 'p', name: 'P', items: [{ id: 'a', dur: 10, wins: [] }], transition: 'classic', speed: 'fast', quiet: {} };
  const r = resolve(pl, lib); assert.equal(r.pages[0].look, 'calm');
  r.pages.push(Object.assign(JSON.parse(JSON.stringify(r.pages[0])), { id: 'copy' }));   // added, or duplicated
  const d = decompose(r, lib); assert.equal(d.boards.find(x => x.id === 'copy').look, 'calm');
  const link = await decodeBoard(await encodeBoard(r)); assert.equal(link.pages[0].look, 'calm');
  assert.notEqual(contentKey(bp), contentKey(Object.assign({}, bp, { look: 'classic' })));   // two boards that differ by look stay two
  const m = migrateData([sanitizeBoard({ id: 's', name: 'S', size: '6x22', pages: [{ id: 'x', name: 'X', layout: 'full', zones: [], look: 'calm' }] })], []);
  assert.equal(m.library[0].look, 'calm');
});

test('the account default is a settings row, checked against MATRIX', () => {
  assert.deepEqual(sanitizeSettings({ id: 'look', look: 'calm' }), { id: 'look', look: 'calm' });
  assert.equal(sanitizeSettings({ id: 'look', look: 'custom', parts: { material: 'metal' } }), null);
  assert.equal(sanitizeSettings({ id: 'look', look: 'custom', parts: { material: 'glass' } }).parts.material, 'glass');
  assert.equal(sanitizeSettings({ id: 'look', look: 'nope' }), null);
});

test('template looks: only once the look has shipped, keyed to the real template ids', () => {
  assert.equal(L.templateLook('letters'), 'calm');
  assert.equal(L.templateLook('station'), 'signal');        // 0.11.1: the ring has shipped
  assert.equal(fromTemplate('letters', 'en').pages[0].look, 'calm');
  assert.equal(fromTemplate('station', 'en').pages[0].look, 'signal');
  assert.equal(fromTemplate('weather', 'en').pages[0].look, 'outside');
  assert.equal(fromTemplate('stocks', 'en').pages[0].look, 'backlit');
  assert.equal(fromTemplate('cafe', 'en').pages[0].look, 'sunday');
  assert.equal(fromTemplate('news', 'en').pages[0].look, undefined);   // the rest stay on their 0.10 theme
  assert.equal(L.templateLook('meter'), 'party');   // 0.11.2: Party has shipped with Listen
  assert.equal(fromTemplate('meter', 'en').pages[0].look, 'party');
  for (const id of Object.keys(L.TEMPLATE_LOOKS)) assert.ok(['demo', 'blank', 'home', 'morning', 'news', 'weather', 'station', 'lobby', 'world', 'cafe', 'money', 'stocks', 'indices', 'crypto', 'rates', 'colour', 'letters', 'meter', 'showcase'].includes(id), id);
});

test('the strings load, and every English key has a Swedish one', async () => {
  const { STR } = await import('../src/strings.js');
  const keys = o => Object.keys(o).sort();
  assert.deepEqual(keys(STR.sv), keys(STR.en)); assert.deepEqual(keys(STR.sv.lk), keys(STR.en.lk));
  assert.ok(!/theme/i.test(STR.en.themeAll + STR.en.boardSize + STR.en.sizeOwn));   // "look" throughout (review 8)
});
