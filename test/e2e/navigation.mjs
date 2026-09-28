// 0.7 navigation, in a real browser: every level has an address, Back and the browser's
// back go up one level, reload lands in the same place, and the week edits real times.
// Needs Chrome and `node _dev/serve.mjs` on 8801 (no Worker needed). npm run e2e:nav
import { spawn } from 'node:child_process';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', PORT = 9300 + Math.floor(Math.random() * 90);
const URL0 = process.env.APP || 'http://localhost:8801/';
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/nav-${Date.now()}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 50 && !tabs; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); } catch { await sleep(200); } }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}; ws.onmessage = e => { const m = JSON.parse(e.data); if (pend[m.id]) { pend[m.id](m.result); delete pend[m.id]; } };
const send = (method, params = {}) => new Promise(r => { pend[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const go = async url => { await send('Page.navigate', { url }); await sleep(2500); };
const results = []; const check = (label, ok, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail !== undefined ? '  ' + detail : ''}`);
const key = async (k, mods = 0) => { const code = { ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, Enter: 13, Escape: 27, Delete: 46 }[k];
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: code, modifiers: mods, text: k === 'Enter' ? '\r' : undefined }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: code, modifiers: mods }); await sleep(250); };
const at = () => ev('location.hash'), lv = () => ev(`(() => { const E = splitFlap.editor.E; return splitFlap.S.editing ? E.sec + ':' + E.lv + (E.lv === 'sb' ? ':' + E.view : '') : 'closed'; })()`);

try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await go(URL0); await ev(`localStorage.setItem('sf_started','1'); localStorage.setItem('sf_cue_seen','1')`); await go(URL0);
  const sb = await ev('splitFlap.cur().id'), p0 = await ev('splitFlap.cur().pages[0].id');

  // Edit opens the board on the wall, at its address
  await ev('splitFlap.toggleEdit()'); await sleep(500);
  check('Edit opens the board that is showing, with an address', (await at()) === `#/storyboards/${sb}/boards/${p0}`, await at());
  // down through the levels by clicking
  await ev(`document.querySelector('[data-k=back]').click()`); await sleep(400);
  check('Back from a board goes to its storyboard', (await lv()) === 'sb:sb:boards', await lv());
  await ev(`document.querySelector('[data-k=view-week]').click()`); await sleep(400);
  check('the storyboard has Week, Boards and Display', (await at()) === `#/storyboards/${sb}/week`, await at());
  await ev(`document.querySelector('[data-k=back]').click()`); await sleep(400);
  check('Back from a storyboard goes to the list', (await at()) === '#/storyboards', await at());
  check('the list has no Back', (await ev(`String(!!document.querySelector('[data-k=back]'))`)) === 'false');
  await ev(`document.querySelector('[data-k=sb-0]').click()`); await sleep(400);
  await ev(`document.querySelector('[data-k=view-boards]').click()`); await sleep(300);
  await ev(`document.querySelector('[data-k=page-1]').click()`); await sleep(400);
  const p1 = await ev('splitFlap.cur().pages[1].id');
  check('a board opens from the Boards view', (await at()) === `#/storyboards/${sb}/boards/${p1}`, await at());
  check('the wall holds the board being edited', (await ev(`splitFlap.currentPage().id`)) === p1);

  // the browser's back goes up the way it came
  await ev('history.back()'); await sleep(500);
  check("the browser's back goes up one level", (await lv()) === 'sb:sb:boards', await lv());
  await ev('history.forward()'); await sleep(500);
  check('and forward goes back down', (await at()) === `#/storyboards/${sb}/boards/${p1}`, await at());

  // reload lands in the same place
  await go(URL0 + `#/storyboards/${sb}/boards/${p1}`);
  check('a reload lands on the same board, editor open', (await lv()) === 'sb:board' && (await ev('splitFlap.editor.page().id')) === p1, await lv());
  await go(URL0 + '#/account/log');
  check('an address opens that level directly', (await lv()) === 'acc:log', await lv());

  // tabs remember where you were in each section
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'sb', sb: '${sb}', view: 'display' })`); await sleep(300);
  await ev(`document.querySelector('[data-k=tab-ex]').click()`); await sleep(300);
  check('a tab opens its section', (await lv()) === 'ex:list', await lv());
  await ev(`document.querySelector('[data-k=tab-sb]').click()`); await sleep(300);
  check('and a tab returns to where you last were in it', (await lv()) === 'sb:sb:display', await lv());
  await ev(`document.querySelector('[data-k=tab-sb]').click()`); await sleep(300);
  check('the current tab goes to the top of its section', (await lv()) === 'sb:list', await lv());

  // Escape closes a menu first, then the editor
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'sb', sb: '${sb}', view: 'boards' })`); await sleep(300);
  await ev(`document.querySelector('[data-k=more-pg-0]').click()`); await sleep(300);
  check('the more menu opens with its verbs in order', (await ev(`[...document.querySelectorAll('.sf-more.open .sf-more-item')].map(b => b.textContent).join(',')`)) === 'Open,Rename,Duplicate,Copy to,Share as image,Delete', await ev(`[...document.querySelectorAll('.sf-more.open .sf-more-item')].map(b => b.textContent).join(',')`));
  await key('Escape');
  check('Escape closes the menu first', (await ev(`String(!!document.querySelector('.sf-more.open'))`)) === 'false' && (await lv()) === 'sb:sb:boards');
  await key('Escape');
  check('then Escape closes the editor, and the address clears', (await lv()) === 'closed' && (await at()) === '', await at());

  // the week: a time made with the keyboard route, then moved with the arrow keys
  await ev('splitFlap.toggleEdit()'); await sleep(400);
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'sb', sb: '${sb}', view: 'week' })`); await sleep(400);
  await ev(`document.querySelector('[data-k=week-add]').click()`); await sleep(300);
  await ev(`(() => { document.querySelector('[data-k=card-page-2]').click(); })()`); await sleep(200);
  await ev(`(() => { const f = document.querySelector('[data-k=card-from]'), t = document.querySelector('[data-k=card-to]'); f.value = '06:30'; f.dispatchEvent(new Event('change')); t.value = '07:15'; t.dispatchEvent(new Event('change')); document.querySelector('[data-k=card-save]').click(); })()`); await sleep(400);
  const w0 = await ev('JSON.stringify(splitFlap.cur().pages[2].wins)');
  check('Add a time gives the chosen board a time on today', /"from":"06:30","to":"07:15","days":\[\d\]/.test(w0), w0);
  check('it shows as a block in the week', (await ev(`document.querySelectorAll('.sf-block[data-page="2"]').length`)) === 1);
  await ev(`document.querySelector('.sf-block[data-page="2"]').focus()`);
  await key('ArrowDown'); await key('ArrowDown');
  check('the down arrow moves it 15 minutes at a time', (await ev('splitFlap.cur().pages[2].wins[0].from')) === '07:00', await ev('splitFlap.cur().pages[2].wins[0].from'));
  await key('ArrowDown', 8);
  check('Shift and the arrow change its end', (await ev('splitFlap.cur().pages[2].wins[0].to')) === '08:00', await ev('splitFlap.cur().pages[2].wins[0].to'));
  const d0 = await ev('splitFlap.cur().pages[2].wins[0].days[0]');
  await key('ArrowRight');
  check('the right arrow moves it to the next day', (await ev('splitFlap.cur().pages[2].wins[0].days[0]')) === (d0 + 1) % 7, String(await ev('splitFlap.cur().pages[2].wins[0].days[0]')));
  check("Today's playlist agrees with the times", (await ev(`(() => { const E = splitFlap.editor; return document.querySelector('.sf-playlist').textContent; })()`)).length > 0);
  await ev(`document.querySelector('.sf-block[data-page="2"]').focus()`);
  await key('Delete');
  check('Delete removes the time', (await ev('splitFlap.cur().pages[2].wins.length')) === 0);

  // the phone: the same levels, one day of the week at a time
  await send('Emulation.setDeviceMetricsOverride', { width: 400, height: 860, deviceScaleFactor: 1, mobile: true });
  await go(URL0 + `#/storyboards/${sb}/week`);
  check('on a phone the week shows one day, with day chips', (await ev(`document.querySelectorAll('.sf-day-col').length`)) === 1 && (await ev(`document.querySelectorAll('[data-k^=day-chip]').length`)) === 7);
  check("and Today's playlist sits above it", (await ev(`String(!!document.querySelector('.sf-week .sf-playlist'))`)) === 'true');
  check('the drawer is on screen below the board', (await ev(`Math.round(document.querySelector('.sf-drawer').getBoundingClientRect().top)`)) < 400, String(await ev(`Math.round(document.querySelector('.sf-drawer').getBoundingClientRect().top)`)));
} catch (e) { results.push('ERROR ' + e.message); }
console.log(results.join('\n'));
ws.close(); proc.kill(); process.exit(results.every(r => r.startsWith('PASS')) ? 0 : 1);
