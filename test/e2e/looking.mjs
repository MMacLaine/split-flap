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
  // 0.10.1 (walkthrough): before a place is picked the demo assumes no city
  check('the demo before a place shows no Stockholm stops', (await ev(`JSON.stringify(splitFlap.cur().pages.flatMap(p => p.zones.map(z => z.ch)))`)).match(/"sl"|"departures"|"weather"/) === null, await ev(`JSON.stringify(splitFlap.cur().pages.map(p => p.name))`));
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

  // another tab's save while previewing never switches the screen or moves the preview (0.10 review)
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'sb', sb: '${other}', view: 'boards' })`); await sleep(400);
  await ev(`(() => { const list = JSON.parse(localStorage.getItem('sf_playlists')); const extra = JSON.parse(JSON.stringify(list[0])); extra.id = 'b-other-tab'; extra.name = 'From another tab'; list.unshift(extra); localStorage.setItem('sf_playlists', JSON.stringify(list)); splitFlap.fromOtherTab(); })()`); await sleep(500);
  check("another tab's save keeps what the screen runs", (await ev('splitFlap.shown().id')) === shown0, await ev('splitFlap.shown().id'));
  check('and keeps the preview on the same playlist', (await ev('splitFlap.cur().id')) === other && (await ev('String(splitFlap.looking())')) === 'true', await ev('splitFlap.cur().id'));

  // Done on a preview: back to what was on
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'sb', sb: '${other}', view: 'boards' })`); await sleep(400);
  await ev(`document.querySelector('[data-k=done]').click()`); await sleep(600);
  check('Done on a preview goes back to what was on, and says so', (await ev('splitFlap.shown().id')) === shown0 && /back to/i.test(await status()) && (await ev('splitFlap.cur().id')) === shown0, await status());

  // a template: seen on the screen at its own size, and Show on this screen lands on its board
  await ev('splitFlap.toggleEdit()'); await sleep(400);
  await ev(`splitFlap.editor.go({ sec: 'ex', lv: 'tpl', tpl: 'weather', section: 'start' })`); await sleep(600);
  const tplName = await ev(`document.querySelector('.sf-panel-title strong').textContent`);
  check('a template is on the screen as soon as it opens, named in the bar', (await ev('String(splitFlap.looking())')) === 'true' && (await bar()).includes(tplName), `${tplName} / ${await bar()}`);
  const nBefore = await ev('splitFlap.boards.length');
  check('the playlists are untouched while it is looked at', (await ev('splitFlap.boards.length')) === nBefore && (await ev('splitFlap.shown().id')) === shown0);
  const tplPages = await ev('splitFlap.cur().pages.length');
  await ev(`document.querySelector('[data-k=use-tpl]').click()`); await sleep(600);
  check('Show on this screen keeps it and shows it', (await ev('splitFlap.boards.length')) === nBefore + 1 && (await ev('splitFlap.shown().from')) === 'weather' && /now showing/i.test(await status()), await status());
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

  // 0.10.1: a tap on a board on Showing previews it alone, and Show on this screen shows it alone
  await ev(`(() => { splitFlap.pickBoard(splitFlap.boards.findIndex(b => b.id === '${shown0}')); splitFlap.editor.go({ sec: 'sb', lv: 'showing' }); })()`); await sleep(500);
  const tapped = await ev(`splitFlap.shown().pages[1].id`);
  await ev(`document.querySelector('[data-k=strip-1]').click()`); await sleep(500);
  check('a tap on a board of what is on previews that board alone', (await lv()) === 'my:bp' && (await ev('String(splitFlap.looking())')) === 'true' && (await ev('splitFlap.currentPage().id')) === tapped, await lv());
  await ev(`document.querySelector('[data-k=look-show]').click()`); await sleep(500);
  check('and Show on this screen shows it alone, as a board', (await ev('String(!!splitFlap.shown().solo)')) === 'true' && (await ev('splitFlap.shown().pages.length')) === 1 && (await ev('splitFlap.shown().pages[0].id')) === tapped, await status());
  check('one status line at a time', (await ev(`document.querySelectorAll('.sf-drawer .sf-status-line').length`)) === 1, String(await ev(`document.querySelectorAll('.sf-drawer .sf-status-line').length`)));
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'showing' })`); await sleep(400);
  check('Showing names it a board', /^Board/.test(await ev(`document.querySelector('.sf-now-card .sf-meta').textContent`)), await ev(`document.querySelector('.sf-now-card .sf-meta').textContent`));
  // Show another board in turn makes a playlist of two
  await ev(`document.querySelector('[data-k=add-in-turn]').click()`); await sleep(500);
  const second = await ev(`(() => { const b = [...document.querySelectorAll('[data-k^=add-blueprint-]')].find(x => !x.disabled); b.click(); return b.dataset.k.replace('add-blueprint-', ''); })()`); await sleep(400);
  check('the bar offers Show both in turn', /show both in turn/i.test(await bar()), await bar());
  await ev(`document.querySelector('[data-k=add-confirm]').click()`); await sleep(500);
  check('which makes a playlist of the two, on the screen', (await ev('String(!!splitFlap.shown().solo)')) === 'false' && (await ev('splitFlap.shown().pages.map(p => p.id).join()')) === `${tapped},${second}` && /in turn/i.test(await status()), await status());
  // your own words, whatever is on
  await ev(`(() => { const b = splitFlap.shown(); splitFlap.upd(bb => { bb.pages.forEach(p => { p.layout = 'full'; p.zones = [{ ch: 'clock', o: {} }]; }); }); splitFlap.editor.go({ sec: 'sb', lv: 'showing' }); })()`); await sleep(500);
  check('Type your own message is on Showing whatever is on', (await ev(`String(!!document.querySelector('[data-k=type-own]'))`)) === 'true');
  await ev(`document.querySelector('[data-k=type-own]').click()`); await sleep(600);
  check('and with no message board, it adds one in turn and opens it', (await lv()) === 'sb:board' && (await ev(`splitFlap.editor.page().zones[0].ch`)) === 'message' && (await ev('splitFlap.shown().pages.length')) === 3, await lv());
  // what you make lands in Boards, and is there whatever is on
  await ev(`splitFlap.editor.go({ sec: 'my', lv: 'list' })`); await sleep(300);
  await ev(`document.querySelector('[data-k=new-board]').click()`); await sleep(500);
  const made = await ev('splitFlap.editor.E.bp');
  check('New board in Boards opens it, at its own address', (await lv()) === 'my:bp' && (await at()) === `#/my-boards/${made}`, await at());
  await ev(`(() => { splitFlap.pickBoard(splitFlap.boards.findIndex(b => b.id === '${shown0}')); })()`); await sleep(300);
  await go(URL0); await ev('splitFlap.toggleEdit()'); await sleep(400);
  await ev(`document.querySelector('[data-k=tab-my]').click()`); await sleep(400);
  check('after a reload with another playlist on, it is one press away in Boards', (await ev(`String(!!document.querySelector('[data-k="bp-${made}"]'))`)) === 'true');

  // a first visit that picks a template: the demo leaves no boards behind
  await go('about:blank'); await go(URL0); await ev('localStorage.clear()'); await go(URL0);
  await ev(`splitFlap.useTemplate('cafe')`); await sleep(500);
  check('a template picked on a first visit replaces the demo and its boards', (await ev('splitFlap.playlists.length')) === 1 && (await ev('splitFlap.blueprints.length')) === (await ev('splitFlap.shown().pages.length')), `${await ev('splitFlap.playlists.length')} playlists, ${await ev('splitFlap.blueprints.length')} boards`);

  // the phone: the bar is there too
  await ev(`splitFlap.editor.go({ sec: 'ex', lv: 'tpl', tpl: 'weather', section: 'start' })`); await sleep(400);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }); await sleep(600);
  check('on a phone the gold bar is under the board', (await ev(`(() => { const b = document.querySelector('.sf-look-bar').getBoundingClientRect(), c = document.querySelector('.sf-canvas-wrap canvas').getBoundingClientRect(); return b.top >= c.bottom - 1 && b.height > 40; })()`)) === true);
} catch (e) { results.push('ERROR ' + e.message); }
console.log(results.join('\n'));
ws.close(); proc.kill(); process.exit(results.every(r => r.startsWith('PASS')) ? 0 : 1);
