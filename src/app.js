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
import { loadBoards, loadBlueprints, sanitizeBlueprint, getFlag, setFlag, sanitizeBoard, encodeBoard, decodeBoard, loadLibrary, loadPlaylists, saveLibrary, savePlaylists, loadShown, saveShown,
  loadSettings, saveSettings, sanitizeSettings, sanitizePlaylist, sizeOf, dimsOfSize } from './store.js';
import { resolve, decompose, loadModel, usedIn, soloOf, settingsOf, boardFromPage } from './library.js';
import { Live } from './live.js';
import * as sound from './sound.js';
import qrcode from './vendor/qrcode.js';
import { Editor } from './editor.js';
import { Account, loadState, loadMyState } from './account.js';
import { loadConns, saveConns, sanitizeConnection } from './connections.js';
import { parseRoute } from './route.js';
import { nowShowing, playlistPanel } from './week.js';
import { h, clone } from './dom.js';
import { VERSION, versionIn, shouldReload } from './changelog.js';

const LOOK_MS = 180000;   // three minutes untouched ends a preview (0.10)
export const MAX_PL = 100, MAX_LIB = 500;   // playlists, and boards in your Boards (0.10.1)

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
    // The status line's voice (0.9.4): one live region that is never rebuilt, so a screen
    // reader hears every line even though the drawer that shows it is drawn again.
    this.statusLive = h('div', { class: 'sf-vh', role: 'status', 'aria-live': 'polite' }); root.append(this.statusLive);
    this.lines = []; this.lineN = 0;

    const params = new URLSearchParams(location.search);
    const docLang = (document.documentElement.lang || 'en').slice(0, 2) === 'sv' ? 'sv' : 'en';
    // A page that has a twin in the other language (the maclaine.se copies) switches
    // language by navigating; the standalone page switches in place.
    this.alt = { en: document.querySelector('link[rel=alternate][hreflang=en]'), sv: document.querySelector('link[rel=alternate][hreflang=sv]') };
    // A language picked before wins over the page it lands on (0.6.1); a first visit keeps
    // the page's language. The link, query and #board all come along.
    // back from a sign-in that did not finish (0.7.1): say so, and tidy the address
    if (params.get('error')) { this.signInError = params.get('error'); params.delete('error'); history.replaceState(history.state, '', location.pathname + (params.toString() ? '?' + params : '') + location.hash); }
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

    // 0.10.1: every board once, in your Boards (this.blueprints, the library), and playlists
    // that point at them (this.playlists). The app runs on the playlists resolved with their
    // boards (this.boards), the shape storyboards had, so the renderer, the week and the
    // editor work as before; save() takes an edited one apart again (library.js).
    const model = loadModel({ loadBoards, loadBlueprints, loadLibrary, loadPlaylists, saveLibrary, savePlaylists, loadShown, saveShown, getFlag, setFlag });
    this.blueprints = model.library; this.playlists = model.playlists || []; this.migrated = model.migrated;
    this.settings = loadSettings();
    const boards = this.playlists;
    this.resolveAll();
    this.active = Math.max(0, this.boards.findIndex(b => b.id === loadShown())); this.look = null; this.lookTpl = null;
    if (!this.boards.length) this.boards = [fromTemplate('demo', this.S.lang, this.live.data.home, this.firstPlace())];
    // A first visit opens Explore on the first Edit. Picking a template then replaces the
    // demo made for this visit. The demo is saved at once (0.7.0 review), so its ids, and
    // the editor's addresses that name them, stay the same across reloads.
    const fresh = getFlag('sf_fresh'), started = getFlag('sf_started') === '1';
    this.hadBoards = boards.length > 0 && !(boards.length === 1 && boards[0].id === fresh);
    this.firstRun = !started && (!boards.length || (boards.length === 1 && boards[0].id === fresh));
    this.freshId = this.firstRun ? this.boards[0].id : null;
    if (!boards.length) { this.save(); setFlag('sf_fresh', this.boards[0].id); setFlag('sf_words_070', '1'); }
    this.connections = loadConns();       // your own sources (0.9.2), kept in this browser and synced
    this.editor = new Editor(this);
    this.account = new Account(this);
    // ?template=home (the SL map links here): open that template's board, creating it
    // once. The parameter is removed so a reload does not make another.
    const tpl = params.get('template');
    if (tpl && TEMPLATES.some(x => x.id === tpl)) {
      let i = this.boards.findIndex(x => x.from === tpl);
      if (i < 0) { this.boards.push(fromTemplate(tpl, this.S.lang, this.live.data.home, this.newPlace())); i = this.boards.length - 1; }
      this.active = i; this.S.cue = false; this.firstRun = false;
      params.delete('template');
      history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params : '') + location.hash);
      this.save();
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
      if (this.signInError) setTimeout(() => this.flash(this.t.signInNotFinished, 10000), 400);
      this.iv = setInterval(() => this.tick(), 500);
      // Accounts: only where the Worker answers, never on a wall screen.
      if (!this.kioskStrict) this.account.init().then(() => { if (this.account.offerCount()) { Object.assign(this.S, { editing: true }); this.editor.go({ sec: 'acc', lv: 'main' }); this.refresh(); } });
      // A wall screen can run for weeks, so it looks for a new release once an hour. A
      // reload that reached its version clears the note of it.
      if (getFlag('sf_reload_for') === VERSION) setFlag('sf_reload_for', '');
      setTimeout(() => this.checkVersion(), 10 * 60e3); setInterval(() => this.checkVersion(), 36e5);
      this.drift();
    });
  }

  // ---------- state helpers ----------
  get t() { return STR[this.S.lang]; }
  // What the screen runs is boards[active], kept between visits. In the editor you can look
  // at something else (0.10): another storyboard (look, an index), a template (lookTpl, not
  // stored), a board in My boards, or a board about to be added. The screen shows it with the
  // gold bar, and nothing changes what the screen runs until Show on this screen.
  cur() {
    if (this.S && this.S.editing) {
      if (this.lookTpl) return this.lookTpl;
      if (this.look != null && this.boards[this.look]) return this.boards[this.look];
    }
    return this.boards[this.active] || this.boards[0];
  }
  curIdx() { return this.S.editing && this.look != null && this.boards[this.look] ? this.look : this.active; }
  shown() { return this.boards[this.active] || this.boards[0]; }
  looking() {
    if (!this.S.editing || this.kioskStrict) return false;
    const E = this.editor && this.editor.E;
    return !!(this.lookTpl || (this.look != null && this.look !== this.active) || (this.editor && this.editor.onBlueprint() && !this.bpOnScreen()) || (E && E.preview));
  }
  // A board of your Boards that this screen shows on its own is not being looked at.
  bpOnScreen() { const b = this.shown(), E = this.editor && this.editor.E; return !!(E && b && b.solo && b.pages[0] && b.pages[0].id === E.bp); }
  // Look at stored storyboard i in the editor. The one on the screen is not looking.
  setLook(i) {
    const was = this.curIdx(), next = i === this.active ? null : i;
    this.lookTpl = null;
    if (next === this.look && was === (next == null ? this.active : next)) return;
    this.look = next; this.lastInput = Date.now();
    Object.assign(this.S, { pageIdx: 0, pageStart: Date.now() });
    this.refresh(true);
  }
  lookAtTemplate(nb) { this.look = null; this.lookTpl = nb; this.lastInput = Date.now(); Object.assign(this.S, { pageIdx: 0, pageStart: Date.now(), sel: 0 }); this.refresh(true); }
  // Leave whatever was being looked at. The screen goes back, and says so.
  endLook(o = {}) {
    const was = this.looking(), name = this.shown().name;
    this.look = null; this.lookTpl = null;
    if (this.editor) this.editor.E.preview = null;
    if (!was) return false;
    Object.assign(this.S, { pageIdx: 0, pageStart: Date.now() });
    if (o.say !== false) this.say(o.msg || this.t.sBack(name), o.action ? { action: o.action } : {});
    this.refresh(true);
    return true;
  }
  // The one button that makes a preview real: Show on this screen.
  showHere() {
    const t = this.t, E = this.editor.E, bp = this.editor.bp();
    if (E.preview && E.sheet && E.sheet.kind === 'add') { this.editor.confirmAdd(); return; }
    if (this.lookTpl) { this.useTemplate(this.lookTpl.from, { kept: true }); return; }
    if (bp) { this.showBoard(bp.id); return; }
    if (this.look != null && this.boards[this.look]) {
      const prev = this.active;
      this.active = this.look; this.look = null; this.saveActive(); this.markShown();
      Object.assign(this.S, { pageIdx: 0, pageStart: Date.now() });
      this.say(t.sNow(this.shown().name), { action: { label: t.undo, fn: () => this.undoShow(prev) } });
      this.refresh();
    }
  }
  undoShow(prev) {
    if (!this.boards[prev]) return;
    const cur = this.active; this.active = prev; this.saveActive(); this.markShown();
    if (this.S.editing && this.editor.E.sec === 'sb' && this.boards[cur] && cur !== prev) this.look = cur;
    Object.assign(this.S, { pageIdx: 0, pageStart: Date.now() });
    this.say(this.t.sBack(this.shown().name)); this.refresh();
  }
  // Under 1024 px the editor stacks: the board on top, one drawer level below it.
  isMobile() { return innerWidth < 1024; }
  set(patch, render = true) { Object.assign(this.S, patch); if (render) this.render(); }

  // ---------- the library and the playlists (0.10.1) ----------
  libMap() { return new Map(this.blueprints.map(b => [b.id, b])); }
  // The playlists with their boards in place, keeping what the screen shows and what the
  // editor looks at by id.
  resolveAll() {
    const curId = this.boards && this.shown() && this.shown().id, lookId = this.boards && this.look != null && this.boards[this.look] ? this.boards[this.look].id : null;
    const lib = this.libMap();
    this.boards = this.playlists.map(pl => resolve(pl, lib));
    this.snap = new Map(this.boards.map(b => [b.id, JSON.stringify(b)]));
    if (curId != null) { const i = this.boards.findIndex(b => b.id === curId); this.active = i >= 0 ? i : Math.min(this.active || 0, Math.max(0, this.boards.length - 1)); }
    if (lookId != null) { const li = this.boards.findIndex(b => b.id === lookId); this.look = li >= 0 && li !== this.active ? li : null; }
  }
  // The resolved playlists that changed since they were resolved, taken apart into the
  // playlists and the boards. Returns whether any board changed.
  commit() {
    const lib = this.libMap(), byId = new Map(this.playlists.map(p => [p.id, p])), out = [], fresh = [];
    let libChanged = false;
    for (const sb of this.boards) {
      if (this.snap && this.snap.get(sb.id) === JSON.stringify(sb) && byId.has(sb.id)) { out.push(byId.get(sb.id)); continue; }
      const d = decompose(sb, lib);
      if (!d.playlist) continue;
      for (const lb of d.boards) {
        const i = this.blueprints.findIndex(x => x.id === lb.id);
        if (i >= 0) this.blueprints[i] = lb; else fresh.push(lb);
        lib.set(lb.id, lb); libChanged = true;
      }
      out.push(d.playlist);
    }
    if (fresh.length) this.blueprints = fresh.concat(this.blueprints);   // newest first, as My boards were
    this.playlists = out;
    this.resolveAll();
    return libChanged;
  }
  save() {
    const libChanged = this.commit();
    savePlaylists(this.playlists); if (libChanged) saveLibrary(this.blueprints); saveShown(this.shown() && this.shown().id);
    if (this.account) { this.account.changed(); if (libChanged) this.account.changedMy(); if (!this.account.state.user) this.keepStorage(); }
  }
  // Settings kept with the account (0.10.1): Home, and what was last shown.
  setting(id) { return this.settings.find(x => x.id === id) || null; }
  home() { return this.setting('home') || { id: 'home', stops: [] }; }
  putSetting(x) {
    const c = sanitizeSettings(x); if (!c) return;
    const i = this.settings.findIndex(y => y.id === c.id);
    if (i >= 0 && JSON.stringify(this.settings[i]) === JSON.stringify(c)) return;
    if (i >= 0) this.settings[i] = c; else this.settings.push(c);
    saveSettings(this.settings); if (this.account) this.account.changedSt();
  }
  setHome(patch) { this.putSetting(Object.assign({}, this.home(), patch)); this.editor.tplCache = null; }
  replaceSettings(list) { this.settings = list || []; saveSettings(this.settings); }
  // What this screen shows was chosen by a person: the account remembers it, so a new
  // device can offer it (0.10.1, lastShown).
  markShown() {
    const b = this.shown(); if (!b || this.kioskStrict) return;
    setFlag('sf_chosen', '1');
    this.putSetting({ id: 'last', pl: b.id, name: b.name, at: Date.now() });
  }
  // Show one board of your Boards on this screen: through the one-board playlist made for
  // it, made now if there is none.
  // Playlists against the cap: the one-board playlists made to show a board are not counted (0.10.1 review).
  plCount() { return this.playlists.filter(p => !p.solo).length; }
  showBoard(id, o = {}) {
    const t = this.t, lb = this.blueprints.find(x => x.id === id); if (!lb) return;
    let i = this.boards.findIndex(b => b.solo && b.pages.length === 1 && b.pages[0].id === id);
    if (i < 0) {
      // a one-board playlist keeps this screen's settings: its quiet hours, sound and transition (0.10.1 review)
      const pl = sanitizePlaylist(Object.assign({}, settingsOf(this.shown()), { name: lb.name, solo: true, items: [{ id, dur: lb.page.dur || 10, wins: [] }] }, this.shown().loc || !this.newPlace() ? {} : { loc: this.newPlace() }));
      delete pl.from;
      pl.id = newId('b'); this.playlists.push(pl); this.resolveAll(); i = this.boards.length - 1;
    }
    const prev = this.active;
    this.active = i; this.look = null; this.save(); this.markShown();
    Object.assign(this.S, { pageIdx: 0, pageStart: Date.now() });
    if (o.say !== false) this.say(t.sNow(lb.name), { action: { label: t.undo, fn: () => this.undoShow(prev) } });
    this.refresh();
  }
  // Delete a board from your Boards. Never refused: it is taken out of every playlist it is
  // in, a playlist left with nothing goes too, and the line names them, with Undo.
  deleteLibBoard(id) {
    const t = this.t, lb = this.blueprints.find(x => x.id === id); if (!lb) return;
    const shownId = this.shown() && this.shown().id;
    const was = this.playlists.map((pl, at) => ({ pl: JSON.parse(JSON.stringify(pl)), at, k: pl.items.findIndex(it => it.id === id) })).filter(x => x.k >= 0);
    const named = was.filter(x => !x.pl.solo).map(x => x.pl.name);
    this.blueprints = this.blueprints.filter(x => x.id !== id); this.account.deletedMy(id);
    const gone = new Set();
    this.playlists = this.playlists.map(pl => {
      if (!pl.items.some(it => it.id === id)) return pl;
      const items = pl.items.filter(it => it.id !== id);
      if (!items.length) { gone.add(pl.id); this.account.deleted(pl.id); return null; }
      return Object.assign({}, pl, { items });
    }).filter(Boolean);
    this.resolveAll();
    if (!this.boards.length) { this.boards = [fromTemplate('blank', this.S.lang, this.live.data.home, this.newPlace())]; }
    this.save(); saveLibrary(this.blueprints);
    Object.assign(this.S, { sel: 0, pageIdx: 0, pageStart: Date.now() });
    const undo = () => this.undoDeleteLib(lb, was, shownId);
    this.say(named.length ? t.deletedIn(lb.name, named) : t.deletedBoard(lb.name), { action: { label: t.undo, fn: undo } });
    this.refresh();
  }
  // Undo puts the board back under a new id, so a delete the account already has never
  // meets it, and puts it back where it was in each playlist.
  undoDeleteLib(lb, was, shownId) {
    const nid = newId('p'), c = Object.assign(JSON.parse(JSON.stringify(lb)), { id: nid }); c.page.id = nid;
    this.blueprints.unshift(c);
    let show = null;
    for (const w of was) {
      const item = Object.assign({}, w.pl.items[w.k], { id: nid }), i = this.playlists.findIndex(pl => pl.id === w.pl.id);
      if (i >= 0) { const items = this.playlists[i].items.slice(); items.splice(Math.min(w.k, items.length), 0, item); this.playlists[i] = Object.assign({}, this.playlists[i], { items }); if (w.pl.id === shownId) show = w.pl.id; }
      else { const pl = Object.assign({}, w.pl, { id: newId('b'), items: w.pl.items.map((it, k) => k === w.k ? item : it).filter(it => it.id === nid || this.blueprints.some(b => b.id === it.id)) }); this.playlists.splice(Math.min(w.at, this.playlists.length), 0, pl); if (w.pl.id === shownId) show = pl.id; }
    }
    this.resolveAll();
    if (show) { const i = this.boards.findIndex(b => b.id === show); if (i >= 0) this.active = i; }
    saveLibrary(this.blueprints); this.save(); this.account.changedMy();
    this.say(this.t.restored(c.name)); this.refresh();
  }
  // The playlists a board is in, for "In Morning and Office".
  usedIn(id) { return usedIn(id, this.playlists); }
  soloOf(id) { return soloOf(id, this.playlists); }
  // Every board of a playlist in one theme, from its Display settings.
  setPlaylistTheme(th) { this.upd(bb => { bb.theme = th; bb.pages.forEach(p => { p.theme = th; }); }); }
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
    if (this.linkVisit || !a || !a.available || a.user || a.state.user || this.S.cue || getFlag('sf_signin_prompt') === 'done') return false;
    return this.boards.length >= 2 || (+getFlag('sf_edit_ms') || 0) >= 180000;
  }
  dismissPrompt() { setFlag('sf_signin_prompt', 'done'); this.renderOverlay(); }
  // My boards (0.7.1). Saved and synced like storyboards, as their own list.
  // Connections (0.9.2): added, changed or removed in the editor, saved here and to the account.
  saveConns() { saveConns(this.connections); if (this.account) this.account.changedConn(); this.live.data.mkq.key = null; this.live.data.mkq.sheet = null; this.live.poll(true); }
  replaceConnections(list) { this.connections = list; saveConns(list); this.render(); }
  addConnection(kind, value, name) {
    const c = sanitizeConnection({ id: newId('c'), kind, value, name: name || this.t.connDefault[kind], updated: Date.now() });
    if (!c) return null;
    this.connections.push(c); this.saveConns(); return c;
  }
  updateConnection(id, patch) { const i = this.connections.findIndex(c => c.id === id); if (i < 0) return; const c = sanitizeConnection(Object.assign({}, this.connections[i], patch, { updated: Date.now() })); if (!c) return false; this.connections[i] = c; this.saveConns(); return true; }
  removeConnection(id) { const i = this.connections.findIndex(c => c.id === id); if (i < 0) return; this.connections.splice(i, 1); this.account.deletedConn(id); this.saveConns(); this.render(); }
  // A board edited, added or removed in your Boards: saved, and every playlist that shows it
  // shows the change.
  saveMy() { saveLibrary(this.blueprints); this.resolveAll(); if (this.account) { this.account.changedMy(); if (!this.account.state.user) this.keepStorage(); } }
  replaceBlueprints(list) { this.account.my.replacing = true; this.blueprints = list || []; saveLibrary(this.blueprints); this.resolveAll(); this.account.my.replacing = false; }
  deleteBlueprint(id) { this.deleteLibBoard(id); }
  // Another tab saved (0.6.4). Its list and its sync state are newer than this tab's, so
  // they are taken as they are, before this tab's next save could write an older list
  // over them. Nothing is saved here, so the tabs never echo each other.
  fromOtherTab() {
    // what the screen runs and what the editor looks at are kept by id, so another tab's save
    // never switches the screen or moves a preview to another playlist (0.10 review)
    const pls = loadPlaylists(), lib = loadLibrary(), curId = this.shown() && this.shown().id;
    if (lib) this.blueprints = lib;
    if (pls && pls.length) this.playlists = pls;
    this.settings = loadSettings();
    this.resolveAll();
    if (!this.boards.some(b => b.id === curId)) Object.assign(this.S, { sel: 0, pageIdx: 0, pageStart: Date.now() });
    if (this.account) { this.account.state = loadState(); this.account.remember(); this.account.my.state = loadMyState('sf_sync_lib'); this.account.my.remember(); this.account.st.state = loadMyState('sf_sync_st'); this.account.st.remember(); }
    this.refresh();
  }
  // The whole list at once (a sync pull, signing out), keeping the board on screen when it
  // is still there. Not counted as an edit to push. An empty list becomes a blank board.
  // 0.10.1: the playlists, as the account has them.
  replacePlaylists(list) {
    const curId = this.shown() && this.shown().id;
    this.account.replacing = true;
    this.playlists = list || [];
    this.resolveAll();
    if (!this.boards.length) this.boards = [fromTemplate('blank', this.S.lang, this.live.data.home)];
    if (!this.boards.some(b => b.id === curId)) { Object.assign(this.S, { sel: 0, pageIdx: 0, pageStart: Date.now() }); this.active = 0; }
    this.save(); this.account.replacing = false;
    this.refresh();
  }
  replaceBoards(list) { this.replacePlaylists(list); }
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
    if (this.S.editing && this.lookTpl) { const b = clone(this.lookTpl); fn(b); this.lookTpl = b; this.refresh(quiet); return; }   // a template is only looked at
    const i = this.curIdx(), b = clone(this.boards[i] || this.cur()); fn(b); this.boards[i] = b; this.save();
    if (b.id === this.freshId) this.freshId = null;
    if (this.S.editing) this.saved();
    this.refresh(quiet);
  }
  // "Saved" after a change in the editor (0.10), once typing pauses, with the time from the
  // second save on, so a run of saves is one line that moves on.
  saved() {
    clearTimeout(this.savedT);
    this.savedT = setTimeout(() => {
      const t = this.t, d = new Date(), hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const again = this.savedNav === this.editor.E.navKey; this.savedNav = this.editor.E.navKey;
      this.say(again ? t.sSavedAt(hhmm) : t.sSaved, { key: 'save' });
    }, 700);
  }
  updPage(fn, quiet) {
    const bp = this.editor.bp();
    if (bp) { const i = this.blueprints.indexOf(bp), c = clone(bp); fn(c.page, c); c.name = c.page.name || c.name; this.blueprints[i] = sanitizeBlueprint(c) || c; this.saveMy(); this.saved(); this.refresh(quiet); return; }
    this.upd(b => { const p = b.pages[this.selIdx(b)]; if (p) fn(p, b); }, quiet);
  }
  selIdx(b = this.cur()) { return Math.max(0, Math.min(this.S.sel, b.pages.length - 1)); }
  flash(msg, ms) { this.say(msg, ms ? { ms } : {}); }
  // The status line (0.9.4): every press answers in words, in one place. In the editor it
  // sits under the panel's title; with the editor closed it floats above the control bar.
  // A line lasts 7 s, or 12 s with an action (Undo, Show it now, Try again). The newest is on
  // top and the one before stays below, fainter, until its time is up. A line with the same
  // key replaces the older one, so a run of saves never stacks.
  say(msg, o = {}) {
    if (o.key !== 'save') clearTimeout(this.savedT);   // a line that says what happened stands in for "Saved"
    const now = Date.now(), ms = o.ms || (o.action ? 12000 : 7000);
    const line = { id: ++this.lineN, msg, fail: !!o.fail, action: o.action || null, key: o.key || null, until: now + ms };
    this.lines = [line, ...this.lines.filter(l => l.until > now && !(line.key && l.key === line.key))].slice(0, 2);
    this.S.notice = msg;
    this.statusLive.textContent = ''; setTimeout(() => { this.statusLive.textContent = msg; }, 40);
    this.paintNotice();
  }
  liveLines() { const now = Date.now(); return this.lines.filter(l => l.until > now); }
  statusLines(cls = '') {
    const lines = this.liveLines(); if (!lines.length) return null;
    // 0.10.1 (walkthrough): one line at a time. Two stacked took a sixth of a phone's panel, and
    // the newer line always says what the screen is doing now.
    return h('div', { class: 'sf-status ' + cls, 'data-status': '' }, lines.slice(0, 1).map((l, i) => h('div', { class: 'sf-status-line' + (l.fail ? ' fail' : '') + (i ? ' old' : ''), 'data-k': i ? null : 'status-line' },
      h('span', { class: 'sf-dot', 'aria-hidden': 'true' }), h('span', { class: 'sf-status-text' }, l.msg),
      l.action ? h('button', { class: 'sf-status-act', 'data-k': i ? null : 'status-act', onclick: () => { l.until = 0; l.action.fn(); this.paintNotice(); } }, l.action.label) : null)));
  }

  // 0.10.1: each board has its own size and theme, so the screen takes them from the board
  // on it (a playlist may mix sizes), else from the playlist, as a storyboard had them.
  dims() { const bp = this.editor && this.editor.bp(); if (bp) return this.dimsOf(bp); const p = this.editor && this.currentPage(); return p && p.size ? this.dimsOf(p) : this.dimsOf(this.cur()); }
  dimsOf(b) {
    if (sizeOf(b) === 'fill') {
      // 0.10.2 (QA E-M3): Fill screen is the wall's setting. The screen running the board
      // measures itself; a wall (kiosk or fullscreen) remembers what it measured, and the
      // editor and thumbnails use that, else 8 x 22, never a phone's own portrait shape.
      if ((b === this.cur() || (this.editor && b === this.currentPage())) && !this.S.editing) {
        const r = this.stage.getBoundingClientRect(), d = fillGrid(r.width || innerWidth, r.height || innerHeight);
        // a wall is a kiosk, or a big screen gone fullscreen; a phone counts only as ?kiosk=1 (0.10.2 review)
        if ((this.kioskStrict || (this.S.isFull && !this.isMobile())) && r.width > 0) { const k = `${d.rows}x${d.cols}`; if (getFlag('sf_fill') !== k) setFlag('sf_fill', k); }
        return d;
      }
      return this.fillSeen() || { rows: 8, cols: 22 };
    }
    return dimsOfSize(b);
  }
  // The last size a wall in this browser filled, as rows x columns, or null.
  fillSeen() { const m = /^(\d{1,2})x(\d{1,2})$/.exec(getFlag('sf_fill') || ''); return m && +m[1] >= 1 && +m[1] <= 24 && +m[2] >= 4 && +m[2] <= 60 ? { rows: +m[1], cols: +m[2] } : null; }
  themeNow() { const bp = this.editor && this.editor.bp(); if (bp) return bp.theme; const p = this.editor && this.currentPage(); return (p && p.theme) || this.cur().theme; }
  boardOpts() { const b = this.cur(), d = this.dims(); return { rows: d.rows, cols: d.cols, theme: this.themeNow(), transition: this.transitionNow(), speed: b.speed }; }
  // The page showing (or being edited) may pick its own transition; else the board's.
  transitionNow() { const p = this.currentPage(); return (p && p.tr) || this.cur().transition; }
  quietMode() { const b = this.cur(); return !this.S.editing && inQuiet(b.quiet, Date.now()) ? b.quiet.mode : null; }
  // The big board holds the board being edited; anywhere else in the editor it plays on.
  holding() { return this.S.editing && (this.editor.onBoard() || this.editor.onBlueprint() || !!this.editor.E.card || !!this.editor.E.preview); }
  saveActive() { saveShown(this.shown() && this.shown().id); }   // what this screen shows, by id, without rewriting the playlists
  currentPage() {
    const b = this.cur();
    const E = this.editor.E, bp = this.editor.bp();
    if (this.S.editing && E.preview) return E.preview;            // a board about to be added, at this storyboard's size
    if (this.S.editing && bp) return bp.page;
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
    const now = Date.now();
    // a preview left alone ends by itself, so a screen is never left on one (0.10)
    if (this.looking() && now - (this.lastInput || now) > LOOK_MS && !this.editor.E.sheet) this.lookTimedOut();
    const b = this.cur();
    if (!this.holding()) {
      const n = nextPage(b.pages, this.S.pageIdx, this.S.pageStart, now);
      this.S.pageIdx = n.idx; this.S.pageStart = n.start;
    }
    // a board arrives at its own size and theme (0.10.1), and with its own transition, so they
    // are set before the new grid
    const d = this.dims(), th = this.themeNow(), o = this.board.o;
    if (!this.previewing && (o.rows !== d.rows || o.cols !== d.cols || o.theme !== th)) { this.board.setOptions({ rows: d.rows, cols: d.cols, theme: th }); this.chromeTheme(); }
    const g = this.grid();
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
    this.board.setHighlight(rect, this.themeNow() === 'white' ? '#8C6222' : '#C8974A');
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
    for (const ev of ['pointerdown', 'keydown', 'wheel', 'touchstart']) addEventListener(ev, () => { this.lastInput = Date.now(); }, { passive: true, capture: true });
    // a phone turning round changes what is worked out at render time: the composer's cells and
    // the folded playlist (0.10.2 review), so the editor is drawn again when those would change
    const shape = () => `${this.isMobile()}|${innerHeight < 500}|${Math.round(innerWidth / 100)}`;
    this.shapeWas = shape();
    addEventListener('resize', () => { const now = shape(), moved = now !== this.shapeWas; this.shapeWas = now;
      if (sizeOf(this.cur()) === 'fill' || this.wasMobile !== this.isMobile() || (moved && this.S.editing)) this.refresh(); this.wasMobile = this.isMobile(); });
    this.wasMobile = this.isMobile();
    document.addEventListener('fullscreenchange', () => { this.set({ isFull: !!document.fullscreenElement }); this.lock(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { this.lock(); if (this.readHome()) this.refresh(); else this.tick(true); } });
    addEventListener('storage', e => {
      if (e.key === 'slmap_home' && this.readHome()) this.refresh();
      if (['sf_playlists', 'sf_library', 'sf_sync_pl', 'sf_sync_lib', 'sf_settings', 'sf_sync_st'].includes(e.key)) this.fromOtherTab();
      if (e.key === 'sf_conns' || e.key === 'sf_sync_conn') { this.connections = loadConns(); this.account.cn.state = loadMyState('sf_sync_conn'); this.account.cn.remember(); this.render(); }
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
    // A visit that came by a board link is a screen (0.9.4): no sign-in prompt and no cue,
    // since there may be nobody there to press Not now.
    this.linkVisit = true; this.S.cue = false;
    // Same board id: replace it. A kiosk that opens the same link at every boot keeps
    // one copy that follows the link, instead of piling up duplicates.
    // 0.10.1: its boards are copied into your Boards, under the ids the link gives them, so
    // opening it again replaces the same ones.
    const i = this.boards.findIndex(x => x.id === b.id);
    if (b.pages.length === 1 && (b.pages[0].name || '') === b.name) b.solo = true;
    // the copy rule (0.10.1 review): in a browser you edit in, a board of yours with the link's id
    // but other content is kept, and the link's comes in as a copy. A wall replaces, to follow the link.
    let copied = false;
    if (!this.kioskStrict) {
      const lib = this.libMap();
      b.pages.forEach(p => { const own = lib.get(p.id); if (own && JSON.stringify(boardFromPage(p, b, p.id, own)) !== JSON.stringify(own)) { p.id = newId('p'); copied = true; } });
    }
    if (i >= 0) this.boards[i] = b; else this.boards.push(b);
    this.active = i >= 0 ? i : this.boards.length - 1;
    this.S.pageIdx = 0; this.S.pageStart = Date.now(); this.S.sel = 0;
    this.save();
    if (!this.kioskStrict) this.flash(copied ? this.t.importedCopy : this.t.imported);
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
      else if (this.S.editing && (!typing || this.editor.E.sheet)) this.editor.escape();   // a sheet closes even from its text box
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
    if (!editing) this.leaveEditor();
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
    this.paintLook();
    document.documentElement.lang = S.lang;
    // drawer: rebuilt whole, scroll positions and focus carried over
    const old = this.drawer;
    const scrolls = old ? [...old.querySelectorAll('.sf-panel-body, .sf-pls, .sf-week-scroll')].map(el => el.scrollTop) : [];
    const lvBefore = old && old.querySelector('.sf-panel-body') ? old.querySelector('.sf-panel-body').dataset.lv : null;
    const focusKey = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.k;
    if (S.editing) {
      this.drawer = this.editor.render();
      if (old) old.replaceWith(this.drawer); else this.root.insertBefore(this.drawer, this.main);
      if (old) {
        this.drawer.style.animation = 'none';
        const now = [...this.drawer.querySelectorAll('.sf-panel-body, .sf-pls, .sf-week-scroll')];
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

  // The gold bar (0.10): only while looking at something that is not on the screen. It sits
  // under the board, which is refitted above it, so no flap is covered, and a thin gold
  // frame goes round the screen as a second sign. Its one button makes it real.
  paintLook() {
    const on = this.looking(), t = this.t;
    this.root.classList.toggle('looking', on);
    if (!on) { if (this.lookBar) { this.lookBar.remove(); this.lookBar = null; } return; }
    const E = this.editor.E, adding = E.preview && E.sheet && E.sheet.kind === 'add';
    const tpl = this.lookTpl && TEMPLATES.find(x => x.id === this.lookTpl.from);
    const name = adding ? E.preview.name || t.page : this.editor.bp() ? this.editor.bp().name : tpl ? tpl.name[this.S.lang] : this.cur().name;
    const label = adding ? (this.cur().solo ? t.showBoth : t.addTo(this.cur().name)) : t.showOn;
    const bar = h('div', { class: 'sf-look-bar', role: 'region', 'aria-label': t.previewing },
      h('span', { class: 'sf-look-kicker' }, t.lookKicker), h('strong', { class: 'sf-look-name' }, name),
      h('button', { class: 'sf-look-go', 'data-k': 'look-show', onclick: () => this.showHere() }, label));
    if (this.lookBar) this.lookBar.replaceWith(bar); else this.stage.append(bar);
    this.lookBar = bar;
  }
  paintBar() {
    if (this.barWrap) this.barWrap.classList.toggle('on', this.S.bar);
    if (this.nowEl) this.nowEl.classList.toggle('on', this.S.bar);
    this.stage.classList.toggle('sf-hide-cursor', !this.S.bar && !this.S.editing);
  }
  paintNotice() {
    clearTimeout(this.noticeT);
    const lines = this.liveLines();
    if (lines.length) this.noticeT = setTimeout(() => this.paintNotice(), Math.min(...lines.map(l => l.until)) - Date.now() + 30);
    else this.S.notice = '';
    if (this.S.editing) {
      const slot = this.drawer && this.drawer.querySelector('[data-status-slot]');
      if (slot) slot.replaceChildren(...[this.statusLines()].filter(Boolean));
    } else this.renderOverlay();
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
      const st = this.statusLines('sf-pop sf-toast'); if (st) wrap.append(st);
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
    // Share from a storyboard's more menu, with the editor open: over the board (0.7.3)
    if (S.editing && S.share) kids.push(h('div', { class: 'sf-share-float' }, this.renderShare()));
    // With the editor closed, one line at the top: what is on now, and what comes next.
    // Not on a first visit: jargon before anything is explained (0.9.3 QA, N-L1).
    if (!S.editing && !this.kioskStrict && !this.startPending() && this.cur().pages.length > 1) {
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

  async openShare(keepOpen, board) {
    if (this.S.share && !keepOpen) { this.set({ share: false, qrBig: false }); return; }
    if (!keepOpen) this.shareBoard = board || this.shown();   // the storyboard asked for, else what is on the screen
    const code = await encodeBoard(this.shareBoard || this.shown());
    const kiosk = this.S.shareKiosk !== false;   // on unless unticked: the link is usually for a wall
    const url = location.origin + location.pathname + (kiosk ? '?kiosk=1' : '') + '#b=' + code;
    let svg = null, n = 0;
    try {
      const q = qrcode(0, 'L'); q.addData(url); q.make();
      n = q.getModuleCount(); let d = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
      // four modules of quiet zone round the code, as scanners expect
      svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 ${n + 8} ${n + 8}" shape-rendering="crispEdges" role="img" aria-label="QR"><rect x="-4" y="-4" width="${n + 8}" height="${n + 8}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
    } catch { svg = null; }   // too long for the largest QR code
    this.set({ share: true, switcher: false, shareUrl: url, shareSvg: svg, shareModules: n, copied: false });
  }
  // A QR code needs at least 4 device pixels a module to scan from a phone. The share panel
  // draws it as large as it can; when that is still too small, it offers the code full screen.
  qrFits(px) { const n = (this.S.shareModules || 0) + 8, dpr = window.devicePixelRatio || 1; return n && px * dpr / n >= 4; }
  renderShare() {
    const S = this.S, t = this.t, kiosk = S.shareKiosk !== false, qrPx = 300;
    const qr = S.shareSvg ? h('div', { class: 'sf-qr' }) : null;
    if (qr) qr.innerHTML = S.shareSvg;   // built above from module coordinates only
    const fits = S.shareSvg && this.qrFits(qrPx);
    return h('div', { class: 'sf-pop sf-share', role: 'dialog', 'aria-label': t.share },
      h('strong', { class: 'sf-share-title' }, t.shareTitle),
      h('div', { class: 'sf-share-row' },
        h('input', { readOnly: true, value: S.shareUrl, 'aria-label': t.boardLink, onfocus: e => e.target.select() }),
        h('button', { 'data-k': 'share-copy', onclick: () => { navigator.clipboard && navigator.clipboard.writeText(S.shareUrl).catch(() => {}); this.set({ copied: true }); this.say(t.linkCopied); setTimeout(() => this.set({ copied: false }), 1600); } }, S.copied ? t.copied : t.copy)),
      h('p', { class: 'sf-share-note' }, t.shareBody),
      h('label', { class: 'sf-check sf-share-kiosk' },
        h('input', { type: 'checkbox', checked: kiosk, 'data-k': 'share-kiosk', onchange: e => { this.S.shareKiosk = e.target.checked; this.openShare(true); } }), h('span', null, t.kioskLink)),
      S.shareSvg ? (fits ? qr : h('button', { class: 'sf-btn sf-qr-open', 'data-k': 'share-qr-big', onclick: () => this.set({ qrBig: true }) }, t.qrLarge))
        : h('p', { class: 'sf-share-note' }, t.shareLong),
      S.qrBig && S.shareSvg ? this.renderQrBig() : null);
  }
  renderQrBig() {
    const box = h('div', { class: 'sf-qr big' }); box.innerHTML = this.S.shareSvg;
    const close = () => this.set({ qrBig: false });
    return h('div', { class: 'sf-qr-full', role: 'dialog', 'aria-label': this.t.qrLarge, onclick: close, onkeydown: e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } } },
      box, h('button', { class: 'sf-btn', 'data-k': 'share-qr-close', onclick: close }, this.t.close));
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
  sizeLabel(bd) {
    const one = x => { const s = sizeOf(x); return s === 'fill' ? this.t.fill : s === 'custom' ? `${x.rows} × ${x.cols}` : s.replace('x', ' × '); };
    if (bd.pages) { const all = [...new Set(bd.pages.filter(p => !p.missing).map(p => p.size ? one(p) : one(bd)))]; if (all.length > 1) return this.t.mixedSizes; }
    return bd.pages && bd.pages[0] && bd.pages[0].size ? one(bd.pages[0]) : one(bd);
  }
  pickBoard(i) { this.active = i; this.look = null; this.sayNext = true; this.save(); this.markShown(); Object.assign(this.S, { sel: 0, pageIdx: 0, pageStart: Date.now(), switcher: false, cz: -1 }); this.say(this.t.sNow(this.shown().name)); this.refresh(); }
  // New board, from the board switcher: the Start panel, where a template adds a board.
  newBoard() {
    Object.assign(this.S, { switcher: false, editing: true, cz: -1 });
    this.dismissCue(false); this.editor.go({ sec: 'ex', lv: 'list' }); this.refresh();
  }
  allStoryboards() {
    Object.assign(this.S, { switcher: false, editing: true, cz: -1 });
    this.dismissCue(false); this.editor.go({ sec: 'sb', lv: 'list' }); this.refresh();
  }
  // The Place a new storyboard starts from (0.8): the one this screen was given on the
  // first visit, else the open storyboard's, else none (a Stockholm board, as before).
  firstPlace() { try { const p = JSON.parse(getFlag('sf_place') || 'null'); return p && p.lat != null ? p : null; } catch { return null; } }
  // This screen's own place, else Home (0.10.1), else the open playlist's.
  newPlace() { const l = this.cur() && this.cur().loc, hp = this.home().place; return this.firstPlace() || (hp && hp.lat != null ? hp : null) || (l && l.lat != null ? l : null); }
  // "Where is this screen?" on the first visit: kept for new storyboards, and the untouched
  // demo is built again for the place, under the same id so its addresses still work.
  setFirstPlace(r) {
    const p = Object.assign({ city: r.name, lat: r.lat, lon: r.lon }, r.cc ? { cc: r.cc } : {}, r.tz ? { tz: r.tz } : {});
    setFlag('sf_place', JSON.stringify(p));
    if (!this.home().place) this.setHome({ place: p });   // the first place is Home too, until it is changed in Account
    if (this.startPending() && this.freshId === this.shown().id) {
      // the demo is built again for the place, with the same ids, so it stays one demo
      const nb = fromTemplate('demo', this.S.lang, this.live.data.home, p), old = this.boards[this.active]; nb.id = this.freshId;
      nb.pages.forEach((pg, k) => { if (old.pages[k]) pg.id = old.pages[k].id; });
      this.boards[this.active] = nb; this.save();
    }
    // choosing a place is a choice (0.10): the first visit is over, and the line says what changed
    this.markStarted();
    const t = this.t, off = this.live.data.off || [];
    this.say(t.built(p.city, [t.builtWeather(p.city), off.includes('transit') ? null : t.builtStops, t.builtHolidays].filter(Boolean)));
    this.editor.tplCache = null; this.refresh();
  }
  startPending() { return this.firstRun && getFlag('sf_started') !== '1'; }
  markStarted() { setFlag('sf_started', '1'); this.firstRun = false; }
  // Done (0.10): a preview ends and the screen goes back, saying so; an edit to what is on
  // says it is saved and showing. Show it now puts an edited storyboard on the screen.
  leaveEditor() {
    const t = this.t, edited = this.savedNav != null && this.savedNav === this.editor.E.navKey;
    clearTimeout(this.savedT); this.savedNav = null;
    if (this.looking()) {
      const idx = this.look, name = this.shown().name;
      this.endLook({ msg: edited ? t.sSavedBack(name) : t.sBack(name), action: idx != null && edited ? { label: t.showItNow, fn: () => this.showIdx(idx) } : null });
    } else if (edited) this.say(t.sSavedShowing(this.shown().name));
    this.look = null; this.lookTpl = null;
  }
  lookTimedOut() {
    this.lastInput = Date.now();   // once: going back to Showing redraws, and that must not time out again
    const t = this.t, r = this.editor.route(), tpl = this.lookTpl, tt = tpl && TEMPLATES.find(x => x.id === tpl.from), bp = this.editor.bp();
    const name = tt ? tt.name[this.S.lang] : bp ? bp.name : this.cur().name;
    const again = { label: t.showItNow, fn: () => { this.lastInput = Date.now(); if (tpl) this.lookAtTemplate(tpl); else this.editor.go(r); this.render(); } };
    const msg = t.sTimeout(name, this.shown().name);
    // a template's page stays where it was; a playlist's or a saved board's level is about what
    // it shows, so the drawer goes back to Showing with the screen
    if (tpl) this.endLook({ msg, action: again });
    else { this.look = null; this.editor.go({ sec: 'sb', lv: 'showing' }, { quietBack: true }); this.say(msg, { action: again }); }
    this.render();
  }
  showIdx(i) {
    if (!this.boards[i]) return;
    const prev = this.active; this.active = i; this.saveActive(); this.markShown();
    Object.assign(this.S, { pageIdx: 0, pageStart: Date.now() });
    this.say(this.t.sNow(this.shown().name), { action: { label: this.t.undo, fn: () => this.undoShow(prev) } }); this.refresh();
  }
  // Use a template (0.10): it becomes a storyboard of yours and goes on the screen, and the
  // editor lands on its board (one board) or its boards (several). Never the week view.
  useTemplate(id) {
    if (!TEMPLATES.some(x => x.id === id)) return;
    if (this.plCount() >= MAX_PL && !(this.startPending() && this.freshId === this.shown().id)) { this.say(this.t.sbFull, { fail: true }); return; }
    const t = this.t, nb = fromTemplate(id, this.S.lang, this.live.data.home, this.newPlace()), prev = this.active;
    const replace = this.startPending() && this.freshId === this.shown().id;
    if (replace) {
      // the untouched demo leaves no trace: its boards go too, unless something else shows them
      const gone = new Set(this.shown().pages.map(p => p.id)), rest = this.playlists.filter(p => p.id !== this.freshId);
      this.blueprints = this.blueprints.filter(b => !gone.has(b.id) || rest.some(p => p.items.some(i => i.id === b.id)));
      saveLibrary(this.blueprints);
      this.boards[this.active] = nb;
    }
    else { this.boards.push(nb); this.active = this.boards.length - 1; }
    if (nb.pages.length === 1) nb.solo = true;   // one board shows as that board (0.10.1)
    this.look = null; this.lookTpl = null;
    this.freshId = null; this.markStarted(); this.save(); this.markShown();
    Object.assign(this.S, { sel: 0, pageIdx: 0, pageStart: Date.now(), cz: -1, editing: true });
    this.say(t.sNowKept(nb.name), replace ? {} : { action: { label: t.undo, fn: () => this.undoShow(prev) } });
    if (nb.pages.length === 1) this.editor.go({ sec: 'sb', lv: 'board', sb: this.shown().id, bd: this.shown().pages[0].id, from: 'boards' });
    else this.editor.go({ sec: 'sb', lv: 'sb', sb: this.shown().id, view: 'boards' });
    this.refresh();
  }
  // A copy of a playlist points at the same boards (0.10.1): it is the order and the times
  // that are copied. Duplicate a board for a board of its own.
  duplicateBoard(i) {
    if (this.plCount() >= MAX_PL) { this.say(this.t.sbFull, { fail: true }); return; }
    const nb = clone(this.boards[i]); nb.id = newId('b'); nb.name = this.boards[i].name + this.t.copySuffix; delete nb.from; delete nb.solo;
    this.boards.push(nb);
    if (this.S.editing) this.look = this.boards.length - 1; else this.active = this.boards.length - 1;   // the editor looks at the copy; the screen keeps running
    this.S.sel = 0; this.save(); this.refresh();
  }
  deleteBoard(i) {
    if (this.boards.length < 2) return;
    const lookId = this.look != null && this.boards[this.look] ? this.boards[this.look].id : null;
    const [gone] = this.boards.splice(i, 1); this.account.deleted(gone.id); this.active = Math.max(0, Math.min(this.active - (i < this.active ? 1 : 0), this.boards.length - 1));
    const li = lookId ? this.boards.findIndex(b => b.id === lookId) : -1; this.look = li >= 0 && li !== this.active ? li : null;
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
    const b = sanitizeBoard(this.boards[i]) || this.boards[i], blob = new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: (b.name || 'board').replace(/[^\wÀ-ɏ-]+/g, '_') + '.json' });
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  exportBlueprint(bp) {
    const blob = new Blob([JSON.stringify(bp, null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: (bp.name || 'board').replace(/[^\wÀ-ɏ-]+/g, '_') + '.json' });
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  // Import from My boards (0.7.1): a board file goes to My boards, a storyboard file to the
  // storyboards, as the file says.
  importAny(e) {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    if (f.size > 262144) { e.target.value = ''; this.flash(this.t.importFail); return; }
    f.text().then(txt => {
      let x = null; try { x = JSON.parse(txt); } catch { x = null; }
      const bp = x && x.page ? sanitizeBlueprint(x) : null;
      if (bp) {
        if (this.blueprints.length >= MAX_LIB) { this.flash(this.t.myFull); return; }
        if (this.blueprints.some(y => y.id === bp.id)) bp.id = newId('m');
        this.blueprints.unshift(bp); this.saveMy(); this.flash(this.t.savedToMy(bp.name)); this.render(); return;
      }
      this.importFile({ target: { files: [f], value: '' } });
    });
    e.target.value = '';
  }
  importFile(e) {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
    if (f.size > 262144) { this.flash(this.t.importFail); return; }
    f.text().then(txt => {
      let nb = null; try { nb = sanitizeBoard(JSON.parse(txt)); } catch { nb = null; }
      if (!nb) { this.flash(this.t.importFail); return; }
      // a file is copied in: its playlist and its boards get ids of their own if they clash
      nb.id = this.boards.some(x => x.id === nb.id) ? newId('b') : nb.id;
      const lib = this.libMap(); nb.pages.forEach(p => { if (lib.has(p.id)) p.id = newId('p'); });
      this.boards.push(nb); this.active = this.boards.length - 1; this.S.sel = 0; this.save(); this.refresh();
    });
  }
}
