// Anonymous usage counts (0.11.5): the app's queue and the Worker's checks.
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.localStorage = globalThis.localStorage || { m: {}, getItem(k) { return this.m[k] ?? null; }, setItem(k, v) { this.m[k] = String(v); } };
const { Track, deviceOf, band, errText } = await import('../src/track.js');
const { parseBatch, clean } = await import('../worker/src/events.js');

test('the kind of screen comes from its size, and a big kiosk is a wall', () => {
  assert.equal(deviceOf(390, 844, false), 'phone');
  assert.equal(deviceOf(820, 1180, false), 'tablet');
  assert.equal(deviceOf(1440, 900, false), 'desktop');
  assert.equal(deviceOf(1920, 1080, true), 'wall');
  assert.equal(deviceOf(390, 844, true), 'phone');
});

test('counts go in bands, and an error loses its numbers and quoted text', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 9, 10, 400].map(band), ['0', '1', '2-3', '2-3', '4-9', '4-9', '10+', '10+']);
  assert.equal(errText('Cannot read "Anna\'s board" at 12:40'), 'Cannot read "…" at #:#');
  assert.ok(errText('x'.repeat(200)).length <= 60);
});

test('the queue sends one batch with the context, a repeated view counts once, and nothing is left', () => {
  const sent = [];
  const tr = new Track({ off: false, send: b => sent.push(JSON.parse(b)), ctx: () => ({ d: 'phone', l: 'en', v: '0.11.5', k: 'no', a: 'no' }) });
  clearInterval(tr.timer);
  tr.ev('view', 'sb:list'); tr.ev('view', 'sb:list'); tr.ev('view', 'ex:list'); tr.ev('template_used', 'station', '10x32');
  tr.flush();
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].e.map(e => e.n), ['view', 'view', 'template_used']);
  assert.equal(sent[0].c.d, 'phone');
  assert.ok(['yes', 'no'].includes(sent[0].c.r));
  tr.flush(); assert.equal(sent.length, 1, 'an empty queue sends nothing');
});

test('off sends nothing at all', () => {
  const sent = []; const tr = new Track({ off: true, send: b => sent.push(b) });
  tr.ev('open', 'first'); tr.flush(); assert.equal(sent.length, 0);
});

test('the Worker keeps only well-formed events, and strips what could be personal', () => {
  const b = parseBatch({ c: { d: 'wall', l: 'sv', v: '0.11.5', r: 'yes', k: 'yes', a: 'no', id: 'user-123' },
    e: [{ n: 'open', a: 'first' }, { n: 'Bad Name' }, { n: 'fail', a: 'mail anna@example.com about https://x.example/a?b=1 or 0701234567' }, null, { n: 'x' }] });
  assert.deepEqual(b.ctx, { device: 'wall', lang: 'sv', version: '0.11.5', returning: 'yes', kiosk: 'yes', account: 'no' });
  assert.deepEqual(b.events.map(e => e.name), ['open', 'fail']);
  assert.equal(b.events[1].a, 'mail @ about url or #');
  assert.ok(!JSON.stringify(b).includes('user-123'), 'an id in the context is dropped');
  assert.equal(parseBatch({ e: 'no' }), null);
  assert.equal(parseBatch(null), null);
  assert.equal(parseBatch({ e: Array.from({ length: 100 }, () => ({ n: 'view' })) }).events.length, 40);
  assert.equal(clean('a'.repeat(100)).length, 60);
});

test('a full queue sends at once rather than dropping the first events', () => {
  const sent = [];
  const tr = new Track({ off: false, send: b => sent.push(JSON.parse(b)), ctx: () => ({}) });
  clearInterval(tr.timer);
  tr.ev('open', 'first');
  for (let i = 0; i < 45; i++) tr.ev('said', 'k' + i);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].e[0].n, 'open', 'the visit itself is never the one lost');
  assert.equal(sent[0].e.length, 40);
});
