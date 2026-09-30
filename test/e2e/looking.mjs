// 0.10 look, then show, in a real browser: whatever you open is on the screen with the gold
// bar, nothing changes what the screen runs until Show on this screen, leaving says so,
// a preview ends by itself, and the first visit ends when a place is picked.
// Needs Chrome and `node _dev/serve.mjs` on 8801 (no Worker needed). npm run e2e:look
import { spawn } from 'node:child_process';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', PORT = 9300 + Math.floor(Math.random() * 90);
const URL0 = process.env.APP || 'http://localhost:8801/';
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/look-${Date.now()}`, 'about:blank'], { stdio: 'ignore' });
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

  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
const status = () => ev(`[...document.querySelectorAll('.sf-status-line')].map(x => x.textContent).join(' | ')`);
const bar = () => ev(`(document.querySelector('.sf-look-bar') || {}).textContent || ''`);

try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  // the first visit: Showing asks where the screen is, once, and picking a city ends it
  await go(URL0);
  await ev('splitFlap.toggleEdit()'); await sleep(500);
  check('a first Edit opens Showing with Where is this screen?', (await lv()) === 'sb:showing' && (await ev(`String(!!document.querySelector('[data-k=where]'))`)) === 'true');
  check('and no sign-in card on Explore', (await ev(`(splitFlap.editor.go({ sec: 'ex', lv: 'list' }), String(!!document.querySelector('[data-k=start-signin]')))`)) === 'false');
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'showing' })`); await sleep(300);
  await ev(`splitFlap.setFirstPlace({ name: 'London', lat: 51.507, lon: -0.128, cc: 'GB', tz: 'Europe/London' })`); await sleep(600);
  check('picking a city says what changed', /built for london/i.test(await status()), await status());
  check('and ends the first visit', (await ev('String(splitFlap.startPending())')) === 'false' && (await ev(`String(!!document.querySelector('[data-k=where]'))`)) === 'false');
  await ev(`document.querySelector('[data-k=done]').click()`); await sleep(500);
  await ev('splitFlap.toggleEdit()'); await sleep(500);
  check('the next Edit does not ask again', (await lv()) === 'sb:showing' && (await ev(`String(!!document.querySelector('[data-k=where]'))`)) === 'false');

  // a second playlist to look at, the demo still on the screen
  await ev(`document.querySelector('[data-k=done]').click()`); await sleep(400);
  await ev(`(() => { splitFlap.duplicateBoard(0); splitFlap.pickBoard(0); })()`); await sleep(400);
  const shown0 = await ev('splitFlap.shown().id'), other = await ev('splitFlap.boards[1].id');
  await ev('splitFlap.toggleEdit()'); await sleep(400);
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'sb', sb: '${other}', view: 'boards' })`); await sleep(500);
  check('opening another playlist previews it with the gold bar', (await ev('String(splitFlap.looking())')) === 'true' && /previewing/i.test(await bar()), await bar());
  check('and does not change what the screen runs', (await ev('splitFlap.shown().id')) === shown0);
  check('the screen shows the playlist being looked at', (await ev('splitFlap.cur().id')) === other);
  check('with a gold frame round the screen', (await ev(`getComputedStyle(document.querySelector('.sf-stage'), '::after').boxShadow`)).includes('inset'));
  await ev(`document.querySelector('[data-k=tab-my]').click()`); await sleep(500);
  check('leaving without pressing puts the screen back, and says so', (await ev('String(splitFlap.looking())')) === 'false' && /back to/i.test(await status()), await status());
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'sb', sb: '${other}', view: 'boards' })`); await sleep(500);
  await ev(`document.querySelector('[data-k=look-show]').click()`); await sleep(500);
  check('Show on this screen makes it real, and says so', (await ev('splitFlap.shown().id')) === other && /now showing/i.test(await status()) && !(await bar()), await status());
  await ev(`document.querySelector('[data-k=status-act]').click()`); await sleep(500);
  check('and Undo puts back what was on', (await ev('splitFlap.shown().id')) === shown0 && /back to/i.test(await status()), await status());

  // Done on a preview: back to what was on
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'sb', sb: '${other}', view: 'boards' })`); await sleep(400);
  await ev(`document.querySelector('[data-k=done]').click()`); await sleep(600);
  check('Done on a preview goes back to what was on, and says so', (await ev('splitFlap.shown().id')) === shown0 && /back to/i.test(await status()) && (await ev('splitFlap.cur().id')) === shown0, await status());

  // a template: seen on the screen at its own size, and Show on this screen lands on its board
  await ev('splitFlap.toggleEdit()'); await sleep(400);
  await ev(`splitFlap.editor.go({ sec: 'ex', lv: 'tpl', tpl: 'weather', section: 'start' })`); await sleep(600);
  const tplName = await ev(`document.querySelector('.sf-panel-title strong').textContent`);
  check('a template is on the screen as soon as it opens, named in the bar', (await ev('String(splitFlap.looking())')) === 'true' && (await bar()).includes(tplName), `${tplName} / ${await bar()}`);
  check('the storyboards are untouched while it is looked at', (await ev('splitFlap.boards.length')) === 2);
  const tplPages = await ev('splitFlap.cur().pages.length');
  await ev(`document.querySelector('[data-k=use-tpl]').click()`); await sleep(600);
  check('Show on this screen keeps it and shows it', (await ev('splitFlap.boards.length')) === 3 && (await ev('splitFlap.shown().from')) === 'weather' && /now showing/i.test(await status()), await status());
  check('and lands on its board, never the week view', (await lv()) === (tplPages === 1 ? 'sb:board' : 'sb:sb:boards'), await lv());

  // every change says Saved
  await ev('splitFlap.editor.openBoard(0)'); await sleep(400);
  await ev(`(() => { const el = document.querySelector('[data-k=page-name]'); if (el) { el.value = 'Renamed'; el.dispatchEvent(new Event('input')); } })()`); await sleep(1200);
  check('a change in the editor says Saved', /^saved/i.test(await status()), await status());

  // a preview left alone ends by itself
  await ev(`splitFlap.editor.go({ sec: 'ex', lv: 'tpl', tpl: 'weather', section: 'start' })`); await sleep(400);
  await ev('splitFlap.lastInput = Date.now() - 200000; splitFlap.tick()'); await sleep(400);
  check('a preview left 3 minutes ends, and says why', (await ev('String(splitFlap.looking())')) === 'false' && /ended after 3 minutes/i.test(await status()), await status());
  check('the drawer stays where it was', (await lv()) === 'ex:tpl', await lv());
  await ev(`document.querySelector('[data-k=status-act]').click()`); await sleep(400);
  check('and Show it now previews it again', (await ev('String(splitFlap.looking())')) === 'true');
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'sb', sb: '${other}', view: 'boards' })`); await sleep(400);
  await ev('splitFlap.lastInput = Date.now() - 200000; splitFlap.tick()'); await sleep(400);
  check('a playlist preview that ends goes back to Showing with the screen', (await lv()) === 'sb:showing' && (await ev('String(splitFlap.looking())')) === 'false' && /ended after 3 minutes/i.test(await status()), `${await lv()} ${await status()}`);

  // the phone: the bar is there too
  await ev(`splitFlap.editor.go({ sec: 'ex', lv: 'tpl', tpl: 'weather', section: 'start' })`); await sleep(400);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }); await sleep(600);
  check('on a phone the gold bar is under the board', (await ev(`(() => { const b = document.querySelector('.sf-look-bar').getBoundingClientRect(), c = document.querySelector('.sf-canvas-wrap canvas').getBoundingClientRect(); return b.top >= c.bottom - 1 && b.height > 40; })()`)) === true);
} catch (e) { results.push('ERROR ' + e.message); }
console.log(results.join('\n'));
ws.close(); proc.kill(); process.exit(results.every(r => r.startsWith('PASS')) ? 0 : 1);
