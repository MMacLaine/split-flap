// 0.10.2, in a real browser: tiles laid out for 12 x 40, Fill screen as the wall's setting,
// and the editor on a phone (finger-sized composer cells, a landscape layout, the folded
// playlist). Needs Chrome and `node _dev/serve.mjs` on 8801 (no Worker needed). npm run e2e:phone
import { spawn } from 'node:child_process';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', PORT = 9300 + Math.floor(Math.random() * 90);
const URL0 = process.env.APP || 'http://localhost:8801/';
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
const lv = () => ev(`(() => { const E = splitFlap.editor.E; return splitFlap.S.editing ? E.sec + ':' + E.lv + (E.lv === 'sb' ? ':' + E.view : '') : 'closed'; })()`);
const rowsUsed = () => ev(`splitFlap.grid().filter(r => r.some(c => c !== ' ')).length`);
try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await go(URL0); await ev(`localStorage.setItem('sf_started','1'); localStorage.setItem('sf_cue_seen','1')`); await go(URL0);

  // 12 x 40: a clock fills the board
  await ev(`(() => { const app = splitFlap; app.useTemplate('blank'); app.updPage(p => { p.layout = 'full'; p.zones = [{ ch: 'clock', o: { fmt: '24' } }]; }); })()`); await sleep(500);
  check('a 12 x 40 board is 12 x 40', (await ev('JSON.stringify(splitFlap.dims())')) === JSON.stringify({ rows: 12, cols: 40 }), await ev('JSON.stringify(splitFlap.dims())'));
  check('a clock on it uses the board, big digits and the date', (await rowsUsed()) >= 11, String(await rowsUsed()));
  await ev(`splitFlap.updPage(p => { p.zones = [{ ch: 'worldtime', o: { places: [{ city: 'London', tz: 'Europe/London' }, { city: 'Tokyo', tz: 'Asia/Tokyo' }] } }]; })`); await sleep(300);
  check('a world clock has a column a city', /LONDON +TOKYO/.test(await ev(`splitFlap.grid().map(r => r.join('')).find(r => r.includes('LONDON')) || ''`)));

  // Fill screen: the editor never edits a phone's own shape
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'board', sb: splitFlap.shown().id, bd: splitFlap.shown().pages[0].id })`); await sleep(300);
  await ev(`document.querySelector('[data-k=size-fill]').click()`); await sleep(400);
  check('Fill screen previews at 8 x 22 until a wall has run it', (await ev('JSON.stringify(splitFlap.dims())')) === JSON.stringify({ rows: 8, cols: 22 }), await ev('JSON.stringify(splitFlap.dims())'));
  check('and says the wall works it out', /worked out by the wall/.test(await ev(`(document.querySelector('[data-k=fill-note]') || {}).textContent || ''`)));
  await ev(`document.querySelector('[data-k=done]').click()`); await sleep(400);
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await go(URL0 + '?kiosk=1'); await sleep(1500);
  const wall = await ev('JSON.stringify(splitFlap.dims())');
  check('a wall measures itself and remembers it', (await ev(`localStorage.getItem('sf_fill')`)) === JSON.parse(wall).rows + 'x' + JSON.parse(wall).cols, `${wall} / ${await ev(`localStorage.getItem('sf_fill')`)}`);
  await go('about:blank');   // off the wall first: a wall that changes shape measures itself again
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await go(URL0); await ev('splitFlap.toggleEdit()'); await sleep(500);
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'board', sb: splitFlap.shown().id, bd: splitFlap.shown().pages[0].id })`); await sleep(400);
  check('on a phone the editor shows the wall\'s size, not the phone\'s', (await ev('JSON.stringify(splitFlap.dims())')) === wall, await ev(`JSON.stringify([splitFlap.dims(), splitFlap.S.editing, splitFlap.editor.E.lv, splitFlap.currentPage().size, localStorage.getItem('sf_fill'), splitFlap.shown().pages.map(p => p.size)])`));
  await ev(`document.querySelector('[data-k=size-12x40]').click()`); await sleep(300);

  // the composer on a phone: cells a finger can pick
  await ev(`(() => { splitFlap.updPage(p => { p.zones = [{ ch: 'message', o: { lines: ['', 'HELLO'] } }]; }); splitFlap.editor.openZone(0); })()`); await sleep(500);
  const cw = await ev(`(() => { const c = document.querySelector('.sf-comp-cell'); return c ? Math.round(c.getBoundingClientRect().width) : 0; })()`);
  check('a 40-wide message on a phone keeps cells of 14 px or more', cw >= 14, cw + ' px');
  check('and says to swipe for the rest', (await ev(`String(!!document.querySelector('[data-k=comp-scroll]'))`)) === 'true');
  check('the grid scrolls sideways', (await ev(`(() => { const w = document.querySelector('.sf-composer.scroll'); return !!w && w.scrollWidth > w.clientWidth; })()`)) === true);

  // a swipe across the wide grid scrolls without placing the caret or raising the keyboard (0.10.2 review)
  const box = await ev(`(() => { const r = document.querySelector('.sf-comp-grid').getBoundingClientRect(); return JSON.stringify([r.left + 60, r.top + 20]); })()`), [sx, sy] = JSON.parse(box);
  const caret0 = await ev('splitFlap.S.caret');
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sx, y: sy }] });
  for (let k = 1; k <= 8; k++) { await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: sx - k * 25, y: sy }] }); await sleep(30); }
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(300);
  check('a sideways swipe does not place the caret or focus the keyboard', (await ev('splitFlap.S.caret')) === caret0 && (await ev(`String(document.activeElement && document.activeElement.classList.contains('sf-comp-input'))`)) === 'false', `${caret0} then ${await ev('splitFlap.S.caret')}`);
  // the default 6 x 22 fits a portrait phone whole
  await ev(`document.querySelector('[data-k=size-6x22]').click()`); await sleep(300);
  await ev(`splitFlap.editor.openZone(0)`); await sleep(400);
  check('a 6 x 22 message fits a portrait phone without scrolling', (await ev(`String(!!document.querySelector('.sf-composer.scroll'))`)) === 'false' && (await ev(`Math.round(document.querySelector('.sf-comp-cell').getBoundingClientRect().width)`)) >= 12, String(await ev(`Math.round(document.querySelector('.sf-comp-cell').getBoundingClientRect().width)`)));

  // a landscape phone: the drawer beside the board, and the playlist folded above the week.
  // Turned without a render call: the app redraws itself (0.10.2 review)
  await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 2, mobile: true }); await sleep(800);
  check('on a landscape phone the drawer sits beside the board', (await ev(`(() => { const d = document.querySelector('.sf-drawer').getBoundingClientRect(), m = document.querySelector('.sf-main').getBoundingClientRect(); return d.right <= m.left + 1 && m.height > 300; })()`)) === true);
  await ev(`(() => { const app = splitFlap; app.pickBoard(0); if (!app.S.editing) app.toggleEdit(); app.editor.go({ sec: 'sb', lv: 'sb', sb: app.shown().id, view: 'week' }); })()`); await sleep(500);
  check("and Today's playlist is one line that opens on a tap", (await ev(`(() => { const f = document.querySelector('[data-k=playlist-fold]'); return !!f && !f.open && f.getBoundingClientRect().height < 64; })()`)) === true, await ev(`(() => { const f = document.querySelector('[data-k=playlist-fold]'); return JSON.stringify([!!f, f && f.open, f && f.getBoundingClientRect().height, splitFlap.editor.E.lv, splitFlap.editor.E.view, innerHeight, splitFlap.editor.phone()]); })()`));
  await send('Emulation.setDeviceMetricsOverride', { width: 400, height: 844, deviceScaleFactor: 2, mobile: true }); await sleep(800);
  check('turned back to portrait, the playlist unfolds by itself', (await ev(`String(!!document.querySelector('[data-k=playlist-fold]'))`)) === 'false' && (await ev(`String(!!document.querySelector('.sf-week .sf-playlist'))`)) === 'true');
} catch (e) { results.push('ERROR ' + e.message); }
console.log(results.join('\n'));
ws.close(); proc.kill(); process.exit(results.every(r => r.startsWith('PASS')) ? 0 : 1);
