// 0.11.1 light and sky, in a real browser: the ring follows every refit, Flash on change fires
// on a real change, the sky through a day, quiet hours, reduced motion, OBS, Make your own's
// Light and Sky, and the quality ladder under a throttled CPU. Needs Chrome and
// `node _dev/serve.mjs` on 8801. npm run e2e:light
import { spawn } from 'node:child_process';
import { launchChrome } from './chrome.mjs';
const URL0 = process.env.APP || 'http://localhost:8801/';
const { proc, PORT } = await launchChrome('light', []);
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
const ringBox = () => ev(`(() => { const r = splitFlap.ambient.ring.getBoundingClientRect(), c = splitFlap.canvas.getBoundingClientRect(), b = splitFlap.ambient.rect; return JSON.stringify({ x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), bx: Math.round(c.left + b.x), bw: Math.round(b.w), on: splitFlap.ambient.ring.classList.contains('on') }); })()`);
const look = (i, id) => ev(`(() => { const a = splitFlap, p = a.shown().pages[${i}]; a.setBoardLook(p.id, { id: '${id}' }); a.saveMy(); a.S.pageIdx = ${i}; a.S.pageStart = Date.now(); a.refresh(); })()`);

try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await go(URL0); await ev(`localStorage.setItem('sf_started','1'); localStorage.setItem('sf_cue_seen','1')`); await go(URL0);
  check('Classic has no ring', (await ev(`String(splitFlap.ambient.ring.classList.contains('on'))`)) === 'false');
  await look(0, 'rgb'); await sleep(800);
  const r0 = JSON.parse(await ringBox());
  check('Classic RGB puts a ring round the board, chasing', r0.on && r0.x < r0.bx && r0.w > r0.bw && /sf11-turn/.test(await ev('splitFlap.ambient.tex.style.animation')), JSON.stringify(r0));
  check('and draws the board as Classic', (await ev('splitFlap.board.o.theme')) === 'black');

  // the ring follows refits: the drawer, the gold bar, a size change
  await ev('splitFlap.toggleEdit()'); await sleep(900);
  const r1 = JSON.parse(await ringBox());
  check('the ring follows the board when the drawer opens', r1.bx !== r0.bx && r1.x < r1.bx && Math.abs((r1.x + r1.w / 2) - (r1.bx + r1.bw / 2)) < 2, JSON.stringify(r1));
  await ev(`splitFlap.editor.go({ sec: 'ex', lv: 'tpl', tpl: 'stocks', section: 'finance' })`); await sleep(900);
  const r2 = JSON.parse(await ringBox());
  check('and under the gold bar, on a board of another size', r2.bw !== r1.bw && Math.abs((r2.x + r2.w / 2) - (r2.bx + r2.bw / 2)) < 2, JSON.stringify(r2));
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'showing' })`); await ev('splitFlap.toggleEdit()'); await sleep(500);

  // Flash on change fires on a real change of grid
  await look(1, 'backlit'); await sleep(1500);
  const f0 = await ev('splitFlap.ambient.flashes || 0');
  await ev(`(() => { const a = splitFlap; const b = a.shown().pages[1]; a.updPage && 0; a.upd(bb => { bb.pages[1].zones = [{ ch: 'message', o: { text: 'CHANGED NOW' } }]; }); a.S.pageIdx = 1; a.tick(); })()`); await sleep(500);
  check('Backlit flashes when the board changes', (await ev('splitFlap.ambient.flashes || 0')) > f0 && (await ev('splitFlap.ambient.ring.getAnimations().length')) > 0);

  // the sky, through a day, with a place
  await ev(`splitFlap.setFirstPlace({ name: 'London', lat: 51.507, lon: -0.128, cc: 'GB', tz: 'Europe/London' })`); await sleep(300);
  await look(3, 'outside'); await sleep(800);
  const at = async hhmm => { await ev(`(() => { const real = window.__realNow || (window.__realNow = Date.now); const d = new Date(); const [h, m] = '${hhmm}'.split(':').map(Number); const t = Date.UTC(2026, 5, 21, h - 1, m); Date.now = () => t; splitFlap.ambient.skyKey = null; splitFlap.tick(); })()`); await sleep(400); return ev(`JSON.stringify({ base: splitFlap.wallEl.style.backgroundColor, phase: splitFlap.ambient.sk && splitFlap.ambient.sk.phase, theme: splitFlap.board.o.theme })`); };
  const night = JSON.parse(await at('02:00')), day = JSON.parse(await at('13:00')), dusk = JSON.parse(await at('21:45'));
  check('Outside follows the sky through a day', night.phase === 'night' && day.phase === 'day' && night.base !== day.base, `${night.phase} ${night.base} / ${day.phase} ${day.base} / ${dusk.phase}`);
  check('its letters take the sky\'s tint, so the board\'s look moves with it', night.theme !== day.theme);
  await ev(`Date.now = window.__realNow; splitFlap.ambient.skyKey = null; splitFlap.tick()`);
  // weather on the wall from the weather the app has
  await ev(`(() => { const a = splitFlap, k = Object.keys(a.live.data.wx)[0] || '51.51,-0.13'; a.live.data.wx[k] = Object.assign({}, a.live.data.wx[k], { t: 9, code: 63, at: Date.now() }); a.ambient.skyKey = null; a.tick(); })()`); await sleep(400);
  check('rain in the weather is rain on the wall', (await ev(`getComputedStyle(splitFlap.ambient.L.rainNear).display`)) === 'block' && +(await ev('splitFlap.ambient.wx.style.opacity')) > 0);
  await ev(`(() => { const a = splitFlap; for (const k in a.live.data.wx) a.live.data.wx[k].at = Date.now() - 5 * 3600e3; a.ambient.skyKey = null; a.tick(); })()`); await sleep(300);
  check('weather more than three hours old: the sky follows the sun alone', (await ev(`getComputedStyle(splitFlap.ambient.L.rainNear).display`)) === 'none' && /hours old/.test(await ev(`splitFlap.ambient.skyNote(splitFlap.lookNow()) || ''`)));

  // quiet hours dim the ring and the wall; reduced motion holds them; OBS shows none of it
  await look(0, 'rgb'); await sleep(500);
  await ev(`(() => { const a = splitFlap; a.upd(b => { b.quiet = { on: true, from: '00:00', to: '23:59', mode: 'dim' }; }); a.tick(); })()`); await sleep(400);
  check('quiet hours dim the ring with the board, and hold it still', (await ev('splitFlap.wrap.style.opacity')) === '0.22' && !/sf11-turn/.test(await ev('splitFlap.ambient.tex.style.animation')) && splitFlap_in_wrap(await ev(`String(splitFlap.wrap.contains(splitFlap.ambient.ring))`)), await ev(`JSON.stringify([splitFlap.wrap.style.opacity, splitFlap.ambient.tex.style.animation, splitFlap.quietMode(), splitFlap.S.editing, splitFlap.lookNow().id])`));
  await ev(`(() => { const a = splitFlap; a.upd(b => { b.quiet = { on: false, from: '23:00', to: '07:00', mode: 'dim' }; }); a.tick(); })()`); await sleep(300);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); await sleep(200);
  await ev(`splitFlap.ambient.key = null; splitFlap.tick()`); await sleep(300);
  check('reduced motion holds the ring still and keeps its colour', !/sf11-turn/.test(await ev('splitFlap.ambient.tex.style.animation')) && (await ev(`String(splitFlap.ambient.ring.classList.contains('on'))`)) === 'true', await ev(`JSON.stringify([splitFlap.ambient.tex.style.animation, splitFlap.ambient.ring.className, splitFlap.lookNow().id, matchMedia('(prefers-reduced-motion: reduce)').matches])`));
  await send('Emulation.setEmulatedMedia', { features: [] });
  const link = await ev(`(async () => (await import('./src/store.js')).encodeBoard(splitFlap.linkLooks(splitFlap.shown())))()`);
  await go('about:blank'); await go(URL0 + '?bg=transparent#b=' + link); await sleep(500);
  check('OBS shows no ring', (await ev(`getComputedStyle(splitFlap.ambient.ring).display`)) === 'none');
  await go('about:blank'); await go(URL0 + '?kiosk=1#b=' + link); await sleep(800);
  check('a kiosk shows the ring', (await ev(`getComputedStyle(splitFlap.ambient.ring).display`)) === 'block');

  // Make your own: the Light row and the Sky row
  await go('about:blank'); await go(URL0); await ev('splitFlap.toggleEdit()'); await sleep(400);
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'board', sb: splitFlap.shown().id, bd: splitFlap.shown().pages[0].id })`); await sleep(400);
  await click('lk-change-board'); await sleep(300);
  check('the sheet now offers the looks with light and sky', (await ev(`[...document.querySelectorAll('.sf-lk-card strong')].map(x => x.textContent).join()`)) === 'Default,Classic,Backlit,Classic RGB,Signal,Calm,Outside,Sunday,Party');   // Party since 0.11.2
  // 0.11.3: each card's thumbnail is drawn on its look's own wall, without the ring
  await sleep(500);
  const corners = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('.sf-lk-card')].map(c => { const cv = c.querySelector('canvas[data-thumb]'), x = cv.getContext('2d'), d = x.getImageData(1, 1, 1, 1).data; return [c.querySelector('strong').textContent, d[0] + ',' + d[1] + ',' + d[2]]; }))`));
  const cornerOf = n => (corners.find(c => c[0] === n) || [])[1];
  check('thumbnails are on each look\'s wall: Calm and Sunday differ from Classic, Classic RGB is Classic\'s', cornerOf('Calm') !== cornerOf('Classic') && cornerOf('Sunday') !== cornerOf('Classic') && cornerOf('Classic RGB') === cornerOf('Classic'), JSON.stringify(corners));
  await ev(`(() => { const d = document.querySelector('.sf-lk details'); d.open = true; d.dispatchEvent(new Event('toggle')); })()`); await sleep(400);
  await click('lk-fx-breathe'); await sleep(300);
  check('Make your own has the Light row, with its colours and stops', (await ev(`String(!!document.querySelector('[data-k=lk-pal-rainbow]') && !!document.querySelector('[data-k=lk-speed-slow]') && !!document.querySelector('[data-k=lk-bright-high]') && !!document.querySelector('[data-k=lk-rsize-wide]'))`)) === 'true');
  await click('lk-mat-paper'); await sleep(300); await click('lk-sky'); await sleep(300);
  check('on Paper the sky takes the wall only, at A hint', (await ev(`[...document.querySelectorAll('[data-k^=lk-str-]')].map(x => x.dataset.k).join()`)) === 'lk-str-hint' && (await ev(`String(!!document.querySelector('[data-k=lk-sky-ink]'))`)) === 'false');
  await click('sheet-close'); await sleep(200);

  // the quality ladder steps down under a throttled CPU, and says so
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'showing' })`); await sleep(300);
  check('Showing has the smoothness setting, Automatic first', (await ev(`document.querySelector('[data-k=quality]').value`)) === 'auto');
  await ev('splitFlap.toggleEdit()'); await sleep(300);
  await look(0, 'calm'); await sleep(500);
  await send('Emulation.setCPUThrottlingRate', { rate: 30 });
  await ev(`(() => { const a = splitFlap; window.__spin = setInterval(() => { const g = a.board.cells.map(r => r.map(() => 'ABCDEFGHIJ'[Math.floor(Math.random() * 10)])); a.board.setGrid(g); }, 700); })()`);
  for (let i = 0; i < 40 && !(await ev('splitFlap.ambient.auto')); i++) await sleep(500);
  await send('Emulation.setCPUThrottlingRate', { rate: 1 }); await ev('clearInterval(window.__spin)');
  check('a screen that cannot keep up steps down one rung, and says so', (await ev('splitFlap.ambient.auto')) >= 1 && /dropped/.test(await st()), `${await ev('splitFlap.ambient.auto')} ${await st()}`);
  check('the automatic step is kept for tomorrow', !!(await ev(`localStorage.getItem('sf_quality_auto')`)), await ev(`localStorage.getItem('sf_quality_auto')`));
  await ev(`localStorage.setItem('sf_quality', 'noring'); splitFlap.ambient.key = null; splitFlap.tick()`);
  check('a manual setting is kept for this screen', (await ev('splitFlap.ambient.rung()')) === 3);
  await ev(`splitFlap.ambient.setQuality('auto')`);
  check('Automatic clears the kept step', (await ev('splitFlap.ambient.auto')) === 0 && !(await ev(`localStorage.getItem('sf_quality_auto')`)));
  // a board that never turns: the two-second probe, not the renderer, finds the slow screen
  await look(0, 'classic'); await sleep(500);
  await send('Emulation.setCPUThrottlingRate', { rate: 40 });
  await look(0, 'outside');
  for (let i = 0; i < 20 && !(await ev('splitFlap.ambient.auto')); i++) await sleep(500);
  await send('Emulation.setCPUThrottlingRate', { rate: 1 });
  check('a still board on a slow screen: the probe steps down when the look goes on', (await ev('splitFlap.ambient.auto')) >= 1, `${await ev('splitFlap.ambient.auto')}`);

  // Classic on a slow screen (0.11.1 build review 1.4): nothing of the ring or the wall to drop,
  // so on a 1x screen it says nothing, and on a 2x screen it goes straight to lower sharpness
  await ev(`splitFlap.ambient.setQuality('auto')`); await look(0, 'classic'); await sleep(500);
  await ev(`(() => { const a = splitFlap; window.__said = []; const say = a.say.bind(a); a.say = (m, o) => { window.__said.push(String(m)); return say(m, o); }; })()`);
  await ev(`splitFlap.ambient.slow(); splitFlap.ambient.slow()`);
  check('Classic on a 1x screen: nothing to drop, and nothing said', (await ev('splitFlap.ambient.auto')) === 0 && (await ev('window.__said.length')) === 0, await ev('JSON.stringify(window.__said)'));
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false }); await sleep(600);
  await send('Emulation.setCPUThrottlingRate', { rate: 30 });
  await ev(`(() => { const a = splitFlap; window.__spin = setInterval(() => { const g = a.board.cells.map(r => r.map(() => 'ABCDEFGHIJ'[Math.floor(Math.random() * 10)])); a.board.setGrid(g); }, 700); })()`);
  for (let i = 0; i < 40 && !(await ev('splitFlap.ambient.auto')); i++) await sleep(500);
  await send('Emulation.setCPUThrottlingRate', { rate: 1 }); await ev('clearInterval(window.__spin)');
  const said = JSON.parse(await ev('JSON.stringify(window.__said.filter(m => /dropped/.test(m)))'));
  check('Classic on a 2x screen goes straight to lower sharpness, said once', (await ev(`localStorage.getItem('sf_quality_auto')`)) === 'lowres' && said.length === 1 && /sharpness/.test(said[0]), JSON.stringify(said));
  await ev(`splitFlap.ambient.setQuality('auto')`);
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  // a kiosk's first load (0.11.1 build review 1.3): the sky asks for the weather at the
  // playlist's own place, not the screen's
  await ev(`(() => { const a = splitFlap; localStorage.setItem('sf_place', JSON.stringify({ city: 'Stockholm', lat: 59.33, lon: 18.07, tz: 'Europe/Stockholm' }));
    a.upd(b => { b.loc = { city: 'Tokyo', lat: 35.68, lon: 139.69, tz: 'Asia/Tokyo' }; }); })()`); await sleep(300);
  await look(0, 'outside'); await sleep(1500);
  await go(URL0 + '?kiosk=1');
  check('a kiosk on first load wants the weather at the playlist\'s place', (await ev(`JSON.stringify([...splitFlap.live.wanted.wx.keys()])`)).includes('35.68,139.69'), await ev(`JSON.stringify([...splitFlap.live.wanted.wx.keys()])`));
} catch (e) { results.push('ERROR ' + e.message); }
function splitFlap_in_wrap(v) { return v === 'true'; }
console.log(results.join('\n'));
ws.close(); proc.kill(); process.exit(results.every(r => r.startsWith('PASS')) ? 0 : 1);
