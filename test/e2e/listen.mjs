// 0.11.2 Listen and the Music meter, in a real browser: Chrome's fake microphone (a tone with
// beeps) through the fake permission UI, then a second Chrome that refuses the prompt. Needs
// Chrome and `node _dev/serve.mjs` on 8801. npm run e2e:listen
import { launchChrome } from './chrome.mjs';
const URL0 = process.env.APP || 'http://localhost:8801/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; const check = (label, ok, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail !== undefined ? '  ' + detail : ''}`);

async function browser(name, flags) {
  const { proc, PORT } = await launchChrome(name, flags);
  let tabs; for (let i = 0; i < 50 && !tabs; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); } catch { await sleep(200); } }
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {}; ws.onmessage = e => { const m = JSON.parse(e.data); if (pend[m.id]) { pend[m.id](m.result); delete pend[m.id]; } };
  const send = (method, params = {}) => new Promise(r => { pend[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true }); if (!r) return undefined; if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  const go = async url => { await send('Page.navigate', { url }); await sleep(2500); };
  const key = async k => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: 'Key' + k.toUpperCase(), text: k }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: 'Key' + k.toUpperCase() }); await sleep(300); };
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  return { proc, ws, send, ev, go, key, close: () => { ws.close(); proc.kill(); } };
}
const st = b => b.ev(`(document.querySelector('[data-k=status-line]') || {}).textContent || ''`);
// the board on the screen becomes a Music meter
const meterBoard = b => b.ev(`(() => { const a = splitFlap; a.upd(x => { x.pages[0].layout = 'full'; x.pages[0].zones = [{ ch: 'meter', o: {} }]; }); a.S.pageIdx = 0; a.S.pageStart = Date.now(); a.refresh(); })()`);
const text = b => b.ev(`splitFlap.board.snapshot().map(r => r.join('')).join('|')`);
const lit = b => b.ev(`splitFlap.board.snapshot().flat().filter(c => /^[gyrf]$/.test(c)).length`);

const A = await browser('listen', ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required']);
try {
  await A.go(URL0); await A.ev(`localStorage.setItem('sf_started','1'); localStorage.setItem('sf_cue_seen','1')`); await A.go(URL0);
  check('no Listen on a board that is not a meter', (await A.ev(`String(!!document.querySelector('[data-k=bar-listen]'))`)) === 'false');
  await meterBoard(A); await sleep(1200);
  check('the meter at rest: unlit, with its words', /MUSIC METER/.test(await text(A)) && /PRESS LISTEN/.test(await text(A)) && (await A.ev(`splitFlap.board.snapshot().flat().filter(c => /^~[gyr]$/.test(c)).length`)) > 50);
  check('the control bar has Listen', (await A.ev(`(document.querySelector('[data-k=bar-listen]') || {}).textContent || ''`)) === 'Listen');
  check('the meter turns on its own fold, with no stagger', (await A.ev('splitFlap.board.o.speed')) === 'meter' && (await A.ev('splitFlap.board.o.transition')) === 'none');
  await A.ev(`document.querySelector('[data-k=bar-listen]').click()`);
  for (let i = 0; i < 20 && (await A.ev('splitFlap.listen.state')) !== 'listening'; i++) await sleep(500);
  check('Listen with the fake microphone: listening, and said', (await A.ev('splitFlap.listen.state')) === 'listening' && /Listening to the room/.test(await st(A)), `${await A.ev('splitFlap.listen.state')} ${await st(A)}`);
  check('Listen\'s own context is running (sound.js keeps its own; this one is made on the press)', (await A.ev('window.__sfListen.ac.state')) === 'running');
  await A.ev('window.__ac1 = window.__sfListen.ac');
  const l1 = await lit(A); await sleep(400); const l2 = await lit(A);
  check('the meter moves to the sound', l1 > 0 || l2 > 0, `${l1} ${l2}`);
  check('the meter is marked running, which is what keeps onFlip from playing the clack', (await A.ev('String(splitFlap.meterRunning())')) === 'true');
  check('the button reads Listening · Stop with a red dot', (await A.ev(`document.querySelector('[data-k=bar-listen]').textContent`)) === 'Listening · Stop' && (await A.ev(`String(!!document.querySelector('[data-k=bar-listen] .sf-rec'))`)) === 'true');
  // a slow screen: the meter's ticks keep coming under a Pi-like throttle
  await A.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await A.ev(`(() => { window.__ticks = 0; const f = splitFlap.meterFrame.bind(splitFlap); splitFlap.meterFrame = () => { window.__ticks++; f(); }; })()`);
  await sleep(2000); const ticks = await A.ev('window.__ticks');
  await A.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  check('under a 4x throttle the meter still ticks, at most about 110 ms apart', ticks >= 18, `${ticks} in 2 s`);
  // Quiet: the room goes silent for four seconds, then sound brings it back
  await A.ev(`(() => { const L = window.__sfListen; L.__real = L.an.getByteFrequencyData.bind(L.an); L.an.getByteFrequencyData = b => b.fill(0); })()`);
  for (let i = 0; i < 14 && (await A.ev('splitFlap.listen.state')) !== 'quiet'; i++) await sleep(500);
  check('four seconds of silence is Quiet, said, with LISTENING on the board', (await A.ev('splitFlap.listen.state')) === 'quiet' && /quiet in here/.test(await st(A)) && /LISTENING/.test(await text(A)), await st(A));
  await A.ev(`(() => { const L = window.__sfListen; L.an.getByteFrequencyData = L.__real; })()`); await sleep(600);
  check('and sound brings it straight back', (await A.ev('splitFlap.listen.state')) === 'listening');
  await A.ev('window.__t1 = window.__sfListen.stream.getAudioTracks()[0]');
  await A.ev(`document.querySelector('[data-k=bar-listen]').click()`); await sleep(500);
  check('Stop ends the track', (await A.ev('window.__t1.readyState')) === 'ended');
  check('Stop ends the track and closes the context', (await A.ev(`window.__sfListen.ac.state`)) === 'closed' && (await A.ev('splitFlap.listen.state')) === 'stopped' && /microphone is off/.test(await st(A)), await st(A));
  check('the board says STOPPED for a moment', /STOPPED/.test(await text(A)));
  await sleep(3000); await A.ev(`(() => { const a = splitFlap; a.S.pageIdx = 0; a.S.pageStart = Date.now(); a.tick(true); })()`); await sleep(800);   // the demo playlist turns on its own
  check('then the unlit meter again, and the meter no longer marked running', (await A.ev('splitFlap.listen.state')) === 'idle' && /PRESS LISTEN/.test(await text(A)) && (await A.ev('String(splitFlap.meterRunning())')) === 'false');
  // a track that ends on its own (the microphone taken away) is Stopped, never Quiet
  await A.ev(`document.querySelector('[data-k=bar-listen]').click()`); await sleep(2000);
  check('each press makes a new context', (await A.ev('String(window.__sfListen.ac !== window.__ac1)')) === 'true');
  const track = await A.ev(`(() => { const t = window.__sfListen.stream.getAudioTracks()[0]; window.__track = t; t.onended(); return t.readyState; })()`);
  check('a track that ends goes to Stopped', (await A.ev('splitFlap.listen.state')) === 'stopped' && (await A.ev('window.__track.readyState')) === 'ended', `${track} ${await A.ev('splitFlap.listen.state')}`);
  await sleep(3000);
  // a playlist that turns past its Meter keeps listening, with Stop in the bar (0.11.2 review M1)
  await A.ev(`document.querySelector('[data-k=bar-listen]').click()`); await sleep(2000);
  await A.ev(`(() => { const a = splitFlap; a.S.pageIdx = 1; a.S.pageStart = Date.now(); a.tick(true); a.renderOverlay(); })()`); await sleep(800);
  check('the playlist turns to a board that is not a meter: still listening, Listening · Stop in the bar', (await A.ev('splitFlap.listen.state')) === 'listening' && !(await A.ev('String(splitFlap.isMeter())')).includes('true') && (await A.ev(`(document.querySelector('[data-k=bar-listen]') || {}).textContent || ''`)) === 'Listening · Stop');
  check('Display on a non-meter board shows no UNDEFINED on the preview label', !/UNDEFINED/.test(await A.ev(`(() => { const a = splitFlap; a.S.pageIdx = 0; a.S.pageStart = Date.now(); a.tick(true); const t = a.t; return (t.transitionAll[a.transitionNow()] || a.transitionNow()) + ' ' + t.speeds[a.speedNow()]; })()`)));
  // leaving the page ends it, and the bar says so (iOS restores pages from the cache)
  await A.ev(`window.dispatchEvent(new Event('pagehide'))`); await sleep(400);
  check('pagehide ends Listen and the bar reads Listen again', (await A.ev('splitFlap.listen.state')) === 'idle' && (await A.ev(`(document.querySelector('[data-k=bar-listen]') || {}).textContent || ''`)) === 'Listen');
  // Bars and Mirror on an 11 x 15 board, odd rows (0.11.2 review H1)
  await A.ev(`splitFlap.upd(x => { Object.assign(x.pages[0], { size: 'custom', rows: 11, cols: 15 }); x.pages[0].zones = [{ ch: 'meter', o: { style: 'mirror' } }]; })`); await sleep(300);
  await A.ev(`(() => { window.__errs = 0; addEventListener('error', () => window.__errs++); const a = splitFlap; a.S.pageIdx = 0; a.S.pageStart = Date.now(); a.refresh(); })()`); await sleep(1200);
  await A.ev(`document.querySelector('[data-k=bar-listen]').click()`); await sleep(2500);
  check('Mirror on an 11 x 15 board: no errors, and the middle row moves', (await A.ev('window.__errs')) === 0 && (await A.ev('splitFlap.board.o.rows')) === 11 && (await A.ev(`splitFlap.board.snapshot()[5].filter(c => c === 'f').length`)) > 0, `${await A.ev('window.__errs')} ${await A.ev('splitFlap.board.o.rows')}`);
  await A.ev(`splitFlap.upd(x => { x.pages[0].zones = [{ ch: 'meter', o: { style: 'bars' } }]; })`); await sleep(1500);
  check('Bars: one colour, filled flaps only', (await A.ev('window.__errs')) === 0 && (await A.ev(`splitFlap.board.snapshot().flat().filter(c => /^[gyr]$/.test(c)).length`)) === 0 && (await A.ev(`splitFlap.board.snapshot().flat().filter(c => c === 'f').length`)) > 0);
  // the Showing row's button
  await A.ev('splitFlap.toggleEdit()'); await A.ev(`splitFlap.editor.go({ sec: 'sb', lv: 'showing' })`); await sleep(500);
  check('Showing has Listen, reading Listening · Stop while it runs', /Listening · Stop|Stop/.test(await A.ev(`(document.querySelector('[data-k=listen]') || {}).textContent || ''`)));
  await A.ev(`document.querySelector('[data-k=listen]').click()`); await sleep(500);
  check('and its Stop stops it', (await A.ev('splitFlap.listen.state')) === 'stopped');
  await A.ev('splitFlap.toggleEdit()'); await sleep(3000);
  await A.ev(`splitFlap.upd(x => { Object.assign(x.pages[0], { size: '6x22', rows: 6, cols: 22 }); })`); await sleep(300);
  // Party: the Music light rests as a slow breathe, and follows the beat with Listen on
  await A.ev(`splitFlap.upd(x => { x.pages[0].zones = [{ ch: 'clock', o: {} }]; })`); await sleep(300);
  await A.ev(`(() => { const a = splitFlap, p = a.shown().pages[0]; a.setBoardLook(p.id, { id: 'party' }); a.saveMy(); a.S.pageIdx = 0; a.S.pageStart = Date.now(); a.refresh(); })()`); await sleep(1200);
  check('Party: the light is on Music and the bar offers Listen', (await A.ev('splitFlap.ambient.rg.fx')) === 'music' && (await A.ev(`String(!!document.querySelector('[data-k=bar-listen]'))`)) === 'true' && (await A.ev('String(!!splitFlap.ambient.anim)')) === 'true');
  await A.ev(`document.querySelector('[data-k=bar-listen]').click()`); await sleep(1500);
  const ops = []; for (let i = 0; i < 12; i++) { ops.push(await A.ev('splitFlap.ambient.ring.style.opacity')); await sleep(120); }
  check('with Listen on, the Music light moves', new Set(ops).size > 1 && (await A.ev('String(splitFlap.ambient.hears)')) === 'true', ops.join(' '));
  await A.ev(`(() => { const a = splitFlap, p = a.shown().pages[0]; a.setBoardLook(p.id, { id: 'classic' }); a.saveMy(); a.S.pageIdx = 0; a.S.pageStart = Date.now(); a.refresh(); })()`); await sleep(800);
  check('a look without Music stops Listen', (await A.ev('splitFlap.listen.state')) === 'stopped' && (await A.ev('window.__sfListen.ac.state')) === 'closed');
  await sleep(3000);
  // a kiosk: no bar, and the L key starts and stops it
  await meterBoard(A); await sleep(500);
  await A.go(URL0 + '?kiosk=1'); await sleep(500);
  check('a kiosk has no Listen button', (await A.ev(`String(!!document.querySelector('[data-k=bar-listen]'))`)) === 'false');
  await A.key('l'); await sleep(2000);
  check('in a kiosk the L key starts Listen', (await A.ev('splitFlap.listen.state')) === 'listening');
  await A.key('l'); await sleep(400);
  check('and stops it', (await A.ev('splitFlap.listen.state')) === 'stopped');
  // Listen is never kept through a reload
  await A.key('l'); await sleep(1500);
  await A.go(URL0 + '?kiosk=1');
  check('a reload never brings Listen back', (await A.ev('splitFlap.listen.state')) === 'idle' && (await A.ev(`Object.keys(localStorage).filter(k => /listen/i.test(k)).length`)) === 0);
} catch (e) { results.push('ERROR ' + e.message); }
A.close();

const B = await browser('listen-no', ['--use-fake-device-for-media-stream', '--deny-permission-prompts']);
try {
  await B.go(URL0); await B.ev(`localStorage.setItem('sf_started','1'); localStorage.setItem('sf_cue_seen','1')`); await B.go(URL0);
  await meterBoard(B); await sleep(800);
  await B.ev(`document.querySelector('[data-k=bar-listen]').click()`); await sleep(1500);
  check('a refused microphone: said, and on the board', (await B.ev('splitFlap.listen.state')) === 'refused' && /wasn’t allowed/.test(await st(B)) && /NO MICROPHONE/.test(await text(B)), `${await B.ev('splitFlap.listen.state')} ${await st(B)}`);
  check('refused leaves nothing open', (await B.ev('String(!window.__sfListen.stream)')) === 'true');
  // no microphone, and one in use elsewhere, each said as it is (0.11.2 review M4)
  const fail = async name => { await B.ev(`navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error('x'), { name: '${name}' }))`); await B.ev(`document.querySelector('[data-k=bar-listen]').click()`); await sleep(800); return [await B.ev('splitFlap.listen.state'), await st(B), await text(B)]; };
  let r = await fail('NotFoundError');
  check('no microphone: said, and on the board', r[0] === 'nomic' && /no microphone/.test(r[1]) && /NO MICROPHONE/.test(r[2]), r.slice(0, 2).join(' '));
  r = await fail('NotReadableError');
  check('a microphone in use: said as in use, not as refused', r[0] === 'busy' && /in use or not working/.test(r[1]) && /MICROPHONE IN USE/.test(r[2]), r.slice(0, 2).join(' '));
  check('no timer left running after a failure', (await B.ev('String(window.__sfListen.timer)')) === '0');
} catch (e) { results.push('ERROR ' + e.message); }
B.close();
console.log(results.join('\n'));
process.exit(results.every(r => r.startsWith('PASS')) ? 0 : 1);
