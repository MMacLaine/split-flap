// My boards (0.7.1), in a real browser: save, add a copy to storyboards of the same and of
// another size, edit and delete apart, import a Vestaboard message, and the addresses.
// Needs Chrome and `node _dev/serve.mjs` on 8801 (no Worker needed). npm run e2e:my
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
const at = () => ev('location.hash'), lv = () => ev(`(() => { const E = splitFlap.editor.E; return splitFlap.S.editing ? E.sec + ':' + E.lv + (E.lv === 'sb' ? ':' + E.view : '') : 'closed'; })()`);

try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await go(URL0); await ev(`localStorage.setItem('sf_started','1'); localStorage.setItem('sf_cue_seen','1')`); await go(URL0);
  // a second storyboard at 3 x 15, from the Café template
  await ev(`splitFlap.useTemplate('cafe')`); await sleep(500);
  await ev(`splitFlap.upd(b => { b.size = '3x15'; })`); await sleep(300);
  const small = await ev('splitFlap.cur().id'), smallDims = await ev('JSON.stringify(splitFlap.dims())');
  await ev(`splitFlap.pickBoard(0)`); await sleep(300);
  const demo = await ev('splitFlap.cur().id');
  // a board with typed cells right to its edges, saved to My boards
  await ev(`(() => { const app = splitFlap; app.S.sel = 0; app.updPage(p => { p.name = 'Edges'; p.layout = 'full'; const c = Array.from({ length: 6 }, () => Array(22).fill(' ')); c[0][0] = 'r'; c[5][21] = 'b'; 'HELLO'.split('').forEach((x, i) => { c[2][8 + i] = x; }); p.zones = [{ ch: 'message', o: { cells: c } }]; }); })()`); await sleep(300);
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'board', sb: '${demo}', bd: splitFlap.cur().pages[0].id })`); await sleep(400);
  await ev(`document.querySelector('[data-k=save-my]').click()`); await sleep(400);
  const bp = await ev('splitFlap.blueprints[0] && splitFlap.blueprints[0].id');
  check('Save to my boards makes a blueprint', !!bp && (await ev('splitFlap.blueprints[0].page.wins')) === undefined, bp);
  check('it records where it came from: its storyboard and itself, since it was made from scratch', (await ev('JSON.stringify(splitFlap.blueprints[0].from)')) === JSON.stringify({ kind: 'storyboard', id: demo, board: await ev('splitFlap.cur().pages[0].id') }), await ev('JSON.stringify(splitFlap.blueprints[0].from)'));
  check('My boards is kept for a guest', (await ev(`JSON.parse(localStorage.getItem('sf_myboards')).length`)) === 1);

  // add it to the demo (same size): no warning; then to the café (3 x 15): a warning
  const addTo = async sb => {
    await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'sb', sb: '${sb}', view: 'boards' })`); await sleep(400);
    await ev(`document.querySelector('[data-k=add-page]').click()`); await sleep(300);
    await ev(`document.querySelector('[data-k="add-blueprint-${bp}"]') ? document.querySelector('[data-k="add-blueprint-${bp}"]').click() : document.querySelector('[data-k=add-all-sizes]').click()`); await sleep(300);
    if (!(await ev(`String(!!document.querySelector('[data-k="add-blueprint-${bp}"].on'))`) === 'true')) { await ev(`document.querySelector('[data-k="add-blueprint-${bp}"]').click()`); await sleep(300); }
  };
  await addTo(demo);
  check('the copy is previewed on the big board before it is added', (await ev(`splitFlap.currentPage().from && splitFlap.currentPage().from.id`)) === bp);
  check('no warning at the same size', (await ev(`String(!!document.querySelector('[data-k=cut-warn]'))`)) === 'false');
  await ev(`document.querySelector('[data-k=add-confirm]').click()`); await sleep(400);
  const demoCopy = await ev(`JSON.stringify(splitFlap.cur().pages.at(-1))`);
  await addTo(small);
  check('the other size is behind Show all sizes, then previewed at 3 x 15', (await ev('JSON.stringify(splitFlap.dims())')) === smallDims && (await ev(`splitFlap.currentPage().zones[0].o.cells.length`)) === 3);
  check('with a warning that names the cut flaps', /2 typed or painted flaps/.test(await ev(`(document.querySelector('[data-k=cut-warn]') || {}).textContent || ''`)), await ev(`(document.querySelector('[data-k=cut-warn]') || {}).textContent || 'no warning'`));
  await ev(`document.querySelector('[data-k=add-confirm]').click()`); await sleep(400);
  const smallCopy = await ev(`JSON.stringify(splitFlap.cur().pages.at(-1))`);

  // proof 1: edit one copy, the other stays; proof 2: delete the blueprint, both copies stay
  await ev(`(() => { const app = splitFlap; app.S.sel = app.cur().pages.length - 1; app.updPage(p => { p.name = 'Edited in the café'; }); })()`); await sleep(300);
  await ev(`splitFlap.pickBoard(splitFlap.boards.findIndex(b => b.id === '${demo}'))`); await sleep(300);
  check('editing the copy in one storyboard leaves the copy in the other unchanged', (await ev(`JSON.stringify(splitFlap.cur().pages.at(-1))`)) === demoCopy);
  await ev(`splitFlap.deleteBlueprint('${bp}')`); await sleep(300);
  check('deleting the blueprint leaves both copies', (await ev(`splitFlap.boards.map(b => b.pages.filter(p => p.from && p.from.id === '${bp}').length).join(',')`)) === '1,1', await ev(`splitFlap.boards.map(b => b.pages.filter(p => p.from && p.from.id === '${bp}').length).join(',')`));

  // Import a pasted Vestaboard message into My boards, previewed as you type
  await ev(`splitFlap.editor.go({ sec: 'my', lv: 'list' })`); await sleep(300);
  await ev(`document.querySelector('[data-k=my-import]').click()`); await sleep(300);
  await ev(`document.querySelector('[data-k=imp-tab-vb]').click()`); await sleep(300);
  await ev(`(() => { const el = document.querySelector('[data-k=imp-vb]'); el.value = 'back at 14:00\\n\\nkeys in the\\nblue bowl'; el.dispatchEvent(new Event('input')); })()`); await sleep(300);
  check('a pasted Vestaboard message is previewed on the big board', (await ev(`JSON.stringify(splitFlap.currentPage().zones[0].o.lines)`)) === JSON.stringify(['BACK AT 14:00', '', 'KEYS IN THE', 'BLUE BOWL']));
  await ev(`document.querySelector('[data-k=imp-vb-save]').click()`); await sleep(400);
  const vb = await ev('splitFlap.blueprints[0].id');
  check('and saved to My boards', (await ev('splitFlap.blueprints[0].name')) === 'back at 14:00' || (await ev('splitFlap.blueprints[0].name')) === 'BACK AT 14:00', await ev('splitFlap.blueprints[0].name'));

  // a blueprint's level has its own address, its own size, and no times
  await ev(`document.querySelector('[data-k="bp-${vb}"]').click()`); await sleep(400);
  check('a blueprint opens at its own address', (await at()) === `#/my-boards/${vb}`, await at());
  check('with no times to set', (await ev(`String(!!document.querySelector('[data-k=win-add]'))`)) === 'false');
  await send('Page.reload'); await sleep(2500);
  check('and a reload lands back on it', (await lv()) === 'my:bp', await lv());
  await ev(`document.querySelector('[data-k=back]').click()`); await sleep(300);
  check('Back goes to My boards', (await at()) === '#/my-boards', await at());
} catch (e) { results.push('ERROR ' + e.message); }
console.log(results.join('\n'));
ws.close(); proc.kill(); process.exit(results.every(r => r.startsWith('PASS')) ? 0 : 1);
