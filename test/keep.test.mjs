// 0.9.4: the last live answers are kept in the browser, so a screen that restarts offline
// shows what it had, with the note saying how old it is, instead of LOADING everywhere.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
globalThis.addEventListener = () => {};
const { Live } = await import('../src/live.js');

test('answers are kept without their fetch state, and come back as never tried', () => {
  const a = new Live(() => {}); clearInterval(a.timer);
  const at = Date.now() - 60 * 60e3;
  a.data.wx['59.33,18.07'] = { t: 14, at, tried: at, busy: false, err: true, fails: 2 };
  a.data.tr['stop1'] = { busy: true, tried: at };   // nothing arrived yet: not kept
  a.keep();
  const b = new Live(() => {}); clearInterval(b.timer); clearTimeout(a.keepT);
  assert.deepEqual(b.data.wx['59.33,18.07'], { t: 14, at });
  assert.equal(b.data.tr['stop1'], undefined);
  const page = { zones: [{ ch: 'weather', o: { lat: 59.33, lon: 18.07 } }] };
  assert.ok(b.staleMinutes(page) >= 59, 'the note says how old it is');
});

test('nothing older than two days comes back', () => {
  store.set('sf_live', JSON.stringify({ v: 1, at: Date.now() - 3 * 864e5, d: { wx: { k: { t: 1, at: 1 } } } }));
  const c = new Live(() => {}); clearInterval(c.timer);
  assert.equal(c.data.wx.k, undefined);
});
