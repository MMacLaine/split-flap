// Two signed-in browsers on one account, one taken offline: the check from the 0.5 plan
// and the build review. Needs Chrome, `node _dev/serve.mjs` on 8801 and
// `wrangler dev --env dev --port 8787 --var DEV_TEST:1` in worker/. npm run e2e
// Exits non-zero if any step fails.
import { spawn } from 'node:child_process';
import { launchChrome } from './chrome.mjs';
const { proc, PORT } = await launchChrome('two', []);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws; for (let i = 0; i < 50 && !ws; i++) { try { const v = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); ws = new WebSocket(v.webSocketDebuggerUrl); } catch { await sleep(200); } }
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pend = new Map();
ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } });
const send = (method, params = {}, sessionId) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });

async function browser(name, shareWith) {
  const browserContextId = shareWith ? shareWith.ctx : (await send('Target.createBrowserContext')).result.browserContextId;
  const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Runtime.enable', {}, sessionId); await send('Network.enable', {}, sessionId);
  const b = {
    name, ctx: browserContextId,
    ev: async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, sessionId); if (r.result.exceptionDetails) throw new Error(name + ': ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text)); return r.result.result.value; },
    go: async url => { await send('Page.navigate', { url }, sessionId); await sleep(2500); },
    offline: async off => send('Network.emulateNetworkConditions', { offline: off, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, sessionId),
    blockApi: async on => send('Network.setBlockedURLs', { urls: on ? ['*/split-flap/api/*'] : [] }, sessionId)
  };
  return b;
}
const names = b => b.ev(`JSON.stringify(splitFlap.boards.map(x => x.name).sort())`);
const serverMy = b => b.ev(`fetch('/split-flap/api/blueprints').then(r => r.json()).then(j => JSON.stringify(j.blueprints.filter(x => !x.deleted).map(x => x.board.name).sort()))`);
const server = b => b.ev(`fetch('/split-flap/api/playlists').then(r => r.json()).then(j => JSON.stringify(j.playlists.filter(x => !x.deleted).map(x => x.board.name).sort()))`);
const results = []; const check = (label, ok, detail) => { results.push(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`); };

try {
  const email = `two-${Date.now()}@example.com`, A = await browser('A'), B = await browser('B');
  for (const b of [A, B]) {
    await b.go('http://localhost:8787/');
    await b.ev(`localStorage.setItem('sf_started','1')`);
    await b.go('http://localhost:8787/');
    await b.ev(`fetch('/split-flap/api/dev/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: '${email}', name: 'Two Browsers' }) }).then(r => r.status)`);
  }
  // A keeps its demo board; B leaves its own demo board here and gets A's from the account
  await A.ev(`splitFlap.account.init().then(() => { splitFlap.account.answerOffer(true); })`); await sleep(3000);
  await B.ev(`splitFlap.account.init().then(() => { splitFlap.account.answerOffer(false); })`); await sleep(3000);
  const shared = await A.ev(`splitFlap.cur().id`);
  await B.ev(`splitFlap.account.sync()`); await sleep(1500);
  check('B has the account board', (await B.ev(`splitFlap.boards.some(b => b.id === '${shared}')`)) === true);

  // B goes offline and edits the shared board; A edits it online
  await B.offline(true);
  await B.ev(`(() => { const i = splitFlap.boards.findIndex(b => b.id === '${shared}'); splitFlap.active = i; splitFlap.upd(b => { b.name = 'B offline edit'; }); })()`); await sleep(2500);
  check('B knows it has unsynced work', (await B.ev(`splitFlap.account.unsyncedCount()`)) >= 1);
  await A.ev(`splitFlap.upd(b => { b.name = 'A online edit'; })`); await sleep(3000);
  check('server has A\'s edit', (await server(A)).includes('A online edit'), await server(A));

  // B comes back: both versions must survive, B's as a copy
  await B.offline(false); await B.ev(`splitFlap.account.sync()`); await sleep(3000); await B.ev(`splitFlap.account.sync()`); await sleep(2000);
  const bn = await names(B), sv = await server(B);
  check('B keeps both versions after reconnecting', bn.includes('A online edit') && bn.includes('B offline edit (copy)'), bn);
  check('the server has both', sv.includes('A online edit') && sv.includes('B offline edit (copy)'), sv);
  await A.ev(`splitFlap.account.sync()`); await sleep(2000);
  check('A gets B\'s copy', (await names(A)).includes('B offline edit (copy)'), await names(A));
  // My boards across two browsers, one offline (0.7.1): both edits survive
  await A.ev(`(() => { const p = JSON.parse(JSON.stringify(splitFlap.cur().pages[0])); p.name = 'Shared sign'; splitFlap.editor.saveToMy(p, null); })()`); await sleep(3000);
  await B.ev(`splitFlap.account.sync()`); await sleep(2000);
  check('a blueprint saved in one browser reaches the other', (await B.ev(`JSON.stringify(splitFlap.blueprints.map(x => x.name))`)).includes('Shared sign'));
  await B.offline(true);
  await B.ev(`(() => { const x = splitFlap.blueprints.find(b => b.name === 'Shared sign'); x.name = 'B offline sign'; x.page.name = x.name; splitFlap.saveMy(); })()`); await sleep(2500);
  await A.ev(`(() => { const x = splitFlap.blueprints.find(b => b.name === 'Shared sign'); x.name = 'A online sign'; x.page.name = x.name; splitFlap.saveMy(); })()`); await sleep(3000);
  await B.offline(false); await B.ev(`splitFlap.account.sync()`); await sleep(3000); await B.ev(`splitFlap.account.sync()`); await sleep(2000);
  const my = await serverMy(B);
  check('back online, both versions of the blueprint are kept', my.includes('A online sign') && my.includes('B offline sign (copy)'), my);
  const menu = await B.ev(`(() => { splitFlap.set({ switcher: true }); const rows = [...document.querySelectorAll('.sf-menu-item')].map(x => x.textContent); splitFlap.set({ switcher: false }); return JSON.stringify(rows); })()`);
  check('the board menu shows when each account board changed', JSON.parse(menu).filter(r => /Changed \d\d:\d\d/.test(r)).length >= 2, menu);

  // The API does not answer when the page loads (the Worker mid-deploy): a board made then
  // must still reach the account once the API is back
  await A.blockApi(true); await A.go('http://localhost:8787/');
  check('with no API, no account controls', (await A.ev(`String(splitFlap.account.available)`)) === 'false');
  await A.ev(`splitFlap.duplicateBoard(0); splitFlap.upd(b => { b.name = 'Made while the API was down'; })`); await sleep(1000);
  await A.blockApi(false); await A.ev(`dispatchEvent(new Event('online'))`); await sleep(4000);
  check('once the API is back, that board reaches the account', (await server(A)).includes('Made while the API was down'), await server(A));

  // The 28 September incident: a short board list here (another tab wrote an older one),
  // the API down at load, one edit. That must never read as deleting the missing boards.
  const liveBefore = JSON.parse(await server(A)).length;
  await A.blockApi(true);
  await A.ev(`(() => { const all = JSON.parse(localStorage.getItem('sf_playlists')); localStorage.setItem('sf_playlists', JSON.stringify(all.slice(0, 1))); })()`);
  await A.go('http://localhost:8787/');
  await A.ev(`splitFlap.upd(b => { b.name = 'Edited with a short list'; })`); await sleep(1000);
  await A.blockApi(false); await A.ev(`dispatchEvent(new Event('online'))`); await sleep(5000);
  const liveAfter = JSON.parse(await server(A));
  check('a short list and an edit delete nothing on the server', liveAfter.length === liveBefore, `${liveBefore} before, ${liveAfter.length} after`);
  check('and the missing boards come back here', (await A.ev(`splitFlap.boards.length`)) >= liveBefore, String(await A.ev(`splitFlap.boards.length`)));
  // a real delete still reaches the account
  await A.ev(`splitFlap.deleteBoard(splitFlap.boards.findIndex(b => b.name === 'Made while the API was down'))`); await sleep(3500);
  check('a board deleted by a person is deleted on the server', !(await server(A)).includes('Made while the API was down'), await server(A));

  // 0.6.3, guest to account: a guest with three boards signs in for the first time
  const C = await browser('C'), emailC = `guest-${Date.now()}@example.com`;
  await C.go('http://localhost:8787/'); await C.ev(`localStorage.setItem('sf_started','1')`); await C.go('http://localhost:8787/');
  await C.ev(`(() => { splitFlap.duplicateBoard(0); splitFlap.upd(b => { b.name = 'Guest keep'; }); splitFlap.duplicateBoard(0); splitFlap.upd(b => { b.name = 'Guest leave'; }); })()`); await sleep(500);
  await C.ev(`(() => { const p = JSON.parse(JSON.stringify(splitFlap.cur().pages[0])); p.name = 'Guest blueprint'; splitFlap.editor.saveToMy(p, null); })()`); await sleep(300);
  const prompt = await C.ev(`(() => { splitFlap.dismissCue(); splitFlap.renderOverlay(); const p = document.querySelector('[data-k=signin-prompt]'); return p ? p.textContent : ''; })()`);
  check('a guest with a second board sees the one sign-in prompt', /only in this browser/.test(prompt), prompt.slice(0, 60));
  // Chrome grants persistence by how much a site is used, so a fresh headless profile says
  // no. The check is that the app asked; persisted() is reported for the handover.
  check('the browser was asked to keep guest storage', (await C.ev(`String(!!splitFlap.askedPersist)`)) === 'true', 'persisted() says ' + await C.ev(`navigator.storage.persisted().then(String)`));
  await C.ev(`fetch('/split-flap/api/dev/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: '${emailC}', name: 'Guest Person' }) }).then(r => r.status)`);
  await C.go('http://localhost:8787/'); await sleep(2500);
  check('the offer shows on the first sign-in', (await C.ev(`splitFlap.account.offer.length`)) === 3);
  check('and covers its boards as its second group: the demo\'s six and the one saved', (await C.ev(`splitFlap.account.offerMy().length`)) === 7, String(await C.ev(`splitFlap.account.offerMy().length`)));
  check('a safety copy of the guest boards is kept', (await C.ev(`JSON.parse(localStorage.getItem('sf_guest_backup') || '{"playlists":[]}').playlists.length`)) === 3);
  await C.go('http://localhost:8787/'); await sleep(2500);   // the tab closed with the question showing
  check('closed during the offer and reopened, the offer is back', (await C.ev(`splitFlap.account.offer.length`)) === 3);
  check('and nothing was taken into the account unasked', JSON.parse(await server(C)).length === 0, await server(C));
  await C.ev(`(() => { const app = splitFlap, f = app.flash.bind(app); app.flashes = []; app.flash = m => { app.flashes.push(m); f(m); };
    const a = app.account, id = app.boards.find(b => b.name === 'Guest leave').id; a.toggleOffer(id); a.answerOffer(true); })()`); await sleep(4000);
  const cServer = JSON.parse(await server(C));
  check('only the ticked boards reach the account', cServer.length === 2 && cServer.includes('Guest keep') && !cServer.includes('Guest leave'), JSON.stringify(cServer));
  check('the unticked board stays here', (await names(C)).includes('Guest leave'));
  check('the safety copy is gone once the server has them', (await C.ev(`String(localStorage.getItem('sf_guest_backup'))`)) === 'null');
  const said = await C.ev(`splitFlap.flashes.join(' / ')`);
  check('the count shown matches the server', said === `${cServer.length} playlists and 7 boards are now in your account.`, said);
  check('the guest\'s boards reached the account', JSON.parse(await serverMy(C)).includes('Guest blueprint') && JSON.parse(await serverMy(C)).length === 7, await serverMy(C));

  // 0.6.4: two tabs of one guest browser. A board made in one tab must survive an edit in
  // an older tab that was left open.
  const T1 = await browser('T1'); await T1.go('http://localhost:8787/'); await T1.ev(`localStorage.setItem('sf_started','1')`); await T1.go('http://localhost:8787/');
  const T2 = await browser('T2', T1); await T2.go('http://localhost:8787/');
  await T1.ev(`(() => { splitFlap.duplicateBoard(0); splitFlap.upd(b => { b.name = 'Made in tab one'; }); })()`); await sleep(800);
  await T2.ev(`splitFlap.upd(b => { b.name = 'Edited in tab two'; })`); await sleep(800);
  const stored = await T2.ev(`JSON.stringify(JSON.parse(localStorage.getItem('sf_playlists')).map(b => b.name))`);
  check('a board made in one tab survives an edit in another', stored.includes('Made in tab one') && stored.includes('Edited in tab two'), stored);
  check('and the other tab shows it', (await names(T2)).includes('Made in tab one'), await names(T2));

  // A first visit on another device (only the untouched demo), signing in to an account that
  // already has storyboards: the demo is not offered, and does not linger on that device
  const D = await browser('D'); await D.go('http://localhost:8787/');
  await D.ev(`fetch('/split-flap/api/dev/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: '${email}', name: 'Two Browsers' }) }).then(r => r.status)`);
  await D.go('http://localhost:8787/'); await sleep(4000);
  check('a new device with only the untouched demo gets no sign-in question', (await D.ev('splitFlap.account.offerCount()')) === 0);
  check('and shows only the account\'s storyboards', !(await names(D)).includes('Demo') && JSON.parse(await names(D)).length === JSON.parse(await server(D)).length, `${await names(D)} vs ${await server(D)}`);

  // 0.10.1: each screen keeps its own Showing, and a new device is offered what was shown last
  await A.ev(`splitFlap.account.sync()`); await B.ev(`splitFlap.account.sync()`); await sleep(2500);
  const accIds = JSON.parse(await A.ev(`JSON.stringify(splitFlap.boards.filter(b => b.name !== 'Demo').map(b => b.id))`));
  const [X, Y] = [accIds[0], accIds[accIds.length - 1]];
  await A.ev(`splitFlap.pickBoard(splitFlap.boards.findIndex(b => b.id === '${X}'))`); await sleep(2500);
  await B.ev(`splitFlap.account.sync()`); await sleep(2000);
  await B.ev(`splitFlap.pickBoard(splitFlap.boards.findIndex(b => b.id === '${Y}'))`); await sleep(2500);
  await A.ev(`splitFlap.account.sync()`); await sleep(2500);
  check('two screens on one account each keep what they show', (await A.ev('splitFlap.shown().id')) === X && (await B.ev('splitFlap.shown().id')) === Y && X !== Y, `${await A.ev('splitFlap.shown().id')} ${await B.ev('splitFlap.shown().id')}`);
  check('the account remembers what was shown last', (await A.ev(`JSON.stringify(splitFlap.setting('last') && splitFlap.setting('last').pl)`)) === JSON.stringify(Y));
  await D.ev(`splitFlap.account.sync()`); await sleep(2500);
  await D.ev(`(async () => { if (splitFlap.shown().id === '${Y}') splitFlap.active = splitFlap.boards.findIndex(b => b.id === '${X}'); splitFlap.toggleEdit(); })()`); await sleep(800);
  const sug = await D.ev(`(document.querySelector('[data-k=last-shown]') || {}).textContent || ''`);
  check('a device that has chosen nothing is offered it', sug.includes(await B.ev('splitFlap.shown().name')), sug.slice(0, 80));
  await D.ev(`document.querySelector('[data-k=last-show]').click()`); await sleep(800);
  check('and one press shows it there', (await D.ev('splitFlap.shown().id')) === Y);

  // 0.10.3: an account migrated from 0.10.0, on screen, signed out and in again: no playlist
  // appears that nobody made, the order stays, and no board goes to the account by itself
  const E = await browser('E'), emailE = `resign-${Date.now()}@example.com`;
  await E.go('http://localhost:8787/'); await E.ev(`localStorage.setItem('sf_cue_seen','1')`);
  await E.ev(`fetch('/split-flap/api/dev/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: '${emailE}', name: 'Re Sign' }) }).then(r => r.status)`);
  await E.ev(`fetch('/split-flap/api/boards/bm_old', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ baseRev: 0, board: { id: 'bm_old', name: 'New board', size: '12x40', rows: 6, cols: 22, theme: 'solari', pages: [{ id: 'pd1', name: 'Departures', layout: 'full', dur: 10, wins: [], zones: [{ ch: 'clock', o: {} }] }] } }) }).then(r => r.status)`);
  await E.go('http://localhost:8787/'); await sleep(4000);
  await E.ev(`splitFlap.account.answerOffer(false)`); await sleep(2500);
  check('the migrated playlist is on the screen', (await E.ev('splitFlap.shown().id')) === 'bm_old', await names(E));
  const libBefore = await serverMy(E);
  await E.ev(`splitFlap.account.signOut()`); await sleep(3000);
  await E.ev(`fetch('/split-flap/api/dev/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: '${emailE}', name: 'Re Sign' }) }).then(r => r.status)`);
  await E.go('http://localhost:8787/'); await sleep(4500);
  check('signed in again, no playlist appears that nobody made', (await names(E)) === JSON.stringify(['New board']), await names(E));
  check('and nothing is offered', (await E.ev('splitFlap.account.offerCount()')) === 0, String(await E.ev('splitFlap.account.offerCount()')));
  check('and no board went to the account on its own', (await serverMy(E)) === libBefore, `${libBefore} then ${await serverMy(E)}`);
  check('and the migrated playlist is what the screen shows', (await E.ev('splitFlap.shown().id')) === 'bm_old');

  // 0.10.3 review, 1: the sign-out blank edited through Boards is the person's, and is offered
  await E.ev(`splitFlap.account.signOut()`); await sleep(3000);
  const blankBoard = await E.ev(`splitFlap.shown().pages[0].id`);
  await E.ev(`(() => { const app = splitFlap; app.S.editing = true; app.editor.go({ sec: 'my', lv: 'bp', bp: '${blankBoard}' }); app.updPage(p => { p.zones = [{ ch: 'message', o: { text: 'MY OWN WORDS' } }]; }); })()`); await sleep(500);
  check('an edit through Boards makes the blank the person\'s', (await E.ev(`String(splitFlap.freshId)`)) === 'null' && (await E.ev(`localStorage.getItem('sf_filler')`)) === '');
  await E.ev(`fetch('/split-flap/api/dev/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: '${emailE}', name: 'Re Sign' }) }).then(r => r.status)`);
  await E.go('http://localhost:8787/'); await sleep(4500);
  check('and at the next sign-in it is offered, never dropped', (await E.ev('splitFlap.account.offerCount()')) > 0 && (await E.ev(`String(splitFlap.blueprints.some(b => JSON.stringify(b.page).includes('MY OWN WORDS')))`)) === 'true');
  await E.ev(`splitFlap.account.answerOffer(false)`); await sleep(2000);

  // 0.10.3 review, 2: two tabs. One signs out; the other edits the blank; it is kept and offered
  const F = await browser('F'), emailF = `twotab-${Date.now()}@example.com`;
  await F.go('http://localhost:8787/'); await F.ev(`localStorage.setItem('sf_cue_seen','1')`);
  await F.ev(`fetch('/split-flap/api/dev/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: '${emailF}', name: 'Two Tabs' }) }).then(r => r.status)`);
  await F.ev(`fetch('/split-flap/api/boards/mine_1', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ baseRev: 0, board: { id: 'mine_1', name: 'Mine', size: '6x22', pages: [{ id: 'mp1', name: 'Mine', layout: 'full', dur: 10, wins: [], zones: [{ ch: 'clock', o: {} }] }] } }) }).then(r => r.status)`);
  await F.go('http://localhost:8787/'); await sleep(4500);
  const F2 = await browser('F2', F); await F2.go('http://localhost:8787/'); await sleep(4000);
  check('two tabs on one account', (await names(F)) === JSON.stringify(['Mine']) && (await names(F2)) === JSON.stringify(['Mine']), `${await names(F)} ${await names(F2)}`);
  await F.ev(`splitFlap.account.signOut()`); await sleep(3500);
  check('the other tab sees the blank and knows it is filler', (await F2.ev(`String(!!splitFlap.freshId && splitFlap.freshId === localStorage.getItem('sf_filler'))`)) === 'true', await F2.ev(`JSON.stringify([splitFlap.freshId, localStorage.getItem('sf_filler'), splitFlap.shown().name])`));
  await F2.ev(`splitFlap.upd(b => { b.name = 'T2 words'; })`); await sleep(500);
  check('an edit there makes it the person\'s', (await F2.ev(`localStorage.getItem('sf_filler')`)) === '' && (await F2.ev(`String(splitFlap.freshId)`)) === 'null');
  await F2.ev(`fetch('/split-flap/api/dev/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: '${emailF}', name: 'Two Tabs' }) }).then(r => r.status)`);
  await F2.go('http://localhost:8787/'); await sleep(4500);
  check('and it is still there after signing in again', (await names(F2)).includes('T2 words'), await names(F2));

  // Sign out while offline with an unsynced edit: nothing may be lost
  await B.offline(true);
  await B.ev(`splitFlap.upd(b => { b.name = 'B unsynced at sign out'; })`); await sleep(2500);
  const warned = await B.ev(`(() => { splitFlap.S.editing = true; splitFlap.editor.go('account'); splitFlap.refresh(); document.querySelector('[data-k=acc-signout]').click(); return document.querySelector('[data-k=acc-signout]').textContent + ' / ' + document.querySelector('[data-k=acc-signout-why]').textContent; })()`);
  check('sign out warns about unsynced boards', /not reached your account/.test(warned), warned.slice(0, 120));
  await B.ev(`document.querySelector('[data-k=acc-signout]').click()`); await sleep(4000);
  const after = await names(B);
  check('signed out offline, the unsynced board is kept here', after.includes('B unsynced at sign out'), after);
  check('with the boards it shows, none of them blank', (await B.ev(`String(splitFlap.boards.find(b => b.name === 'B unsynced at sign out').pages.every(p => !p.missing))`)) === 'true');
  check('and the account boards that were safe are gone from B', !after.includes('A online edit'), after);
  check('B is signed out', (await B.ev(`String(splitFlap.account.signedIn())`)) === 'false');
} catch (e) { results.push('ERROR ' + e.message); }
console.log(results.join('\n'));
ws.close(); proc.kill(); process.exit(results.every(r => r.startsWith('PASS')) ? 0 : 1);
