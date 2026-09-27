// The page around the board: control bar, editor drawer, composer, share, kiosk mode.
// Plain DOM, no framework. The drawer is rebuilt on structural changes (a click, a
// select); typing edits the board in place so inputs keep focus and the phone
// keyboard stays up.

import { Board, THEMES, fillGrid } from './renderer.js';
import { CHIPS, CHIP_KEYS, CHIP_NAMES, cleanChar, isChip } from './charset.js';
import { compose, zonesFor, toCells, defaultBoard, FALLBACK_PAGE, CHANNELS, LAYOUTS, newId, blank } from './content.js';
import { nextPage, inQuiet } from './schedule.js';
import { STR } from './strings.js';
import { loadBoards, saveBoards, getFlag, setFlag, sanitizeBoard, encodeBoard, decodeBoard } from './store.js';
import { Live, searchStations, searchCities } from './live.js';
import * as sound from './sound.js';
import qrcode from './vendor/qrcode.js';

// ---------- tiny DOM helper ----------
const PROPS = new Set(['value', 'checked', 'disabled', 'readOnly', 'type', 'min', 'max']);
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const k in props || {}) {
    const v = props[k];
    if (v == null || v === false && !k.startsWith('aria-')) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (PROPS.has(k)) el[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
const clone = o => JSON.parse(JSON.stringify(o));

export class App {
  constructor(root) {
    this.root = root;
    this.stage = root.querySelector('.sf-stage');
    this.wrap = root.querySelector('.sf-canvas-wrap');
    this.canvas = root.querySelector('canvas');
    this.liveRegion = root.querySelector('[aria-live]');
    this.main = root.querySelector('.sf-main');
    this.overlay = h('div', { class: 'sf-overlay' });
    this.comps = new Map();
    this.stage.append(this.overlay);

    const params = new URLSearchParams(location.search);
    const docLang = (document.documentElement.lang || 'en').slice(0, 2) === 'sv' ? 'sv' : 'en';
    // A page that has a twin in the other language (the maclaine.se copies) switches
    // language by navigating; the standalone page switches in place.
    this.alt = { en: document.querySelector('link[rel=alternate][hreflang=en]'), sv: document.querySelector('link[rel=alternate][hreflang=sv]') };
    this.S = {
      lang: this.alt[docLang] ? docLang : (getFlag('sf_lang') || docLang),
      editing: false, tab: 'pages', sel: 0, bar: true, cue: getFlag('sf_cue_seen') !== '1',
      share: false, switcher: false, caret: 0, cz: -1, notice: '', isFull: false,
      pageIdx: 0, pageStart: Date.now(), shareUrl: '', shareSvg: null, copied: false
    };
    this.kioskStrict = params.get('kiosk') === '1';
    if (this.kioskStrict) document.documentElement.classList.add('sf-kiosk');

    const { boards, active } = loadBoards();
    this.boards = boards.length ? boards : [defaultBoard(null, this.S.lang)];
    this.active = active;

    this.live = new Live(() => this.tick(true));
    this.board = new Board(this.canvas, Object.assign(this.boardOpts(), {
      onFlip: f => { if (this.cur().sound && !this.quietMode()) sound.click(f); }
    }));
    this.chromeTheme();
    this.bind();
    this.openLink().then(() => {
      this.refresh();
      this.wake(this.S.cue ? 12000 : 3000);
      this.iv = setInterval(() => this.tick(), 500);
      this.drift();
    });
  }

  // ---------- state helpers ----------
  get t() { return STR[this.S.lang]; }
  cur() { return this.boards[this.active] || this.boards[0]; }
  isMobile() { return innerWidth < 760; }
  set(patch, render = true) { Object.assign(this.S, patch); if (render) this.render(); }
  save() { saveBoards(this.boards, this.active); }
  upd(fn, quiet) {
    const b = clone(this.cur()); fn(b); this.boards[this.active] = b; this.save();
    this.refresh(quiet);
  }
  updPage(fn, quiet) { this.upd(b => { const p = b.pages[this.selIdx(b)]; if (p) fn(p, b); }, quiet); }
  selIdx(b = this.cur()) { return Math.max(0, Math.min(this.S.sel, b.pages.length - 1)); }
  flash(msg) { clearTimeout(this.noticeT); this.S.notice = msg; this.paintNotice(); this.noticeT = setTimeout(() => { this.S.notice = ''; this.paintNotice(); }, 3200); }

  dims() {
    const b = this.cur();
    if (b.size === 'fill') { const r = this.stage.getBoundingClientRect(); return fillGrid(r.width || innerWidth, r.height || innerHeight); }
    if (b.size === 'custom') return { rows: Math.max(1, Math.min(24, +b.rows || 6)), cols: Math.max(4, Math.min(60, +b.cols || 22)) };
    const [r, c] = b.size.split('x').map(Number); return { rows: r, cols: c };
  }
  boardOpts() { const b = this.cur(), d = this.dims(); return { rows: d.rows, cols: d.cols, theme: b.theme, transition: b.transition, speed: b.speed }; }
  quietMode() { const b = this.cur(); return !this.S.editing && inQuiet(b.quiet, Date.now()) ? b.quiet.mode : null; }
  currentPage() {
    const b = this.cur();
    if (this.S.editing) return b.pages[this.selIdx()];
    return this.S.pageIdx >= 0 ? b.pages[this.S.pageIdx] : FALLBACK_PAGE;
  }
  grid() {
    const d = this.dims();
    if (this.quietMode() === 'blank') return blank(d.rows, d.cols);
    return compose(this.currentPage(), d.rows, d.cols, Date.now(), this.S.lang, this.live.data);
  }

  // Board settings or content changed: re-apply to the renderer, the fetcher and (unless
  // quiet) the drawer.
  refresh(quiet) {
    this.board.setOptions(this.boardOpts());
    this.live.want(this.cur());
    this.tick(true);
    if (!quiet) this.render();
  }

  tick(force) {
    const b = this.cur(), now = Date.now();
    if (!this.S.editing) {
      const n = nextPage(b.pages, this.S.pageIdx, this.S.pageStart, now);
      this.S.pageIdx = n.idx; this.S.pageStart = n.start;
    }
    const g = this.grid();
    this.board.setGrid(g);
    this.wrap.style.opacity = this.quietMode() === 'dim' ? '0.22' : '1';
    const text = g.map(r => r.map(c => isChip(c) ? ' ' : c).join('').trim()).filter(Boolean).join('\n');
    if (text !== this.lastAria) { this.lastAria = text; this.liveRegion.textContent = text; }
    const stale = this.S.editing ? 0 : this.live.staleMinutes(this.currentPage());
    if (stale !== this.lastStale) { this.lastStale = stale; this.renderOverlay(); }
    if (force && this.S.editing) this.paintComposer();
  }

  // ---------- page-level wiring ----------
  bind() {
    const onMove = () => this.wake();
    addEventListener('mousemove', onMove); addEventListener('touchstart', onMove, { passive: true });
    addEventListener('keydown', e => this.globalKey(e));
    addEventListener('resize', () => { if (this.cur().size === 'fill' || this.wasMobile !== this.isMobile()) this.refresh(); this.wasMobile = this.isMobile(); });
    this.wasMobile = this.isMobile();
    document.addEventListener('fullscreenchange', () => { this.set({ isFull: !!document.fullscreenElement }); this.lock(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { this.lock(); this.tick(true); } });
    addEventListener('hashchange', () => this.openLink().then(() => this.refresh()));
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => this.chromeTheme());
    this.lock();
  }
  chromeTheme() {
    let t = null; try { t = localStorage.getItem('theme'); } catch { /* no storage */ }
    document.documentElement.dataset.chrome = t === 'light' || t === 'dark' ? t : (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  }
  // Keep the screen awake while it is being used as a display.
  async lock() {
    const want = (this.kioskStrict || this.S.isFull) && !document.hidden;
    try {
      if (want && !this.wl && navigator.wakeLock) { this.wl = await navigator.wakeLock.request('screen'); this.wl.addEventListener('release', () => { this.wl = null; }); }
      if (!want && this.wl) { await this.wl.release(); this.wl = null; }
    } catch { this.wl = null; }
  }
  // Burn-in care for screens left on for days: the whole board shifts by a pixel every
  // four minutes, round a small square. Nobody sees it; the panel does.
  drift() {
    const steps = [[0, 0], [1, 0], [1, 1], [0, 1]]; let i = 0;
    setInterval(() => { i = (i + 1) % 4; const [x, y] = steps[i]; this.wrap.style.transform = this.S.editing ? '' : `translate(${x}px, ${y}px)`; }, 240e3);
  }
  async openLink() {
    const m = /[#&]b=([A-Za-z0-9_-]+)/.exec(location.hash);
    if (!m) return;
    const b = await decodeBoard(m[1]);
    history.replaceState(null, '', location.pathname + location.search);
    if (!b) { this.flash(this.t.linkFail); return; }
    // Same board id: replace it. A kiosk that opens the same link at every boot keeps
    // one copy that follows the link, instead of piling up duplicates.
    const i = this.boards.findIndex(x => x.id === b.id);
    if (i >= 0) this.boards[i] = b; else this.boards.push(b);
    this.active = i >= 0 ? i : this.boards.length - 1;
    this.S.pageIdx = 0; this.S.pageStart = Date.now(); this.S.sel = 0;
    this.save();
    if (!this.kioskStrict) this.flash(this.t.imported);
  }
  wake(ms) {
    if (!this.S.bar) { this.S.bar = true; this.paintBar(); }
    clearTimeout(this.hideT);
    this.hideT = setTimeout(() => {
      if (this.S.share || this.S.switcher || this.overBar) return this.wake();
      this.S.bar = false; this.paintBar();
    }, ms || 3000);
  }
  globalKey(e) {
    const tag = (e.target && e.target.tagName) || '';
    if (e.key === 'Escape') {
      if (this.S.share || this.S.switcher) this.set({ share: false, switcher: false });
      else if (this.S.editing && !/INPUT|TEXTAREA|SELECT/.test(tag)) this.toggleEdit();
      return;
    }
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.metaKey || e.ctrlKey || e.altKey) return;
    this.wake();
    const k = e.key.toLowerCase();
    if (this.kioskStrict) return;
    if (k === 'e') this.toggleEdit(); else if (k === 'f') this.toggleFull(); else if (k === 's') this.toggleSound();
  }
  toggleEdit() {
    const editing = !this.S.editing;
    if (editing) this.dismissCue(false);
    const b = this.cur();
    this.S.editing = editing; this.S.share = false; this.S.switcher = false; this.S.cz = -1;
    if (editing) this.S.sel = this.S.pageIdx >= 0 ? this.S.pageIdx % b.pages.length : 0;
    this.S.pageStart = Date.now();
    this.wrap.style.transform = '';
    this.refresh();
    if (!editing) this.wake();
  }
  toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
  }
  toggleSound() { const on = !this.cur().sound; if (on) sound.unlock(); this.upd(b => { b.sound = on; }); }
  dismissCue(render = true) { setFlag('sf_cue_seen', '1'); this.S.cue = false; if (render) this.render(); }
  setLang(lang) {
    if (lang === this.S.lang) return;
    const link = this.alt[lang];
    if (link && link.href !== location.href.split('#')[0]) { location.href = link.href; return; }
    setFlag('sf_lang', lang); this.S.lang = lang; this.refresh();
  }

  // ---------- rendering ----------
  render() {
    const S = this.S, mobile = this.isMobile(), kiosk = this.kioskStrict || S.isFull;
    this.root.classList.toggle('editing', S.editing);
    this.root.classList.toggle('editing-mobile', S.editing && mobile);
    this.root.classList.toggle('kiosk', kiosk);
    document.documentElement.lang = S.lang;
    // drawer: rebuilt whole, scroll position and focus carried over
    const old = this.drawer;
    const scroll = old ? old.scrollTop : 0, winScroll = scrollY;
    const focusKey = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.k;
    if (S.editing) {
      this.drawer = this.renderDrawer();
      if (old) old.replaceWith(this.drawer); else this.root.insertBefore(this.drawer, this.main);
      if (old) { this.drawer.style.animation = 'none'; this.drawer.scrollTop = scroll; if (mobile) scrollTo(0, winScroll); }
      if (focusKey) { const el = this.drawer.querySelector(`[data-k="${focusKey}"]`); if (el) el.focus({ preventScroll: true }); }
    } else if (old) { old.remove(); this.drawer = null; }
    this.renderOverlay();
  }

  paintBar() {
    if (this.barWrap) this.barWrap.classList.toggle('on', this.S.bar);
    this.stage.classList.toggle('sf-hide-cursor', !this.S.bar && !this.S.editing);
  }
  paintNotice() {
    const el = this.root.querySelector('[data-notice]'); if (el) el.textContent = this.S.notice;
    if (!this.S.editing) this.renderOverlay();
  }

  renderOverlay() {
    const S = this.S, t = this.t, b = this.cur();
    const kids = [];
    if (this.lastStale > 0) kids.push(h('div', { class: 'sf-offline', role: 'status', style: `color:${b.theme === 'white' ? 'rgba(24,24,27,0.55)' : 'rgba(237,230,214,0.45)'}` }, t.offline(this.lastStale)));
    this.barWrap = null;
    if (!S.editing && !this.kioskStrict) {
      const wrap = h('div', {
        class: 'sf-bar-wrap' + (S.bar ? ' on' : ''),
        onmouseenter: () => { this.overBar = true; }, onmouseleave: () => { this.overBar = false; this.wake(); }
      });
      if (S.share) wrap.append(this.renderShare());
      if (S.switcher) wrap.append(this.renderSwitcher());
      if (S.notice) wrap.append(h('div', { class: 'sf-pop sf-toast', role: 'status' }, S.notice));
      if (S.cue) wrap.append(h('div', { class: 'sf-cue' }, h('span', null, t.cue), h('button', { onclick: () => this.dismissCue() }, t.gotIt)));
      wrap.append(h('nav', { class: 'sf-bar', 'aria-label': t.controls },
        h('button', { class: 'sf-btn primary caps', 'aria-keyshortcuts': 'E', 'data-k': 'bar-edit', onclick: () => this.toggleEdit() }, t.edit),
        h('button', { class: 'sf-bar-board', 'aria-haspopup': 'menu', 'aria-expanded': String(S.switcher), 'data-k': 'bar-board', onclick: () => this.set({ switcher: !S.switcher, share: false }) },
          h('span', null, b.name), h('span', { 'aria-hidden': 'true' }, '▾')),
        h('span', { class: 'sf-sep' }),
        h('button', { class: 'sf-bar-btn', 'aria-keyshortcuts': 'F', 'data-k': 'bar-full', onclick: () => this.toggleFull() }, S.isFull ? t.exitFs : t.fullscreen),
        h('button', { class: 'sf-bar-btn', 'aria-pressed': String(!!b.sound), 'aria-keyshortcuts': 'S', 'data-k': 'bar-sound', onclick: () => this.toggleSound() },
          h('span', null, t.sound), h('span', { class: 'state' }, b.sound ? t.on : t.off)),
        h('button', { class: 'sf-bar-btn', 'aria-expanded': String(S.share), 'data-k': 'bar-share', onclick: () => this.openShare() }, t.share),
        h('span', { class: 'sf-sep' }),
        h('div', { role: 'group', 'aria-label': t.lang, style: 'display:flex' },
          h('button', { class: 'sf-lang', 'aria-pressed': String(S.lang === 'en'), lang: 'en', onclick: () => this.setLang('en') }, 'EN'),
          h('button', { class: 'sf-lang', 'aria-pressed': String(S.lang === 'sv'), lang: 'sv', onclick: () => this.setLang('sv') }, 'SV'))));
      kids.push(wrap);
      this.barWrap = wrap;
    }
    const focusKey = document.activeElement && this.overlay.contains(document.activeElement) && document.activeElement.dataset.k;
    this.overlay.replaceChildren(...kids);
    if (focusKey) { const el = this.overlay.querySelector(`[data-k="${focusKey}"]`); if (el) el.focus({ preventScroll: true }); }
    this.paintBar();
  }

  async openShare() {
    if (this.S.share) { this.set({ share: false }); return; }
    const code = await encodeBoard(this.cur());
    const url = location.origin + location.pathname + '#b=' + code;
    let svg = null;
    try {
      const q = qrcode(0, 'L'); q.addData(url); q.make();
      const n = q.getModuleCount(); let d = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
      svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" role="img" aria-label="QR"><path d="${d}" fill="#000"/></svg>`;
    } catch { svg = null; }   // too long for the largest QR code
    this.set({ share: true, switcher: false, shareUrl: url, shareSvg: svg, copied: false });
  }
  renderShare() {
    const S = this.S, t = this.t;
    const qr = h('div', { class: 'sf-qr' + (S.shareSvg ? '' : ' none') });
    if (S.shareSvg) qr.innerHTML = S.shareSvg;   // built above from module coordinates only
    return h('div', { class: 'sf-pop sf-share', role: 'dialog', 'aria-label': t.share },
      qr,
      h('div', { class: 'sf-share-text' }, h('strong', null, t.shareTitle), h('span', null, S.shareSvg ? t.shareBody : t.shareLong)),
      h('div', { class: 'sf-share-row' },
        h('input', { readOnly: true, value: S.shareUrl, 'aria-label': t.boardLink, onfocus: e => e.target.select() }),
        h('button', { 'data-k': 'share-copy', onclick: () => { navigator.clipboard && navigator.clipboard.writeText(S.shareUrl).catch(() => {}); this.set({ copied: true }); setTimeout(() => this.set({ copied: false }), 1600); } }, S.copied ? t.copied : t.copy)));
  }
  renderSwitcher() {
    const t = this.t;
    return h('div', { class: 'sf-pop sf-menu', role: 'menu' },
      this.boards.map((bd, i) => h('button', { class: 'sf-menu-item', role: 'menuitem', 'aria-current': String(i === this.active), onclick: () => this.pickBoard(i) },
        h('span', null, bd.name), h('span', null, this.sizeLabel(bd)))),
      h('button', { class: 'sf-menu-new', role: 'menuitem', onclick: () => this.newBoard() }, '+ ' + t.newBoard));
  }
  sizeLabel(bd) { return bd.size === 'fill' ? this.t.fill : bd.size === 'custom' ? `${bd.rows} × ${bd.cols}` : bd.size.replace('x', ' × '); }
  pickBoard(i) { this.active = i; this.save(); Object.assign(this.S, { sel: 0, pageIdx: 0, pageStart: Date.now(), switcher: false, cz: -1 }); this.refresh(); }
  newBoard() {
    const t = this.t, nb = defaultBoard(t.newBoard, this.S.lang);
    nb.pages = [{ id: newId('p'), name: t.page + ' 1', layout: 'full', dur: 10, win: null, zones: [{ ch: 'message', o: { lines: ['', '', t.typeHere] } }] }];
    this.boards.push(nb); this.active = this.boards.length - 1; this.save();
    Object.assign(this.S, { sel: 0, pageIdx: 0, switcher: false, editing: true, tab: 'pages', cz: -1 });
    this.dismissCue(false); this.refresh();
  }

  // ---------- drawer ----------
  renderDrawer() {
    this.comps = new Map();
    const S = this.S, t = this.t, b = this.cur();
    const tab = (id, label) => h('button', { class: 'sf-tab', role: 'tab', 'aria-selected': String(S.tab === id), 'data-k': 'tab-' + id, onclick: () => this.set({ tab: id }) }, label);
    const panel = S.tab === 'board' ? this.panelBoard() : S.tab === 'boards' ? this.panelBoards() : this.panelPages();
    return h('aside', { class: 'sf-drawer', 'aria-label': t.editor },
      h('div', { class: 'sf-drawer-head' },
        h('div', { class: 'sf-drawer-title' },
          h('div', null, h('span', { class: 'sf-eyebrow' }, t.editing), h('strong', null, b.name)),
          h('button', { class: 'sf-btn primary caps', 'data-k': 'done', onclick: () => this.toggleEdit() }, t.done)),
        h('div', { class: 'sf-tabs', role: 'tablist' }, tab('pages', t.pages), tab('board', t.board), tab('boards', t.boards))),
      panel);
  }
  seg(items, cur, pick, key) {
    return items.map(([id, label]) => h('button', { class: 'sf-seg', 'aria-pressed': String(id === cur), 'data-k': key + '-' + id, onclick: () => pick(id) }, label));
  }

  panelPages() {
    const S = this.S, t = this.t, b = this.cur(), sel = this.selIdx(), page = b.pages[sel];
    const winText = w => w && w.on ? `  ${w.from} ${t.to} ${w.to}${w.days && w.days.length && w.days.length < 7 ? ' ' + w.days.map(d => t.dayShort[d]).join(' ') : ''}` : '';
    const list = h('ol', { class: 'sf-pages' }, b.pages.map((p, i) => h('li', { class: 'sf-page', 'aria-current': String(i === sel) },
      h('span', { class: 'sf-page-num' }, String(i + 1).padStart(2, '0')),
      h('button', { class: 'sf-page-main', 'data-k': 'page-' + i, onclick: () => this.set({ sel: i, cz: -1 }) },
        h('span', null, p.name || t.page + ' ' + (i + 1)), h('span', null, p.zones.map(z => t.channels[z.ch]).join(' + ') + winText(p.win))),
      h('div', { class: 'sf-page-tools' },
        h('label', null, h('input', { type: 'number', min: 3, max: 3600, value: p.dur, 'aria-label': t.duration, 'data-k': 'dur-' + i, onchange: e => this.upd(bb => { bb.pages[i].dur = Math.max(3, Math.min(3600, +e.target.value || 10)); }) }), h('span', null, 's')),
        h('button', { class: 'sf-icon', 'aria-label': t.moveUp, 'data-k': 'up-' + i, onclick: () => this.movePage(i, -1) }, '↑'),
        h('button', { class: 'sf-icon', 'aria-label': t.moveDown, 'data-k': 'down-' + i, onclick: () => this.movePage(i, 1) }, '↓'),
        h('button', { class: 'sf-icon del', 'aria-label': t.delPage, disabled: b.pages.length < 2, onclick: () => this.delPage(i) }, '×')))));
    const out = [h('section', { class: 'sf-section' },
      h('div', { class: 'sf-section-head' }, h('h3', { class: 'sf-eyebrow' }, t.playlist), h('button', { class: 'sf-link-btn', 'data-k': 'add-page', onclick: () => this.addPage() }, '+ ' + t.addPage)),
      list)];
    if (page) out.push(this.pageEditor(page, b));
    return h('div', { class: 'sf-panel' }, out);
  }
  movePage(i, dir) {
    const b = this.cur(), j = i + dir; if (j < 0 || j >= b.pages.length) return;
    this.upd(bb => { const [x] = bb.pages.splice(i, 1); bb.pages.splice(j, 0, x); }, true);
    if (this.S.sel === i) this.S.sel = j; else if (this.S.sel === j) this.S.sel = i;
    this.render();
  }
  delPage(i) {
    const b = this.cur(); if (b.pages.length < 2) return;
    this.upd(bb => { bb.pages.splice(i, 1); }, true);
    this.S.sel = Math.max(0, this.S.sel - (i <= this.S.sel ? 1 : 0)); this.S.cz = -1; this.render();
  }
  addPage() {
    const t = this.t;
    this.upd(bb => { bb.pages.push({ id: newId('p'), name: t.newPage, layout: 'full', dur: 10, win: null, zones: [{ ch: 'message', o: { cells: null } }] }); }, true);
    this.S.sel = this.cur().pages.length - 1; this.S.cz = 0; this.S.caret = 0; this.render();
  }

  pageEditor(page, b) {
    const t = this.t, d = this.dims();
    const LP = { full: ['1fr', '1fr', [['1', '1', 1]]], header: ['1fr', '1fr 2.4fr', [['1', '1', 0], ['1', '2', 1]]], split: ['1fr 1fr', '1fr', [['1', '1', 1], ['2', '1', 0]]], ticker: ['1fr', '2.4fr 1fr', [['1', '1', 1], ['1', '2', 0]]] };
    const layouts = h('div', { class: 'sf-layouts' }, LAYOUTS.map(id => {
      const [cols, rows, parts] = LP[id];
      return h('button', { class: 'sf-layout', 'aria-pressed': String(page.layout === id), 'data-k': 'layout-' + id, onclick: () => this.setLayout(id) },
        h('span', { class: 'sf-layout-pic', style: `grid-template-columns:${cols};grid-template-rows:${rows}` }, parts.map(([c, r, strong]) => h('span', { class: strong ? 'strong' : '', style: `grid-column:${c};grid-row:${r}` }))),
        h('span', null, t.layouts[id]));
    }));
    const zones = zonesFor(page.layout, d.rows, d.cols).map((z, zi) => this.zoneEditor(page, z, zi, b));
    const w = page.win || { on: false, from: '07:00', to: '09:00', days: [] };
    const setWin = fn => this.updPage(p => { p.win = Object.assign({ on: false, from: '07:00', to: '09:00', days: [] }, p.win); fn(p.win); });
    const days = w.days && w.days.length ? w.days : [];
    // Monday first in the picker; stored as Date.getDay() numbers
    const dayBtns = [1, 2, 3, 4, 5, 6, 0].map(dn => h('button', { class: 'sf-day', 'aria-pressed': String(!days.length || days.includes(dn)), 'data-k': 'day-' + dn,
      onclick: () => setWin(ww => {
        let cur = ww.days && ww.days.length ? ww.days.slice() : [0, 1, 2, 3, 4, 5, 6];
        cur = cur.includes(dn) ? cur.filter(x => x !== dn) : cur.concat(dn);
        ww.days = cur.length === 7 || !cur.length ? [] : cur.sort();
      }) }, t.dayShort[dn]));
    return h('section', { class: 'sf-section ruled' },
      h('label', { class: 'sf-field' }, h('span', { class: 'sf-eyebrow' }, t.name),
        h('input', { class: 'sf-input inset', value: page.name, 'data-k': 'page-name', oninput: e => this.updPage(p => { p.name = e.target.value.slice(0, 80); }, true), onchange: () => this.render() })),
      h('div', { class: 'sf-field' }, h('span', { class: 'sf-eyebrow' }, t.layout), layouts),
      zones,
      h('div', { class: 'sf-section' },
        h('label', { class: 'sf-check' }, h('input', { type: 'checkbox', checked: !!w.on, 'data-k': 'win-on', onchange: e => setWin(ww => { ww.on = e.target.checked; }) }), h('span', null, t.window)),
        w.on && h('div', { class: 'sf-row' },
          h('input', { type: 'time', class: 'sf-time', value: w.from, 'data-k': 'win-from', onchange: e => setWin(ww => { ww.from = e.target.value || '07:00'; }) }),
          h('span', { style: 'color:var(--muted);font-size:13px' }, t.to),
          h('input', { type: 'time', class: 'sf-time', value: w.to, 'data-k': 'win-to', onchange: e => setWin(ww => { ww.to = e.target.value || '09:00'; }) })),
        w.on && h('div', { class: 'sf-days' }, dayBtns)));
  }
  setLayout(id) {
    this.updPage(p => {
      const need = id === 'full' ? 1 : 2; p.layout = id;
      while (p.zones.length < need) p.zones.push(id === 'ticker' ? { ch: 'message', o: { text: 'YOUR TICKER TEXT' } } : { ch: 'clock', o: { fmt: '24' } });
      p.zones.length = need;
    });
  }

  zoneEditor(page, z, zi, b) {
    const t = this.t, zone = page.zones[zi] || { ch: 'message', o: {} }, o = zone.o || {};
    const ticker = page.layout === 'ticker' && zi === 1;
    const setO = (fn, quiet) => this.updPage(p => { p.zones[zi].o = Object.assign({}, p.zones[zi].o); fn(p.zones[zi].o); }, quiet);
    const head = h('div', { class: 'sf-zone-head' },
      h('span', { class: 'sf-eyebrow' }, `${t.zoneNames[page.layout][zi]}  ${z.h} × ${z.w}`),
      h('select', { 'aria-label': t.channel, 'data-k': 'ch-' + zi, onchange: e => this.setChannel(zi, e.target.value, ticker) },
        CHANNELS.map(id => h('option', { value: id, selected: id === zone.ch ? true : null }, t.channels[id]))));
    let body = null;
    if (zone.ch === 'message' && !ticker) body = this.composerEl(zi, z, zone, b);
    else if (zone.ch === 'message') body = h('label', { class: 'sf-field' }, h('span', null, t.text),
      h('input', { class: 'sf-input mono', value: o.text || '', 'data-k': 'tick-' + zi, oninput: e => setO(oo => { oo.text = e.target.value.slice(0, 500); }, true) }));
    else if (zone.ch === 'clock') body = h('div', { class: 'sf-row' }, h('span', { style: 'font-size:12px;color:var(--muted);flex:1' }, t.format),
      this.seg([['24', '24 h'], ['12', '12 h']], o.fmt || '24', v => setO(oo => { oo.fmt = v; }), 'fmt' + zi));
    else if (zone.ch === 'countdown') body = h('div', { class: 'sf-grid2' },
      h('label', { class: 'sf-field' }, h('span', null, t.label), h('input', { class: 'sf-input mono', value: o.label || '', 'data-k': 'cdl-' + zi, oninput: e => setO(oo => { oo.label = e.target.value.slice(0, 60); }, true) })),
      h('label', { class: 'sf-field' }, h('span', null, t.date), h('input', { type: 'date', class: 'sf-input', value: o.date || '', 'data-k': 'cdd-' + zi, onchange: e => setO(oo => { oo.date = e.target.value; }, true) })));
    else if (zone.ch === 'sl') body = this.slEditor(zi, o, setO);
    else if (zone.ch === 'weather') body = this.searchEditor(zi, t.city, o.city, q => searchCities(q, this.S.lang),
      r => setO(oo => { oo.city = r.name; oo.lat = r.lat; oo.lon = r.lon; }));
    else if (zone.ch === 'quote') body = h('p', { class: 'sf-note', style: 'font-size:13px' }, t.quoteNote);
    return h('div', { class: 'sf-zone' }, head, body);
  }
  setChannel(zi, v, ticker) {
    this.updPage(p => {
      p.zones[zi] = { ch: v, o: v === 'message' ? (ticker ? { text: 'YOUR TICKER TEXT' } : {}) : v === 'countdown' ? { label: 'MIDSOMMAR', date: '2027-06-25' } : v === 'clock' ? { fmt: '24' } : v === 'sl' ? { eta: 'min' } : {} };
    });
    this.S.cz = -1;
  }

  slEditor(zi, o, setO) {
    const t = this.t;
    const modes = Array.isArray(o.modes) ? o.modes : [];
    const modeBtns = ['METRO', 'TRAIN', 'TRAM', 'BUS', 'SHIP'].map(m => h('button', { class: 'sf-seg', 'aria-pressed': String(!modes.length || modes.includes(m)), 'data-k': `mode${zi}-${m}`,
      onclick: () => setO(oo => {
        let cur = oo.modes && oo.modes.length ? oo.modes.slice() : ['METRO', 'TRAIN', 'TRAM', 'BUS', 'SHIP'];
        cur = cur.includes(m) ? cur.filter(x => x !== m) : cur.concat(m);
        oo.modes = cur.length === 5 || !cur.length ? [] : cur;
      }) }, t.modeNames[m]));
    return h('div', { class: 'sf-section' },
      this.searchEditor(zi, t.station, o.name, q => searchStations(q), r => setO(oo => { oo.site = r.id; oo.name = r.name; })),
      h('div', { class: 'sf-field' }, h('span', null, t.modes), h('div', { class: 'sf-row' }, modeBtns)),
      h('div', { class: 'sf-row' }, h('span', { style: 'font-size:12px;color:var(--muted);flex:1' }, t.eta),
        this.seg([['min', t.etaMin], ['clock', t.etaClock]], o.eta || 'min', v => setO(oo => { oo.eta = v; }), 'eta' + zi)));
  }

  // A search box whose results update in place (no drawer rebuild while typing).
  searchEditor(zi, label, current, search, pick) {
    const t = this.t;
    const sugs = h('div', { class: 'sf-sugs' });
    let seq = 0;
    const input = h('input', {
      type: 'search', class: 'sf-input', placeholder: current || '', 'data-k': 'search-' + zi, autocomplete: 'off',
      oninput: async e => {
        const q = e.target.value, my = ++seq;
        if (!q.trim()) { sugs.replaceChildren(); return; }
        const res = await search(q);
        if (my !== seq) return;
        sugs.replaceChildren(...(res.length ? res.map(r => h('button', { class: 'sf-sug', onclick: () => pick(r) }, h('span', null, r.name), h('span', null, r.note || ''))) : [h('div', { class: 'sf-sug' }, h('span', null, t.noMatch))]));
      }
    });
    return h('div', { class: 'sf-field' },
      h('span', null, label, current ? h('span', { class: 'sf-current' }, '  ' + current) : null),
      input, sugs);
  }

  // ---------- composer: type straight onto the grid ----------
  composerEl(zi, z, zone, b) {
    const t = this.t, T = THEMES[b.theme], w = z.w, n = z.h * z.w;
    const cells = [];
    const grid = h('div', { class: 'sf-comp-grid', style: `grid-template-columns:repeat(${w},minmax(0,1fr));background:${T.housing}`, onclick: () => { this.S.cz = zi; input.focus(); this.paintComposer(); } });
    const drawerW = this.isMobile() ? innerWidth - 70 : 370;
    const fs = Math.max(7, Math.min(18, Math.floor((drawerW / w) * 0.62)));
    for (let i = 0; i < n; i++) {
      const cell = h('span', { class: 'sf-comp-cell', style: `font-size:${fs}px`, onmousedown: e => { e.preventDefault(); this.S.cz = zi; this.S.caret = i; input.focus(); this.paintComposer(); } });
      cells.push(cell); grid.append(cell);
    }
    const input = h('input', {
      class: 'sf-comp-input', value: '', 'aria-label': t.typeOnBoard, autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', 'data-k': 'comp-' + zi,
      onfocus: () => { if (this.S.cz !== zi) { this.S.cz = zi; this.S.caret = 0; } this.paintComposer(); },
      oninput: e => {
        const v = e.target.value; e.target.value = ''; if (!v) return;
        const out = [];
        for (const ch of v) { const r = cleanChar(ch); if (!r.valid) this.flash(t.blankNote(ch)); out.push(r.ch); }
        this.place(zi, z, out);
      },
      onkeydown: e => this.compKey(e, zi, z)
    });
    const chips = CHIP_KEYS.map(k => h('button', { class: 'sf-chip', style: `background:${k === 'f' ? T.filled : CHIPS[k]}`, 'aria-label': t.chip(CHIP_NAMES[this.S.lang][k]), title: t.chip(CHIP_NAMES[this.S.lang][k]),
      onclick: () => { this.place(zi, z, [k]); input.focus(); } }));
    const used = h('span');
    this.comps.set(zi, { zi, z, cells, used, T, input });
    const el = h('div', { class: 'sf-section' },
      h('div', { class: 'sf-composer' }, grid, input),
      h('div', { class: 'sf-row' }, chips, h('span', { style: 'flex:1' }),
        h('button', { class: 'sf-small-btn', onclick: () => this.compWrite(zi, z, c => c.forEach((r, ri) => { const a = r.join('').trim() ? r.slice(r.findIndex(x => x !== ' '), r.length - [...r].reverse().findIndex(x => x !== ' ')) : []; const off = Math.floor((w - a.length) / 2); c[ri] = Array(w).fill(' '); a.forEach((ch, j) => { c[ri][off + j] = ch; }); })) }, t.center),
        h('button', { class: 'sf-small-btn', onclick: () => { this.compWrite(zi, z, c => c.forEach(r => r.fill(' '))); this.S.caret = 0; this.paintComposer(); } }, t.clear)),
      h('div', { class: 'sf-comp-foot' }, used, h('span', { role: 'status', 'data-notice': '' }, this.S.notice)));
    queueMicrotask(() => this.paintComposer());
    return el;
  }
  paintComposer() { for (const c of this.comps.values()) this.paintOne(c); }
  paintOne(c) {
    if (!c.cells[0] || !c.cells[0].isConnected) return;
    const page = this.cur().pages[this.selIdx()], zone = page && page.zones[c.zi];
    if (!zone || zone.ch !== 'message') return;
    const grid = toCells(zone.o || {}, c.z.h, c.z.w).flat(), n = grid.length;
    const caret = this.S.cz === c.zi && document.activeElement === c.input ? Math.min(this.S.caret, n - 1) : -1;
    grid.forEach((ch, i) => {
      const chip = ch === 'f' ? c.T.filled : CHIPS[ch], el = c.cells[i];
      el.textContent = chip ? '' : ch;
      el.style.background = chip || c.T.face; el.style.color = c.T.glyph;
      el.classList.toggle('caret', i === caret);
    });
    c.used.textContent = `${grid.filter(x => x !== ' ').length} / ${n} ${this.t.flaps}`;
  }
  compWrite(zi, z, fn) {
    this.updPage(p => { const zz = p.zones[zi]; const c = toCells(zz.o || {}, z.h, z.w); fn(c); zz.o = { cells: c }; }, true);
    this.paintComposer();
  }
  place(zi, z, chars) {
    const n = z.h * z.w; let pos = this.S.cz === zi ? this.S.caret : 0, full = false;
    const list = [];
    for (const ch of chars) { if (pos >= n) { full = true; break; } list.push([pos, ch]); pos++; }
    this.compWrite(zi, z, c => list.forEach(([i, ch]) => { c[Math.floor(i / z.w)][i % z.w] = ch; }));
    this.S.cz = zi; this.S.caret = Math.min(n, pos);
    if (full || pos >= n) this.flash(this.t.full);
    this.paintComposer();
  }
  compKey(e, zi, z) {
    const n = z.h * z.w, w = z.w, pos = this.S.cz === zi ? this.S.caret : 0, k = e.key;
    const caret = i => { this.S.cz = zi; this.S.caret = Math.max(0, Math.min(n, i)); this.paintComposer(); };
    if (k === 'Backspace') { e.preventDefault(); const i = pos - 1; if (i >= 0) { this.compWrite(zi, z, c => { c[Math.floor(i / w)][i % w] = ' '; }); caret(i); } }
    else if (k === 'Delete') { e.preventDefault(); if (pos < n) this.compWrite(zi, z, c => { c[Math.floor(pos / w)][pos % w] = ' '; }); }
    else if (k === 'ArrowLeft') { e.preventDefault(); caret(pos - 1); }
    else if (k === 'ArrowRight') { e.preventDefault(); caret(pos + 1); }
    else if (k === 'ArrowUp') { e.preventDefault(); caret(pos - w); }
    else if (k === 'ArrowDown') { e.preventDefault(); caret(pos + w); }
    else if (k === 'Enter') { e.preventDefault(); const nx = (Math.floor(pos / w) + 1) * w; if (nx >= n) this.flash(this.t.full); else caret(nx); }
    else if (k === 'Escape') { e.currentTarget.blur(); }
  }

  // ---------- board + boards tabs ----------
  panelBoard() {
    const t = this.t, b = this.cur();
    const themes = h('div', { class: 'sf-themes' }, Object.values(THEMES).map(th => h('button', { class: 'sf-theme', 'aria-pressed': String(b.theme === th.id), 'data-k': 'theme-' + th.id, onclick: () => this.upd(bb => { bb.theme = th.id; }) },
      h('span', { class: 'sf-theme-pic', style: `background:${th.housing}` },
        h('span', { style: `background:${th.face};color:${th.glyph};font-family:${th.font}` }, 'A'),
        h('span', { style: `background:${th.face};color:${th.glyph};font-family:${th.font}` }, 'Ö'),
        h('span', { style: `background:${CHIPS.r}` })),
      h('span', null, th.label))));
    return h('div', { class: 'sf-panel' },
      h('section', { class: 'sf-section' }, h('h3', { class: 'sf-eyebrow' }, t.size),
        h('div', { class: 'sf-row' }, this.seg([['6x22', '6 × 22'], ['3x15', '3 × 15'], ['fill', t.fill], ['custom', t.custom]], b.size, v => this.upd(bb => { if (v === 'custom' && bb.size !== 'custom') { const d = this.dims(); bb.rows = d.rows; bb.cols = d.cols; } bb.size = v; }), 'size')),
        b.size === 'custom' && h('div', { class: 'sf-row', style: 'gap:10px' },
          h('label', { class: 'sf-field' }, h('span', null, t.rows), h('input', { type: 'number', class: 'sf-input inset', style: 'width:80px;font-family:var(--mono)', min: 1, max: 24, value: b.rows, 'data-k': 'rows', onchange: e => this.upd(bb => { bb.rows = Math.max(1, Math.min(24, +e.target.value || 6)); }) })),
          h('label', { class: 'sf-field' }, h('span', null, t.cols), h('input', { type: 'number', class: 'sf-input inset', style: 'width:80px;font-family:var(--mono)', min: 4, max: 60, value: b.cols, 'data-k': 'cols', onchange: e => this.upd(bb => { bb.cols = Math.max(4, Math.min(60, +e.target.value || 22)); }) })))),
      h('section', { class: 'sf-section' }, h('h3', { class: 'sf-eyebrow' }, t.theme), themes),
      h('section', { class: 'sf-section' }, h('h3', { class: 'sf-eyebrow' }, t.transition),
        h('div', { class: 'sf-row' }, this.seg(Object.entries(t.transitions), b.transition, v => this.upd(bb => { bb.transition = v; }), 'tr')),
        h('div', { class: 'sf-row' }, h('span', { style: 'font-size:12px;color:var(--muted);width:72px' }, t.speed),
          this.seg([['fast', t.speeds.fast], ['gentle', t.speeds.gentle], ['authentic', t.speeds.authentic]], b.speed, v => this.upd(bb => { bb.speed = v; }), 'sp'))),
      h('section', { class: 'sf-section' },
        h('label', { class: 'sf-check' }, h('input', { type: 'checkbox', checked: !!b.quiet.on, 'data-k': 'quiet-on', onchange: e => this.upd(bb => { bb.quiet.on = e.target.checked; }) }), h('span', { class: 'sf-eyebrow' }, t.quiet)),
        b.quiet.on && h('div', { class: 'sf-row', style: 'gap:10px' },
          h('input', { type: 'time', class: 'sf-time', value: b.quiet.from, 'data-k': 'q-from', onchange: e => this.upd(bb => { bb.quiet.from = e.target.value || '23:00'; }) }),
          h('span', { style: 'color:var(--muted);font-size:13px' }, t.to),
          h('input', { type: 'time', class: 'sf-time', value: b.quiet.to, 'data-k': 'q-to', onchange: e => this.upd(bb => { bb.quiet.to = e.target.value || '07:00'; }) }),
          this.seg([['blank', t.quietBlank], ['dim', t.quietDim]], b.quiet.mode, v => this.upd(bb => { bb.quiet.mode = v; }), 'qm'))),
      h('section', { class: 'sf-section' },
        h('label', { class: 'sf-check' }, h('input', { type: 'checkbox', checked: !!b.sound, 'data-k': 'sound', onchange: () => this.toggleSound() }), h('span', { class: 'sf-eyebrow' }, t.sound))));
  }

  panelBoards() {
    const t = this.t, b = this.cur();
    const file = h('input', { type: 'file', accept: 'application/json,.json', style: 'display:none', onchange: e => this.importFile(e) });
    return h('div', { class: 'sf-panel' },
      h('label', { class: 'sf-field' }, h('span', { class: 'sf-eyebrow' }, t.name),
        h('input', { class: 'sf-input inset', value: b.name, 'data-k': 'board-name', oninput: e => this.upd(bb => { bb.name = e.target.value.slice(0, 80); }, true), onchange: () => this.render() }),
        h('span', { class: 'sf-note' }, t.saved)),
      h('ul', { class: 'sf-boards' }, this.boards.map((bd, i) => h('li', null, h('button', { class: 'sf-board-item', 'aria-current': String(i === this.active), onclick: () => this.pickBoard(i) }, h('span', null, bd.name), h('span', null, this.sizeLabel(bd)))))),
      h('div', { class: 'sf-row', style: 'gap:8px' },
        h('button', { class: 'sf-btn primary', onclick: () => this.newBoard() }, t.newBoard),
        h('button', { class: 'sf-btn', onclick: () => { const nb = clone(b); nb.id = newId('b'); nb.name = b.name + t.copySuffix; this.boards.push(nb); this.active = this.boards.length - 1; this.save(); this.refresh(); } }, t.duplicate),
        h('button', { class: 'sf-btn', onclick: () => this.exportJson() }, t.exportJ),
        h('button', { class: 'sf-btn', onclick: () => file.click() }, t.importJ),
        h('button', { class: 'sf-btn', style: 'color:var(--muted)', disabled: this.boards.length < 2, onclick: () => { if (this.boards.length < 2) return; this.boards.splice(this.active, 1); this.active = 0; this.S.sel = 0; this.save(); this.refresh(); } }, t.del),
        file),
      h('p', { class: 'sf-note' }, t.jsonNote));
  }
  exportJson() {
    const b = this.cur(), blob = new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: (b.name || 'board').replace(/[^\wÀ-ɏ-]+/g, '_') + '.json' });
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  importFile(e) {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
    if (f.size > 262144) { this.flash(this.t.importFail); return; }
    f.text().then(txt => {
      let nb = null; try { nb = sanitizeBoard(JSON.parse(txt)); } catch { nb = null; }
      if (!nb) { this.flash(this.t.importFail); return; }
      nb.id = this.boards.some(x => x.id === nb.id) ? newId('b') : nb.id;
      this.boards.push(nb); this.active = this.boards.length - 1; this.S.sel = 0; this.save(); this.refresh();
    });
  }
}
