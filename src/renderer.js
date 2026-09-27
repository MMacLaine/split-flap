// Split-flap canvas renderer. Ported from the design handoff (design/flap-renderer.js),
// which is also the numeric spec: every geometry value is a ratio of tile height (H)
// unless marked px or ms. One 2D canvas, no CSS 3D, no filters, no per-frame shadows
// or blur, so a Raspberry Pi can keep up.
//
// Changes from the handoff, each deliberate:
//   - the drum comes from charset.js (Nordic letters and $ are real flaps)
//   - a third speed, 'authentic', rolls the whole drum with no step cap
//   - the glyph atlas is cleared on resize and theme change (its keys include the
//     tile size, so a long-running kiosk that resized would otherwise grow forever)
//   - a frame budget: if animation frames run long, the canvas drops to 1x density
//   - from the editor handoff (design/editor/flap-renderer.js): the zone highlight and
//     renderStatic, which draws one still frame of any grid for thumbnails and images

import { CHIPS, DRUM, cellChar, drumPath, isDim, baseChar } from './charset.js';

export const GEOM = {
  tileW: 0.68,      // flap width / H
  gapX: 0.11,       // housing gap between columns
  gapY: 0.17,       // housing gap between rows (holds the flap stack edges)
  radius: 0.05,     // flap corner radius
  crease: 0.022,    // dark split line at 0.5H (min 1 device px)
  lip: 0.010,       // highlight directly under the crease: top edge of the lower flap
  notchW: 0.035,    // hinge pin notch, fraction of flap WIDTH
  notchH: 0.05,     // hinge pin notch height
  capHeight: 0.46,  // glyph cap height
  baseline: 0.73,   // glyph baseline from flap top (cap top lands at 0.27H, centred on the split)
  stack1: 0.010,    // first peeking flap edge, offset below flap bottom
  stack2: 0.030,    // second peeking flap edge
  fit: 0.88         // board occupies at most 88% of the viewport on its limiting axis
};

export const THEMES = {
  black: {
    id: 'black', label: 'Vestaboard Black',
    face: '#1C1C1E', faceHi: '#232326', faceB: '#1A1A1C', faceLo: '#121213',
    housing: '#070708', crease: '#020202', lip: 'rgba(255,255,255,0.06)', stack: '#2B2B2E', pin: '#3A3A3D',
    glyph: '#EDE6D6', font: '"DM Mono"', weight: 500, capRatio: 0.70,
    frame: '#0F0F10', frameEdge: '#26262A', frameShade: '#050505', framePad: 0.5, frameRadius: 0.12,
    backdrop: ['#141518', '#0A0A0C'], shadow: 0.6,
    occl: 0.28, cast: 0.35, fallDark: 0.55, riseLight: 0.10, edge: '#4A4A4F', filled: '#EDE6D6', dim: 0.16
  },
  white: {
    id: 'white', label: 'Vestaboard White',
    face: '#F0EDE6', faceHi: '#F7F5F0', faceB: '#ECE9E2', faceLo: '#DEDAD2',
    housing: '#B9B4AB', crease: '#7F7A72', lip: 'rgba(255,255,255,0.7)', stack: '#D3CEC5', pin: '#9C978F',
    glyph: '#18181B', font: '"DM Mono"', weight: 500, capRatio: 0.70,
    frame: '#E7E3DB', frameEdge: '#FAF8F4', frameShade: '#BDB8AF', framePad: 0.5, frameRadius: 0.12,
    backdrop: ['#D5D1C9', '#C3BEB5'], shadow: 0.28,
    occl: 0.16, cast: 0.22, fallDark: 0.30, riseLight: 0.18, edge: '#FFFFFF', filled: '#18181B', dim: 0.13
  },
  solari: {
    id: 'solari', label: 'Solari Amber',
    face: '#2A2B2D', faceHi: '#313235', faceB: '#28292B', faceLo: '#1E1F21',
    housing: '#0C0D0E', crease: '#050506', lip: 'rgba(255,255,255,0.08)', stack: '#3B3C40', pin: '#55575C',
    glyph: '#F2B01E', font: '"Schibsted Grotesk"', weight: 700, capRatio: 0.72,
    frame: '#1C1D1F', frameEdge: '#3A3C40', frameShade: '#0A0A0B', framePad: 0.9, frameRadius: 0.06,
    rail: '#161719', screws: true, screw: '#6A6D72',
    backdrop: ['#303236', '#1B1C1F'], shadow: 0.5,
    occl: 0.30, cast: 0.35, fallDark: 0.50, riseLight: 0.10, edge: '#5A5C61', filled: '#F2B01E', dim: 0.16
  }
};

// Timing (ms). One flip = one character step on the drum.
export const FOLD = {
  fast:      { step: 70,  final: 160, settle: 90,  maxSteps: 10 },
  gentle:    { step: 110, final: 260, settle: 120, maxSteps: 14 },
  // Every flap between here and there, like the hardware. Steps are quicker than Fast
  // so a full turn of the drum (74 flaps) lands in about four seconds.
  authentic: { step: 52,  final: 160, settle: 90,  maxSteps: Infinity },
  exp: 1.35,          // fold angle = PI * t^1.35 (gravity: slow release, accelerating fall)
  settleAngle: 0.13,  // rebound after the final flap lands (radians)
  fade: 140,          // reduced motion crossfade
  dimFade: 600        // a letter clock word lighting up or going faint
};

export const STAGGER = {
  classic: (r, c) => c * 22 + Math.random() * 30,
  wave:    (r, c) => (r + c) * 28,
  drift:   () => Math.random() * 1200,
  curtain: (r, c) => r * 140 + c * 6
};

// A cell is heading to dest (the end of its queue, else what it is animating to, else
// what it shows) and now wants the same letter faint or lit (the letter clock). No drum
// path is built: a queued flip lands in the new state, a running flip, fade or settle
// ends in it, and a still flap fades in place from start. Returns false when the letter
// itself changes, so the caller builds a normal path.
export function retargetFaint(cell, want, start) {
  const dest = cell.q.length ? cell.q[cell.q.length - 1] : (cell.a && cell.a.kind !== 'settle' ? cell.a.to : cell.cur);
  if (want === dest || baseChar(want) !== baseChar(dest)) return false;
  if (cell.q.length) cell.q[cell.q.length - 1] = want;
  else if (cell.a) cell.a.to = want;
  else { cell.sp = null; cell.a = { kind: 'fade', from: cell.cur, to: want, start, dur: FOLD.dimFade }; }
  return true;
}

export function thetaAt(t) { return Math.PI * Math.pow(Math.min(1, Math.max(0, t)), FOLD.exp); }

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
}

function paintFace(ctx, ch, x, y, w, h, T) {
  const hinge = y + h / 2, r = h * GEOM.radius, dim = isDim(ch);
  if (dim) ch = baseChar(ch);
  const tint = ch === 'f' ? T.filled : CHIPS[ch], chip = dim ? null : tint;
  ctx.save(); rr(ctx, x, y, w, h, r); ctx.clip();
  let g = ctx.createLinearGradient(0, y, 0, y + h);
  if (chip) {
    ctx.fillStyle = chip; ctx.fillRect(x, y, w, h);
    g.addColorStop(0, 'rgba(255,255,255,0.07)'); g.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.04)'); g.addColorStop(1, 'rgba(0,0,0,0.14)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  } else {
    g.addColorStop(0, T.faceHi); g.addColorStop(0.5, T.face); g.addColorStop(0.5, T.faceB); g.addColorStop(1, T.faceLo);
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = dim ? T.dim : 1;   // a faint flap: the same glyph or chip, barely there
    if (dim && tint) { ctx.fillStyle = tint; ctx.fillRect(x, y, w, h); }
    else if (ch === '♥') {
      // Drawn as a shape: the board faces may not carry the glyph, and a fallback font
      // would draw an emoji. Cap height tall, in the glyph colour.
      const ch2 = h * GEOM.capHeight, top = y + h * (GEOM.baseline - GEOM.capHeight), cx = x + w / 2, hw = ch2 * 0.54;
      ctx.fillStyle = T.glyph; ctx.beginPath();
      ctx.moveTo(cx, top + ch2);
      ctx.bezierCurveTo(cx - hw * 0.35, top + ch2 * 0.72, cx - hw, top + ch2 * 0.52, cx - hw, top + ch2 * 0.26);
      ctx.bezierCurveTo(cx - hw, top - ch2 * 0.02, cx - hw * 0.25, top - ch2 * 0.06, cx, top + ch2 * 0.2);
      ctx.bezierCurveTo(cx + hw * 0.25, top - ch2 * 0.06, cx + hw, top - ch2 * 0.02, cx + hw, top + ch2 * 0.26);
      ctx.bezierCurveTo(cx + hw, top + ch2 * 0.52, cx + hw * 0.35, top + ch2 * 0.72, cx, top + ch2);
      ctx.fill();
    } else if (ch !== ' ') {
      const fs = h * GEOM.capHeight / T.capRatio;
      ctx.font = `${T.weight} ${fs}px ${T.font}, "DM Mono", ui-monospace, monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = T.glyph;
      ctx.fillText(ch, x + w / 2, y + h * GEOM.baseline);
    }
    ctx.globalAlpha = 1;
  }
  // hinge occlusion: the halves shade each other near the split
  g = ctx.createLinearGradient(0, hinge - h * 0.08, 0, hinge);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${T.occl})`);
  ctx.fillStyle = g; ctx.fillRect(x, hinge - h * 0.08, w, h * 0.08);
  g = ctx.createLinearGradient(0, hinge, 0, hinge + h * 0.06);
  g.addColorStop(0, `rgba(0,0,0,${T.occl})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(x, hinge, w, h * 0.06);
  // crease + lip
  const c = Math.max(1, Math.round(h * GEOM.crease)), cy = Math.round(hinge - c / 2);
  ctx.fillStyle = T.crease; ctx.fillRect(x, cy, w, c);
  ctx.fillStyle = T.lip; ctx.fillRect(x, cy + c, w, Math.max(1, Math.round(h * GEOM.lip)));
  // hinge pin notches, cut into both side edges
  const nw = Math.max(1, Math.round(w * GEOM.notchW)), nh = Math.max(2, Math.round(h * GEOM.notchH));
  ctx.fillStyle = T.housing;
  ctx.fillRect(x, Math.round(hinge - nh / 2), nw, nh); ctx.fillRect(x + w - nw, Math.round(hinge - nh / 2), nw, nh);
  ctx.restore();
}

class Atlas {
  constructor() { this.m = new Map(); }
  get(ch, w, h, T) {
    const k = T.id + '|' + ch + '|' + w + 'x' + h;
    let c = this.m.get(k);
    if (!c) {
      c = document.createElement('canvas'); c.width = w; c.height = h;
      paintFace(c.getContext('2d'), ch, 0, 0, w, h, T); this.m.set(k, c);
    }
    return c;
  }
  clear() { this.m.clear(); }
}

// theta: 0 = old char flat, PI/2 = top flap edge-on, PI = new char flat.
function drawFold(ctx, A, x, y, w, h, T, from, to, th, under) {
  const hh = Math.round(h / 2), hinge = y + hh;
  const af = A.get(from, w, h, T), at = A.get(to, w, h, T), au = A.get(under || from, w, h, T);
  if (th <= 0) { ctx.drawImage(af, x, y); return; }
  if (th >= Math.PI) { ctx.drawImage(at, x, y); return; }
  ctx.save(); rr(ctx, x, y, w, h, h * GEOM.radius); ctx.clip();
  ctx.drawImage(at, 0, 0, w, hh, x, y, w, hh);                 // next char, top half (revealed)
  ctx.drawImage(au, 0, hh, w, h - hh, x, hinge, w, h - hh);    // previous char, bottom half
  const s = Math.sin(th), c = Math.cos(th);
  if (th < Math.PI / 2) {
    ctx.fillStyle = `rgba(0,0,0,${(T.cast * c).toFixed(3)})`; ctx.fillRect(x, y, w, hh);
    const fh = Math.max(1, hh * c);
    ctx.drawImage(af, 0, 0, w, hh, x, hinge - fh, w, fh);      // falling top flap, scaled toward the hinge
    ctx.fillStyle = `rgba(0,0,0,${(T.fallDark * s).toFixed(3)})`; ctx.fillRect(x, hinge - fh, w, fh);
  } else {
    const fh = Math.max(1, hh * -c), sh = h * 0.12;
    const g = ctx.createLinearGradient(0, hinge + fh, 0, hinge + fh + sh);
    g.addColorStop(0, `rgba(0,0,0,${(T.cast * s).toFixed(3)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x, hinge + fh, w, Math.min(sh, hh - fh));
    ctx.drawImage(at, 0, hh, w, h - hh, x, hinge, w, fh);      // landing flap, growing from the hinge
    ctx.fillStyle = `rgba(255,255,255,${(T.riseLight * s).toFixed(3)})`; ctx.fillRect(x, hinge, w, fh);
  }
  if (s > 0.85) {                                              // flap edge catching the light near edge-on
    const e = Math.max(1, Math.round(h * 0.012));
    ctx.globalAlpha = (s - 0.85) / 0.15; ctx.fillStyle = T.edge; ctx.fillRect(x, hinge - e, w, e); ctx.globalAlpha = 1;
  }
  const cr = Math.max(1, Math.round(h * GEOM.crease));
  ctx.fillStyle = T.crease; ctx.fillRect(x, Math.round(hinge - cr / 2), w, cr);
  ctx.restore();
}

function paintCellBed(x, cx, cy, tw, th, gx, T) {
  x.fillStyle = T.stack;
  x.fillRect(cx + tw * 0.03, cy + th + Math.round(th * GEOM.stack1), tw * 0.94, Math.max(1, Math.round(th * 0.012)));
  x.globalAlpha = 0.55;
  x.fillRect(cx + tw * 0.07, cy + th + Math.round(th * GEOM.stack2), tw * 0.86, Math.max(1, Math.round(th * 0.010)));
  x.globalAlpha = 1;
  x.fillStyle = T.pin;
  const ph = Math.max(2, Math.round(th * 0.04)), pw = Math.max(1, Math.round(gx * 0.35));
  x.fillRect(cx - pw, Math.round(cy + th / 2 - ph / 2), pw, ph);
  x.fillRect(cx + tw, Math.round(cy + th / 2 - ph / 2), pw, ph);
}

function screw(x, cx, cy, r, T, ang) {
  x.fillStyle = T.frameShade; x.beginPath(); x.arc(cx, cy + r * 0.18, r * 1.06, 0, Math.PI * 2); x.fill();
  x.fillStyle = T.screw; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
  x.strokeStyle = T.frameShade; x.lineWidth = Math.max(1, r * 0.28);
  x.beginPath(); x.moveTo(cx - Math.cos(ang) * r * 0.7, cy - Math.sin(ang) * r * 0.7); x.lineTo(cx + Math.cos(ang) * r * 0.7, cy + Math.sin(ang) * r * 0.7); x.stroke();
}

// Rows and columns that suit a viewport, for the "fill screen" size.
export function fillGrid(w, h) {
  const ar = w / Math.max(1, h);
  const rows = ar > 2 ? 6 : ar > 1.1 ? 8 : 14;
  const cols = Math.max(6, Math.floor((rows + (rows - 1) * GEOM.gapY + 1) * ar / (GEOM.tileW + GEOM.gapX)));
  return { rows, cols: Math.min(cols, 60) };
}

export class Board {
  constructor(canvas, o) {
    // transparent (for OBS and other overlays) needs an alpha canvas, which cannot be
    // switched later, so it is read here. The frame is drawn on nothing.
    this.clear = !!(o && o.transparent);
    this.cv = canvas; this.ctx = canvas.getContext('2d', { alpha: this.clear });
    this.A = new Atlas(); this.bg = document.createElement('canvas');
    this.o = Object.assign({
      rows: 6, cols: 22, theme: 'black', speed: 'fast', transition: 'classic', maxDpr: 2,
      reduced: !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)
    }, o || {});
    this.cells = []; this.target = null; this._raf = 0; this._tick = this._tick.bind(this);
    this._slow = 0; this._last = 0;
    this._build();
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(canvas);
    this.resize();
    if (document.fonts) document.fonts.ready.then(() => { this.A.clear(); this._full(); });
  }
  _build() {
    const old = this.cells; this.cells = [];
    for (let r = 0; r < this.o.rows; r++) {
      const row = [];
      for (let c = 0; c < this.o.cols; c++) {
        const p = old[r] && old[r][c];
        row.push({ cur: p ? p.cur : ' ', q: [], a: null, due: 0, c });
      }
      this.cells.push(row);
    }
  }
  setOptions(o) {
    const regrid = (o.rows != null && o.rows !== this.o.rows) || (o.cols != null && o.cols !== this.o.cols);
    const retheme = o.theme && o.theme !== this.o.theme;
    Object.assign(this.o, o);
    if (regrid) this._build();
    if (regrid || retheme) this.resize();
    if (this.target && regrid) this.setGrid(this.target);
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.o.maxDpr);
    const r = this.cv.getBoundingClientRect(); if (!r.width || !r.height) return;
    const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
    const key = W + 'x' + H + '|' + this.o.theme + '|' + this.o.rows + 'x' + this.o.cols;
    if (key === this._sizeKey) return;
    this._sizeKey = key;
    this.cv.width = W; this.cv.height = H; this.W = W; this.H = H;
    this.A.clear();
    this._layout(); this._paintBg(); this._full();
  }
  _layout() {
    const T = THEMES[this.o.theme], G = GEOM, rows = this.o.rows, cols = this.o.cols, pad = T.framePad;
    const uw = cols * G.tileW + (cols - 1) * G.gapX + 2 * pad, uh = rows + (rows - 1) * G.gapY + 2 * pad;
    let h = Math.floor(Math.min(this.W * G.fit / uw, this.H * G.fit / uh)); h = Math.max(8, h - (h % 2));
    this.th = h; this.tw = Math.round(h * G.tileW); this.gx = Math.round(h * G.gapX); this.gy = Math.round(h * G.gapY);
    this.pad = Math.round(h * pad);
    this.bw = cols * this.tw + (cols - 1) * this.gx + 2 * this.pad; this.bh = rows * h + (rows - 1) * this.gy + 2 * this.pad;
    this.bx = Math.round((this.W - this.bw) / 2); this.by = Math.round((this.H - this.bh) / 2);
  }
  cellXY(r, c) { return [this.bx + this.pad + c * (this.tw + this.gx), this.by + this.pad + r * (this.th + this.gy)]; }
  _paintBg() {
    const T = THEMES[this.o.theme], b = this.bg; b.width = this.W; b.height = this.H;
    const x = b.getContext('2d'), W = this.W, H = this.H, bx = this.bx, by = this.by, bw = this.bw, bh = this.bh, th = this.th;
    const g = x.createRadialGradient(W / 2, H * 0.46, 0, W / 2, H * 0.46, Math.hypot(W, H) * 0.6);
    if (!this.clear) { g.addColorStop(0, T.backdrop[0]); g.addColorStop(1, T.backdrop[1]); x.fillStyle = g; x.fillRect(0, 0, W, H); }
    for (let i = 1; i <= 6 && !this.clear; i++) {      // static contact shadow, painted once
      const s = i * th * 0.07; x.fillStyle = `rgba(0,0,0,${(T.shadow / 12).toFixed(3)})`;
      rr(x, bx - s * 0.4, by + s * 0.9, bw + s * 0.8, bh + s * 0.5, th * T.frameRadius + s); x.fill();
    }
    const fr = th * T.frameRadius;
    x.fillStyle = T.frame; rr(x, bx, by, bw, bh, fr); x.fill();
    const lw = Math.max(1, Math.round(th * 0.012));
    x.fillStyle = T.frameEdge; x.fillRect(bx + fr, by, bw - 2 * fr, lw);
    x.fillStyle = T.frameShade; x.fillRect(bx + fr, by + bh - lw, bw - 2 * fr, lw);
    const bedPad = Math.round(Math.min(this.gx, this.gy) * 0.8);
    x.fillStyle = T.housing;
    rr(x, bx + this.pad - bedPad, by + this.pad - bedPad, bw - 2 * this.pad + 2 * bedPad, bh - 2 * this.pad + 2 * bedPad, th * 0.04); x.fill();
    if (T.rail) {
      x.fillStyle = T.rail;
      for (let r = 0; r < this.o.rows; r++) { const yy = this.cellXY(r, 0)[1]; x.fillRect(bx + this.pad - bedPad, yy + th * 0.42, bw - 2 * this.pad + 2 * bedPad, th * 0.16); }
    }
    for (let r = 0; r < this.o.rows; r++) for (let c = 0; c < this.o.cols; c++) {
      const p = this.cellXY(r, c); paintCellBed(x, p[0], p[1], this.tw, th, this.gx, T);
    }
    if (T.screws) {
      const sr = th * 0.075, i = this.pad * 0.5, pts = [[bx + i, by + i], [bx + bw - i, by + i], [bx + i, by + bh - i], [bx + bw - i, by + bh - i], [bx + bw / 2, by + i], [bx + bw / 2, by + bh - i]];
      if (bw / bh > 2.5) pts.push([bx + bw / 4, by + i], [bx + bw * 0.75, by + i], [bx + bw / 4, by + bh - i], [bx + bw * 0.75, by + bh - i]);
      pts.forEach((p, k) => screw(x, p[0], p[1], sr, T, 0.4 + k * 1.3));
    }
  }
  _full() {
    if (!this.W) return;
    if (this.clear) this.ctx.clearRect(0, 0, this.W, this.H);
    this.ctx.drawImage(this.bg, 0, 0);
    const now = performance.now();
    for (let r = 0; r < this.o.rows; r++) for (let c = 0; c < this.o.cols; c++) this._drawCell(r, c, now);
    this._drawHl();
  }
  // Editor zone highlight: the cells outside the zone are dimmed with the housing colour
  // and an accent line runs in the gaps around it. z is { r, c, h, w } or null.
  setHighlight(z, color) {
    const k = z ? [z.r, z.c, z.h, z.w, color].join(',') : '';
    if (k === this._hlk) return;
    this._hlk = k; this.hl = z ? { r: z.r, c: z.c, h: z.h, w: z.w, color: color || '#C8974A' } : null; this._full();
  }
  _inHl(r, c) { const z = this.hl; return !z || (r >= z.r && r < z.r + z.h && c >= z.c && c < z.c + z.w); }
  _drawHl() {
    const z = this.hl; if (!z || !this.W) return;
    const a = this.cellXY(z.r, z.c), b = this.cellXY(z.r + z.h - 1, z.c + z.w - 1), x = this.ctx;
    const lw = Math.max(2, Math.round(this.th * 0.05)), px = this.gx / 2, py = this.gy / 2;
    x.strokeStyle = z.color; x.lineWidth = lw;
    rr(x, a[0] - px, a[1] - py, b[0] + this.tw - a[0] + 2 * px, b[1] + this.th - a[1] + 2 * py, this.th * 0.08); x.stroke();
  }
  _drawCell(r, c, now) {
    this._drawCellInner(r, c, now);
    if (this.hl && !this._inHl(r, c)) {
      const p = this.cellXY(r, c), x = this.ctx; x.globalAlpha = 0.62; x.fillStyle = THEMES[this.o.theme].housing;
      x.fillRect(p[0], p[1], this.tw, this.th); x.globalAlpha = 1;
    }
  }
  _drawCellInner(r, c, now) {
    const p = this.cellXY(r, c), x = p[0], y = p[1], tw = this.tw, th = this.th, ctx = this.ctx, T = THEMES[this.o.theme], A = this.A;
    if (this.clear) ctx.clearRect(x, y, tw, th);
    ctx.drawImage(this.bg, x, y, tw, th, x, y, tw, th);
    const cell = this.cells[r][c], a = cell.a;
    if (!a) { ctx.drawImage(A.get(cell.cur, tw, th, T), x, y); return; }
    const t = Math.min(1, Math.max(0, (now - a.start) / a.dur));
    if (a.kind === 'fade') {
      ctx.drawImage(A.get(a.from, tw, th, T), x, y); ctx.globalAlpha = t; ctx.drawImage(A.get(a.to, tw, th, T), x, y); ctx.globalAlpha = 1; return;
    }
    if (a.kind === 'settle') { drawFold(ctx, A, x, y, tw, th, T, a.to, a.to, Math.PI - FOLD.settleAngle * Math.sin(Math.PI * t), a.to); return; }
    drawFold(ctx, A, x, y, tw, th, T, a.from, a.to, thetaAt(t));
  }
  // True when no flap is moving or queued.
  isIdle() { return this.cells.every(row => row.every(c => !c.a && !c.q.length)); }
  // What the board currently says (or is heading to), as rows of cells.
  snapshot() {
    return this.cells.map(row => row.map(cell => cell.q.length ? cell.q[cell.q.length - 1] : (cell.a ? cell.a.to : cell.cur)));
  }
  setGrid(lines, opt) {
    opt = opt || {}; this.target = lines;
    const now = performance.now(), st = STAGGER[this.o.transition] || STAGGER.classic, sp = FOLD[this.o.speed] || FOLD.fast;
    let any = false;
    for (let r = 0; r < this.o.rows; r++) {
      const row = lines[r] ? (Array.isArray(lines[r]) ? lines[r] : [...lines[r]]) : [];
      for (let c = 0; c < this.o.cols; c++) {
        const cell = this.cells[r][c], want = cellChar(row[c]);
        if (opt.instant) { cell.cur = want; cell.q = []; cell.a = null; continue; }
        const dest = cell.q.length ? cell.q[cell.q.length - 1] : (cell.a && cell.a.kind !== 'settle' ? cell.a.to : cell.cur);
        if (want === dest) continue;
        // Only faint to lit or back: never a turn of the drum (see retargetFaint).
        if (retargetFaint(cell, want, now + st(r, c) * 0.5)) { any = true; continue; }
        cell.q = this.o.reduced ? [want] : this._path(dest, want, sp.maxSteps); cell.sp = null;
        if (!cell.a) cell.due = now + st(r, c);
        any = true;
      }
    }
    if (opt.instant) this._full(); else if (any) this._kick();
  }
  // Every flap turns the whole drum once and lands where it already was, like a Solari
  // board on power up. At the authentic step timing whatever the board's speed, with
  // the named stagger. A setGrid during the roll takes over from wherever each flap is.
  // The drum path between two flaps; a faint flap turns as its letter and lands faint.
  _path(from, to, max) {
    const p = drumPath(baseChar(from), baseChar(to), max);
    if (p.length) p[p.length - 1] = to;
    return p;
  }
  roll(stagger) {
    if (this.o.reduced) return;
    const now = performance.now(), st = STAGGER[stagger] || STAGGER.curtain;
    for (let r = 0; r < this.o.rows; r++) for (let c = 0; c < this.o.cols; c++) {
      const cell = this.cells[r][c];
      const dest = cell.q.length ? cell.q[cell.q.length - 1] : (cell.a && cell.a.kind !== 'settle' ? cell.a.to : cell.cur);
      cell.q = this._path(dest, dest, Infinity); cell.sp = FOLD.authentic;
      if (!cell.a) cell.due = now + st(r, c);
    }
    this._kick();
  }
  _kick() { if (!this._raf) { this._last = 0; this._slow = 0; this._raf = requestAnimationFrame(this._tick); } }
  _start(cell, now, sp) {
    const to = cell.q.shift(), final = cell.q.length === 0;
    if (this.o.reduced) return { kind: 'fade', from: cell.cur, to, start: now, dur: FOLD.fade };
    if (this.o.onFlip) this.o.onFlip(final, this.o.cols > 1 ? cell.c / (this.o.cols - 1) * 2 - 1 : 0);
    return { kind: 'flip', from: cell.cur, to, start: now, dur: final ? sp.final : sp.step, final };
  }
  // Frame budget: 45 long frames (over 34ms, so under ~30fps) in one run of animation
  // means the device cannot keep up at this density. Drop to 1x once; it stays there.
  _budget(now) {
    if (this._last && this.o.maxDpr > 1 && (window.devicePixelRatio || 1) > 1) {
      const dt = now - this._last;
      if (dt > 34 && dt < 250 && !document.hidden) this._slow++;   // over 250ms is a background tab, not a slow device
      if (this._slow > 45) { this.o.maxDpr = 1; this._slow = 0; this._sizeKey = null; this.resize(); if (this.o.onDegrade) this.o.onDegrade(); }
    }
    this._last = now;
  }
  _tick(now) {
    this._raf = 0; let active = false; const sp = FOLD[this.o.speed] || FOLD.fast;
    this._budget(now);
    for (let r = 0; r < this.o.rows; r++) for (let c = 0; c < this.o.cols; c++) {
      const cell = this.cells[r][c];
      const csp = cell.sp || sp;   // a roll runs at its own timing
      if (!cell.a && cell.q.length && now >= cell.due) cell.a = this._start(cell, now, csp);
      const a = cell.a;
      if (a) {
        if (now - a.start >= a.dur) {
          if (a.kind === 'flip') {
            cell.cur = a.to;
            cell.a = a.final ? { kind: 'settle', from: a.to, to: a.to, start: now, dur: csp.settle } : null;
          } else { cell.cur = a.to; cell.a = null; }
          if (!cell.a && cell.q.length) cell.a = this._start(cell, now, csp);
          if (!cell.a && !cell.q.length) cell.sp = null;
        }
        this._drawCell(r, c, now);
      }
      if (cell.a || cell.q.length) active = true;
    }
    if (active) this._raf = requestAnimationFrame(this._tick);
    else this._last = 0;
  }
  destroy() { cancelAnimationFrame(this._raf); this.ro.disconnect(); }
}

// Static render helper: one still frame of any grid, for thumbnails, the zone diagram
// and Save as image. One atlas shared by every thumbnail; float geometry, so HTML
// overlays line up with staticGeom() percentages. No animation and no wall.
// Size comes from the canvas's CSS box, or o.width and o.height in device pixels.
const SHARED = new Atlas();
export function staticGeom(rows, cols, pad) {
  const p = pad == null ? 0.35 : pad, G = GEOM;
  return { pad: p, uw: cols * G.tileW + (cols - 1) * G.gapX + 2 * p, uh: rows + (rows - 1) * G.gapY + 2 * p };
}
export function renderStatic(canvas, o) {
  const T = THEMES[o.theme] || THEMES.black;
  let W = o.width, H = o.height;
  if (!W || !H) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    W = Math.round(r.width * dpr); H = Math.round(r.height * dpr);
  }
  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;
  if (SHARED.m.size > 5000) SHARED.clear();
  const x = canvas.getContext('2d'), g = staticGeom(o.rows, o.cols, o.pad), G = GEOM;
  const h = Math.min(W / g.uw, H / g.uh), ox = (W - g.uw * h) / 2, oy = (H - g.uh * h) / 2;
  x.fillStyle = T.frame; x.fillRect(0, 0, W, H);
  const bp = h * 0.08;
  x.fillStyle = T.housing; rr(x, ox + g.pad * h - bp, oy + g.pad * h - bp, (g.uw - 2 * g.pad) * h + 2 * bp, (g.uh - 2 * g.pad) * h + 2 * bp, h * 0.06); x.fill();
  const th = Math.max(2, Math.round(h)), tw = Math.max(2, Math.round(h * G.tileW));
  for (let r = 0; r < o.rows; r++) for (let c = 0; c < o.cols; c++) {
    const ch = cellChar(o.grid && o.grid[r] ? o.grid[r][c] : ' ');
    const px = ox + (g.pad + c * (G.tileW + G.gapX)) * h, py = oy + (g.pad + r * (1 + G.gapY)) * h;
    x.drawImage(SHARED.get(ch, tw, th, T), px, py, h * G.tileW, h);
  }
  return { h, ox, oy };
}
// Clears the shared atlas once the web fonts arrive, so thumbnails drawn before then
// (in the fallback face) are redrawn in DM Mono.
export function resetStatic() { SHARED.clear(); }

export { DRUM };
