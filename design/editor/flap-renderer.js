/* Split-Flap canvas renderer. Reference implementation AND the numeric spec.
   Every value below is a ratio of tile height (H) unless marked px or ms.
   One 2D canvas, no CSS 3D, no filters, no per-frame shadows or blur. */
(function () {
  'use strict';

  const GEOM = {
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

  const CHIPS = { r: '#D5352B', o: '#EE7D22', y: '#F2BE2E', g: '#2C9A5A', b: '#2B6FC4', v: '#7A4DB2', w: '#EFECE5', k: '#141415' };
  const CHIP_KEYS = ['r', 'o', 'y', 'g', 'b', 'v', 'w', 'k', 'f']; // f = "filled" (theme glyph colour)

  const THEMES = {
    black: {
      id: 'black', label: 'Vestaboard Black',
      face: '#1C1C1E', faceHi: '#232326', faceB: '#1A1A1C', faceLo: '#121213',
      housing: '#070708', crease: '#020202', lip: 'rgba(255,255,255,0.06)', stack: '#2B2B2E', pin: '#3A3A3D',
      glyph: '#EDE6D6', font: '"DM Mono"', weight: 500, capRatio: 0.70,
      frame: '#0F0F10', frameEdge: '#26262A', frameShade: '#050505', framePad: 0.5, frameRadius: 0.12,
      backdrop: ['#141518', '#0A0A0C'], shadow: 0.6,
      occl: 0.28, cast: 0.35, fallDark: 0.55, riseLight: 0.10, edge: '#4A4A4F', filled: '#EDE6D6'
    },
    white: {
      id: 'white', label: 'Vestaboard White',
      face: '#F0EDE6', faceHi: '#F7F5F0', faceB: '#ECE9E2', faceLo: '#DEDAD2',
      housing: '#B9B4AB', crease: '#7F7A72', lip: 'rgba(255,255,255,0.7)', stack: '#D3CEC5', pin: '#9C978F',
      glyph: '#18181B', font: '"DM Mono"', weight: 500, capRatio: 0.70,
      frame: '#E7E3DB', frameEdge: '#FAF8F4', frameShade: '#BDB8AF', framePad: 0.5, frameRadius: 0.12,
      backdrop: ['#D5D1C9', '#C3BEB5'], shadow: 0.28,
      occl: 0.16, cast: 0.22, fallDark: 0.30, riseLight: 0.18, edge: '#FFFFFF', filled: '#18181B'
    },
    solari: {
      id: 'solari', label: 'Solari Amber',
      face: '#2A2B2D', faceHi: '#313235', faceB: '#28292B', faceLo: '#1E1F21',
      housing: '#0C0D0E', crease: '#050506', lip: 'rgba(255,255,255,0.08)', stack: '#3B3C40', pin: '#55575C',
      glyph: '#F2B01E', font: '"Schibsted Grotesk"', weight: 700, capRatio: 0.72,
      frame: '#1C1D1F', frameEdge: '#3A3C40', frameShade: '#0A0A0B', framePad: 0.9, frameRadius: 0.06,
      rail: '#161719', screws: true, screw: '#6A6D72',
      backdrop: ['#303236', '#1B1C1F'], shadow: 0.5,
      occl: 0.30, cast: 0.35, fallDark: 0.50, riseLight: 0.10, edge: '#5A5C61', filled: '#F2B01E'
    }
  };

  const DRUM = ' ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ0123456789.,:;!?\'"-+/&%#@()=°roygbvwkf';
  const DRUM_IDX = {}; [...DRUM].forEach((c, i) => { DRUM_IDX[c] = i; });
  const FOLD_MAP = { 'É': 'E', 'È': 'E', 'Ê': 'E', 'Ü': 'U', 'Ø': 'Ö', 'Æ': 'Ä', 'Á': 'A', 'À': 'A', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ñ': 'N', 'Ç': 'C', '\u2019': "'", '\u2018': "'", '\u201C': '"', '\u201D': '"', '\u2013': '-', '\u2014': '-' };

  // Timing (ms). One flip = one character step on the drum.
  const FOLD = {
    fast:   { step: 70,  final: 160, settle: 90,  maxSteps: 10 },
    gentle: { step: 110, final: 260, settle: 120, maxSteps: 14 },
    exp: 1.35,          // fold angle = PI * t^1.35 (gravity: slow release, accelerating fall)
    settleAngle: 0.13,  // rebound after the final flap lands (radians)
    fade: 140           // reduced motion crossfade
  };
  const STAGGER = {
    classic: (r, c) => c * 22 + Math.random() * 30,
    wave:    (r, c) => (r + c) * 28,
    drift:   () => Math.random() * 1200,
    curtain: (r, c) => r * 140 + c * 6
  };

  function cleanChar(ch) {
    if (ch == null || ch === '') return { ch: ' ', valid: true };
    const u = String(ch).toUpperCase();
    if (u.length === 1 && DRUM_IDX[u] !== undefined) return { ch: u, valid: true };
    if (FOLD_MAP[u]) return { ch: FOLD_MAP[u], valid: true };
    return { ch: ' ', valid: false };
  }
  function cellChar(ch) {
    if (ch && (CHIPS[ch] || ch === 'f')) return ch;
    return cleanChar(ch).ch;
  }
  function thetaAt(t) { return Math.PI * Math.pow(Math.min(1, Math.max(0, t)), FOLD.exp); }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }

  function paintFace(ctx, ch, x, y, w, h, T) {
    const hinge = y + h / 2, r = h * GEOM.radius;
    const chip = ch === 'f' ? T.filled : CHIPS[ch];
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
      if (ch !== ' ') {
        const fs = h * GEOM.capHeight / T.capRatio;
        ctx.font = `${T.weight} ${fs}px ${T.font}, "DM Mono", ui-monospace, monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = T.glyph;
        ctx.fillText(ch, x + w / 2, y + h * GEOM.baseline);
      }
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

  function fillGrid(w, h) {
    const ar = w / Math.max(1, h);
    const rows = ar > 2 ? 6 : ar > 1.1 ? 8 : 14;
    const cols = Math.max(6, Math.floor((rows + (rows - 1) * GEOM.gapY + 1) * ar / (GEOM.tileW + GEOM.gapX)));
    return { rows, cols: Math.min(cols, 60) };
  }

  class Board {
    constructor(canvas, o) {
      this.cv = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
      this.A = new Atlas(); this.bg = document.createElement('canvas');
      this.o = Object.assign({ rows: 6, cols: 22, theme: 'black', speed: 'fast', transition: 'classic', maxDpr: 2,
        reduced: window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches }, o || {});
      this.cells = []; this.target = null; this._raf = 0; this._tick = this._tick.bind(this);
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
          row.push({ cur: p ? p.cur : ' ', q: [], a: null, due: 0 });
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
      this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr);
      this.W = this.cv.width; this.H = this.cv.height;
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
      g.addColorStop(0, T.backdrop[0]); g.addColorStop(1, T.backdrop[1]); x.fillStyle = g; x.fillRect(0, 0, W, H);
      for (let i = 1; i <= 6; i++) {                     // static contact shadow, painted once
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
      this.ctx.drawImage(this.bg, 0, 0);
      const now = performance.now();
      for (let r = 0; r < this.o.rows; r++) for (let c = 0; c < this.o.cols; c++) this._drawCell(r, c, now);
      this._drawHl();
    }
    // Editor zone highlight: scrim outside the zone, accent outline in the gaps around it.
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
          cell.q = this.o.reduced ? [want] : path(dest, want, sp.maxSteps);
          if (!cell.a) cell.due = now + st(r, c);
          any = true;
        }
      }
      if (opt.instant) this._full(); else if (any) this._kick();
    }
    _kick() { if (!this._raf) this._raf = requestAnimationFrame(this._tick); }
    _start(cell, now, sp) {
      const to = cell.q.shift(), final = cell.q.length === 0;
      if (this.o.reduced) return { kind: 'fade', from: cell.cur, to, start: now, dur: FOLD.fade };
      if (this.o.onFlip) this.o.onFlip(final);
      return { kind: 'flip', from: cell.cur, to, start: now, dur: final ? sp.final : sp.step, final };
    }
    _tick(now) {
      this._raf = 0; let active = false; const sp = FOLD[this.o.speed] || FOLD.fast;
      for (let r = 0; r < this.o.rows; r++) for (let c = 0; c < this.o.cols; c++) {
        const cell = this.cells[r][c];
        if (!cell.a && cell.q.length && now >= cell.due) cell.a = this._start(cell, now, sp);
        const a = cell.a;
        if (a) {
          if (now - a.start >= a.dur) {
            if (a.kind === 'flip') {
              cell.cur = a.to;
              cell.a = a.final ? { kind: 'settle', from: a.to, to: a.to, start: now, dur: sp.settle } : null;
            } else { cell.cur = a.to; cell.a = null; }
            if (!cell.a && cell.q.length) cell.a = this._start(cell, now, sp);
          }
          this._drawCell(r, c, now);
        }
        if (cell.a || cell.q.length) active = true;
      }
      if (active) this._raf = requestAnimationFrame(this._tick);
    }
    destroy() { cancelAnimationFrame(this._raf); this.ro.disconnect(); }
  }

  function path(from, to, max) {
    const n = DRUM.length, fi = DRUM_IDX[from] != null ? DRUM_IDX[from] : 0, ti = DRUM_IDX[to];
    const steps = ((ti - fi) % n + n) % n || n, k = Math.min(steps, max), out = [];
    for (let i = k - 1; i >= 0; i--) out.push(DRUM[((ti - i) % n + n) % n]);
    return out;
  }

  // Single tile on its housing, for spec sheets. Returns tile rect in CSS px.
  function paintTile(canvas, o) {
    const T = THEMES[o.theme || 'black'], dpr = Math.min(window.devicePixelRatio || 1, 2), r = canvas.getBoundingClientRect();
    if (!r.width) return null;
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    const x = canvas.getContext('2d');
    x.fillStyle = T.housing; x.fillRect(0, 0, canvas.width, canvas.height);
    let h = Math.round(canvas.height * (o.scale || 0.78)); h -= h % 2;
    const w = Math.round(h * GEOM.tileW), tx = Math.round((canvas.width - w) / 2), ty = Math.round((canvas.height - h) / 2 - h * 0.03);
    paintCellBed(x, tx, ty, w, h, h * GEOM.gapX, T);
    drawFold(x, new Atlas(), tx, ty, w, h, T, o.from || ' ', o.to || o.from || ' ', o.theta || 0, o.under);
    return { x: tx / dpr, y: ty / dpr, w: w / dpr, h: h / dpr };
  }

  // Static render helper: one frame of any grid at any size. Shared atlas, float geometry so
  // HTML overlays can be positioned with staticGeom percentages. No animation, no wall.
  const SHARED = new Atlas();
  function staticGeom(rows, cols, pad) {
    const p = pad == null ? 0.35 : pad, G = GEOM;
    return { pad: p, uw: cols * G.tileW + (cols - 1) * G.gapX + 2 * p, uh: rows + (rows - 1) * G.gapY + 2 * p };
  }
  function renderStatic(canvas, o) {
    const T = THEMES[o.theme || 'black'], dpr = Math.min(window.devicePixelRatio || 1, 2), r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
    if (canvas.width !== W) canvas.width = W; if (canvas.height !== H) canvas.height = H;
    if (SHARED.m.size > 5000) SHARED.clear();
    const x = canvas.getContext('2d'), g = staticGeom(o.rows, o.cols, o.pad), G = GEOM;
    const h = Math.min(W / g.uw, H / g.uh), ox = (W - g.uw * h) / 2, oy = (H - g.uh * h) / 2;
    x.fillStyle = T.frame; x.fillRect(0, 0, W, H);
    const bp = h * 0.08;
    x.fillStyle = T.housing; rr(x, ox + g.pad * h - bp, oy + g.pad * h - bp, (g.uw - 2 * g.pad) * h + 2 * bp, (g.uh - 2 * g.pad) * h + 2 * bp, h * 0.06); x.fill();
    const th = Math.max(2, Math.round(h)), tw = Math.max(2, Math.round(h * G.tileW));
    for (let rr0 = 0; rr0 < o.rows; rr0++) for (let c = 0; c < o.cols; c++) {
      const ch = cellChar(o.grid && o.grid[rr0] ? o.grid[rr0][c] : ' ');
      const px = ox + (g.pad + c * (G.tileW + G.gapX)) * h, py = oy + (g.pad + rr0 * (1 + G.gapY)) * h;
      x.drawImage(SHARED.get(ch, tw, th, T), px, py, h * G.tileW, h);
    }
    return { h: h / dpr, ox: ox / dpr, oy: oy / dpr };
  }

  window.SplitFlap = { GEOM, CHIPS, CHIP_KEYS, THEMES, DRUM, FOLD, STAGGER, cleanChar, cellChar, thetaAt, fillGrid, paintTile, Board, renderStatic, staticGeom };
})();
