// The page around the board: control bar, share, kiosk mode, and the state the editor
// drawer (editor.js) works on. Plain DOM, no framework. The drawer is rebuilt on
// structural changes (a click, a select); typing edits the board in place so inputs
// keep focus and the phone keyboard stays up.

import { Board, THEMES, fillGrid, renderStatic, staticGeom } from './renderer.js';
import { isChip } from './charset.js';
import { compose, FALLBACK_PAGE, newId, blank } from './content.js';
import { TEMPLATES, fromTemplate } from './templates.js';
import { RAINBOW } from './pixels.js';
import { nextPage, inQuiet } from './schedule.js';
import { STR } from './strings.js';
import { loadBoards, saveBoards, getFlag, setFlag, sanitizeBoard, encodeBoard, decodeBoard } from './store.js';
import { Live } from './live.js';
import * as sound from './sound.js';
import qrcode from './vendor/qrcode.js';
import { Editor } from './editor.js';
import { h, clone } from './dom.js';

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
      editing: false, sel: 0, bar: true, cue: getFlag('sf_cue_seen') !== '1',
      share: false, switcher: false, caret: 0, cz: -1, notice: '', isFull: false,
      pageIdx: 0, pageStart: Date.now(), shareUrl: '', shareSvg: null, copied: false
    };
    // ?bg=transparent draws the board on nothing, for OBS and other overlays. It is a
    // view setting only, never stored, and implies kiosk mode (no bar, no cue).
    this.transparent = params.get('bg') === 'transparent';
    this.kioskStrict = params.get('kiosk') === '1' || this.transparent;
    if (this.kioskStrict) document.documentElement.classList.add('sf-kiosk');
    if (this.transparent) document.documentElement.classList.add('sf-transparent');

    this.live = new Live(() => this.tick(true));
    this.readHome();

    const { boards, active } = loadBoards();
    this.boards = boards.length ? boards : [fromTemplate('demo', this.S.lang, this.live.data.home)];
    this.active = active;
    // A first visit opens the Start panel on the first Edit. Picking a template then
    // replaces the demo board made for this visit, as long as nothing on it was changed.
    this.firstRun = !boards.length && getFlag('sf_started') !== '1';
    this.freshId = boards.length ? null : this.boards[0].id;
    this.editor = new Editor(this);
    // ?template=home (the SL map links here): open that template's board, creating it
    // once. The parameter is removed so a reload does not make another.
    const tpl = params.get('template');
    if (tpl && TEMPLATES.some(x => x.id === tpl)) {
      let i = this.boards.findIndex(x => x.from === tpl);
      if (i < 0) { this.boards.push(fromTemplate(tpl, this.S.lang, this.live.data.home)); i = this.boards.length - 1; }
      this.active = i; this.S.cue = false; this.firstRun = false;
      params.delete('template');
      history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params : '') + location.hash);
      saveBoards(this.boards, this.active);
    }

    this.board = new Board(this.canvas, Object.assign(this.boardOpts(), { transparent: this.transparent,
      onFlip: (f, pan) => { const b = this.cur(); if (b.sound && !this.quietMode()) sound.play(f, b.soundStyle, pan); }
    }));
    this.chromeTheme();
    this.bind();
    this.openLink().then(() => {
      if (location.hash === '#log') this.openLog();
      this.refresh();
      this.wake(this.S.cue ? 12000 : 3000);
      this.iv = setInterval(() => this.tick(), 500);
      this.drift();
    });
  }

  // ---------- state helpers ----------
  get t() { return STR[this.S.lang]; }
  cur() { return this.boards[this.active] || this.boards[0]; }
  // Under 1024 px the editor stacks: the board on top, one drawer level below it.
  isMobile() { return innerWidth < 1024; }
  set(patch, render = true) { Object.assign(this.S, patch); if (render) this.render(); }
  save() { saveBoards(this.boards, this.active); }
  upd(fn, quiet) {
    const b = clone(this.cur()); fn(b); this.boards[this.active] = b; this.save();
    if (b.id === this.freshId) this.freshId = null;
    this.refresh(quiet);
  }
  updPage(fn, quiet) { this.upd(b => { const p = b.pages[this.selIdx(b)]; if (p) fn(p, b); }, quiet); }
  selIdx(b = this.cur()) { return Math.max(0, Math.min(this.S.sel, b.pages.length - 1)); }
  flash(msg) { clearTimeout(this.noticeT); this.S.notice = msg; this.paintNotice(); this.noticeT = setTimeout(() => { this.S.notice = ''; this.paintNotice(); }, 3200); }

  dims() { return this.dimsOf(this.cur()); }
  dimsOf(b) {
    if (b.size === 'fill') {
      // measured from the stage when this board is showing, else a full window
      const r = b === this.cur() && !this.S.editing ? this.stage.getBoundingClientRect() : { width: innerWidth, height: innerHeight };
      return fillGrid(r.width || innerWidth, r.height || innerHeight);
    }
    if (b.size === 'custom') return { rows: Math.max(1, Math.min(24, +b.rows || 6)), cols: Math.max(4, Math.min(60, +b.cols || 22)) };
    const [r, c] = b.size.split('x').map(Number); return { rows: r, cols: c };
  }
  boardOpts() { const b = this.cur(), d = this.dims(); return { rows: d.rows, cols: d.cols, theme: b.theme, transition: this.transitionNow(), speed: b.speed }; }
  // The page showing (or being edited) may pick its own transition; else the board's.
  transitionNow() { const p = this.currentPage(); return (p && p.tr) || this.cur().transition; }
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
    sound.setVolume(this.cur().volume ?? sound.DEFAULT_VOLUME);
    this.live.want(this.cur(), this.S.lang);
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
    // a page arrives with its own transition, so it is set before the new grid
    if (!this.previewing && this.board.o.transition !== this.transitionNow()) this.board.setOptions({ transition: this.transitionNow() });
    if (!this.previewing) this.board.setGrid(g);
    this.paintHighlight();
    if (this.S.editing && now - (this.lastThumbs || 0) > 3000) { this.lastThumbs = now; this.editor.refreshThumbs(); }
    this.rolls(now);
    this.wrap.style.opacity = this.quietMode() === 'dim' ? '0.22' : '1';
    const text = g.map(r => r.map(c => isChip(c) ? ' ' : c).join('').trim()).filter(Boolean).join('\n');
    if (text !== this.lastAria) { this.lastAria = text; this.liveRegion.textContent = text; }
    const stale = this.S.editing ? 0 : this.live.staleMinutes(this.currentPage());
    if (stale !== this.lastStale) { this.lastStale = stale; this.renderOverlay(); }
    if (force && this.S.editing) this.editor.composer.paintGrid();
  }
  // Rolls: every flap turns once when the board starts (after the first page has
  // settled), and optionally on the hour. Not while editing, in quiet hours or during a
  // transition preview.
  rolls(now) {
    const r = this.cur().roll; if (!r || this.S.editing || this.previewing || this.quietMode()) return;
    if (r.start && !this.startRolled && this.board.isIdle()) { this.startRolled = true; this.board.roll('curtain'); return; }
    const d = new Date(now), hour = d.toDateString() + d.getHours();
    if (r.hourly && d.getMinutes() === 0 && this.lastRollHour !== hour) { this.lastRollHour = hour; this.board.roll('curtain'); }
  }
  // The zone being edited, outlined on the big board in the chrome's accent.
  paintHighlight() {
    const rect = this.S.editing ? this.editor.hlRect() : null;
    this.board.setHighlight(rect, this.cur().theme === 'white' ? '#8C6222' : '#C8974A');
  }

  // The home station starred on the maclaine.se SL map (same site, same storage).
  // Shape there: { name, coords, sites: [siteId, ...] }. Anywhere else it is simply absent.
  readHome() {
    let h = null;
    try { const v = JSON.parse(localStorage.getItem('slmap_home')); if (v && v.name && Array.isArray(v.sites) && v.sites.length) h = { name: String(v.name).slice(0, 80), sites: v.sites.map(Number).filter(Number.isFinite).slice(0, 6) }; } catch { h = null; }
    const changed = JSON.stringify(h) !== JSON.stringify(this.live.data.home || null);
    this.live.data.home = h;
    return changed;
  }

  // ---------- page-level wiring ----------
  bind() {
    const onMove = () => this.wake();
    addEventListener('mousemove', onMove); addEventListener('touchstart', onMove, { passive: true });
    addEventListener('keydown', e => this.globalKey(e));
    addEventListener('resize', () => { if (this.cur().size === 'fill' || this.wasMobile !== this.isMobile()) this.refresh(); this.wasMobile = this.isMobile(); });
    this.wasMobile = this.isMobile();
    document.addEventListener('fullscreenchange', () => { this.set({ isFull: !!document.fullscreenElement }); this.lock(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { this.lock(); if (this.readHome()) this.refresh(); else this.tick(true); } });
    addEventListener('storage', e => { if (e.key === 'slmap_home' && this.readHome()) this.refresh(); });
    addEventListener('hashchange', () => { if (location.hash === '#log') return this.openLog(); this.openLink().then(() => this.refresh()); });
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
  openLog() {
    history.replaceState(null, '', location.pathname + location.search);
    if (this.kioskStrict) return;
    Object.assign(this.S, { editing: true, share: false, switcher: false });
    this.editor.prevLv = 'playlist';
    scrollTo(0, 0);
    this.editor.go('log');
    this.refresh();
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
    const tag = (e.target && e.target.tagName) || '', typing = /INPUT|TEXTAREA|SELECT/.test(tag);
    if (e.key === 'Escape') {
      if (this.S.share || this.S.switcher) this.set({ share: false, switcher: false });
      else if (this.S.editing && !typing) this.editor.escape();
      return;
    }
    // Undo and redo in the composer, when focus is not in some other text field.
    if (this.S.editing && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !typing && this.editor.composer.els) {
      e.preventDefault(); if (e.shiftKey) this.editor.composer.redo(); else this.editor.composer.undo(); return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    this.wake();
    const k = e.key.toLowerCase();
    if (this.kioskStrict) return;
    if (k === 'e') this.toggleEdit(); else if (k === 'f') this.toggleFull(); else if (k === 's') this.toggleSound();
  }
  toggleEdit() {
    const editing = !this.S.editing;
    if (editing) this.dismissCue(false); else this.editor.composer.leave();
    const b = this.cur();
    this.S.editing = editing; this.S.share = false; this.S.switcher = false; this.S.cz = -1;
    if (editing) this.S.sel = this.S.pageIdx >= 0 ? this.S.pageIdx % b.pages.length : 0;
    else { this.S.pageIdx = this.selIdx(b); }
    this.S.pageStart = Date.now();
    this.wrap.style.transform = '';
    if (editing) this.editor.open(); else this.refresh();
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
    // Same origin, same query (keeps ?kiosk=1): only the path swaps language.
    if (link) { const path = new URL(link.href).pathname; if (path !== location.pathname) { location.href = path + location.search; return; } }
    setFlag('sf_lang', lang); this.S.lang = lang; this.refresh();
  }

  // ---------- rendering ----------
  render() {
    const S = this.S, mobile = this.isMobile(), kiosk = this.kioskStrict || S.isFull;
    this.root.classList.toggle('editing', S.editing);
    this.root.classList.toggle('editing-mobile', S.editing && mobile);
    this.root.classList.toggle('kiosk', kiosk);
    document.documentElement.lang = S.lang;
    // drawer: rebuilt whole, scroll positions and focus carried over
    const old = this.drawer;
    const scrolls = old ? [...old.querySelectorAll('.sf-panel-body, .sf-pls')].map(el => el.scrollTop) : [];
    const lvBefore = old && old.querySelector('.sf-panel-body') ? old.querySelector('.sf-panel-body').dataset.lv : null;
    const focusKey = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.k;
    if (S.editing) {
      this.drawer = this.editor.render();
      if (old) old.replaceWith(this.drawer); else this.root.insertBefore(this.drawer, this.main);
      if (old) {
        this.drawer.style.animation = 'none';
        const now = [...this.drawer.querySelectorAll('.sf-panel-body, .sf-pls')];
        if (lvBefore === (now[0] && now[0].dataset.lv)) now.forEach((el, i) => { if (scrolls[i] != null) el.scrollTop = scrolls[i]; });
        else if (now[1] && scrolls[1] != null) now[1].scrollTop = scrolls[1];
      }
      this.editor.after();
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

  async openShare(keepOpen) {
    if (this.S.share && !keepOpen) { this.set({ share: false }); return; }
    const code = await encodeBoard(this.cur());
    const url = location.origin + location.pathname + (this.S.shareKiosk ? '?kiosk=1' : '') + '#b=' + code;
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
      h('label', { class: 'sf-check', style: 'grid-column:1 / -1;font-size:12px;color:var(--pale)' },
        h('input', { type: 'checkbox', checked: !!S.shareKiosk, 'data-k': 'share-kiosk', onchange: e => { this.S.shareKiosk = e.target.checked; this.openShare(true); } }), h('span', null, t.kioskLink)),
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
  // New board, from the board switcher: the Start panel, where a template adds a board.
  newBoard() {
    Object.assign(this.S, { switcher: false, editing: true, cz: -1 });
    this.dismissCue(false); this.editor.go('start'); this.refresh();
  }
  startPending() { return this.firstRun && getFlag('sf_started') !== '1'; }
  markStarted() { setFlag('sf_started', '1'); this.firstRun = false; }
  useTemplate(id) {
    const nb = fromTemplate(id, this.S.lang, this.live.data.home);
    if (this.startPending() && this.freshId === this.cur().id) this.boards[this.active] = nb;
    else { this.boards.push(nb); this.active = this.boards.length - 1; }
    this.freshId = null; this.markStarted(); this.save();
    Object.assign(this.S, { sel: 0, pageIdx: 0, pageStart: Date.now(), cz: -1 });
    this.editor.go(this.isMobile() ? 'playlist' : 'page'); this.refresh();
  }
  duplicateBoard(i) {
    const nb = clone(this.boards[i]); nb.id = newId('b'); nb.name = this.boards[i].name + this.t.copySuffix; delete nb.from;
    this.boards.push(nb); this.active = this.boards.length - 1; this.S.sel = 0; this.save(); this.refresh();
  }
  deleteBoard(i) {
    if (this.boards.length < 2) return;
    this.boards.splice(i, 1); this.active = Math.max(0, Math.min(this.active - (i < this.active ? 1 : 0), this.boards.length - 1));
    this.S.sel = 0; this.save(); this.refresh();
  }
  // The page being edited (or showing) as a PNG, with the board frame, at twice the
  // screen's density: a still of what the wall says, for sharing.
  saveImage() {
    const b = this.cur(), d = this.dims(), g = staticGeom(d.rows, d.cols, 0.6), scale = Math.min(96, Math.max(24, Math.floor(2400 / g.uw)));
    const cv = document.createElement('canvas');
    renderStatic(cv, { rows: d.rows, cols: d.cols, grid: this.grid(), theme: b.theme, pad: 0.6, width: Math.round(g.uw * scale), height: Math.round(g.uh * scale) });
    const page = this.currentPage(), name = `${b.name || 'board'} ${page && page.name ? page.name : ''}`.trim().replace(/[^\wÀ-ɏ-]+/g, '_');
    cv.toBlob(blob => { if (!blob) return; const a = h('a', { href: URL.createObjectURL(blob), download: name + '.png' }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }, 'image/png');
  }

  // Show off a transition or speed: flip to a sample card, hold, flip back. Both
  // directions use the chosen transition, so the whole effect is seen twice.
  async previewTransition() {
    const token = (this.previewToken || 0) + 1; this.previewToken = token;
    const b = this.cur(), d = this.dims(), t = this.t;
    const card = blank(d.rows, d.cols);
    for (let r = 0; r < d.rows; r++) for (let c = 0; c < d.cols; c++) card[r][c] = RAINBOW[(r + c) % 6];
    const tr = this.transitionNow(); this.board.setOptions({ transition: tr });
    const label = [...`${t.transitions[tr]} ${t.speeds[b.speed]}`.toUpperCase()].slice(0, d.cols);
    const mid = Math.floor(d.rows / 2), off = Math.floor((d.cols - label.length) / 2);
    for (let c = 0; c < d.cols; c++) card[mid][c] = ' ';
    label.forEach((ch, i) => { card[mid][off + i] = ch; });
    this.previewing = true;
    this.board.setGrid(card);
    const waitIdle = async () => { while (!this.board.isIdle()) { await new Promise(r => setTimeout(r, 100)); if (token !== this.previewToken) return false; } return true; };
    if (!await waitIdle()) return;
    await new Promise(r => setTimeout(r, 1100));
    if (token !== this.previewToken) return;
    this.previewing = false;
    this.tick(true);
  }

  // Volume applies live while dragging and plays a short sample when the drag ends,
  // so the level is judged by ear rather than by the number.
  volumeSlider(b) {
    const t = this.t, v = b.volume ?? sound.DEFAULT_VOLUME;
    const out = h('output', { class: 'sf-vol-out' }, String(v));
    const input = h('input', {
      type: 'range', class: 'sf-vol', min: 0, max: 100, step: 5, value: v, 'aria-label': t.volume, 'data-k': 'volume',
      oninput: e => { out.textContent = e.target.value; sound.setVolume(e.target.value); },
      onchange: e => { const nv = +e.target.value; this.upd(bb => { bb.volume = nv; }, true); if (nv > 0) sound.preview(b.soundStyle || 'clack'); }
    });
    return h('div', { class: 'sf-row' }, h('span', { style: 'font-size:12px;color:var(--muted);width:72px' }, t.volume), input, out);
  }

  exportJson(i = this.active) {
    const b = this.boards[i], blob = new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' });
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
