// Connections and interest rates (0.9.2), in real browsers: a source added on one browser
// reaches the other through the account, sealed on the server; signing out takes every
// one of them out of the browser; a guest's source is offered at the first sign-in; the
// rates template draws all four central banks. Needs Chrome, `node _dev/serve.mjs` on 8801
// and `wrangler dev --env dev --port 8787 --var DEV_TEST:1 --var ALPHAVANTAGE_KEY:none` in
// worker/, with CONN_KEY in worker/.dev.vars. It asks the ECB and the Fed for real, so it
// is not run in CI. npm run e2e:connections
import { spawn } from 'node:child_process';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', PORT = 9400 + Math.floor(Math.random() * 300);
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/two-${Date.now()}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws; for (let i = 0; i < 50 && !ws; i++) { try { const v = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); ws = new WebSocket(v.webSocketDebuggerUrl); } catch { await sleep(200); } }
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pend = new Map();
ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } });
const send = (method, params = {}, sessionId) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });

async function browser(name, shareWith) {
  const browserContextId = shareWith ? shareWith.ctx : (await send('Target.createBrowserContext')).result.browserContextId;
  const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Runtime.enable', {}, sessionId); await send('Network.enable', {}, sessionId);
  const b = {
    name, ctx: browserContextId,
    ev: async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, sessionId); if (r.result.exceptionDetails) throw new Error(name + ': ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text)); return r.result.result.value; },
    go: async url => { await send('Page.navigate', { url }, sessionId); await sleep(2500); },
    offline: async off => send('Network.emulateNetworkConditions', { offline: off, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, sessionId),
    blockApi: async on => send('Network.setBlockedURLs', { urls: on ? ['*/split-flap/api/*'] : [] }, sessionId)
  };
  return b;
}
const results = []; const check = (label, ok, detail) => { results.push(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail !== undefined ? '  ' + detail : ''}`); };
const KEY = 'E2EKEY' + Date.now().toString(36).toUpperCase();

try {
  const email = `cn-${Date.now()}@example.com`, A = await browser('A'), B = await browser('B'), C = await browser('C');
  for (const b of [A, B, C]) { await b.go('http://localhost:8787/'); await b.ev(`localStorage.setItem('sf_started','1'); localStorage.setItem('sf_cue_seen','1'); localStorage.setItem('sf_lang','en')`); await b.go('http://localhost:8787/'); }
  // C, still a guest, adds a key; it is offered when C signs in
  await C.ev(`splitFlap.addConnection('av', '${KEY}C', 'Guest key')`);
  for (const b of [A, B, C]) await b.ev(`fetch('/split-flap/api/dev/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: '${email}', name: 'Conn Test' }) }).then(r => r.status)`);
  await A.ev(`splitFlap.account.init().then(() => splitFlap.account.answerOffer(false))`); await sleep(2500);
  await B.ev(`splitFlap.account.init().then(() => splitFlap.account.answerOffer(false))`); await sleep(2500);
  await C.ev(`splitFlap.account.init()`); await sleep(1500);
  check('a guest\'s key is offered at the first sign-in', (await C.ev(`JSON.stringify(splitFlap.account.offerConn())`)).length > 2, await C.ev(`JSON.stringify(splitFlap.account.offerConn())`));
  await C.ev(`splitFlap.account.answerOffer(true)`); await sleep(3000);

  // A adds a key: it reaches the account at once, and B on its next sync
  await A.ev(`splitFlap.addConnection('av', '${KEY}', 'My key')`); await sleep(2500);
  const onServer = await A.ev(`fetch('/split-flap/api/connections').then(r => r.json()).then(j => JSON.stringify(j.connections.filter(x => !x.deleted).map(x => x.board.value).sort()))`);
  check('A\'s key is with the account, and C\'s from the offer', onServer.includes(KEY + '"') && onServer.includes(KEY + 'C'), onServer);
  await B.ev(`splitFlap.account.sync()`); await sleep(2500);
  check('B has it after a sync', (await B.ev(`JSON.stringify(splitFlap.connections.map(c => c.value))`)).includes(KEY + '"'));
  check('the account export names it without its value', !(await A.ev(`fetch('/split-flap/api/export').then(r => r.text())`)).includes('${KEY}'));

  // a board that uses it never holds it
  await A.ev(`(() => { const app = splitFlap; app.useTemplate('stocks'); app.upd(b => { b.pages[0].zones[0].o.source = 'key'; b.pages[0].zones[0].o.symbols = [{ s: 'IBM' }]; }); })()`); await sleep(2500);
  const leak = await A.ev(`(async () => { const s = await import('./src/store.js'); const b = splitFlap.cur(); const srv = await fetch('/split-flap/api/boards').then(r => r.text()); return [JSON.stringify(b), s.encodeBoard(b), localStorage.getItem('sf_boards') || '', srv].some(x => String(x).includes('${KEY}')); })()`);
  check('the board, its link, the saved storyboards and the account\'s boards never hold it', leak === false);

  // signing out takes every connection the account owns out of this browser
  await B.ev(`splitFlap.account.signOut()`); await sleep(3000);
  check('signing out removes them from the browser', (await B.ev(`JSON.stringify(splitFlap.connections)`)) === '[]' && !(await B.ev(`localStorage.getItem('sf_conns') || ''`)).includes('${KEY}'), await B.ev(`JSON.stringify(splitFlap.connections.map(c => c.name))`));

  // interest rates: the ECB and the Fed from the browser, the Bank of England and the Riksbank through the Worker
  await A.ev(`splitFlap.useTemplate('rates')`); await sleep(500);
  const ok = async () => A.ev(`['riks:1', 'ecb:1', 'boe:1', 'fed:1'].every(k => (splitFlap.live.data.rates[k] || {}).series && splitFlap.live.data.rates[k].series.length)`);
  for (let i = 0; i < 40 && !(await ok()); i++) await sleep(500);
  const four = await A.ev(`(async () => { const { compose } = await import('./src/content.js'); const app = splitFlap, d = app.dims(); return compose(app.cur().pages[1], d.rows, d.cols, Date.now(), 'en', app.live.data).map(r => r.join('').trim()).filter(Boolean).join(' | '); })()`);
  check('the rates template draws all four central banks', (await ok()) && (four.match(/%/g) || []).length === 4, four);
} catch (err) { check('no exception', false, err && err.message); }

console.log(results.join('\n'));
ws.close(); proc.kill();
process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
