// 0.7 navigation, in a real browser: every level has an address, Back and the browser's
// back go up one level, reload lands in the same place, and the week edits real times.
// Needs Chrome and `node _dev/serve.mjs` on 8801 (no Worker needed). npm run e2e:nav
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
  const sb = await ev('splitFlap.cur().id'), p0 = await ev('splitFlap.cur().pages[0].id');

  // an untouched demo keeps its ids, so a reload inside it stays put (0.7.0 review, 3)
  await ev('splitFlap.toggleEdit()'); await sleep(500);
  await ev(`document.querySelector('[data-k=edit-on-now]').click()`); await sleep(400);
  const demoAt = await at();
  await send('Page.reload'); await sleep(2500);
  check('a reload inside the untouched demo keeps the level', (await at()) === demoAt && (await lv()) === 'sb:board', `${demoAt} then ${await at()}`);
  await ev(`document.querySelector('[data-k=done]').click()`); await sleep(600);

  // 0.10: Edit opens Showing, this screen, at its address
  await ev('splitFlap.toggleEdit()'); await sleep(500);
  check('Edit opens Showing, with an address', (await at()) === '#/showing' && (await lv()) === 'sb:showing', await at());
  check('Showing is a section top, with no Back', (await ev(`String(!!document.querySelector('[data-k=back]'))`)) === 'false');
  await ev(`document.querySelector('[data-k=edit-on-now]').click()`); await sleep(400);
  const pOn = await ev('splitFlap.editor.page().id');
  check('Edit the board on now opens it', (await at()) === `#/storyboards/${sb}/boards/${pOn}`, await at());
  check('and says the playlist holds on it', /holding on/i.test(await ev(`(document.querySelector('[data-k=status-line]') || {}).textContent || ''`)));
  // down through the levels by clicking
  await ev(`document.querySelector('[data-k=back]').click()`); await sleep(400);
  check('Back from a board goes to its playlist', (await lv()) === 'sb:sb:boards', await lv());
  await ev(`document.querySelector('[data-k=view-week]').click()`); await sleep(400);
  check('the playlist has Week, Boards and Display', (await at()) === `#/storyboards/${sb}/week`, await at());
  await ev(`document.querySelector('[data-k=back]').click()`); await sleep(400);
  check('Back from the playlist on the screen goes to Showing', (await at()) === '#/showing', await at());
  await ev(`document.querySelector('[data-k=change-shown]').click()`); await sleep(400);
  check('Change opens Boards, with the playlists first (0.10.1)', (await at()) === '#/my-boards' && (await ev(`String(!!document.querySelector('[data-k=sb-0]'))`)) === 'true', await at());
  check('Boards is a tab top, with no Back', (await ev(`String(!!document.querySelector('[data-k=back]'))`)) === 'false');
  await go(URL0 + '#/storyboards'); 
  check('the old address of the list lands in Boards', (await lv()) === 'my:list', await lv());
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'list' })`); await sleep(300);
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

  // after a reload, the app's Back and the browser's back never repeat a level (review, 2)
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'sb', sb: '${sb}', view: 'boards' })`); await sleep(300);
  await ev(`document.querySelector('[data-k=page-1]').click()`); await sleep(400);
  await send('Page.reload'); await sleep(2500);
  await ev(`document.querySelector('[data-k=back]').click()`); await sleep(500);
  const afterBack = await at();
  await ev('history.back()'); await sleep(600);
  check("after a reload, the app's Back then the browser's back never repeats a level", afterBack === `#/storyboards/${sb}/boards` && (await at()) !== afterBack, `${afterBack} then ${await at()}`);

  // tabs remember where you were in each section
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'sb', sb: '${sb}', view: 'display' })`); await sleep(300);
  await ev(`document.querySelector('[data-k=tab-ex]').click()`); await sleep(300);
  check('a tab opens its section', (await lv()) === 'ex:list', await lv());
  await ev(`splitFlap.editor.go({ sec: 'ex', lv: 'section', section: 'travel' })`); await sleep(300);
  await ev(`document.querySelector('[data-k=tab-sb]').click()`); await sleep(300);
  check('Showing always opens on this screen', (await lv()) === 'sb:showing', await lv());
  await ev(`document.querySelector('[data-k=tab-ex]').click()`); await sleep(300);
  check('and a tab returns to where you last were in it', (await lv()) === 'ex:section', await lv());
  await ev(`document.querySelector('[data-k=tab-ex]').click()`); await sleep(300);
  check('the current tab goes to the top of its section', (await lv()) === 'ex:list', await lv());

  // Escape closes a menu first, then the editor
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'sb', sb: '${sb}', view: 'boards' })`); await sleep(300);
  await ev(`document.querySelector('[data-k=more-pg-0]').click()`); await sleep(300);
  check('the more menu opens with its verbs in order', (await ev(`[...document.querySelectorAll('.sf-more.open .sf-more-item')].map(b => b.textContent).join(',')`)) === 'Open,Rename,Duplicate,Add to a playlist,Share as image,Take out of this playlist', await ev(`[...document.querySelectorAll('.sf-more.open .sf-more-item')].map(b => b.textContent).join(',')`));
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

  // Done, then the browser's back, leaves the editor closed (review, 1). From a clean
  // start, so the entry behind the app is another page, as for someone arriving at it.
  await go('about:blank'); await go(URL0);
  await ev('splitFlap.toggleEdit()'); await sleep(400);
  await ev(`splitFlap.editor.go({ sec: 'sb', lv: 'list' })`); await sleep(300);
  await ev(`document.querySelector('[data-k=sb-0]').click()`); await sleep(300);
  await ev(`document.querySelector('[data-k=view-boards]').click()`); await sleep(300);
  await ev(`document.querySelector('[data-k=page-0]').click()`); await sleep(300);
  await ev(`document.querySelector('[data-k=done]').click()`); await sleep(800);
  check('Done clears the address', (await lv()) === 'closed' && (await at()) === '', await at());
  await ev('history.back()'); await sleep(2500);
  const nav = await send('Page.getNavigationHistory'), here = nav.entries[nav.currentIndex].url;
  check("and the browser's back after Done leaves the site, never reopening the editor", here === 'about:blank', here);

  // 0.9.4: every press answers while the editor is open, a bad address is corrected, the
  // share panel leads with the wall link and draws a QR code that scans, and a visit that
  // came by a board link is a screen
  await go(URL0); await ev('splitFlap.toggleEdit()'); await sleep(500);
  await ev(`(() => { const b = splitFlap.cur(); splitFlap.editor.saveToMy(b.pages[0], null, splitFlap.dims(), b.theme); })()`); await sleep(400);
  const line = await ev(`(document.querySelector('.sf-drawer [data-k=status-line]') || {}).textContent || ''`);
  check('the status line shows in the editor after Save to Boards', /in your Boards/i.test(line), line);
  check('and a screen reader hears it', /in your Boards/i.test(await ev(`document.querySelector('.sf > [role=status][aria-live=polite]').textContent`)));
  await go(URL0 + '#/my-boards/nope'); await sleep(300);
  check('a bad address is replaced by the level it landed on', (await at()) === '#/my-boards', await at());
  await ev(`document.querySelector('[data-k=done]').click()`); await sleep(600);
  await ev('splitFlap.openShare()'); await sleep(600);
  const qr = await ev(`(() => { const q = document.querySelector('.sf-share .sf-qr svg'), big = document.querySelector('[data-k=share-qr-big]'); if (!q) return big ? 'big' : 'none'; const n = +q.getAttribute('viewBox').split(' ')[2]; return (q.getBoundingClientRect().width * devicePixelRatio / n).toFixed(1); })()`);
  check('the QR code is 4 px a module or more, or offered full size', qr === 'big' || +qr >= 4, qr);
  check('the wall link is kiosk by default', /\?kiosk=1#b=/.test(await ev(`splitFlap.S.shareUrl`)));
  const link = (await ev(`splitFlap.S.shareUrl`)).replace('?kiosk=1', '');
  await go('about:blank'); await ev(`localStorage.clear()`).catch(() => {}); await go(link); await sleep(500);
  await ev(`localStorage.setItem('sf_edit_ms', '999999')`); await ev('splitFlap.renderOverlay()');
  check('a visit that came by a board link shows no sign-in prompt', (await ev(`String(!!document.querySelector('[data-k=signin-prompt]'))`)) === 'false' && (await ev('String(splitFlap.linkVisit === true && splitFlap.promptDue() === false)')) === 'true');

  // the phone: the same levels, one day of the week at a time
  await go(URL0);
  await send('Emulation.setDeviceMetricsOverride', { width: 400, height: 860, deviceScaleFactor: 1, mobile: true });
  await go(URL0 + `#/storyboards/${sb}/week`);
  check('on a phone the week shows one day, with day chips', (await ev(`document.querySelectorAll('.sf-day-col').length`)) === 1 && (await ev(`document.querySelectorAll('[data-k^=day-chip]').length`)) === 7);
  check("and Today's playlist sits above it", (await ev(`String(!!document.querySelector('.sf-week .sf-playlist'))`)) === 'true');
  check('the drawer is on screen below the board', (await ev(`Math.round(document.querySelector('.sf-drawer').getBoundingClientRect().top)`)) < 400, String(await ev(`Math.round(document.querySelector('.sf-drawer').getBoundingClientRect().top)`)));
} catch (e) { results.push('ERROR ' + e.message); }
console.log(results.join('\n'));
ws.close(); proc.kill(); process.exit(results.every(r => r.startsWith('PASS')) ? 0 : 1);
