// Markets (0.9), in a real browser: the Crypto template draws a live line in half flaps,
// Stocks shows SAMPLE until it has closes, Finance has its kinds in order, new storyboards
// are 12 x 40, and your own key never leaves this browser. Needs Chrome, `node _dev/serve.mjs`
// on 8801 and `wrangler dev --env dev --port 8787 --var DEV_TEST:1 --var ALPHAVANTAGE_KEY:none`
// in worker/: the last var keeps the real key's 25 calls a day out of the tests. It asks
// CoinGecko for real, so it is not run in CI. npm run e2e:markets
import { spawn } from 'node:child_process';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', PORT = 9300 + Math.floor(Math.random() * 90);
const URL0 = process.env.APP || 'http://localhost:8787/';
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/nav-${Date.now()}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 50 && !tabs; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); } catch { await sleep(200); } }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}; ws.onmessage = e => { const m = JSON.parse(e.data); if (pend[m.id]) { pend[m.id](m.result); delete pend[m.id]; } };
const send = (method, params = {}) => new Promise(r => { pend[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (!r) return undefined; /* the page left mid-call */ if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const go = async url => { await send('Page.navigate', { url }); await sleep(2500); };
const results = []; const check = (label, ok, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail !== undefined ? '  ' + detail : ''}`);
const key = async (k, mods = 0) => { const code = { ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, Enter: 13, Escape: 27, Delete: 46 }[k];
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: code, modifiers: mods, text: k === 'Enter' ? '\r' : undefined }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: code, modifiers: mods }); await sleep(250); };
const at = () => ev('location.hash'), lv = () => ev(`(() => { const E = splitFlap.editor.E; return splitFlap.S.editing ? E.sec + ':' + E.lv + (E.lv === 'sb' ? ':' + E.view : '') : 'closed'; })()`);

const composed = expr => ev(`(async () => { const { compose } = await import('./src/content.js'); const app = splitFlap, d = app.dims(), p = ${expr}; return compose(p, d.rows, d.cols, Date.now(), app.S.lang, app.live.data).map(r => r.join('')).join('|'); })()`);
const waitFor = async (expr, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(expr)) return true; await sleep(500); } return false; };



try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await go(URL0); await ev(`localStorage.setItem('sf_cue_seen','1'); localStorage.setItem('sf_lang','en'); localStorage.setItem('sf_started','1')`); await go(URL0);
  const before = await ev('JSON.stringify(splitFlap.dims())');

  // Crypto, live and keyless
  await ev(`splitFlap.useTemplate('crypto')`); await sleep(500);
  check('the Crypto template is 12 x 40', (await ev('JSON.stringify(splitFlap.dims())')) === '{"rows":12,"cols":40}', await ev('JSON.stringify(splitFlap.dims())'));
  const got = await waitFor(`Object.keys(splitFlap.live.data.mk).some(k => k.startsWith('crypto:') && (splitFlap.live.data.mk[k].closes || []).length > 5)`, 30000);
  const grid = await composed(`app.cur().pages[0]`);
  check('it draws a line of half flaps from CoinGecko', got && /[\uE000-\uE005]/.test(grid), grid.replace(/[\uE000-\uE005]/g, '~').replace(/\s{2,}/g, ' ').slice(0, 160));
  check('with the coin, its price and OPEN 24/7 beside it', /BITCOIN|ETHER/.test(grid) && /OPEN 24\/7/.test(grid) && /\d/.test(grid));

  // Stocks: built in, through the Worker; SAMPLE until the object has closes
  await ev(`splitFlap.useTemplate('stocks')`); await sleep(2500);
  const st = await composed(`app.cur().pages[0]`);
  const real = /CLOSE/.test(st) && /GBX/.test(st), sample = /SAMPLE/.test(st) && /-----/.test(st);
  check('Stocks shows real closes, or SAMPLE with dashes until the key has answered', real || sample, real ? 'real' : sample ? 'sample' : st.replace(/\s{2,}/g, ' ').slice(0, 120));
  check('it asked the Worker for all six symbols in one request', (await ev(`JSON.stringify(Object.keys(splitFlap.live.data.mkq))`)).includes('0MHW.LON,0NC6.LON,AAPL,AZN.LON,MSFT,SHEL.LON'), await ev(`JSON.stringify(Object.keys(splitFlap.live.data.mkq))`));

  // Finance in Explore: its own page, the kinds in order
  await ev(`splitFlap.S.editing || splitFlap.toggleEdit()`); await sleep(400);
  await ev(`splitFlap.editor.go({ sec: 'ex', lv: 'list' })`); await sleep(500);
  await ev(`document.querySelector('[data-k=sec-finance]').click()`); await sleep(500);
  check('Finance has a page of its own', (await at()) === '#/explore/finance', await at());
  check('with Stocks, ETFs, Crypto, Currency and Interest rates in that order', (await ev(`[...document.querySelectorAll('.sf-level .sf-group > .sf-eyebrow')].map(e => e.textContent).join(', ')`)) === 'Stocks, ETFs, Crypto, Currency, Interest rates', await ev(`[...document.querySelectorAll('.sf-level .sf-group > .sf-eyebrow')].map(e => e.textContent).join(', ')`));
  await ev(`document.querySelector('[data-k=tpl-stocks]').click()`); await sleep(400);
  check('a template opens inside its section', (await at()) === '#/explore/finance/stocks', await at());
  await ev(`document.querySelector('[data-k=back]').click()`); await sleep(400);
  check('and Back returns to the section', (await at()) === '#/explore/finance', await at());

  // 0.10.3: each template is made at its own size: Blank at 6 x 22, Stocks at 12 x 40
  await ev(`splitFlap.useTemplate('blank')`); await sleep(400);
  check('Blank is made at its recommended 6 x 22', (await ev('JSON.stringify(splitFlap.dims())')) === '{"rows":6,"cols":22}');
  await ev(`splitFlap.useTemplate('stocks')`); await sleep(400);
  check('and Stocks at 12 x 40', (await ev('JSON.stringify(splitFlap.dims())')) === '{"rows":12,"cols":40}');
  check('and the demo from before keeps its 6 x 22', before === '{"rows":6,"cols":22}', before);

  // your own key: kept in this browser, never in the board, a link, a blueprint or the saved storyboards
  await ev(`(() => { const app = splitFlap; app.useTemplate('stocks'); app.upd(b => { b.pages[0].zones[0].o.source = 'key'; b.pages[0].zones[0].o.symbols = [{ s: 'IBM' }]; }); })()`); await sleep(400);
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'board', sb: splitFlap.cur().id, bd: splitFlap.cur().pages[0].id })`); await sleep(500);
  await ev(`document.querySelector('[data-k=zone-0]') && document.querySelector('[data-k=zone-0]').click()`); await sleep(300);
  await ev(`(() => { const a = document.querySelector('[data-k=adv-markets]'); if (a && a.getAttribute('aria-expanded') !== 'true') a.click(); })()`); await sleep(400);
  const hasField = await ev(`String(!!document.querySelector('[data-k=f-conn]'))`);
  await ev(`(() => { const el = document.querySelector('[data-k=f-conn]'); el.value = 'TESTKEY0123456789'; el.dispatchEvent(new Event('change')); })()`); await sleep(400);
  check('the key field is there under More options', hasField === 'true');
  check('the key is kept in this browser', (await ev(`JSON.parse(localStorage.getItem('sf_conns')).some(c => c.kind === 'av' && c.value === 'TESTKEY0123456789')`)) === true);
  const leaks = await ev(`(async () => { const s = await import('./src/store.js'); const b = splitFlap.cur(); const out = [];
    if (JSON.stringify(b).includes('TESTKEY')) out.push('board');
    if (String(s.encodeBoard(b)).includes('TESTKEY') || JSON.stringify(s.decodeBoard(s.encodeBoard(b)) || {}).includes('TESTKEY')) out.push('link');
    if ((localStorage.getItem('sf_boards') || '').includes('TESTKEY')) out.push('saved storyboards');
    splitFlap.editor.saveToMy(b.pages[0], { kind: 'storyboard', id: b.id }, splitFlap.dims(), b.theme); await new Promise(r => setTimeout(r, 300));
    if ((localStorage.getItem('sf_myboards') || '').includes('TESTKEY')) out.push('blueprint');
    return out.join(', ') || 'none'; })()`);
  check('and never in the board, its link, the saved storyboards or a blueprint', leaks === 'none', leaks);
  const needs = await composed(`app.cur().pages[0]`);
  await ev(`splitFlap.connections.slice().forEach(c => splitFlap.removeConnection(c.id))`); await sleep(1500);
  check('without a key the board says it needs one, never an error', /NEEDS YOUR KEY/.test(await composed(`app.cur().pages[0]`)), (await composed(`app.cur().pages[0]`)).replace(/\s{2,}/g, ' ').slice(0, 100));
} catch (err) { check('no exception', false, err && err.message); }

console.log(results.join('\n'));
ws.close(); proc.kill();
process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
