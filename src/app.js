// The page around the board: control bar, share, kiosk mode, and the state the editor
// drawer (editor.js) works on. Plain DOM, no framework. The drawer is rebuilt on
// structural changes (a click, a select); typing edits the board in place so inputs
// keep focus and the phone keyboard stays up.

import { Board, THEMES, fillGrid, renderStatic, staticGeom } from './renderer.js';
import { isChip, isDim } from './charset.js';
import { compose, FALLBACK_PAGE, newId, blank } from './content.js';
import { TEMPLATES, fromTemplate } from './templates.js';
import { RAINBOW } from './pixels.js';
import { nextPage, inQuiet } from './schedule.js';
import { STR } from './strings.js';
import { loadBoards, saveBoards, saveActiveOnly, getFlag, setFlag, sanitizeBoard, encodeBoard, decodeBoard } from './store.js';
import { Live } from './live.js';
import * as sound from './sound.js';
import qrcode from './vendor/qrcode.js';
import { Editor } from './editor.js';
import { Account, loadState } from './account.js';
import { parseRoute } from './route.js';
import { nowShowing, playlistPanel } from './week.js';
import { h, clone } from './dom.js';
import { VERSION, versionIn, shouldReload } from './changelog.js';

export class App {
  constructor(root) {
    this.root = root;
    this.stage = root.querySelector('.sf-stage');
    this.wrap = root.querySelector('.sf-canvas-wrap');
    this.canvas = root.querySelector('canvas');
    // The board as text, for screen readers (0.6). The twin inside the stage always holds the
    // current text, for anyone who moves to it; the live region speaks only when the page
    // changes or R is pressed, so a clock or a departures page never talks on every tick.
    this.liveRegion = root.querySelector('[aria-live]');
    this.twin = h('div', { class: 'sf-vh' }); this.stage.append(this.twin);
    this.stage.setAttribute('role', 'region');
    this.main = root.querySelector('.sf-main');
    this.overlay = h('div', { class: 'sf-overlay' });
    this.comps = new Map();
    this.stage.append(this.overlay);

    const params = new URLSearchParams(location.search);
    const docLang = (document.documentElement.lang || 'en').slice(0, 2) === 'sv' ? 'sv' : 'en';
    // A page that has a twin in the other language (the maclaine.se copies) switches
    // language by navigating; the standalone page switches in place.
    this.alt = { en: document.querySelector('link[rel=alternate][hreflang=en]'), sv: document.querySelector('link[rel=alternate][hreflang=sv]') };
    // A language picked before wins over the page it lands on (0.6.1); a first visit keeps
    // the page's language. The link, query and #board all come along.
    const picked = getFlag('sf_lang');
    if (this.alt[docLang] && picked && picked !== docLang && this.alt[picked]) {
      const path = new URL(this.alt[picked].href).pathname;
      if (path !== location.pathname) location.replace(path + location.search + location.hash);
    }
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
    // A first visit opens Explore on the first Edit. Picking a template then replaces the
    // demo made for this visit. The demo is saved at once (0.7.0 review), so its ids, and
    // the editor's addresses that name them, stay the same across reloads.
    const fresh = getFlag('sf_fresh'), started = getFlag('sf_started') === '1';
    this.hadBoards = boards.length > 0 && !(boards.length === 1 && boards[0].id === fresh);
    this.firstRun = !started && (!boards.length || (boards.length === 1 && boards[0].id === fresh));
    this.freshId = this.firstRun ? this.boards[0].id : null;
    if (!boards.length) { saveBoards(this.boards, 0); setFlag('sf_fresh', this.boards[0].id); setFlag('sf_words_070', '1'); }
    this.editor = new Editor(this);
    this.account = new Account(this);
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
      else if (parseRoute(location.hash) && !this.kioskStrict) { this.S.editing = true; this.dismissCue(false); this.editor.open(); }   // a reload lands where it was
      this.refresh();
      this.wake(this.S.cue ? 12000 : 3000);
      this.iv = setInterval(() => this.tick(), 500);
      // Accounts: only where the Worker answers, never on a wall screen.
      if (!this.kioskStrict) this.account.init().then(() => { if (this.account.offer.length) { Object.assign(this.S, { editing: true }); this.editor.go({ sec: 'acc', lv: 'main' }); this.refresh(); } });
      // A wall screen can run for weeks, so it looks for a new release once an hour. A
      // reload that reached its version clears the note of it.
      if (getFlag('sf_reload_for') === VERSION) setFlag('sf_reload_for', '');
      setTimeout(() => this.checkVersion(), 10 * 60e3); setInterval(() => this.checkVersion(), 36e5);
      this.drift();
    });
  }

  // ---------- state helpers ----------
  get t() { return STR[this.S.lang]; }
  cur() { return this.boards[this.active] || this.boards[0]; }
  // Under 1024 px the editor stacks: the board on top, one drawer level below it.
  isMobile() { return innerWidth < 1024; }
  set(patch, render = true) { Object.assign(this.S, patch); if (render) this.render(); }
  save() { saveBoards(this.boards, this.active); if (this.account) { this.account.changed(); if (!this.account.state.user) this.keepStorage(); } }
  // A guest has made something: ask the browser not to clear this site's storage on its
  // own (Chrome and recent Safari honour it). Once per page.
  keepStorage() {
    if (this.askedPersist || !navigator.storage || !navigator.storage.persist) return;
    this.askedPersist = true; navigator.storage.persist().catch(() => {});
  }
  // The one sign-in prompt (0.6.3): for a guest where accounts exist, once they have put
  // something in, a second board or three minutes in the editor. Dismissed for good.
  promptDue() {
    const a = this.account;
    if (!a || !a.available || a.user || a.state.user || this.S.cue || getFlag('sf_signin_prompt') === 'done') return false;
    return this.boards.length >= 2 || (+getFlag('sf_edit_ms') || 0) >= 180000;
  }
  dismissPrompt() { setFlag('sf_signin_prompt', 'done'); this.renderOverlay(); }
  // Another tab saved (0.6.4). Its list and its sync state are newer than this tab's, so
  // they are taken as they are, before this tab's next save could write an older list
  // over them. Nothing is saved here, so the tabs never echo each other.
  fromOtherTab() {
    const { boards } = loadBoards(), curId = this.cur() && this.cur().id;
    if (boards.length) {
      this.boards = boards;
      const i = boards.findIndex(b => b.id === curId); this.active = i >= 0 ? i : Math.min(this.active, boards.length - 1);
      if (i < 0) Object.assign(this.S, { sel: 0, pageIdx: 0, pageStart: Date.now() });
    }
    if (this.account) { this.account.state = loadState(); this.account.remember(); }
    this.refresh();
  }
  // The whole list at once (a sync pull, signing out), keeping the board on screen when it
  // is still there. Not counted as an edit to push. An empty list becomes a blank board.
  replaceBoards(list) {
    const curId = this.cur() && this.cur().id;
    this.account.replacing = true;
    this.boards = list && list.length ? list : [fromTemplate('blank', this.S.lang, this.live.data.home)];
    const i = this.boards.findIndex(b => b.id === curId);
    if (i < 0) Object.assign(this.S, { sel: 0, pageIdx: 0, pageStart: Date.now() });
    this.active = i >= 0 ? i : 0;
    this.save(); this.account.replacing = false;
    this.refresh();
  }
  // The account's sync status changed: the text updates in place. Rebuilding the drawer
  // here would run on every keystroke, since every save marks a board for sync.
  paintAccount() {
    this.renderOverlay();   // the bar's account button shows a failed sync, drawer open or not
    const d = this.drawer; if (!d) return;
    const sub = d.querySelector('[data-account-sub]'); if (sub) sub.textContent = this.editor.accountSub();
    const st = d.querySelector('[data-account-status]');
    if (st) { st.textContent = this.editor.accountStatus(); st.classList.toggle('fail', this.account.status === 'failed'); }
    const mark = d.querySelector('[data-sync-fail]'); if (mark) mark.hidden = this.account.status !== 'failed';
  }
  // The bar's account button: opens the Account panel, which explains guest or signed in.
  openAccount() {
    this.S.switcher = false;
    if (!this.S.editing) { this.S.editing = true; this.dismissCue(false); }
    this.editor.go({ sec: 'acc', lv: 'main' });
  }
  // Rename the board in place: the playlist header turns into a text field.
  renameBoard() {
    this.S.switcher = false;
    if (!this.S.editing) this.toggleEdit();
    this.editor.startRename();
  }
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
  // The big board holds the board being edited; anywhere else in the editor it plays on.
  holding() { return this.S.editing && (this.editor.onBoard() || !!this.editor.E.card); }
  saveActive() { saveActiveOnly(this.active); }   // which storyboard is showing, without rewriting them all
  currentPage() {
    const b = this.cur();
    if (this.holding()) return b.pages[this.selIdx()];
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
    if (!this.holding()) {
      const n = nextPage(b.pages, this.S.pageIdx, this.S.pageStart, now);
      this.S.pageIdx = n.idx; this.S.pageStart = n.start;
    }
    const g = this.grid();
    // a page arrives with its own transition, so it is set before the new grid
    if (!this.previewing && this.board.o.transition !== this.transitionNow()) this.board.setOptions({ transition: this.transitionNow() });
    if (!this.previewing) this.board.setGrid(g);
    this.paintHighlight();
    if (this.S.editing && !this.account.state.user) {   // editor time, for the sign-in prompt
      this.editMs = (this.editMs || 0) + Math.min(now - (this.lastEditTick || now), 1000); this.lastEditTick = now;
      if (this.editMs >= 10000) { setFlag('sf_edit_ms', String((+getFlag('sf_edit_ms') || 0) + this.editMs)); this.editMs = 0; }
    } else this.lastEditTick = 0;
    if (this.S.editing && now - (this.lastThumbs || 0) > 3000) { this.lastThumbs = now; this.editor.refreshThumbs(); }
    this.rolls(now);
    this.maybeReload(now);
    this.wrap.style.opacity = this.quietMode() === 'dim' ? '0.22' : '1';
    const text = g.map(r => r.map(c => isChip(c) || isDim(c) ? ' ' : c).join('').trim()).filter(Boolean).join('\n');
    if (text !== this.lastAria) { this.lastAria = text; this.twin.textContent = text; }
    const pageKey = [b.id, this.holding() ? 'e' + this.selIdx() : this.S.pageIdx, this.S.lang].join(':');
    if (pageKey !== this.lastPageKey) {
      this.lastPageKey = pageKey; this.stage.setAttribute('aria-label', this.stageLabel()); this.stage.setAttribute('aria-roledescription', this.t.stageRole);
      // Spoken only when a person caused the change: the first load, a board picked, the
      // editor closed, a page chosen in the editor. A playlist rotating by itself stays
      // silent, or it would talk every few seconds all day. R reads the board at any time.
      if (this.sayNext !== false || this.holding()) { this.sayNext = false; clearTimeout(this.sayT); this.sayT = setTimeout(() => this.announce(), 1200); }   // after live data has had a moment to arrive
    }
    const minute = Math.floor(now / 60000);
    if (this.nowEl && minute !== this.nowMinute) { this.nowMinute = minute; this.nowEl.lastChild.textContent = nowShowing(b, now, this.t); }
    const stale = this.S.editing ? 0 : this.live.staleMinutes(this.currentPage());
    if (stale !== this.lastStale) { this.lastStale = stale; this.renderOverlay(); }
    if (force && this.S.editing) this.editor.composer.paintGrid();
  }
  // Fetches changelog.js as text (no query string, so the service worker keeps one
  // entry) and marks a reload when it names another version. The reload waits for quiet
  // hours or 04:00, and never happens while the editor is open.
  async checkVersion() {
    try {
      const r = await fetch(new URL('./changelog.js', import.meta.url), { cache: 'no-cache' });
      const v = r.ok ? versionIn(await r.text()) : null;
      if (shouldReload(VERSION, v, getFlag('sf_reload_for'))) this.reloadPending = v;
    } catch { /* offline: try again next hour */ }
  }
  maybeReload(now) {
    if (!this.reloadPending || this.S.editing || this.S.share) return;
    if (this.quietMode() || new Date(now).getHours() === 4) { setFlag('sf_reload_for', this.reloadPending); this.reloadPending = false; location.reload(); }
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
    addEventListener('storage', e => {
      if (e.key === 'slmap_home' && this.readHome()) this.refresh();
      if (e.key === 'sf_boards' || e.key === 'sf_sync') this.fromOtherTab();
    });
    addEventListener('hashchange', () => { if (location.hash === '#log') return this.openLog(); if (parseRoute(location.hash)) return; this.openLink().then(() => this.refresh()); });
    // A click anywhere else closes an open more menu.
    addEventListener('click', e => { const E = this.editor.E; if (E.menu && !(e.target.closest && e.target.closest('.sf-more'))) { E.menu = null; E.confirm = null; this.render(); } });
    // The browser's back and forward move through the editor's levels (0.7). Back past the
    // first level closes the editor.
    addEventListener('popstate', () => {
      if (this.editor.closing) { this.editor.closing = false; history.replaceState(null, '', location.pathname + location.search); return; }   // Done, landing before the editor
      const r = parseRoute(location.hash);
      if (r && !this.kioskStrict) { if (!this.S.editing) { this.S.editing = true; this.dismissCue(false); } this.editor.apply(r); }
      else if (this.S.editing && !/^#b=/.test(location.hash)) this.toggleEdit(true);
    });
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
    scrollTo(0, 0);
    this.editor.go({ sec: 'acc', lv: 'log' });
    this.refresh();
  }
  // The board's name for screen readers: which board, which page of how many.
  stageLabel() {
    const b = this.cur(), t = this.t, i = this.holding() ? this.selIdx() : this.S.pageIdx, p = b.pages[i];
    return i >= 0 && p ? t.stageLabel(b.name, i + 1, b.pages.length, p.name) : t.stageLabel(b.name);
  }
  // Says the page once. Cleared first, so pressing R twice on the same text speaks again.
  announce() {
    const text = (this.lastAria || '').replace(/\s+/g, ' ').trim();
    this.liveRegion.textContent = '';
    requestAnimationFrame(() => { this.liveRegion.textContent = text ? `${this.stageLabel()}. ${text}` : this.stageLabel(); });
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
    if (k === 'r') { this.announce(); return; }   // read the board aloud, kiosk or not
    if (this.kioskStrict) return;
    if (k === 'e') this.toggleEdit(); else if (k === 'f') this.toggleFull(); else if (k === 's') this.toggleSound();
  }
  toggleEdit(fromHistory) {
    const editing = !this.S.editing;
    if (editing) this.dismissCue(false); else { this.editor.composer.leave(); if (!fromHistory) this.editor.close(); }
    const b = this.cur();
    this.S.editing = editing; this.S.share = false; this.S.switcher = false; this.S.cz = -1;
    if (editing) this.S.sel = this.S.pageIdx >= 0 ? this.S.pageIdx % b.pages.length : 0;
    else { this.S.pageIdx = this.selIdx(b); }
    this.S.pageStart = Date.now();
    this.wrap.style.transform = '';
    if (!editing) this.sayNext = true;   // set before refresh(), whose tick speaks
    if (editing) this.editor.open(); else this.refresh();
    if (!editing) { this.wake(); const edit = this.root.querySelector('[data-k="bar-edit"]'); if (edit && (!document.activeElement || document.activeElement === document.body)) edit.focus({ preventScroll: true }); }
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
    setFlag('sf_lang', lang);
    if (link) { const path = new URL(link.href).pathname; if (path !== location.pathname) { location.href = path + location.search + location.hash; return; } }
    this.S.lang = lang; this.refresh();
  }

  // ---------- rendering ----------
  // Never nested: rebuilding the drawer removes a focused text field, and the browser can
  // fire its change event right then, which calls render again from inside this one. A
  // nested call waits and runs once this one is done.
  render() {
    if (this.rendering) { this.renderAgain = true; return; }
    this.rendering = true;
    try { this.renderNow(); } finally {
      this.rendering = false;
      if (this.renderAgain) { this.renderAgain = false; this.render(); }
    }
  }
  renderNow() {
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
      // only ever one drawer on the page
      this.root.querySelectorAll('.sf-drawer').forEach(d => { if (d !== this.drawer) d.remove(); });
      this.editor.after();
      if (focusKey) { const el = this.drawer.querySelector(`[data-k="${focusKey}"]`); if (el) el.focus({ preventScroll: true }); }
    } else { this.root.querySelectorAll('.sf-drawer').forEach(d => d.remove()); this.drawer = null; }
    // Today's playlist, under the board beside the week on a wide screen (the phone has it
    // as a card above the week, inside the drawer).
    const E = this.editor.E, pl = S.editing && !mobile && E.sec === 'sb' && E.lv === 'sb' ? playlistPanel(this.editor, new Date()) : null;
    if (pl) { if (this.plEl) this.plEl.replaceWith(pl); else this.main.append(pl); this.plEl = pl; }
    else if (this.plEl) { this.plEl.remove(); this.plEl = null; }
    this.renderOverlay();
  }

  paintBar() {
    if (this.barWrap) this.barWrap.classList.toggle('on', this.S.bar);
    if (this.nowEl) this.nowEl.classList.toggle('on', this.S.bar);
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
      else if (this.promptDue()) {
        const safari = /^((?!chrome|chromium|android|crios|fxios).)*safari/i.test(navigator.userAgent);
        wrap.append(h('div', { class: 'sf-cue', role: 'status', 'data-k': 'signin-prompt' }, h('span', null, t.signInPrompt(safari)),
          h('button', { class: 'accent', 'data-k': 'prompt-signin', onclick: () => { setFlag('sf_signin_prompt', 'done'); this.account.signIn(); } }, t.signIn),
          h('button', { 'data-k': 'prompt-dismiss', onclick: () => this.dismissPrompt() }, t.notNow)));
      }
      wrap.append(h('nav', { class: 'sf-bar', 'aria-label': t.controls },
        h('button', { class: 'sf-btn primary caps', 'aria-keyshortcuts': 'E', 'data-k': 'bar-edit', onclick: () => this.toggleEdit() }, t.edit),
        h('button', { class: 'sf-bar-board', 'aria-haspopup': 'menu', 'aria-expanded': String(S.switcher), 'data-k': 'bar-board', onclick: () => this.set({ switcher: !S.switcher, share: false }) },
          h('span', null, b.name), h('span', { 'aria-hidden': 'true' }, '▾')),
        h('span', { class: 'sf-sep' }),
        h('button', { class: 'sf-bar-btn', 'aria-keyshortcuts': 'F', 'data-k': 'bar-full', onclick: () => this.toggleFull() }, S.isFull ? t.exitFs : t.fullscreen),
        h('button', { class: 'sf-bar-btn', 'aria-pressed': String(!!b.sound), 'aria-keyshortcuts': 'S', 'data-k': 'bar-sound', onclick: () => this.toggleSound() },
          h('span', null, t.sound), h('span', { class: 'state' }, b.sound ? t.on : t.off)),
        h('button', { class: 'sf-bar-btn', 'aria-expanded': String(S.share), 'data-k': 'bar-share', onclick: () => this.openShare() }, t.share),
        this.account && this.account.available ? h('button', { class: 'sf-bar-btn' + (this.account.signedIn() ? ' named' : ' signin'), 'data-k': 'bar-account', onclick: () => this.openAccount(),
            title: this.account.status === 'failed' || this.account.status === 'signedout' ? this.editor.accountStatus() : null },
          this.account.signedIn() ? this.account.user.name : this.account.status === 'signedout'
            ? [h('span', { class: 'sf-wide' }, t.signInToSync), h('span', { class: 'sf-narrow' }, t.signIn, h('span', { class: 'sf-bar-fail', 'aria-hidden': 'true' }, ' !'))] : t.signIn,
          this.account.status === 'failed' || this.account.refusedBoards().length ? h('span', { class: 'sf-bar-fail', 'aria-label': t.syncFailedMark, role: 'img' }, ' !') : null) : null,
        ));
      kids.push(wrap);
      this.barWrap = wrap;
    }
    const focusKey = document.activeElement && this.overlay.contains(document.activeElement) && document.activeElement.dataset.k;
    // With the editor closed, one line at the top: what is on now, and what comes next.
    if (!S.editing && !this.kioskStrict && this.cur().pages.length > 1) {
      const line = nowShowing(this.cur(), Date.now(), t);
      if (line) { this.nowEl = h('div', { class: 'sf-nowline' + (S.bar ? ' on' : ''), 'aria-hidden': 'true' }, h('span', { class: 'sf-eyebrow' }, t.todaysPlaylist), h('span', null, line)); kids.push(this.nowEl); }
    } else this.nowEl = null;
    this.overlay.replaceChildren(...kids);
    const inPop = focusKey == null && this.popWas && document.activeElement === document.body;
    if (focusKey) { const el = this.overlay.querySelector(`[data-k="${focusKey}"]`); if (el) el.focus({ preventScroll: true }); }
    // A menu or the share panel takes focus when it opens, and gives it back to its button
    // when it closes, so the keyboard never ends up behind the page.
    const pop = S.switcher ? 'switcher' : S.share ? 'share' : null;
    if (pop && pop !== this.popWas) { const first = this.overlay.querySelector('.sf-pop button, .sf-pop a, .sf-pop input'); if (first) first.focus({ preventScroll: true }); }
    else if (!pop && this.popWas && (inPop || document.activeElement === document.body)) { const opener = this.overlay.querySelector(`[data-k="bar-${this.popWas === 'switcher' ? 'board' : 'share'}"]`); if (opener) opener.focus({ preventScroll: true }); }
    this.popWas = pop;
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
      this.boards.map((bd, i) => h('div', { class: 'sf-menu-row' },
        h('button', { class: 'sf-menu-item', role: 'menuitem', 'aria-current': String(i === this.active), onclick: () => this.pickBoard(i), ondblclick: () => { this.pickBoard(i); this.renameBoard(); } },
          h('span', null, bd.name), h('span', null, this.showChanged() && this.changedAt(bd) ? this.changedAt(bd) : this.sizeLabel(bd))),
        i === this.active ? h('button', { class: 'sf-menu-rename', role: 'menuitem', 'data-k': 'menu-rename', title: t.renameBoard, 'aria-label': t.renameBoard, onclick: () => this.renameBoard() }, '✎') : null)),
      h('button', { class: 'sf-menu-new', role: 'menuitem', 'data-k': 'menu-all', onclick: () => this.allStoryboards() }, t.allStoryboards),
      h('button', { class: 'sf-menu-new', role: 'menuitem', 'data-k': 'menu-new', onclick: () => this.newBoard() }, '+ ' + t.newStoryboard));
  }
  // While a "(copy)" from a sync conflict is here, the menu shows when each account board
  // last changed on the server instead of its size, so it is clear which copy is newer.
  // The name may be what changed, so the pair cannot be matched by name.
  showChanged() { const sfx = this.t.otherDevice; return this.boards.some(o => o.name.endsWith(sfx)); }
  changedAt(bd) {
    const e = this.account && this.account.state.boards[bd.id], at = e && e.updated;
    if (!at) return null;
    const d = new Date(at), today = d.toDateString() === new Date().toDateString(), loc = this.S.lang === 'sv' ? 'sv-SE' : 'en-GB';
    return this.t.changedAt(today ? d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString(loc, { day: 'numeric', month: 'short' }));
  }
  sizeLabel(bd) { return bd.size === 'fill' ? this.t.fill : bd.size === 'custom' ? `${bd.rows} × ${bd.cols}` : bd.size.replace('x', ' × '); }
  pickBoard(i) { this.active = i; this.sayNext = true; this.save(); Object.assign(this.S, { sel: 0, pageIdx: 0, pageStart: Date.now(), switcher: false, cz: -1 }); this.refresh(); }
  // New board, from the board switcher: the Start panel, where a template adds a board.
  newBoard() {
    Object.assign(this.S, { switcher: false, editing: true, cz: -1 });
    this.dismissCue(false); this.editor.go({ sec: 'ex', lv: 'list' }); this.refresh();
  }
  allStoryboards() {
    Object.assign(this.S, { switcher: false, editing: true, cz: -1 });
    this.dismissCue(false); this.editor.go({ sec: 'sb', lv: 'list' }); this.refresh();
  }
  startPending() { return this.firstRun && getFlag('sf_started') !== '1'; }
  markStarted() { setFlag('sf_started', '1'); this.firstRun = false; }
  useTemplate(id) {
    const nb = fromTemplate(id, this.S.lang, this.live.data.home);
    if (this.startPending() && this.freshId === this.cur().id) this.boards[this.active] = nb;
    else { this.boards.push(nb); this.active = this.boards.length - 1; }
    this.freshId = null; this.markStarted(); this.save();
    Object.assign(this.S, { sel: 0, pageIdx: 0, pageStart: Date.now(), cz: -1, editing: true });
    this.editor.go({ sec: 'sb', lv: 'sb', sb: nb.id, view: 'week' }); this.refresh();
  }
  duplicateBoard(i) {
    const nb = clone(this.boards[i]); nb.id = newId('b'); nb.name = this.boards[i].name + this.t.copySuffix; delete nb.from;
    this.boards.push(nb); this.active = this.boards.length - 1; this.S.sel = 0; this.save(); this.refresh();
  }
  deleteBoard(i) {
    if (this.boards.length < 2) return;
    const [gone] = this.boards.splice(i, 1); this.account.deleted(gone.id); this.active = Math.max(0, Math.min(this.active - (i < this.active ? 1 : 0), this.boards.length - 1));
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
