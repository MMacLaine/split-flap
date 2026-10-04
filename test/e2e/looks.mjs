// 0.11.0 looks, in a real browser: the look sheet in its five places, preview, Use this look,
// Back, Undo and "already on"; the default, a pin and a preview over it; Same look for all; a
// mixed playlist keeping the atlas; links both ways with 0.10.2; quiet hours, reduced motion,
// a kiosk and OBS; the legacy readings; an animated regrid; Escape; fillGrid; the Cormorant
// digits. Needs Chrome, `node _dev/serve.mjs` on 8801, and 0.10.2 on 8802 for the link step
// (see pixels.mjs). npm run e2e:looks
import { spawn } from 'node:child_process';
import { launchChrome } from './chrome.mjs';
const URL0 = process.env.APP || 'http://localhost:8801/';
const { proc, PORT } = await launchChrome('looks', []);
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
const OLD = process.env.BASE || 'http://localhost:8802/';
const st = () => ev(`(document.querySelector('[data-k=status-line]') || {}).textContent || ''`);
const bar = () => ev(`(document.querySelector('.sf-look-bar') || {}).textContent || ''`);
const click = k => ev(`(() => { const el = document.querySelector('[data-k="${k}"]'); if (!el) throw new Error('no ${k}'); el.click(); })()`);
const cards = () => ev(`[...document.querySelectorAll('.sf-lk-card strong')].map(x => x.textContent).join(',')`);

try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await go(URL0); await ev(`localStorage.setItem('sf_started','1'); localStorage.setItem('sf_cue_seen','1')`); await go(URL0);
  const pl = await ev('splitFlap.shown().id'), b1 = await ev('splitFlap.shown().pages[1].id'), b2 = await ev('splitFlap.shown().pages[2].id');
  check('a new install shows Classic, drawn with 0.10\'s own theme', (await ev('splitFlap.themeNow()')) === 'black' && (await ev(`String(splitFlap.wallEl.classList.contains('on'))`)) === 'false');

  // a board's page: Look · Default (Classic) · Change, and the sheet
  await ev('splitFlap.toggleEdit()'); await sleep(300);
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'board', sb: '${pl}', bd: '${b1}' })`); await sleep(400);
  check('a board shows its look with a swatch and Change', /Look\s*Default \(Classic\)/.test(await ev(`document.querySelector('.sf-lk-row').textContent`)) && (await ev(`String(!!document.querySelector('.sf-lk-row .sf-swatch-lk'))`)) === 'true');
  await click('lk-change-board'); await sleep(400);
  check('the sheet offers Default, then the looks that have shipped', (await cards()) === 'Default,Classic,Backlit,Classic RGB,Signal,Calm,Outside,Sunday,Party', await cards());   // 0.11.1: five more have shipped
  check('each card is a thumbnail of the board, drawn in its look', (await ev(`document.querySelectorAll('.sf-lk-card canvas[data-thumb]').length`)) === 9);
  await click('lk-card-classic'); await sleep(300);
  check('a Default board is already Classic: picking it previews it, since it becomes its own', /Previewing Classic/.test(await st()));
  await click('lk-card-default'); await sleep(300);
  check('picking the look that is on says so, and shows no bar', /already on/.test(await st()) && !(await bar()), await st());
  await click('lk-card-calm'); await sleep(500);
  check('a card previews behind the sheet, under the gold bar', /Previewing\s*Calm for Big clock\s*Use this look/.test(await bar()) && /^L11-glass/.test(await ev('splitFlap.board.o.theme')), await bar());
  check('the wall behind it moves', (await ev('splitFlap.wallEl.className')) === 'sf-wall on fields');
  await click('sheet-close'); await sleep(400);
  check('Cancel puts it back, and says so', /Back to Default \(Classic\)/.test(await st()) && (await ev('splitFlap.board.o.theme')) === 'black', await st());
  await click('lk-change-board'); await sleep(300); await click('lk-card-calm'); await sleep(300);
  await key('Escape');
  check('Escape closes the sheet and ends the preview', (await ev(`String(!!document.querySelector('.sf-lk'))`)) === 'false' && (await ev('splitFlap.board.o.theme')) === 'black');
  await click('lk-change-board'); await sleep(300); await click('lk-card-calm'); await sleep(300); await click('look-show'); await sleep(500);
  check('Use this look keeps it, with Undo', /Calm is on for Big clock/.test(await st()) && (await ev(`splitFlap.blueprints.find(b => b.id === '${b1}').look`)) === 'calm');
  check('and writes the nearest 0.10 theme for older readers', (await ev(`splitFlap.blueprints.find(b => b.id === '${b1}').theme`)) === 'black');
  await click('status-act'); await sleep(400);
  check('Undo puts the board back on Default', (await ev(`splitFlap.blueprints.find(b => b.id === '${b1}').look`)) === 'default');
  await click('lk-change-board'); await sleep(300); await click('lk-card-calm'); await sleep(300); await click('lk-use'); await sleep(400);

  // Make your own: only what MATRIX allows
  await click('lk-change-board'); await sleep(300);
  await ev(`(() => { const d = document.querySelector('.sf-lk details'); d.open = true; d.dispatchEvent(new Event('toggle')); })()`); await sleep(400);
  check('Make your own offers the five materials of 0.11.0', (await ev(`[...document.querySelectorAll('[data-k^=lk-mat-]')].map(x => x.dataset.k.slice(7)).join()`)) === 'flap,solari,paper,glass,smoke');
  await click('lk-mat-paper'); await sleep(300);
  check('Paper offers no lit letters and only a plain wall', (await ev(`String(!!document.querySelector('[data-k=lk-lit]'))`)) === 'false' && (await ev(`[...document.querySelectorAll('[data-k^=lk-wall-]')].map(x => x.dataset.k).join()`)) === 'lk-wall-still');
  await click('lk-mat-solari'); await sleep(300);
  check('Solari offers no serif or round face', (await ev(`[...document.querySelectorAll('[data-k^=lk-type-]')].map(x => x.dataset.k.slice(8)).join()`)) === 'grotesk,mono');
  check('Motion can leave it to the playlist', (await ev(`String(!!document.querySelector('[data-k=lk-mo-playlist]'))`)) === 'true');
  await click('sheet-close'); await sleep(300);

  // Account: the default, followed by Default boards and not by one with its own
  await ev(`splitFlap.editor.go({ sec: 'acc', lv: 'main' })`); await sleep(300);
  check('Account shows the default look and how many boards follow it', /Default look\s*Classic\s*5 boards follow the default/.test(await ev(`document.querySelector('[data-k=default-look]').textContent`)));
  await click('lk-change-default'); await sleep(300);
  check('the default sheet has no Default card', (await cards()) === 'Classic,Backlit,Classic RGB,Signal,Calm,Outside,Sunday,Party');
  await click('lk-card-calm'); await sleep(300); await click('lk-use'); await sleep(400);
  check('the line says what changed', /New boards start as Calm. 5 boards follow the default/.test(await st()), await st());
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'board', sb: '${pl}', bd: '${b2}' })`); await sleep(400);
  check('a Default board now shows Calm', /^L11-glass/.test(await ev('splitFlap.themeNow()')));
  await ev(`(() => { const b = splitFlap.blueprints.find(x => x.id === '${b2}'); b.look = 'classic'; splitFlap.saveMy(); })()`); await sleep(300);
  check('a board that chose its own does not follow', (await ev('splitFlap.themeNow()')) === 'black');
  await ev(`(() => { const b = splitFlap.blueprints.find(x => x.id === '${b2}'); b.look = 'default'; splitFlap.saveMy(); splitFlap.putSetting({ id: 'look', look: 'classic' }); })()`); await sleep(300);

  // this screen: a pin over every board, and a preview over the pin
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'showing' })`); await sleep(300);
  check('Showing says the screen follows each board', /Follows each board/.test(await ev(`document.querySelector('[data-k=lk-change-screen]').parentNode.textContent`)));
  await click('lk-change-screen'); await sleep(300);
  check('This screen\'s first card is Follow the boards', (await cards()) === 'Follow the boards,Classic,Backlit,Classic RGB,Signal,Calm,Outside,Sunday,Party');
  await click('lk-card-classic'); await sleep(300); await click('lk-use'); await sleep(400);
  check('a pin says so, with Undo', /This screen always shows Classic/.test(await st()));
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'board', sb: '${pl}', bd: '${b1}' })`); await sleep(400);
  check('a pin wins over a board\'s own look', (await ev('splitFlap.themeNow()')) === 'black');
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'board', sb: '${pl}', bd: '${b2}' })`); await sleep(400);
  await click('lk-change-board'); await sleep(300); await click('lk-card-calm'); await sleep(300);
  check('a preview wins over the pin', /^L11-glass/.test(await ev('splitFlap.themeNow()')));
  await click('sheet-close'); await sleep(300);
  await ev(`splitFlap.toggleEdit()`); await sleep(500);
  check('a pinned screen shows the chip, in its look\'s accent', /Pinned · Classic/.test(await ev(`(document.querySelector('[data-k=pinned-chip]') || {}).textContent || ''`)));
  await ev(`localStorage.setItem('sf_look_pin', ''); splitFlap.renderOverlay()`); await sleep(200);

  // a mixed playlist turns without clearing the atlas
  await ev(`(() => { const app = splitFlap; app.active = app.boards.findIndex(b => b.id === '${pl}'); app.S.pageIdx = 0; app.S.pageStart = Date.now(); app.tick(); })()`); await sleep(600);
  await ev(`(() => { const app = splitFlap; app.S.pageIdx = 1; app.S.pageStart = Date.now(); app.tick(); })()`); await sleep(1500);
  await ev(`(() => { const app = splitFlap; app.S.pageIdx = 2; app.S.pageStart = Date.now(); app.tick(); })()`); await sleep(1500);
  const looks = JSON.parse(await ev('JSON.stringify(splitFlap.board.A.looks)'));
  check('a playlist with Classic and Calm boards keeps both looks\' glyphs', looks.includes('black') && looks.some(x => /^L11-glass/.test(x)) && (await ev('splitFlap.board.A.m.size')) > 0, JSON.stringify(looks));
  // a Classic to Calm turn: the old frame lies over the board and fades, never off the screen (review 1)
  await ev(`(() => { const app = splitFlap; app.S.pageIdx = 0; app.S.pageStart = Date.now(); app.tick(); })()`); await sleep(1500);
  const fade = JSON.parse(await ev(`(async () => { const app = splitFlap; app.S.pageIdx = 1; app.S.pageStart = Date.now(); app.tick(); await new Promise(r => setTimeout(r, 200));
    const f = app.fadeCv.getBoundingClientRect(), c = app.canvas.getBoundingClientRect(), op = +getComputedStyle(app.fadeCv).opacity;
    return JSON.stringify({ top: [f.top, c.top], size: [f.width, f.height, c.width, c.height], op, z: getComputedStyle(app.fadeCv).position }); })()`));
  check('a look change crossfades: the old frame lies over the board, part way faded', fade.top[0] === fade.top[1] && fade.size[0] === fade.size[2] && fade.size[1] === fade.size[3] && fade.op > 0 && fade.op < 1 && fade.z === 'absolute', JSON.stringify(fade));

  // Same look for all, with the names and Undo
  await ev('splitFlap.toggleEdit()'); await sleep(300);
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'sb', sb: '${pl}', view: 'display' })`); await sleep(300);
  await ev(`(() => { const app = splitFlap; app.S.pageIdx = 1; app.S.pageStart = Date.now(); app.tick(); app.render(); })()`); await sleep(300);
  check('Display says when the board on the screen has a look with its own motion', /sets its own motion/.test(await ev(`(document.querySelector('[data-k=motion-by-look]') || {}).textContent || ''`)));
  await click('same-look'); await sleep(300); await click('lk-card-calm'); await sleep(300);
  check('Same look for all previews every board', /Calm for every board in Demo/.test(await bar()), await bar());
  await click('look-show'); await sleep(400);
  check('and names the boards it changed', /Calm is on for Welcome, Big clock, .* and Quote of the hour/.test(await st()), await st());
  check('every board in the playlist is Calm', (await ev(`splitFlap.boards.find(b => b.id === '${pl}').pages.every(p => p.look === 'calm')`)) === true);
  await click('status-act'); await sleep(400);
  check('Undo puts each board back as it was', (await ev(`splitFlap.blueprints.find(b => b.id === '${b1}').look`)) === 'calm' && (await ev(`splitFlap.blueprints.find(b => b.id === '${b2}').look`)) === 'default');
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'sb', sb: '${pl}', view: 'boards' })`); await sleep(300);
  check('a playlist shows a swatch on each row', (await ev(`document.querySelectorAll('.sf-pls .sf-swatch-lk').length`)) === (await ev(`splitFlap.shown().pages.length`)));

  // a template: its look before Use this, and in the line after
  await ev(`splitFlap.editor.go({ sec: 'ex', lv: 'tpl', tpl: 'letters', section: 'fun' })`); await sleep(500);
  check('Letter clock comes in Calm, its template look', /Look\s*Calm/.test(await ev(`document.querySelector('.sf-lk-row').textContent`)));
  await click('lk-change-template'); await sleep(300); await click('lk-card-classic'); await sleep(300); await click('lk-use'); await sleep(300);
  check('another look says the template will come in it', /Letter clock will come in Classic/.test(await st()), await st());
  await click('use-tpl'); await sleep(500);
  check('and Use this says it came in it', /Added Letter clock, in Classic/.test(await st()) && (await ev('splitFlap.shown().pages[0].look')) === 'classic', await st());

  // links: 0.11 to 0.10.2, and 0.10.2 to 0.11
  await ev(`splitFlap.putSetting({ id: 'look', look: 'calm' })`);
  const code = await ev(`(async () => (await import('./src/store.js')).encodeBoard(splitFlap.linkLooks(splitFlap.boards.find(b => b.id === '${pl}'))))()`);
  check('a link carries a Default board as the sender\'s default, with a 0.10 theme', (await ev(`(async () => { const b = await (await import('./src/store.js')).decodeBoard('${code}'); return b.pages[2].look + ' ' + b.pages[2].theme; })()`)) === 'calm black');
  await send('Page.navigate', { url: OLD + '?kiosk=1#b=' + code }); await sleep(2500);
  check('0.10.2 opens a 0.11 link on its legacy theme', (await ev(`splitFlap.cur().theme + ' ' + splitFlap.board.o.theme`)) === 'black black');
  await send('Page.navigate', { url: 'about:blank' }); await sleep(200);
  await send('Page.navigate', { url: OLD }); await sleep(2000);
  await ev(`localStorage.setItem('sf_started','1')`);
  const oldCode = await ev(`(async () => { const b = JSON.parse(JSON.stringify(splitFlap.cur())); b.theme = 'white'; b.pages.forEach(p => { p.theme = 'white'; }); return (await import('./src/store.js')).encodeBoard(b); })()`);
  await go('about:blank'); await go(URL0 + '?kiosk=1#b=' + oldCode); await sleep(800);
  check('0.11 reads a 0.10.2 white board as Paper, drawn as it was', (await ev('splitFlap.lookNow().id')) === 'paper' && (await ev('splitFlap.board.o.theme')) === 'white', await ev(`JSON.stringify([splitFlap.lookNow().id, splitFlap.board.o.theme, splitFlap.cur().theme, splitFlap.cur().pages[0].theme, splitFlap.cur().pages[0].look])`));

  // a kiosk link in Calm shows its wall; OBS shows no wall and no plate
  await go('about:blank'); await go(URL0 + '?kiosk=1#b=' + code); await sleep(800);
  check('a kiosk opened by a link in Calm shows the wall', (await ev('splitFlap.wallEl.className')).includes('on') || (await ev('splitFlap.lookNow().id')) === 'calm', await ev('splitFlap.lookNow().id'));
  await go('about:blank'); await go(URL0 + '?bg=transparent#b=' + code); await sleep(800);
  check('OBS (bg=transparent) draws no wall and no plate', (await ev(`getComputedStyle(splitFlap.wallEl).display`)) === 'none' && (await ev(`getComputedStyle(splitFlap.plate).display`)) === 'none');

  // quiet hours: blank dims the wall too, and holds the fields
  await go('about:blank'); await go(URL0 + '#b=' + code); await sleep(800);
  await ev(`(() => { const app = splitFlap; const pages = app.cur(); app.upd(b => { b.quiet = { on: true, from: '00:00', to: '23:59', mode: 'blank' }; }); if (app.S.editing) app.toggleEdit(); app.tick(); })()`); await sleep(400);
  check('blank quiet hours dim a moving wall and hold it still', (await ev('splitFlap.wrap.style.opacity')) === '0.22' && (await ev(`String(splitFlap.wallEl.classList.contains('still'))`)) === 'true', await ev('splitFlap.wrap.style.opacity'));

  // reduced motion holds the fields
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await go('about:blank'); await go(URL0 + '#b=' + code); await sleep(800);
  check('reduced motion holds the fields still and keeps the colour', (await ev(`String(splitFlap.wallEl.classList.contains('still') && splitFlap.wallEl.classList.contains('on'))`)) === 'true');
  await send('Emulation.setEmulatedMedia', { features: [] });

  // the renderer: fillGrid as 0.10, a regrid still flips, roll still runs
  await go('about:blank'); await go(URL0); await sleep(300);
  check('fillGrid is unchanged: a 1920 x 1080 wall is 8 rows', (await ev(`(async () => (await import('./src/renderer.js')).fillGrid(1920, 1080).rows)()`)) === 8);
  await ev(`(() => { const b = splitFlap.board; clearInterval(splitFlap.iv); splitFlap.tick = () => {}; b.setGrid([[..."HELLO"]], { instant: true }); b.target = [[..."WORLD"]]; b.setOptions({ rows: 3, cols: 15 }); })()`); await sleep(50);
  check('a regrid flips to the new size, never cuts', (await ev('String(splitFlap.board.isIdle())')) === 'false');
  await sleep(2500); await ev(`splitFlap.board.roll('curtain')`); await sleep(50);
  check('and roll() still turns the drum', (await ev('String(splitFlap.board.isIdle())')) === 'false');

  // the Cormorant digits sit at cap height (the lining figures, frozen into the new file)
  const dig = await ev(`(async () => { await document.fonts.load('500 100px "Cormorant Garamond"'); const c = document.createElement('canvas').getContext('2d'); c.font = '500 100px "Cormorant Garamond"'; const one = c.measureText('1').actualBoundingBoxAscent, H = c.measureText('H').actualBoundingBoxAscent; return JSON.stringify({ one, H, src: [...document.fonts].filter(f => /Cormorant/.test(f.family)).map(f => f.status).join() }); })()`);
  const D = JSON.parse(dig);
  check('Cormorant\'s digits reach its cap height, within 3 %', Math.abs(D.one - D.H) / D.H <= 0.03, dig);

  // the phone: the sheet at 400 px
  await send('Emulation.setDeviceMetricsOverride', { width: 400, height: 844, deviceScaleFactor: 2, mobile: true });
  await go('about:blank'); await go(URL0); await ev('splitFlap.toggleEdit()'); await sleep(400);
  const pid = await ev('splitFlap.shown().pages[0].id');
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'board', sb: splitFlap.shown().id, bd: '${pid}' })`); await sleep(400);
  check('the swatch is 40 by 28', (await ev(`(() => { const r = document.querySelector('.sf-swatch-lk').getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); })()`)) === '40x28');
  await click('lk-change-board'); await sleep(400);
  const h0 = await ev(`Math.round(document.querySelector('.sf-lk-card .sf-lk-well').getBoundingClientRect().height)`);
  check('on a phone the cards keep a usable height', h0 >= 60, h0 + ' px');
} catch (e) { results.push('ERROR ' + e.message); }
console.log(results.join('\n'));
ws.close(); proc.kill(); process.exit(results.every(r => r.startsWith('PASS')) ? 0 : 1);
