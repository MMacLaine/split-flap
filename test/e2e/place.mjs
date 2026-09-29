// The Place (0.8), in a real browser: the first visit asks where the screen is, the demo
// is built for it, departures come from the nearest stop through the Worker, Explore is
// grouped, and a switched-off source hides its tile and its templates.
// Needs Chrome, `node _dev/serve.mjs` on 8801 and `wrangler dev --env dev --port 8787` in
// worker/ (the data routes are the Worker's). It asks Open-Meteo and Transitous for real,
// so it is not run in CI. npm run e2e:place
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
  await go(URL0); await ev(`localStorage.setItem('sf_cue_seen','1'); localStorage.setItem('sf_lang','en')`); await go(URL0);
  const fresh = await ev('splitFlap.cur().id');
  await ev('splitFlap.toggleEdit()'); await sleep(600);
  check('a first visit opens Explore and asks where the screen is', (await lv()) === 'ex:list' && (await ev(`String(!!document.querySelector('[data-k=first-place]'))`)) === 'true', await lv());
  await ev(`(() => { const el = document.querySelector('[data-k=first-place]'); el.value = 'London'; el.dispatchEvent(new Event('input')); })()`);
  await waitFor(`document.querySelector('.sf-sugs .sf-sug[role=option]')`);
  await ev(`document.querySelector('.sf-sugs .sf-sug[role=option]').click()`); await sleep(800);
  const place = JSON.parse(await ev(`localStorage.getItem('sf_place')`) || '{}');
  check('the city search gives the place its country and time zone', place.cc === 'GB' && place.tz === 'Europe/London', JSON.stringify(place));
  check('the demo is built again for London, under the same id', (await ev('splitFlap.cur().id')) === fresh && (await ev('splitFlap.cur().loc && splitFlap.cur().loc.cc')) === 'GB');
  const dz = JSON.parse(await ev(`JSON.stringify(splitFlap.cur().pages.find(p => p.zones.some(z => z.ch === 'departures')) || null)`));
  check('its departures follow the nearest stop, not Odenplan', !!dz && dz.zones[1].o.near === true && !JSON.stringify(dz).includes('Odenplan'));
  check('Explore shows its sections, each with a way to see all', (await ev(`document.querySelectorAll('.sf-level [data-k^="sec-"]').length`)) >= 5, await ev(`[...document.querySelectorAll('.sf-level .sf-group .sf-eyebrow')].map(e => e.textContent).join(', ')`));
  const nearOk = await waitFor(`Object.values(splitFlap.live.data.near).some(n => n.stops && n.stops.length)`);
  check('the nearest stops come back through the Worker', nearOk, await ev(`JSON.stringify(Object.values(splitFlap.live.data.near).map(n => (n.stops || []).slice(0, 2).map(s => s.name)))`));
  const depOk = await waitFor(`Object.values(splitFlap.live.data.tr).some(e => e.deps && e.deps.length)`, 30000);
  const board = await composed(`app.cur().pages.find(p => p.zones.some(z => z.ch === 'departures'))`);
  check('and the departures board prints a London stop with times', depOk && /MIN|NOW/.test(board) && !/PICK A STOP|LOADING/.test(board), board.replace(/\s{2,}/g, ' '));

  // a template for the place: the café prices in pounds, the station board uses the station look
  await ev(`splitFlap.useTemplate('cafe')`); await sleep(500);
  const menu = await ev(`JSON.stringify(splitFlap.cur().pages[0].zones[0].o)`);
  check('the Café template prices in the local currency', /"suffix":" GBP"/.test(menu) && !/KANELBULLE/.test(menu), menu);
  await ev(`splitFlap.useTemplate('station')`); await sleep(500);
  check('the Station board is a Departures zone with the station look', (await ev(`JSON.stringify(splitFlap.cur().pages[0].zones[1].o)`)).includes('"view":"board"') && (await ev(`JSON.stringify(splitFlap.cur().pages[0].zones[1].o)`)).includes('"near":"rail"'), await ev(`JSON.stringify(splitFlap.cur().pages[0].zones[1].o)`));

  // the picker offers Departures, not the SL tile, and it says which stop it chose
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'board', sb: splitFlap.cur().id, bd: splitFlap.cur().pages[0].id })`); await sleep(500);
  await ev(`document.querySelector('[data-k=zone-1]').click()`); await sleep(400);
  await ev(`document.querySelector('[data-k=change]').click()`); await sleep(500);
  check('the picker has Departures and no SL tile', (await ev(`String(!!document.querySelector('[data-k=tile-departures]') && !document.querySelector('[data-k=tile-sl]'))`)) === 'true');
  await ev(`document.querySelector('[data-k=tile-departures]').click()`); await sleep(1500);
  check('Departures names the nearest stop it picked', /Nearest stop to London/.test(await ev(`document.querySelector('.sf-drawer').textContent`)), (await ev(`(document.querySelector('.sf-drawer .sf-list .sf-note') || {}).textContent || ''`)));
  check('and credits Transitous with a link to its sources', (await ev(`String(!!document.querySelector('.sf-drawer a[href="https://transitous.org/sources/"]'))`)) === 'true');

  // a stop search anywhere, and a name the flaps print without gaps
  const found = JSON.parse(await ev(`(async () => { const { searchStops } = await import('./src/live.js'); return JSON.stringify(await searchStops('Łódź Fabryczna', 'en', { cc: 'PL' })); })()`));
  check('a stop search reaches Poland, and SL stays out of it', found.length > 0 && found.every(r => r.src === 'tr'), found.slice(0, 2).map(r => r.name).join(', '));
  const printed = await ev(`(async () => { const { boardText } = await import('./src/charset.js'); return boardText(${JSON.stringify((found[0] || {}).name || 'Łódź')}); })()`);
  check('and its name prints on the flaps', /LODZ/.test(printed) && !/  /.test(printed.trim()), printed);

  // the kill switch: a source the Worker lists as off hides its tile and its templates
  await ev(`(() => { splitFlap.live.data.off = ['transit']; splitFlap.editor.E.picking = true; splitFlap.render(); })()`); await sleep(400);
  check('a switched-off source hides its tile', (await ev(`String(!!document.querySelector('[data-k=tile-departures]'))`)) === 'false');
  await ev(`splitFlap.editor.go({ sec: 'ex', lv: 'section', section: 'travel' })`); await sleep(600);
  check('and moves its templates to Not available here yet, on their section\'s page', /Not available here yet/.test(await ev(`document.querySelector('.sf-drawer').textContent`)) && (await at()) === '#/explore/travel', await at());
  await ev(`splitFlap.live.data.off = []`);
} catch (err) { check('no exception', false, err && err.message); }

console.log(results.join('\n'));
ws.close(); proc.kill();
process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
