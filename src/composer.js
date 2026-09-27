// The message composer: one grid of flaps with three ways to fill it, all writing the
// same cells. Type puts letters where the caret is (settled in DESIGN-HANDOVER.md).
// Paint drags colour chips across the grid, with a fill tool and a mirror. Photo maps a
// picture to chips in the browser. Undo and redo keep 60 steps per zone, and a message
// left with changes is kept as an earlier message (12 at most) in this browser.

import { h, clone } from './dom.js';
import { THEMES } from './renderer.js';
import { CHIPS, CHIP_KEYS, CHIP_NAMES, composerInput } from './charset.js';
import { toCells } from './content.js';
import { getFlag, setFlag } from './store.js';
import { mapImage, sampleImage } from './photo.js';

const MAX_HIST = 60, MAX_DRAFTS = 12;

export class Composer {
  constructor(app, editor) {
    this.app = app; this.ed = editor;
    this.hist = {}; this.photos = {}; this.pp = {};
    this.tool = 'brush'; this.paint = 'r'; this.mirror = false; this.showDrafts = false;
    this.els = null;
  }
  get t() { return this.app.t; }
  key() { const p = this.ed.page(); return p ? p.id + ':' + this.ed.zi() : ''; }
  mode(zone) { const m = zone && zone.o && zone.o.mode; return m === 'paint' || m === 'photo' ? m : 'type'; }
  drafts() { try { const d = JSON.parse(getFlag('sf_drafts')); return Array.isArray(d) ? d.filter(x => x && Array.isArray(x.cells)).slice(0, MAX_DRAFTS) : []; } catch { return []; } }

  // ---------- history ----------
  ensure(key, cells) { if (!this.hist[key]) this.hist[key] = { st: [clone(cells)], i: 0, saved: 0 }; return this.hist[key]; }
  push(cells) {
    const H = this.ensure(this.key(), cells);
    H.st = H.st.slice(0, H.i + 1); H.st.push(clone(cells));
    if (H.st.length > MAX_HIST) { H.st.shift(); H.saved--; }
    H.i = H.st.length - 1;
  }
  undo() { const H = this.hist[this.key()]; if (H && H.i > 0) { H.i--; this.write(clone(H.st[H.i]), true); } }
  redo() { const H = this.hist[this.key()]; if (H && H.i < H.st.length - 1) { H.i++; this.write(clone(H.st[H.i]), true); } }
  forget() { delete this.hist[this.key()]; delete this.photos[this.key()]; }

  // Called when the composer goes away (another level, Done): keep the message as an
  // earlier message if it changed since it was last kept.
  leave() {
    if (!this.els) return;
    const zone = this.ed.zone(), H = this.hist[this.key()];
    this.els = null;
    if (!zone || zone.ch !== 'message' || !H || H.i === H.saved) return;
    const cells = H.st[H.i]; if (!cells.some(r => r.some(c => c !== ' '))) return;
    H.saved = H.i;
    const sig = JSON.stringify(cells);
    const next = [{ id: 'd' + Date.now().toString(36), t: Date.now(), h: cells.length, w: cells[0].length, cells }].concat(this.drafts().filter(x => JSON.stringify(x.cells) !== sig)).slice(0, MAX_DRAFTS);
    setFlag('sf_drafts', JSON.stringify(next));
  }

  // ---------- writing ----------
  cells() { const zone = this.ed.zone(), zd = this.zd; return toCells((zone && zone.o) || {}, zd.h, zd.w); }
  // Cells into the zone (quietly, so the drawer is not rebuilt), then the grid, the
  // undo buttons and the thumbnails catch up in place.
  write(cells, noHist) {
    this.ed.updZone(z => { const mode = z.o && z.o.mode; z.o = { cells }; if (mode) z.o.mode = mode; }, true);
    if (!noHist) this.push(cells);
    this.paintGrid(); this.ed.refreshThumbs(true);
  }
  edit(fn) { const c = this.cells(); fn(c); this.write(c); }
  setMode(m) {
    this.ed.updZone(z => { z.o = Object.assign({}, z.o, { cells: toCells(z.o || {}, this.zd.h, this.zd.w) }); if (m === 'type') delete z.o.mode; else z.o.mode = m; });
  }

  // ---------- the element ----------
  render(zone, zd) {
    const t = this.t, T = THEMES[this.app.cur().theme], mode = this.mode(zone), n = zd.h * zd.w, key = this.key();
    this.zd = zd; this.T = T;
    const H = this.ensure(key, toCells(zone.o || {}, zd.h, zd.w));
    const names = CHIP_NAMES[this.app.S.lang];
    const modeBtn = (id, label) => h('button', { role: 'radio', class: 'sf-mode', 'aria-checked': String(mode === id), 'data-k': 'mode-' + id, onclick: () => { if (mode !== id) this.setMode(id); } }, label);
    const undo = h('button', { class: 'sf-small-btn', 'data-k': 'undo', 'aria-keyshortcuts': 'Control+Z Meta+Z', disabled: !(H.i > 0), onclick: () => this.undo() }, t.undo);
    const redo = h('button', { class: 'sf-small-btn', 'data-k': 'redo', 'aria-keyshortcuts': 'Control+Shift+Z Meta+Shift+Z', disabled: !(H.i < H.st.length - 1), onclick: () => this.redo() }, t.redo);

    // the grid, with a hidden input over it so the phone keyboard works in Type mode
    const avail = (this.ed.phone() ? innerWidth : 412) - 52 - (zd.w - 1) * 2, fs = Math.max(7, Math.min(18, Math.floor(avail / zd.w * 0.66)));
    const grid = h('div', { class: 'sf-comp-grid ' + mode, style: `grid-template-columns:repeat(${zd.w},minmax(0,1fr));background:${T.housing}` });
    const cellEls = [];
    for (let i = 0; i < n; i++) { const c = h('span', { class: 'sf-comp-cell', 'data-i': i, style: `font-size:${fs}px;font-family:${T.font}, 'DM Mono', monospace` }); cellEls.push(c); grid.append(c); }
    const input = h('input', { class: 'sf-comp-input', value: '', 'aria-label': t.typeOnBoard, autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', 'data-k': 'comp', tabIndex: mode === 'type' ? 0 : -1,
      onfocus: () => { this.app.S.cz = this.ed.zi(); this.paintGrid(); }, onblur: () => this.paintGrid(),
      oninput: e => this.typed(e), onkeydown: e => this.typeKey(e) });
    grid.addEventListener('pointerdown', e => this.down(e));
    grid.addEventListener('pointermove', e => this.move(e));
    grid.addEventListener('pointerup', () => this.up()); grid.addEventListener('pointercancel', () => this.up());

    const used = h('span', { class: 'sf-comp-used' }), notice = h('span', { role: 'status', 'data-notice': '' }, this.app.S.notice);
    this.els = { cells: cellEls, input, undo, redo, used, grid };

    const parts = [h('div', { class: 'sf-row between' },
      h('div', { class: 'sf-modes', role: 'radiogroup', 'aria-label': t.composerMode }, modeBtn('type', t.type), modeBtn('paint', t.paint), modeBtn('photo', t.photo)),
      h('div', { class: 'sf-row' }, undo, redo))];
    if (mode === 'paint') parts.push(this.paintTools(T, names));
    if (mode === 'photo') parts.push(this.photoPick());
    parts.push(h('div', { class: 'sf-composer' }, grid, input));
    if (mode === 'type') parts.push(h('div', { class: 'sf-row' },
      CHIP_KEYS.map(k => h('button', { class: 'sf-chip', style: `background:${k === 'f' ? T.filled : CHIPS[k]}`, 'aria-label': t.chip(names[k]), title: t.chip(names[k]), onclick: () => { this.place([k]); input.focus(); } })),
      h('span', { class: 'sf-grow' }),
      h('button', { class: 'sf-small-btn', 'data-k': 'centre', onclick: () => this.centre() }, t.center),
      h('button', { class: 'sf-small-btn', 'data-k': 'clear', onclick: () => { this.edit(c => c.forEach(r => r.fill(' '))); this.app.S.caret = 0; this.paintGrid(); } }, t.clear)));
    if (mode === 'photo') parts.push(this.photoControls());
    parts.push(h('div', { class: 'sf-comp-foot' }, used, notice));
    parts.push(this.draftsEl(zd));
    return h('div', { class: 'sf-field sf-composer-wrap' }, parts);
  }
  after() { this.paintGrid(); }

  paintGrid() {
    const E = this.els; if (!E || !E.cells[0] || !E.cells[0].isConnected) return;
    const zone = this.ed.zone(); if (!zone || zone.ch !== 'message') return;
    const grid = this.cells().flat(), n = grid.length, T = this.T, mode = this.mode(zone);
    const caret = mode === 'type' && document.activeElement === E.input ? Math.min(this.app.S.caret, n - 1) : -1;
    grid.forEach((ch, i) => {
      const chip = ch === 'f' ? T.filled : CHIPS[ch], el = E.cells[i];
      el.textContent = chip ? '' : ch; el.style.background = chip || T.face; el.style.color = T.glyph;
      el.classList.toggle('caret', i === caret);
    });
    E.used.textContent = `${grid.filter(x => x !== ' ').length} / ${n} ${this.t.flaps}`;
    const H = this.hist[this.key()];
    E.undo.disabled = !(H && H.i > 0); E.redo.disabled = !(H && H.i < H.st.length - 1);
  }

  // ---------- type ----------
  place(chars) {
    const zd = this.zd, n = zd.h * zd.w; let pos = Math.min(this.app.S.caret, n), full = false;
    const list = [];
    for (const ch of chars) { if (pos >= n) { full = true; break; } list.push([pos, ch]); pos++; }
    if (list.length) this.edit(c => list.forEach(([i, ch]) => { c[Math.floor(i / zd.w)][i % zd.w] = ch; }));
    this.app.S.caret = Math.min(n, pos);
    if (full || pos >= n) this.app.flash(this.t.full);
    this.paintGrid();
  }
  typed(e) {
    const v = e.target.value; e.target.value = ''; if (!v) return;
    // coloured square emoji place chips; anything with no flap shows as blank, with a note
    const { cells, invalid } = composerInput(v);
    if (invalid.length) this.app.flash(this.t.blankNote(invalid[0]));
    this.place(cells);
  }
  typeKey(e) {
    const zd = this.zd, n = zd.h * zd.w, w = zd.w, pos = Math.min(this.app.S.caret, n), k = e.key, S = this.app.S;
    const caret = i => { S.caret = Math.max(0, Math.min(n, i)); this.paintGrid(); };
    if ((e.metaKey || e.ctrlKey) && k.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) this.redo(); else this.undo(); return; }
    if (k === 'Backspace') { e.preventDefault(); const i = pos - 1; if (i >= 0) { this.edit(c => { c[Math.floor(i / w)][i % w] = ' '; }); caret(i); } }
    else if (k === 'Delete') { e.preventDefault(); if (pos < n) this.edit(c => { c[Math.floor(pos / w)][pos % w] = ' '; }); }
    else if (k === 'ArrowLeft') { e.preventDefault(); caret(pos - 1); }
    else if (k === 'ArrowRight') { e.preventDefault(); caret(pos + 1); }
    else if (k === 'ArrowUp') { e.preventDefault(); caret(pos - w); }
    else if (k === 'ArrowDown') { e.preventDefault(); caret(pos + w); }
    else if (k === 'Enter') { e.preventDefault(); const nx = (Math.floor(pos / w) + 1) * w; if (nx >= n) this.app.flash(this.t.full); else caret(nx); }
    else if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); e.currentTarget.blur(); }
  }
  centre() {
    const w = this.zd.w;
    this.edit(c => c.forEach((r, ri) => {
      const first = r.findIndex(x => x !== ' '); if (first < 0) return;
      const last = r.length - 1 - [...r].reverse().findIndex(x => x !== ' '), a = r.slice(first, last + 1), off = Math.floor((w - a.length) / 2);
      c[ri] = Array(w).fill(' '); a.forEach((ch, j) => { c[ri][off + j] = ch; });
    }));
  }

  // ---------- pointer: caret in Type, strokes in Paint ----------
  cellAt(e) { const el = document.elementFromPoint(e.clientX, e.clientY); const i = el && el.dataset ? +el.dataset.i : NaN; return el && this.els && this.els.grid.contains(el) && !isNaN(i) ? i : -1; }
  down(e) {
    const zone = this.ed.zone(), mode = this.mode(zone), i = this.cellAt(e); if (i < 0) return;
    if (mode === 'type') { e.preventDefault(); this.app.S.caret = i; this.els.input.focus(); this.paintGrid(); return; }
    if (mode !== 'paint') return;
    e.preventDefault(); this.els.grid.setPointerCapture && this.els.grid.setPointerCapture(e.pointerId);
    if (this.tool === 'fill') { this.fill(i); return; }
    this.stroke = { cells: this.cells(), last: -1 }; this.dab(i);
  }
  move(e) { if (!this.stroke) return; const i = this.cellAt(e); if (i >= 0 && i !== this.stroke.last) this.dab(i); }
  up() { if (!this.stroke) return; const c = this.stroke.cells; this.stroke = null; this.push(c); this.paintGrid(); }
  dab(i) {
    const w = this.zd.w, r = Math.floor(i / w), c = i % w, S = this.stroke;
    S.cells[r][c] = this.paint; if (this.mirror) S.cells[r][w - 1 - c] = this.paint;
    S.last = i; this.write(clone(S.cells), true);
  }
  fill(i) {
    const { h: H, w } = this.zd, k = this.paint;
    this.edit(c => {
      const seeds = [[Math.floor(i / w), i % w]]; if (this.mirror) seeds.push([Math.floor(i / w), w - 1 - (i % w)]);
      for (const [r0, c0] of seeds) {
        const tgt = c[r0][c0]; if (tgt === k) continue;
        const q = [[r0, c0]];
        while (q.length) { const [r, cc] = q.pop(); if (r < 0 || r >= H || cc < 0 || cc >= w || c[r][cc] !== tgt) continue; c[r][cc] = k; q.push([r + 1, cc], [r - 1, cc], [r, cc + 1], [r, cc - 1]); }
      }
    });
  }
  paintTools(T, names) {
    const t = this.t, rerender = () => this.app.render();
    const tool = (id, label) => h('button', { class: 'sf-seg', 'aria-pressed': String(this.tool === id), 'data-k': 'tool-' + id, onclick: () => { this.tool = id; rerender(); } }, label);
    const sw = k => h('button', { class: 'sf-swatch', role: 'radio', 'aria-checked': String(this.paint === k), 'aria-label': k === ' ' ? t.blankChip : names[k], title: k === ' ' ? t.blankChip : names[k], 'data-k': 'paint-' + (k === ' ' ? 'blank' : k),
      style: `background:${k === 'f' ? T.filled : k === ' ' ? T.face : CHIPS[k]}`, onclick: () => { this.paint = k; rerender(); } });
    return h('div', { class: 'sf-list' },
      h('div', { class: 'sf-row' }, tool('brush', t.brush), tool('fill', t.fillTool),
        h('button', { class: 'sf-seg', 'aria-pressed': String(this.mirror), 'data-k': 'mirror', onclick: () => { this.mirror = !this.mirror; rerender(); } }, t.mirror)),
      h('div', { class: 'sf-swatches ten', role: 'radiogroup', 'aria-label': t.paintColour }, ['r', 'o', 'y', 'g', 'b', 'v', 'w', 'k', 'f', ' '].map(sw)));
  }

  // ---------- photo ----------
  params() { const k = this.key(); return this.pp[k] || (this.pp[k] = { zoom: 1, px: 0.5, py: 0.5, dither: true, blank: true }); }
  remap(noHist) {
    const src = (this.photos[this.key()] || {}).img || sampleImage(), zd = this.zd;
    const cells = mapImage(src, zd.h, zd.w, Object.assign({ theme: this.app.cur().theme }, this.params()));
    this.write(cells, noHist);
  }
  photoPick() {
    const t = this.t, ph = this.photos[this.key()];
    const onFile = e => {
      const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
      const img = new Image();
      img.onload = () => { this.photos[this.key()] = { img, name: f.name }; Object.assign(this.params(), { zoom: 1, px: 0.5, py: 0.5 }); this.remap(); URL.revokeObjectURL(img.src); this.app.render(); };
      img.onerror = () => this.app.flash(t.photoFail);
      img.src = URL.createObjectURL(f);
    };
    const pick = h('input', { type: 'file', accept: 'image/*', style: 'display:none', onchange: onFile });
    const cam = h('input', { type: 'file', accept: 'image/*', capture: 'environment', style: 'display:none', onchange: onFile });
    return h('div', { class: 'sf-row' },
      h('button', { class: 'sf-btn primary', 'data-k': 'photo-pick', onclick: () => pick.click() }, t.choosePhoto),
      h('button', { class: 'sf-btn', 'data-k': 'photo-cam', onclick: () => cam.click() }, t.takePhoto),
      h('span', { class: 'sf-photo-name' }, ph ? ph.name : t.sampleImage), pick, cam);
  }
  photoControls() {
    const t = this.t, P = this.params(), has = !!this.photos[this.key()];
    const slider = (k, label, min, max, step) => h('label', { class: 'sf-slider' }, h('span', null, label),
      h('input', { type: 'range', min, max, step, value: P[k], 'data-k': 'ph-' + k, oninput: e => { P[k] = +e.target.value; this.remap(true); }, onchange: () => this.push(this.cells()) }));
    const check = (k, label, hint) => h('label', { class: 'sf-check top' }, h('input', { type: 'checkbox', checked: P[k], 'data-k': 'ph-' + k, onchange: e => { P[k] = e.target.checked; this.remap(); } }),
      h('span', null, label, hint ? h('span', { class: 'sf-hint block' }, hint) : null));
    return h('div', { class: 'sf-list' },
      has ? null : h('span', { class: 'sf-hint' }, t.sampleNote),
      slider('zoom', t.zoom, 1, 3, 0.05), slider('px', t.posX, 0, 1, 0.01), slider('py', t.posY, 0, 1, 0.01),
      check('dither', t.dither, t.ditherHint), check('blank', t.blankColour),
      h('span', { class: 'sf-hint' }, t.photoLocal));
  }

  // ---------- earlier messages ----------
  draftsEl(zd) {
    const t = this.t, list = this.drafts(), open = this.showDrafts, b = this.app.cur();
    const when = ms => {
      const d = new Date(ms), now = new Date(), y = new Date(Date.now() - 864e5), hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      return d.toDateString() === now.toDateString() ? `${t.today} ${hm}` : d.toDateString() === y.toDateString() ? `${t.yesterday} ${hm}` : `${d.getDate()}/${d.getMonth() + 1} ${hm}`;
    };
    return h('div', { class: 'sf-list ruled' },
      h('button', { class: 'sf-disclose', 'aria-expanded': String(open), 'data-k': 'drafts', onclick: () => { this.showDrafts = !open; this.app.render(); } },
        h('span', { 'aria-hidden': 'true' }, open ? '−' : '+'), h('span', null, `${t.drafts} (${list.length})`)),
      open ? [h('span', { class: 'sf-hint' }, list.length ? t.draftsNote : t.noDrafts),
        list.map(d => h('div', { class: 'sf-draft' },
          this.ed.thumb('drf-' + d.id, d.h, d.w, () => d.cells, b.theme),
          h('span', null, when(d.t)),
          h('button', { class: 'sf-small-btn', 'data-k': 'draft-' + d.id, onclick: () => this.write(toCells({ cells: d.cells }, zd.h, zd.w)) }, t.use)))] : null);
  }
}
