// The app's side of the Worker's data routes (0.8.0 review): when it asks the Worker and
// when the source, and which 503 means "switched off". fetch is replaced, so nothing here
// reaches the network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { viaWorker, dataMode, resetDataMode } from '../src/live.js';

const reply = (status, body, type = 'application/json') => new Response(body == null ? null : typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'content-type': type } });
function fake(routes) {
  const calls = [];
  globalThis.fetch = async url => { calls.push(String(url)); const f = routes.find(([m]) => String(url).includes(m)); if (!f) throw new TypeError('offline'); return typeof f[1] === 'function' ? f[1]() : f[1]; };
  return calls;
}
const shape = j => ({ shaped: j });

test('on maclaine.se the Worker answers or nothing does: a Pages 404 never sends screens to Transitous', async () => {
  resetDataMode();
  const calls = fake([['/split-flap/api/data/transit', reply(404, '<html>Not found</html>', 'text/html')], ['api.transitous.org', reply(200, { stopTimes: [] })]]);
  await assert.rejects(viaWorker('/transit/departures?stop=a&n=12', 'https://api.transitous.org/x', shape, 'maclaine.se'), /404/);
  assert.ok(!calls.some(u => u.includes('transitous.org')), calls.join(' '));
  assert.equal((await dataMode('maclaine.se')).worker, true);
});

test('without a Worker (local, self-hosted) the source is asked directly, decided once per load', async () => {
  resetDataMode();
  const calls = fake([['/split-flap/api/data/status', reply(404, 'Not found', 'text/plain')], ['api.transitous.org', () => reply(200, { stopTimes: [] })]]);
  assert.deepEqual(await viaWorker('/transit/departures?stop=a&n=12', 'https://api.transitous.org/x', shape, 'localhost'), { shaped: { stopTimes: [] } });
  await viaWorker('/transit/departures?stop=b&n=12', 'https://api.transitous.org/y', shape, 'localhost');
  assert.equal(calls.filter(u => u.includes('/data/status')).length, 1);   // asked once
  // a network failure while asking is not remembered, so a screen that booted offline asks again
  resetDataMode(); fake([]);
  assert.equal((await dataMode('localhost')).worker, false);
  const again = fake([['/split-flap/api/data/status', reply(200, { off: [] })]]);
  assert.equal((await dataMode('localhost')).worker, true);
  assert.equal(again.length, 1);
});

test('only our own source_off 503 is the kill switch; Cloudflare\'s 503 is a failure to retry', async () => {
  resetDataMode();
  fake([['/transit/', reply(503, { error: 'source_off' })]]);
  await assert.rejects(viaWorker('/transit/departures?stop=a&n=12', 'x', shape, 'maclaine.se'), err => err.off === true);
  fake([['/transit/', reply(503, '<html>Error 1102: Worker exceeded resource limits</html>', 'text/html')]]);
  await assert.rejects(viaWorker('/transit/departures?stop=a&n=12', 'x', shape, 'maclaine.se'), err => !err.off && /503/.test(err.message));
  fake([['/transit/', reply(503, { error: 'upstream_failed' })]]);
  await assert.rejects(viaWorker('/transit/departures?stop=a&n=12', 'x', shape, 'maclaine.se'), err => !err.off);
  fake([['/transit/', reply(200, { tz: 'Europe/London', deps: [] })]]);
  assert.deepEqual(await viaWorker('/transit/departures?stop=a&n=12', 'x', shape, 'maclaine.se'), { tz: 'Europe/London', deps: [] });
});
