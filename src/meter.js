// The Meter board and Listen (0.11.2). The engine is the design handover's
// (board-content-11.js): 13 bands of two columns across 40, each column's top moving at most
// one cell a tick, like a real meter's needle, so about 40 flaps change an update instead of
// 500. At rest every cell is a faint flap of its zone's colour, an unlit LED meter, so lighting
// a cell is a quick fade and never a turn of the drum.
//
// Listen owns its own AudioContext, made in the press handler (iOS needs the gesture) and
// closed on Stop, so the system's microphone light goes off. sound.js's context, the clack's,
// is never touched (0.11.1 plan review 5.1). Nothing is stored and nothing survives a reload.
import { METER, RING } from './looks.js';
import { HALF } from './charset.js';

const blank = (R, C) => Array.from({ length: R }, () => Array(C).fill(' '));
const centreRow = (g, r, s) => { if (!g[r]) return; const C = g[r].length, c0 = Math.max(0, Math.floor((C - s.length) / 2)); [...s].forEach((ch, i) => { if (c0 + i < C) g[r][c0 + i] = ch; }); };
export const STYLES = ['mixer', 'bars', 'mirror'];

export class Meter {
  constructor(R, C, M = METER) {
    this.R = R; this.C = C; this.M = M; this.nb = Math.max(1, Math.floor((C + M.bandGap) / (M.bandCols + M.bandGap)));
    this.off = Math.floor((C - (this.nb * (M.bandCols + M.bandGap) - M.bandGap)) / 2);
    this.shown = new Float32Array(this.nb); this.peaks = new Float32Array(this.nb); this.peakAt = new Float64Array(this.nb);
  }
  zone(f) { const z = this.M.zones; return f <= z.green ? 'g' : f <= z.amber ? 'y' : 'r'; }
  // One tick: called exactly once per METER.tick, since each call moves the columns.
  grid(bands, now, style, overlay) {
    const R = this.R, C = this.C, h = HALF, g = blank(R, C), mirror = style === 'mirror', max = mirror ? R : R * 2;
    const halfUp = { g: h.gBottom, y: h.yBottom, r: h.rBottom, f: h.fBottom }, halfTop = { g: h.gTop, y: h.yTop, r: h.rTop, f: h.fTop };
    for (let b = 0; b < this.nb; b++) {
      const src = bands.length ? bands[Math.min(bands.length - 1, Math.floor(b * bands.length / this.nb))] : 0;
      const want = Math.round(src * max), u = this.shown[b] += Math.max(-2 * this.M.step, Math.min(2 * this.M.step, want - this.shown[b]));
      if (u >= this.peaks[b]) { this.peaks[b] = u; this.peakAt[b] = now; } else if (now - this.peakAt[b] > this.M.peakHold) this.peaks[b] = Math.max(u, this.peaks[b] - this.M.peakFall * 2);
      for (let k = 0; k < this.M.bandCols; k++) {
        const c = this.off + b * (this.M.bandCols + this.M.bandGap) + k; if (c >= C) continue;
        if (mirror) {
          const Hh = R / 2;
          for (let d = 0; d < Hh; d++) {
            const n = Math.max(0, Math.min(2, u - 2 * d)), up = Math.floor(Hh - 1 - d), dn = Math.floor(Hh + d);
            g[up][c] = n === 2 ? 'f' : n === 1 ? h.fBottom : '~f'; if (g[dn]) g[dn][c] = n === 2 ? 'f' : n === 1 ? h.fTop : '~f';
          }
          continue;
        }
        for (let i = 0; i < R; i++) {
          const n = Math.max(0, Math.min(2, u - 2 * i)), z = style === 'bars' ? 'f' : this.zone((i + 1) / R), row = R - 1 - i;
          g[row][c] = n === 2 ? z : n === 1 ? halfUp[z] : '~' + z;
        }
        // the peak's cell is the highest one it lit, drawn above the column's own top (the
        // handover's floor(peak / 2) was a cell too high for an even peak, so the top row never held one)
        const pk = Math.ceil(this.peaks[b] / 2) - 1;
        if (pk > Math.ceil(u / 2) - 1 && pk < R) { const z = style === 'bars' ? 'f' : this.zone((pk + 1) / R); g[R - 1 - pk][c] = halfTop[z]; }   // peak hold: a half flap
      }
    }
    if (overlay) overlay.forEach(l => { if (l.text) centreRow(g, l.row, l.text); });
    return g;
  }
  rest() { this.shown.fill(0); this.peaks.fill(0); }
  idle() { return this.shown.every(v => v <= 0); }
}

// The board's own words for each state, centred, over the meter.
export function overlayFor(state, R, words) {
  const at = lines => { const top = Math.max(0, Math.floor((R - lines.length) / 2)); return lines.map((text, i) => ({ row: top + i, text })); };
  if (state === 'quiet') return [{ row: 0, text: words.listening }];
  if (state === 'stopped') return [{ row: Math.max(0, Math.floor(R / 2) - 1), text: words.stopped }];
  if (state === 'refused') return at(words.refused);
  if (state === 'nomic') return at(words.noMic);
  if (state === 'idle') return at(words.idle);
  return null;
}
// A meter at rest, for a board nobody is listening to, and for thumbnails.
export function restGrid(R, C, style, state, words) {
  return new Meter(R, C).grid([], 0, STYLES.includes(style) ? style : 'mixer', overlayFor(state, R, words));
}

// The 15 log bands from 40 Hz to 12 kHz, as the prototype's analyser has them.
export function bandsOf(buf, sampleRate, fftSize, n = 15) {
  const hz = sampleRate / fftSize, out = new Float32Array(n);
  for (let b = 0; b < n; b++) {
    const lo = 40 * Math.pow(300, b / n), hi = 40 * Math.pow(300, (b + 1) / n); let s = 0, k = 0;
    for (let i = Math.floor(lo / hz); i <= Math.ceil(hi / hz) && i < buf.length; i++) { s += buf[i]; k++; }
    out[b] = Math.min(1, Math.pow(s / Math.max(1, k) / 255, 1.6) * 1.45);
  }
  return out;
}

// Listen: idle, listening, quiet, stopped, refused, nomic. on.change(state) and on.frame()
// are the app's; the app also says each status line.
export class Listen {
  constructor(on) {
    this.on = on; this.state = 'idle'; this.bands = new Float32Array(15); this.beatAt = 0; this.avg = 0;
    this.meters = new Map(); this.grids = new Map(); this.timer = 0;
  }
  active() { return this.state === 'listening' || this.state === 'quiet'; }
  running() { return this.active() || this.state === 'stopped'; }
  set(state, line) { this.state = state; this.on.change(state, line); }
  press() { if (this.active()) this.stop(); else this.start(); }
  async start() {
    if (this.starting) return; this.starting = true;
    const AC = window.AudioContext || window.webkitAudioContext;
    let ac = null;
    try { ac = new AC(); } catch { /* no Web Audio: refused below */ }
    let stream;
    try {
      if (!ac || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error('none'), { name: 'NotFoundError' });
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } });
    } catch (e) {
      if (ac) ac.close().catch(() => {});
      this.starting = false;
      return this.set(e && e.name === 'NotFoundError' ? 'nomic' : 'refused', e && e.name === 'NotFoundError' ? 'stNoMic' : 'stRefused');
    }
    if (ac.state === 'suspended') await ac.resume().catch(() => {});
    const an = Object.assign(ac.createAnalyser(), { fftSize: 2048, smoothingTimeConstant: 0.72 });
    ac.createMediaStreamSource(stream).connect(an);
    Object.assign(this, { ac, an, stream, buf: new Uint8Array(an.frequencyBinCount), muted: false, starting: false });
    // iOS mutes the track and suspends the context with the screen locked: that is a pause,
    // never Quiet, and a track that ends (the mic taken away) is Stopped (plan review 5.5)
    const track = stream.getAudioTracks()[0];
    if (track) {
      track.onended = () => { if (this.stream === stream) this.stop(); };
      track.onmute = () => { this.muted = true; };
      track.onunmute = () => { this.muted = false; this.loudAt = performance.now(); };
    }
    this.loudAt = performance.now();
    this.set('listening', 'stListen');
    if (!this.timer) this.timer = setInterval(() => this.step(), METER.tick);
  }
  release() {
    if (this.stream) this.stream.getTracks().forEach(t => { t.onended = null; t.stop(); });
    if (this.ac && this.ac.state !== 'closed') this.ac.close().catch(() => {});
    this.stream = null; this.an = null;   // ac is kept, closed, for the e2e hook to read
  }
  stop() {
    if (!this.active()) return;
    this.release(); this.stoppedAt = performance.now();
    this.set('stopped', 'stStopped');
  }
  // A reload or a page hide ends it silently: Listen is never kept.
  end() { this.release(); clearInterval(this.timer); this.timer = 0; this.state = 'idle'; this.meters.clear(); this.grids.clear(); }
  paused() { return this.muted || (this.ac && this.ac.state !== 'running'); }
  step() {
    const now = performance.now(), M = METER;
    let bands = new Float32Array(15);
    if (this.active() && this.an && !this.paused()) { this.an.getByteFrequencyData(this.buf); bands = bandsOf(this.buf, this.ac.sampleRate, this.an.fftSize); }
    const loud = Math.max.apply(null, bands) > 0.06; if (loud || this.paused()) this.loudAt = now;
    if (this.state === 'listening' && now - this.loudAt > M.quietAfter) this.set('quiet', 'stQuiet');
    else if (this.state === 'quiet' && loud) this.set('listening', 'stListen');
    const bass = (bands[0] + bands[1] + bands[2]) / 3; this.avg = this.avg * 0.95 + bass * 0.05;
    if (bass > this.avg * 1.18 && bass > 0.3 && now - this.beatAt > 260) this.beatAt = now;
    this.bands = bands; this.now = now;
    if (this.state === 'stopped' && now - this.stoppedAt > M.stoppedFor) {
      clearInterval(this.timer); this.timer = 0; this.meters.clear(); this.grids.clear();
      this.set('idle', null); return;
    }
    this.grids.clear();   // made again for this tick's zones, once each, by frame()
    this.on.frame(now);
  }
  // The meter grid for one zone this tick: made once per tick and zone, then copied.
  gridFor(R, C, style, words) {
    const key = `${R}x${C}:${style}`;
    if (this.grids.has(key)) return this.grids.get(key);
    let m = this.meters.get(key); if (!m) { m = new Meter(R, C); this.meters.set(key, m); }
    const g = m.grid(this.bands, this.now || 0, STYLES.includes(style) ? style : 'mixer', overlayFor(this.state, R, words));
    this.grids.set(key, g); return g;
  }
  // The Music light: how far past the last beat, 0 to 1.
  beat(now = performance.now()) { return Math.exp(-(now - this.beatAt) / RING.effects.music.decay); }
}
