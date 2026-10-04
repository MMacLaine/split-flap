// 0.11.4 a board's own week, at the top of When it shows: drag to add, drag an edge to change,
// tap to edit or remove, the keyboard, the form under it, a phone with a finger, and the Week
// view in step both ways. Needs Chrome and `node _dev/serve.mjs` on 8801. npm run e2e:when
import { launchChrome } from './chrome.mjs';
const URL0 = process.env.APP || 'http://localhost:8801/';
const SHOTS = process.env.SHOTS || '';
const { proc, PORT } = await launchChrome('when', []);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 50 && !tabs; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); } catch { await sleep(200); } }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}; ws.onmessage = e => { const m = JSON.parse(e.data); if (pend[m.id]) { pend[m.id](m.result); delete pend[m.id]; } };
const send = (method, params = {}) => new Promise(r => { pend[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (!r) return undefined; if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const go = async url => { await send('Page.navigate', { url }); await sleep(2500); };
const results = []; const check = (label, ok, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail !== undefined ? '  ' + detail : ''}`);
const st = () => ev(`(document.querySelector('[data-k=status-line]') || {}).textContent || ''`);
const wins = () => ev(`JSON.stringify(splitFlap.cur().pages[1].wins || [])`);
// where a minute of a strip day is on the screen
const at = (k, min) => ev(`(() => { const c = document.querySelector('[data-k=strip-day-${k}]'); c.scrollIntoView({ block: 'center' }); const r = c.getBoundingClientRect(); return JSON.stringify({ x: r.left + r.width / 2, y: r.top + ${min} / 1440 * r.height }); })()`).then(JSON.parse);
const box = sel => ev(`(() => { const e = document.querySelector('${sel}'); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return JSON.stringify({ x: r.left + r.width / 2, top: r.top, bottom: r.bottom }); })()`).then(v => v && JSON.parse(v));
const mouse = async (x, y0, y1) => {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y: y0, button: 'left', buttons: 1, clickCount: 1 });
  for (let k = 1; k <= 6; k++) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y: y0 + (y1 - y0) * k / 6, button: 'left', buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y: y1, button: 'left', buttons: 0, clickCount: 1 }); await sleep(400);
};
const finger = async (x, y0, y1, hold = 0) => {
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
  if (hold) await sleep(hold);
  for (let k = 1; k <= 6; k++) { await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + (y1 - y0) * k / 6 }] }); await sleep(20); }
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(400);
};
const key = async (k, mods = 0) => { const code = { ArrowUp: 38, ArrowDown: 40, Delete: 46, Enter: 13 }[k];
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: code, modifiers: mods }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: code, modifiers: mods }); await sleep(300); };
const shot = async name => { if (!SHOTS) return; const { writeFileSync } = await import('node:fs'); const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${SHOTS}/${name}.png`, Buffer.from(r.data, 'base64')); };
const board = async () => { await ev(`(() => { const a = splitFlap; if (!a.S.editing) a.toggleEdit(); a.editor.go({ sec: 'sb', lv: 'board', sb: a.cur().id, bd: a.cur().pages[1].id }); })()`); await sleep(600); };

try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await go(URL0); await ev(`localStorage.setItem('sf_started','1'); localStorage.setItem('sf_cue_seen','1')`); await go(URL0);
  // a board with no times, one of its neighbours with a time to sit faintly behind
  await ev(`splitFlap.upd(b => { b.pages.forEach(p => { delete p.wins; delete p.alone; }); b.pages[0].wins = [{ from: '07:00', to: '09:00', days: [] }]; })`);
  await board();
  check('When it shows is its own section, no Advanced tag', (await ev(`String(!!document.querySelector('[data-k=when] [data-k=strip]') && !document.querySelector('[data-k=when-adv]'))`)) === 'true');
  check('the other boards sit faintly behind', (await ev(`document.querySelectorAll('[data-k=strip] .sf-block.faint').length`)) >= 7 && (await ev(`document.querySelectorAll('[data-k=strip] .sf-block.mine').length`)) === 0);
  await shot('d-strip-empty');

  // drag an empty slot: a time for this board, said, with Undo
  let a = await at(2, 540), b = await at(2, 660);
  await mouse(a.x, a.y, b.y);
  const day2 = await ev(`(() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 2); return d.getDay(); })()`);
  check('drag on an empty slot adds a time', (await wins()) === JSON.stringify([{ from: '09:00', to: '11:00', days: [day2] }]), await wins());
  check('and says so, as every week, with Undo', /^Big clock: Wednesdays 09:00 to 11:00/.test(await st()) && !!(await ev(`String(!!document.querySelector('.sf-status [data-k=status-action], [data-k=status-line] button'))`)).match(/true/), await st());
  check('the block is solid, in the strip', (await ev(`document.querySelectorAll('[data-k=strip] .sf-block.mine').length`)) === 1);
  check('the form under the strip has the same time', (await ev(`document.querySelector('[data-k=win-from-0]').value + '-' + document.querySelector('[data-k=win-to-0]').value`)) === '09:00-11:00');
  await ev(`(document.querySelector('[data-k=status-line] button') || document.querySelector('[data-k=status-action]')).click()`); await sleep(400);
  check('Undo takes it back', (await wins()) === '[]', await wins());
  a = await at(2, 540); b = await at(2, 660);
  await mouse(a.x, a.y, b.y);
  await shot('d-strip-time');

  // drag the bottom edge: a later end
  // a two-hour block's middle moves it; then a one-hour one's (0.11.4 review)
  let bl = await box(`[data-k=strip-0-2]`);
  await mouse(bl.x, bl.bottom - 2, bl.bottom - 2 - 14);
  bl = await box(`[data-k=strip-0-2]`);
  await mouse(bl.x, (bl.top + bl.bottom) / 2, (bl.top + bl.bottom) / 2 + 28);
  check('the middle of a one-hour block moves it: 28 px is two hours', JSON.stringify(JSON.parse(await wins())[0]).includes('"from":"11:00","to":"12:00"'), await wins());
  await ev(`(document.querySelector('[data-k=status-line] button')).click()`); await sleep(400);
  await ev(`(document.querySelector('[data-k=status-line] button')).click()`); await sleep(400);
  bl = await box(`[data-k=strip-0-2]`);
  await mouse(bl.x, bl.bottom - 2, bl.bottom - 2 + 14);
  check('drag an edge to change the end', JSON.parse(await wins())[0].to === '12:00', await wins());
  bl = await box(`[data-k=strip-0-2]`);
  await mouse(bl.x, bl.top + 2, bl.top + 2 - 14);
  check('and the top edge to change the start', JSON.parse(await wins())[0].from === '08:00', await wins());

  // the keyboard: arrows move it by 15 minutes, Shift changes the end
  await ev(`document.querySelector('[data-k=strip-0-2]').focus()`);
  await key('ArrowDown');
  check('the keyboard moves it by 15 minutes', JSON.parse(await wins())[0].from === '08:15' && JSON.parse(await wins())[0].to === '12:15', await wins());
  await ev(`document.querySelector('[data-k=strip-0-2]').focus()`);
  await key('ArrowUp', 8);
  check('Shift and an arrow change the end', JSON.parse(await wins())[0].to === '12:00', await wins());

  // the form edits the same time, and the strip follows
  await ev(`(() => { const i = document.querySelector('[data-k=win-from-0]'); i.value = '10:00'; i.dispatchEvent(new Event('change', { bubbles: true })); })()`); await sleep(400);
  bl = await box(`[data-k=strip-0-2]`); const col = await ev(`(() => { const r = document.querySelector('[data-k=strip-day-2]').getBoundingClientRect(); return r.top + ',' + r.height; })()`);
  const [ct, ch] = col.split(',').map(Number);
  check('a change in the form moves the block', Math.abs((bl.top - ct) / ch * 1440 - 600) < 15 && /Changed when/.test(await st()), `${Math.round((bl.top - ct) / ch * 1440)} ${await st()}`);

  // the Week view shows the same time, and a change there shows in the strip
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'sb', sb: splitFlap.cur().id, view: 'week' })`); await sleep(500);
  check('the Week view has the strip\'s time', (await ev(`document.querySelectorAll('[data-k^="block-1-0-2"]').length`)) === 1);
  const wb = await box(`[data-k="block-1-0-2"]`);
  await mouse(wb.x, (wb.top + wb.bottom) / 2, (wb.top + wb.bottom) / 2 + 32);   // an hour later in the week grid
  check('a move in the Week view', JSON.parse(await wins())[0].from === '11:00', await wins());
  await board();
  bl = await box(`[data-k=strip-0-2]`); const col2 = (await ev(`(() => { const r = document.querySelector('[data-k=strip-day-2]').getBoundingClientRect(); return r.top + ',' + r.height; })()`)).split(',').map(Number);
  check('shows in the strip', Math.abs((bl.top - col2[0]) / col2[1] * 1440 - 660) < 15, `${Math.round((bl.top - col2[0]) / col2[1] * 1440)}`);

  // tap a block: a card to edit or remove it
  bl = await box(`[data-k=strip-0-2]`);
  await mouse(bl.x, (bl.top + bl.bottom) / 2, (bl.top + bl.bottom) / 2);
  check('a tap on a block opens its card, with focus on its heading, not the time', (await ev(`String(!!document.querySelector('[data-k=strip-card]'))`)) === 'true' && (await ev(`document.activeElement.dataset.k`)) === 'strip-card-title');
  await shot('d-strip-card');
  await ev(`(() => { const i = document.querySelector('[data-k=strip-card-to]'); i.value = '13:30'; i.dispatchEvent(new Event('change', { bubbles: true })); })()`); await sleep(400);
  check('the card changes the end', JSON.parse(await wins())[0].to === '13:30', await wins());
  await ev(`document.querySelector('[data-k=strip-card-rm]').click()`); await sleep(400);
  check('and Remove takes it off, said with Undo', (await wins()) === '[]' && /Took a time off/.test(await st()), await st());
  await ev(`(document.querySelector('[data-k=status-line] button') || document.querySelector('[data-k=status-action]')).click()`); await sleep(400);
  check('Undo puts it back', JSON.parse(await wins()).length === 1);
  await ev(`document.querySelector('[data-k=strip-0-2]').focus()`); await key('Delete');
  check('Delete on a focused block removes it', (await wins()) === '[]');
  // Done gives focus back to the block; Show alone says what it did, with Undo
  a = await at(2, 540); b = await at(2, 600); await mouse(a.x, a.y, b.y);
  bl = await box(`[data-k=strip-0-2]`); await mouse(bl.x, (bl.top + bl.bottom) / 2, (bl.top + bl.bottom) / 2);
  await ev(`document.querySelector('[data-k=strip-card-done]').click()`); await sleep(300);
  check('Done returns focus to the block', (await ev(`document.activeElement.dataset.k`)) === 'strip-0-2', await ev(`document.activeElement.dataset.k`));
  check('the faint boards are named under the strip', /^Faint: /.test(await ev(`(document.querySelector('[data-k=strip-others]') || {}).textContent || ''`)) && (await ev(`document.querySelector('[data-k=strip]').getAttribute('role')`)) === 'group');
  check('the block says 09:00 to 10:00, no dash', /09:00 to 10:00/.test(await ev(`document.querySelector('[data-k=strip-0-2]').textContent`)));
  await ev(`document.querySelector('[data-k=win-alone]').click()`); await sleep(400);
  check('Show alone answers in the status line, with Undo', /shows alone/.test(await st()) && (await ev('String(!!splitFlap.cur().pages[1].alone)')) === 'true', await st());
  await ev(`document.querySelector('[data-k=status-line] button').click()`); await sleep(400);
  check('and Undo turns it off again', (await ev('String(!!splitFlap.cur().pages[1].alone)')) === 'false');
  await ev(`document.querySelector('[data-k=strip-0-2]').focus()`); await key('Delete');
  // a week ahead: a drag there is every week, and says so
  await ev(`document.querySelector('[data-k=strip-next]').click()`); await sleep(300);
  a = await at(1, 540); b = await at(1, 600); await mouse(a.x, a.y, b.y);
  check('a drag in a week ahead says it is every week', /: Tuesdays 09:00 to 10:00/.test(await st()), await st());
  await ev(`document.querySelector('[data-k=status-line] button').click()`); await sleep(300);
  await ev(`document.querySelector('[data-k=strip-prev]').click()`); await sleep(300);
  await ev('splitFlap.toggleEdit()'); await sleep(300);

  // a phone: one day with arrows, a finger draws a time, and the page doesn't scroll
  await send('Emulation.setDeviceMetricsOverride', { width: 400, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await go(URL0); await board(); await sleep(400);
  check('a phone shows one day at a time', (await ev(`document.querySelectorAll('[data-k=strip] .sf-day-col').length`)) === 1);
  const k0 = await ev(`+document.querySelector('[data-k=strip] .sf-day-col').dataset.day`);
  await ev(`document.querySelector('[data-k=strip-next]').click()`); await sleep(300);
  check('the arrows go a day on', (await ev(`+document.querySelector('[data-k=strip] .sf-day-col').dataset.day`)) === (k0 + 1) % 7);
  await ev(`document.querySelector('[data-k=strip-prev]').click()`); await sleep(300);
  check('the phone hint says tap and hold', /Tap to add an hour, hold to draw/.test(await ev(`document.querySelector('[data-k=strip]').textContent`)));
  const scrollTop = () => ev(`(document.querySelector('[data-k=strip]').closest('.sf-panel-body') || document.scrollingElement).scrollTop`);
  // a swipe over the strip scrolls the page and saves nothing (the coordinator's decision)
  a = await at(k0, 900); b = await at(k0, 300);
  const sw0 = await scrollTop(); await finger(a.x, a.y, b.y); const sw1 = await scrollTop();
  check('a swipe over the strip scrolls and saves nothing', (await wins()) === '[]' && sw1 !== sw0, `${await wins()} ${sw0} ${sw1}`);
  // a tap adds an hour
  a = await at(k0, 300);
  await finger(a.x, a.y, a.y);
  const tapped = JSON.parse(await wins());
  check('a tap adds an hour', tapped.length === 1 && tapped[0].from === '05:00' && tapped[0].to === '06:00', await wins());
  check('a phone has no second row of days', (await ev(`String(!document.querySelector('[data-k=strip] .sf-strip-days'))`)) === 'true');
  // a finger on the middle of that hour moves it
  bl = await box(`[data-k=strip] .sf-block.mine`);
  await finger(bl.x, (bl.top + bl.bottom) / 2, (bl.top + bl.bottom) / 2 + 28);
  check('a finger on the middle of a one-hour block moves it', JSON.parse(await wins())[0].from === '07:00' && JSON.parse(await wins())[0].to === '08:00', await wins());
  await ev(`(document.querySelector('[data-k=status-line] button')).click()`); await sleep(400);
  await ev(`(document.querySelector('[data-k=status-line] button')).click()`); await sleep(400);
  // a hold and then a draw: the time, and the page holds still under it
  a = await at(k0, 600); b = await at(k0, 720);
  const scroll0 = await scrollTop();
  await finger(a.x, a.y, b.y, 450);
  const scroll1 = await scrollTop();
  check('a hold then a drag draws a time on a phone', JSON.parse(await wins()).length === 1 && JSON.parse(await wins())[0].from === '10:00' && JSON.parse(await wins())[0].to === '12:00', await wins());
  check('and the page holds still while it draws', scroll0 === scroll1, `${scroll0} ${scroll1}`);
  await shot('p-strip');
  bl = await box(`[data-k=strip] .sf-block.mine`);
  await finger(bl.x, bl.bottom - 3, bl.bottom - 3 + 14);
  check('a finger on the bottom edge changes the end', JSON.parse(await wins())[0].to === '13:00', await wins());
  bl = await box(`[data-k=strip] .sf-block.mine`);
  await finger(bl.x, (bl.top + bl.bottom) / 2, (bl.top + bl.bottom) / 2);
  check('a tap on a phone opens the card', (await ev(`String(!!document.querySelector('[data-k=strip-card]'))`)) === 'true');
  await shot('p-strip-card');
  // Swedish
  await ev(`(() => { const a = splitFlap; a.S.lang = 'sv'; a.render(); })()`); await sleep(300);
  check('in Swedish', /Dra för att lägga till en tid|Tavlan har redan|När den visas/.test(await ev(`document.querySelector('[data-k=when]').textContent`)));
} catch (e) { results.push('ERROR ' + e.message); }
console.log(results.join('\n'));
ws.close(); proc.kill(); process.exit(results.every(r => r.startsWith('PASS')) ? 0 : 1);
