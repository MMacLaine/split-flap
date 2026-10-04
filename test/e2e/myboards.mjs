// Boards (0.10.1), in a real browser: every board once, playlists that point at them at
// their own sizes, an edit that shows everywhere, Duplicate, Delete with Undo, an import, and the addresses.
// Needs Chrome and `node _dev/serve.mjs` on 8801 (no Worker needed). npm run e2e:my
import { spawn } from 'node:child_process';
import { launchChrome } from './chrome.mjs';
const URL0 = process.env.APP || 'http://localhost:8801/';
const { proc, PORT } = await launchChrome('nav', []);
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
  const demo = await ev('splitFlap.cur().id');
  check('every board of the demo is in Boards', (await ev('splitFlap.blueprints.length')) === (await ev('splitFlap.cur().pages.length')) && (await ev(`splitFlap.cur().pages.every(p => splitFlap.blueprints.some(b => b.id === p.id))`)) === true);
  // a second playlist at 3 x 15, from the Café template: its boards land in Boards too
  await ev(`splitFlap.useTemplate('cafe')`); await sleep(500);
  const cafe = await ev('splitFlap.shown().id'), cafeBoards = await ev('splitFlap.shown().pages.length');
  await ev(`splitFlap.upd(b => { b.pages.forEach(p => { p.size = '3x15'; p.rows = 3; p.cols = 15; }); })`); await sleep(300);
  check('a template shown keeps its boards in Boards', (await ev(`splitFlap.shown().pages.every(p => splitFlap.blueprints.some(b => b.id === p.id && b.size === '3x15'))`)) === true);
  await ev(`splitFlap.pickBoard(splitFlap.boards.findIndex(b => b.id === '${demo}'))`); await sleep(300);
  // a board with typed cells to its edges, at 6 x 22, in the demo
  await ev(`(() => { const app = splitFlap; app.S.sel = 0; app.updPage(p => { p.name = 'Edges'; p.layout = 'full'; const c = Array.from({ length: 6 }, () => Array(22).fill(' ')); c[0][0] = 'r'; c[5][21] = 'b'; 'HELLO'.split('').forEach((x, i) => { c[2][8 + i] = x; }); p.zones = [{ ch: 'message', o: { cells: c } }]; }); })()`); await sleep(300);
  const edges = await ev('splitFlap.cur().pages[0].id');
  check('an edit to a board of a playlist is an edit to the board in Boards', (await ev(`splitFlap.blueprints.find(b => b.id === '${edges}').name`)) === 'Edges');

  // add it to the café playlist (3 x 15): the playlist points at it, at its own size, nothing cut
  await ev('splitFlap.S.editing || splitFlap.toggleEdit()'); await sleep(300);
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'sb', sb: '${cafe}', view: 'boards' })`); await sleep(400);
  await ev(`document.querySelector('[data-k=add-page]').click()`); await sleep(300);
  await ev(`document.querySelector('[data-k="add-blueprint-${edges}"]').click()`); await sleep(300);
  check('the board is previewed at its own size, 6 x 22, in the 3 x 15 playlist', (await ev('JSON.stringify(splitFlap.dims())')) === JSON.stringify({ rows: 6, cols: 22 }) && (await ev(`splitFlap.currentPage().id`)) === edges);
  check('and no cut warning, since nothing is cut', (await ev(`String(!!document.querySelector('[data-k=cut-warn]'))`)) === 'false');
  await ev(`document.querySelector('[data-k=add-confirm]').click()`); await sleep(400);
  check('the playlist points at the same board', (await ev(`splitFlap.playlists.find(p => p.id === '${cafe}').items.some(i => i.id === '${edges}')`)) === true && (await ev('splitFlap.blueprints.length')) === (await ev(`new Set(splitFlap.blueprints.map(b => b.id)).size`)));
  check('and says it has mixed sizes', (await ev(`splitFlap.sizeLabel(splitFlap.boards.find(b => b.id === '${cafe}'))`)) === 'Mixed sizes');
  await ev(`document.querySelector('[data-k=add-page]').click()`); await sleep(300);
  check('a board already in the playlist cannot be added twice', (await ev(`String(document.querySelector('[data-k="add-blueprint-${edges}"]').disabled)`)) === 'true');
  await ev(`document.querySelector('[data-k=sheet-close]').click()`); await sleep(200);

  // a playlist of mixed sizes: the screen takes each board's size as it comes round
  await ev(`(() => { const app = splitFlap, i = app.boards.findIndex(b => b.id === '${cafe}'); if (app.S.editing) app.toggleEdit(); app.active = i; app.S.pageIdx = 0; app.S.pageStart = Date.now(); app.tick(); })()`); await sleep(300);
  const d0 = await ev('JSON.stringify([splitFlap.board.o.rows, splitFlap.board.o.cols])');
  await ev(`(() => { const app = splitFlap; app.S.pageIdx = app.cur().pages.length - 1; app.S.pageStart = Date.now(); app.tick(); })()`); await sleep(300);
  const d1 = await ev('JSON.stringify([splitFlap.board.o.rows, splitFlap.board.o.cols])');
  check('the screen runs each board at its own size', d0 === '[3,15]' && d1 === '[6,22]', `${d0} then ${d1}`);

  // one board in two playlists: edit it in one, the other shows it, and the board says where it is
  await ev('splitFlap.S.editing || splitFlap.toggleEdit()'); await sleep(300);
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'board', sb: '${cafe}', bd: '${edges}' })`); await sleep(400);
  await ev(`splitFlap.updPage(p => { p.name = 'Edges everywhere'; })`); await sleep(400);
  check('an edit in one playlist shows in the other', (await ev(`splitFlap.boards.find(b => b.id === '${demo}').pages.find(p => p.id === '${edges}').name`)) === 'Edges everywhere');
  check('the board names the playlists it is in', /In Demo and/.test(await ev(`document.querySelector('[data-k=in-playlists]').textContent`)), await ev(`document.querySelector('[data-k=in-playlists]').textContent`));
  check('its times stay with each playlist', (await ev(`splitFlap.playlists.find(p => p.id === '${demo}').items[0].dur`)) === 10);

  // Duplicate makes a board of its own
  await ev(`splitFlap.editor.go({ sec: 'my', lv: 'bp', bp: '${edges}' })`); await sleep(300);
  check('a board in Boards is previewed with the gold bar', (await ev('String(splitFlap.looking())')) === 'true');
  await ev(`document.querySelector('[data-k=more-bp-open]').click()`); await sleep(200);
  check('its menu has Add to a playlist, Duplicate, Share and Delete', /Duplicate.*Add to a playlist.*Share.*Delete/.test(await ev(`[...document.querySelectorAll('.sf-more.open .sf-more-item')].map(b => b.textContent).join(',')`)), await ev(`[...document.querySelectorAll('.sf-more.open .sf-more-item')].map(b => b.textContent).join(',')`));
  await ev(`document.querySelector('.sf-more.open [data-k=more-duplicate]').click()`); await sleep(300);
  check('Duplicate makes a board of its own, in no playlist', (await ev(`splitFlap.blueprints.some(b => b.name === 'Edges everywhere copy' && !splitFlap.playlists.some(p => p.items.some(i => i.id === b.id)))`)) === true);

  // Delete is never refused: it names the playlists and offers Undo
  await ev(`document.querySelector('[data-k=more-bp-open]').click()`); await sleep(200);
  await ev(`document.querySelector('.sf-more.open [data-k=more-delete]').click()`); await sleep(200);
  await ev(`document.querySelector('.sf-more.open [data-k=more-delete]').click()`); await sleep(500);
  const said = await ev(`(document.querySelector('[data-k=status-line]') || {}).textContent || ''`);
  check('Delete names the playlists it is taken out of', /Deleted Edges everywhere\. Also taken out of Demo and Café/.test(said) || /Also taken out of/.test(said), said);
  check('and it leaves both playlists', (await ev(`splitFlap.playlists.some(p => p.items.some(i => i.id === '${edges}'))`)) === false && (await lv()) === 'my:list', await lv());
  await ev(`document.querySelector('[data-k=status-act]').click()`); await sleep(400);
  check('Undo puts it back in both, where it was', (await ev(`splitFlap.boards.find(b => b.id === '${demo}').pages[0].name`)) === 'Edges everywhere' && (await ev(`splitFlap.boards.find(b => b.id === '${cafe}').pages.at(-1).name`)) === 'Edges everywhere');

  // Import a pasted Vestaboard message into Boards, previewed as you type
  await ev(`splitFlap.editor.go({ sec: 'my', lv: 'list' })`); await sleep(300);
  await ev(`document.querySelector('[data-k=my-import]').click()`); await sleep(300);
  await ev(`document.querySelector('[data-k=imp-tab-vb]').click()`); await sleep(300);
  await ev(`(() => { const el = document.querySelector('[data-k=imp-vb]'); el.value = 'back at 14:00\\n\\nkeys in the\\nblue bowl'; el.dispatchEvent(new Event('input')); })()`); await sleep(300);
  check('a pasted Vestaboard message is previewed on the big board', (await ev(`JSON.stringify(splitFlap.currentPage().zones[0].o.lines)`)) === JSON.stringify(['BACK AT 14:00', '', 'KEYS IN THE', 'BLUE BOWL']));
  await ev(`document.querySelector('[data-k=imp-vb-save]').click()`); await sleep(400);
  const vb = await ev('splitFlap.blueprints[0].id');
  check('and saved to Boards', /back at 14:00/i.test(await ev('splitFlap.blueprints[0].name')), await ev('splitFlap.blueprints[0].name'));

  // a board's level has its own address, its own size, and no times
  await ev(`document.querySelector('[data-k="bp-${vb}"]').click()`); await sleep(400);
  check('a board opens at its own address', (await at()) === `#/my-boards/${vb}`, await at());
  check('with no times to set', (await ev(`String(!!document.querySelector('[data-k=win-add]'))`)) === 'false');
  await ev(`document.querySelector('[data-k=size-12x40]').click()`); await sleep(300);
  check('and a size of its own, set on the board', (await ev(`splitFlap.blueprints.find(b => b.id === '${vb}').size`)) === '12x40' && (await ev('JSON.stringify(splitFlap.dims())')) === JSON.stringify({ rows: 12, cols: 40 }));
  await send('Page.reload'); await sleep(2500);
  check('and a reload lands back on it', (await lv()) === 'my:bp', await lv());
  await ev(`document.querySelector('[data-k=back]').click()`); await sleep(300);
  check('Back goes to Boards', (await at()) === '#/my-boards', await at());
} catch (e) { results.push('ERROR ' + e.message); }
console.log(results.join('\n'));
ws.close(); proc.kill(); process.exit(results.every(r => r.startsWith('PASS')) ? 0 : 1);
