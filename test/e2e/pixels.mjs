// 0.11.0: Classic is pixel for pixel 0.10.2, at rest and mid-flip, and so are 0.10's white and
// solari boards (now the named looks Paper and Solari). Needs Chrome, this tree on 8801 and
// 0.10.2 (e9eb7ea) on 8802: `git worktree add <dir> e9eb7ea && node <dir>/_dev/serve.mjs 8802`.
// npm run e2e:pixels
import { spawn } from 'node:child_process';
import { launchChrome } from './chrome.mjs';
const NEW = process.env.APP || 'http://localhost:8801/', OLD = process.env.BASE || 'http://localhost:8802/';
const { proc, PORT } = await launchChrome('px', ['--force-device-scale-factor=1']);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 50 && !tabs; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); } catch { await sleep(200); } }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}; ws.onmessage = e => { const m = JSON.parse(e.data); if (pend[m.id]) { pend[m.id](m.result); delete pend[m.id]; } };
const send = (method, params = {}) => new Promise(r => { pend[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const results = []; const check = (label, ok, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail !== undefined ? '  ' + detail : ''}`);

// A fixed grid, the board held still, and a checksum of every canvas pixel. mid: every flap
// started at one clock and drawn at one frozen moment of its fold.
const FRAME = theme => `(async () => {
  const app = splitFlap; clearInterval(app.iv); app.tick = () => {}; app.board.o.onFlip = null;
  await document.fonts.ready; await new Promise(r => setTimeout(r, 300));
  const b = app.board, T = '${theme}';
  b.setOptions({ rows: 6, cols: 22, theme: T, speed: 'fast', transition: 'classic' });
  const rows = ['', ' HELLO FROM ÅLESUND', ' 14:02  r g b y o v', ' $3.50 ♥ ~W~O~R~D', '', ' THE LAST ROW 22'];
  const grid = rows.map(s => [...s.padEnd(22)].slice(0, 22));
  b.setGrid(grid, { instant: true });
  const sum = () => { const d = b.ctx.getImageData(0, 0, b.W, b.H).data; let h = 2166136261; for (let i = 0; i < d.length; i++) h = Math.imul(h ^ d[i], 16777619) >>> 0; return b.W + 'x' + b.H + ':' + h.toString(16); };
  const rest = sum();
  cancelAnimationFrame(b._raf); b._raf = 0;
  const next = rows.map(s => [...s.split('').reverse().join('').padEnd(22)].slice(0, 22));
  b.setGrid(next); cancelAnimationFrame(b._raf); b._raf = 0;
  const t0 = 1000; b.cells.forEach(row => row.forEach(c => { if (c.q.length) c.a = b._start(c, t0, { step: 70, final: 160, settle: 90 }); }));
  const real = performance.now; performance.now = () => t0 + 31; b._full(); const mid = sum(); performance.now = real;
  return JSON.stringify({ rest, mid });
})()`;
async function frames(url, theme) {
  await send('Page.navigate', { url: 'about:blank' }); await sleep(300);
  await send('Page.navigate', { url }); await sleep(1500);
  await ev(`localStorage.clear(); localStorage.setItem('sf_started','1'); localStorage.setItem('sf_cue_seen','1')`);
  await send('Page.navigate', { url }); await sleep(2500);
  return JSON.parse(await ev(FRAME(theme)));
}
// The page as composited, through the app's own path (no theme forced): the demo at rest, with
// the overlay hidden, captured from the screen.
async function shot(url) {
  await send('Page.navigate', { url: 'about:blank' }); await sleep(300);
  await send('Page.navigate', { url }); await sleep(1500);
  await ev(`localStorage.clear(); localStorage.setItem('sf_started','1'); localStorage.setItem('sf_cue_seen','1')`);
  await send('Page.navigate', { url }); await sleep(2500);
  const theme = await ev(`splitFlap.board.o.theme`);
  await ev(`(async () => { const app = splitFlap; clearInterval(app.iv); app.tick = () => {}; await document.fonts.ready;
    const st = document.createElement('style'); st.textContent = '.sf-overlay, .sf-look-bar { display: none !important; }'; document.head.append(st);
    const rows = ['', ' HELLO FROM ÅLESUND', ' 14:02  r g b y o v', ' $3.50 ♥', '', ' THE LAST ROW 22']; app.board.setGrid(rows.map(s => [...s.padEnd(22)].slice(0, 22)), { instant: true }); await new Promise(r => setTimeout(r, 400)); })()`);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  return { theme, png: r.data };
}
try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  const s1 = await shot(OLD), s2 = await shot(NEW);
  check('the app draws a new install in 0.10\'s own theme', s2.theme === 'black' && s1.theme === 'black', `${s1.theme} / ${s2.theme}`);
  check('the composited page at rest is 0.10.2\'s, byte for byte', s1.png === s2.png, `${s1.png.length} / ${s2.png.length}`);
  for (const theme of ['black', 'white', 'solari']) {
    const a = await frames(OLD, theme), b = await frames(NEW, theme);
    check(`${theme}: at rest, every pixel as 0.10.2`, a.rest === b.rest, `${a.rest} / ${b.rest}`);
    check(`${theme}: mid-flip, every pixel as 0.10.2`, a.mid === b.mid, `${a.mid} / ${b.mid}`);
  }
} catch (e) { results.push('ERROR ' + e.message); }
console.log(results.join('\n'));
ws.close(); proc.kill(); process.exit(results.every(r => r.startsWith('PASS')) ? 0 : 1);
