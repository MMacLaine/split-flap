// Two signed-in browsers on one account, one taken offline: the check from the 0.5 plan
// and the build review. Needs Chrome, `node _dev/serve.mjs` on 8801 and
// `wrangler dev --env dev --port 8787 --var DEV_TEST:1` in worker/. npm run e2e
// Exits non-zero if any step fails.
import { spawn } from 'node:child_process';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', PORT = 9400 + Math.floor(Math.random() * 300);
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/two-${Date.now()}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws; for (let i = 0; i < 50 && !ws; i++) { try { const v = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); ws = new WebSocket(v.webSocketDebuggerUrl); } catch { await sleep(200); } }
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pend = new Map();
ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } });
const send = (method, params = {}, sessionId) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });

async function browser(name) {
  const { result: { browserContextId } } = await send('Target.createBrowserContext');
  const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Runtime.enable', {}, sessionId); await send('Network.enable', {}, sessionId);
  const b = {
    name,
    ev: async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, sessionId); if (r.result.exceptionDetails) throw new Error(name + ': ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text)); return r.result.result.value; },
    go: async url => { await send('Page.navigate', { url }, sessionId); await sleep(2500); },
    offline: async off => send('Network.emulateNetworkConditions', { offline: off, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, sessionId),
    blockApi: async on => send('Network.setBlockedURLs', { urls: on ? ['*/split-flap/api/*'] : [] }, sessionId)
  };
  return b;
}
const names = b => b.ev(`JSON.stringify(splitFlap.boards.map(x => x.name).sort())`);
const server = b => b.ev(`fetch('/split-flap/api/boards').then(r => r.json()).then(j => JSON.stringify(j.boards.filter(x => !x.deleted).map(x => x.board.name).sort()))`);
const results = []; const check = (label, ok, detail) => { results.push(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`); };

try {
  const email = `two-${Date.now()}@example.com`, A = await browser('A'), B = await browser('B');
  for (const b of [A, B]) {
    await b.go('http://localhost:8787/');
    await b.ev(`localStorage.setItem('sf_started','1')`);
    await b.go('http://localhost:8787/');
    await b.ev(`fetch('/split-flap/api/dev/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: '${email}', name: 'Two Browsers' }) }).then(r => r.status)`);
  }
  // A keeps its demo board; B leaves its own demo board here and gets A's from the account
  await A.ev(`splitFlap.account.init().then(() => { splitFlap.account.answerOffer(true); })`); await sleep(3000);
  await B.ev(`splitFlap.account.init().then(() => { splitFlap.account.answerOffer(false); })`); await sleep(3000);
  const shared = await A.ev(`splitFlap.cur().id`);
  await B.ev(`splitFlap.account.sync()`); await sleep(1500);
  check('B has the account board', (await B.ev(`splitFlap.boards.some(b => b.id === '${shared}')`)) === true);

  // B goes offline and edits the shared board; A edits it online
  await B.offline(true);
  await B.ev(`(() => { const i = splitFlap.boards.findIndex(b => b.id === '${shared}'); splitFlap.active = i; splitFlap.upd(b => { b.name = 'B offline edit'; }); })()`); await sleep(2500);
  check('B knows it has unsynced work', (await B.ev(`splitFlap.account.unsyncedCount()`)) >= 1);
  await A.ev(`splitFlap.upd(b => { b.name = 'A online edit'; })`); await sleep(3000);
  check('server has A\'s edit', (await server(A)).includes('A online edit'), await server(A));

  // B comes back: both versions must survive, B's as a copy
  await B.offline(false); await B.ev(`splitFlap.account.sync()`); await sleep(3000); await B.ev(`splitFlap.account.sync()`); await sleep(2000);
  const bn = await names(B), sv = await server(B);
  check('B keeps both versions after reconnecting', bn.includes('A online edit') && bn.includes('B offline edit (copy)'), bn);
  check('the server has both', sv.includes('A online edit') && sv.includes('B offline edit (copy)'), sv);
  await A.ev(`splitFlap.account.sync()`); await sleep(2000);
  check('A gets B\'s copy', (await names(A)).includes('B offline edit (copy)'), await names(A));
  const menu = await B.ev(`(() => { splitFlap.set({ switcher: true }); const rows = [...document.querySelectorAll('.sf-menu-item')].map(x => x.textContent); splitFlap.set({ switcher: false }); return JSON.stringify(rows); })()`);
  check('the board menu shows when each account board changed', JSON.parse(menu).filter(r => /Changed \d\d:\d\d/.test(r)).length >= 2, menu);

  // The API does not answer when the page loads (the Worker mid-deploy): a board made then
  // must still reach the account once the API is back
  await A.blockApi(true); await A.go('http://localhost:8787/');
  check('with no API, no account controls', (await A.ev(`String(splitFlap.account.available)`)) === 'false');
  await A.ev(`splitFlap.duplicateBoard(0); splitFlap.upd(b => { b.name = 'Made while the API was down'; })`); await sleep(1000);
  await A.blockApi(false); await A.ev(`dispatchEvent(new Event('online'))`); await sleep(4000);
  check('once the API is back, that board reaches the account', (await server(A)).includes('Made while the API was down'), await server(A));

  // Sign out while offline with an unsynced edit: nothing may be lost
  await B.offline(true);
  await B.ev(`splitFlap.upd(b => { b.name = 'B unsynced at sign out'; })`); await sleep(2500);
  const warned = await B.ev(`(() => { splitFlap.S.editing = true; splitFlap.editor.go('account'); splitFlap.refresh(); document.querySelector('[data-k=acc-signout]').click(); return document.querySelector('[data-k=acc-signout]').textContent + ' / ' + document.querySelector('[data-k=acc-signout-why]').textContent; })()`);
  check('sign out warns about unsynced boards', /not reached your account/.test(warned), warned.slice(0, 120));
  await B.ev(`document.querySelector('[data-k=acc-signout]').click()`); await sleep(4000);
  const after = await names(B);
  check('signed out offline, the unsynced board is kept here', after.includes('B unsynced at sign out'), after);
  check('and the account boards that were safe are gone from B', !after.includes('A online edit'), after);
  check('B is signed out', (await B.ev(`String(splitFlap.account.signedIn())`)) === 'false');
} catch (e) { results.push('ERROR ' + e.message); }
console.log(results.join('\n'));
ws.close(); proc.kill(); process.exit(results.every(r => r.startsWith('PASS')) ? 0 : 1);
