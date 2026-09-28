// The editor drawer. Its look is the editor handoff (DESIGN-HANDOVER-editor.md) and its
// structure is 0.7's (DESIGN-HANDOVER-0.7.md): three sections in a tab row (Storyboards,
// Explore, Account; My boards joins in 0.7.1), at most two levels below each, with an
// address per level so the browser's back goes up one. The same on phone and desktop.
// Words follow GLOSSARY.md: a storyboard is a stored board, a board is one of its pages.
//
// Like the rest of the app it is plain DOM, rebuilt whole on structural changes. Typing
// updates the board in place (app.upd with quiet) so inputs keep focus.

import { h, clone } from './dom.js';
import { THEMES, renderStatic, staticGeom, GEOM } from './renderer.js';
import { CHIPS, CHIP_NAMES } from './charset.js';
import { compose, zonesFor, LAYOUTS, newId, blank, templateTokens, fixedCut, vestaboard } from './content.js';
import { TEMPLATES, fromTemplate } from './templates.js';
import { searchStations, searchCities, MODE_LETTERS } from './live.js';
import { GROUPS, TILES, tileFor, previewLive, SAMPLE_FEED } from './catalogue.js';
import { sampleImage, mapImage, stamp, HEART } from './photo.js';
import { Composer } from './composer.js';
import { CHANGELOG, VERSION } from './changelog.js';
import { pageWins, dayPlaylist } from './schedule.js';
import { parseRoute, routeHash, parentRoute } from './route.js';
import { weekView, hueOf, nextHue } from './week.js';
import { getFlag, setFlag } from './store.js';
import { HELP, INTRO } from './help.js';
import * as sound from './sound.js';

const MAX_MY = 100;   // boards in My boards per account, and per browser for a guest
const DURS = [3, 5, 8, 10, 12, 15, 20, 30, 45, 60, 90, 120, 180, 300, 600, 900, 1800, 3600];
const LAYOUT_PIC = { full: ['1fr', '1fr', [['1', '1', 1]]], header: ['1fr', '1fr 2.4fr', [['1', '1', 0], ['1', '2', 1]]], split: ['1fr 1fr', '1fr', [['1', '1', 1], ['2', '1', 0]]],
  ticker: ['1fr', '2.4fr 1fr', [['1', '1', 1], ['1', '2', 0]]], stacked: ['1fr', '1fr 1fr', [['1', '1', 1], ['1', '2', 0]]] };
const aspect = (rows, cols, pad) => { const g = staticGeom(rows, cols, pad); return (g.uw / g.uh).toFixed(4); };

export class Editor {
  constructor(app) {
    this.app = app;
    // Where the editor is (0.7): a section (sb storyboards, ex explore, acc account), a level
    // in it, and the ids that level shows. It is mirrored in the address, see route.js.
    this.E = { sec: 'sb', lv: 'list', sb: null, bd: null, bp: null, view: 'week', tpl: null, from: 'boards', preview: null,
      zone: 0, zoneOpen: false, picking: false, search: '', adv: {}, hover: null, navKey: 0, fx: 'in', drag: -1,
      menu: null, sheet: null, last: {} };
    this.specs = new Map();
    this.lastNav = -1;
    this.composer = new Composer(app, this);
  }
  get t() { return this.app.t; }
  get lang() { return this.app.S.lang; }
  L(x) { return x ? x[this.lang] || x.en : ''; }
  phone() { return this.app.isMobile(); }
  panelLv() { return this.E.lv; }
  onBoard() { return this.E.sec === 'sb' && this.E.lv === 'board'; }
  // My boards (0.7.1): on a blueprint's level, the board being edited is the blueprint's.
  onBlueprint() { return this.E.sec === 'my' && this.E.lv === 'bp'; }
  bp() { return this.onBlueprint() ? this.app.blueprints.find(x => x.id === this.E.bp) || null : null; }

  // ---------- navigation ----------
  route() { const E = this.E; return { sec: E.sec, lv: E.lv, sb: E.sb, bd: E.bd, bp: E.bp, view: E.view, tpl: E.tpl, from: E.from }; }
  // Move to a level. Each move is a history entry, so browser Back goes up the way it came.
  go(r, opts = {}) {
    const E = this.E, prevSec = E.sec;
    this.composer.leave(); E.confirm = null; E.menu = null; E.sheet = null; E.card = null; E.preview = null;
    if (typeof r === 'string') r = { account: { sec: 'acc', lv: 'main' }, help: { sec: 'acc', lv: 'help' }, log: { sec: 'acc', lv: 'log' }, start: { sec: 'ex', lv: 'list' },
      settings: { sec: 'sb', lv: 'sb', sb: this.app.cur().id, view: 'display' } }[r] || { sec: 'sb', lv: 'list' };   // named levels, from Help's links
    r = this.resolve(Object.assign({}, r));
    Object.assign(E, { sec: r.sec, lv: r.lv, sb: r.sb || null, bd: r.bd || null, bp: r.bp || null, view: r.view || E.view || 'week', tpl: r.tpl || null, from: r.from || E.from,
      fx: opts.back ? 'back' : 'in', navKey: E.navKey + 1, hover: null, search: '' });
    if (!opts.keepZone) Object.assign(E, { zone: 0, zoneOpen: false, picking: false, fresh: false }, opts.zone || {});
    E.last[r.sec] = this.route();
    if (!opts.silent) {
      const hash = routeHash(r), url = location.pathname + location.search + hash;
      // Each entry carries how deep in the editor it is and the address of the level it
      // came from, in history.state, so they survive a reload (0.7.0 review).
      const st = history.state && history.state.sf ? history.state : null;
      if (opts.replace || location.hash === hash) history.replaceState({ sf: 1, depth: st ? st.depth : 1, prev: st ? st.prev : '' }, '', url);
      else history.pushState({ sf: 1, depth: (st ? st.depth : 0) + 1, prev: location.hash }, '', url);
    }
    this.app.S.cz = -1;
    this.app.board.setOptions(this.app.boardOpts());   // a blueprint has its own size and theme
    this.app.render(); this.app.tick(true);
    const body = this.app.drawer && this.app.drawer.querySelector('.sf-panel-body'); if (body && (!opts.back || prevSec !== r.sec)) body.scrollTop = 0;
    // Keyboard and screen reader users land on the new level's title.
    const d = this.app.drawer, title = d && d.querySelector('.sf-panel-title');
    if (title && (!opts.back || !d.contains(document.activeElement))) title.focus({ preventScroll: true });
  }
  // A route names storyboards and boards by id; the app's list is by index. A missing id
  // (deleted, or a link from another browser) lands on the nearest level that exists.
  resolve(r) {
    const app = this.app;
    if (r.sec === 'sb' && (r.lv === 'sb' || r.lv === 'board')) {
      const i = app.boards.findIndex(b => b.id === r.sb);
      if (i < 0) return { sec: 'sb', lv: 'list' };
      if (i !== app.active) { app.active = i; app.saveActive(); app.S.pageIdx = 0; app.S.pageStart = Date.now(); app.refresh(true); }
      if (r.lv === 'board') {
        const j = app.boards[i].pages.findIndex(p => p.id === r.bd);
        if (j < 0) return { sec: 'sb', lv: 'sb', sb: r.sb, view: r.from || 'boards' };
        app.S.sel = j;
      }
    }
    if (r.sec === 'ex' && r.lv === 'tpl' && !TEMPLATES.some(x => x.id === r.tpl)) return { sec: 'ex', lv: 'list' };
    if (r.sec === 'my' && r.lv === 'bp' && !app.blueprints.some(x => x.id === r.bp)) return { sec: 'my', lv: 'list' };
    return r;
  }
  // The browser moved (back, forward, or an address typed in): show that level, no new entry.
  apply(r) {
    this.go(r, { silent: true, back: true });
  }
  backTarget() { return parentRoute(this.route()); }
  // Back is up one level. When the level above is the one we came from, it is the
  // browser's own back, so the history does not grow.
  back() {
    const up = this.backTarget(); if (!up) return;
    const h = routeHash(up);
    if (history.state && history.state.sf && history.state.prev === h) { history.back(); return; }
    this.go(up, { back: true, replace: true });   // the entry keeps the level it really came from
  }
  // Escape: a menu or sheet first, then the content picker if the zone had content, and
  // otherwise it closes the editor.
  escape() {
    const E = this.E;
    if (E.menu || E.sheet || E.card) { E.menu = null; E.sheet = null; E.card = null; E.preview = null; E.confirm = null; this.app.render(); this.app.tick(true); return; }
    if (E.picking && !E.fresh && this.onBoard()) { E.picking = false; this.app.render(); return; }
    this.app.toggleEdit();
  }
  top(sec) { return sec === 'ex' ? { sec: 'ex', lv: 'list' } : sec === 'acc' ? { sec: 'acc', lv: 'main' } : sec === 'my' ? { sec: 'my', lv: 'list' } : { sec: 'sb', lv: 'list' }; }
  // A tab returns to where you last were in that section; the current tab goes to its top.
  tab(sec) { this.go(sec === this.E.sec ? this.top(sec) : this.E.last[sec] || this.top(sec)); }
  // Opening the editor: Explore on the very first edit, else the board on the wall now.
  open() {
    this.E.drag = -1;
    const r = parseRoute(location.hash);
    if (r) {
      // opened at an address with no editor entries of this visit behind it: depth 0
      if (!(history.state && history.state.sf)) history.replaceState({ sf: 1, depth: 0, prev: '' }, '', location.href);
      this.go(r, { replace: true }); return;
    }
    if (this.app.startPending()) { this.go({ sec: 'ex', lv: 'list' }); return; }
    const b = this.app.cur(), p = b.pages[this.app.selIdx(b)];
    this.go(p ? { sec: 'sb', lv: 'board', sb: b.id, bd: p.id, from: 'boards' } : { sec: 'sb', lv: 'sb', sb: b.id, view: 'week' });
  }
  // Done: back out of every entry the editor made, so the browser's back after Done leaves
  // the site instead of reopening the editor. An editor opened straight from an address
  // (a reload, a link) has nothing of its own behind it, so its entry is just cleared.
  close() {
    const st = history.state, depth = st && st.sf ? st.depth : 0, clear = () => history.replaceState(null, '', location.pathname + location.search);
    if (depth > 0) { this.closing = true; history.go(-depth); } else clear();
  }
  openBoard(i, from) { const b = this.app.cur(), p = b.pages[i]; if (p) this.go({ sec: 'sb', lv: 'board', sb: b.id, bd: p.id, from: from || (this.E.lv === 'sb' ? this.E.view : 'boards') }); }
  openPage(i) { this.openBoard(i); }
  openStoryboard(i, view) { const b = this.app.boards[i]; if (b) this.go({ sec: 'sb', lv: 'sb', sb: b.id, view: view || 'week' }); }
  openZone(k) { Object.assign(this.E, { zone: k, zoneOpen: true, picking: !tileFor(this.page() && this.page().zones[k]), fresh: false, landKey: (this.E.landKey || 0) + 1 }); this.app.render(); this.app.paintHighlight();
    const el = this.app.drawer && this.app.drawer.querySelector('.sf-zone-open'); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }

  zones() { const p = this.page(), d = this.app.dims(); return p ? zonesFor(p.layout, d.rows, d.cols) : []; }
  page() { const bp = this.bp(); if (bp) return bp.page; const b = this.app.cur(); return b.pages[this.app.selIdx(b)]; }
  zi() { return Math.max(0, Math.min(this.E.zone, this.zones().length - 1)); }
  zone() { const p = this.page(); return p ? p.zones[this.zi()] : null; }
  isTicker(k = this.zi()) { const p = this.page(); return p && p.layout === 'ticker' && k === 1; }
  updZone(fn, quiet) { const k = this.zi(); this.app.updPage(p => { while (p.zones.length <= k) p.zones.push({ ch: 'message', o: {} }); fn(p.zones[k]); }, quiet); }
  setO(fn, quiet) { this.updZone(z => { z.o = Object.assign({}, z.o); fn(z.o); }, quiet); if (quiet) this.refreshThumbs(true); }

  // The zone outlined on the big board: the one hovered, else the one open.
  hlRect() {
    if (!this.app.S.editing || !(this.onBoard() || this.onBlueprint())) return null;
    const zs = this.zones(); if (zs.length < 2) return null;
    const k = this.E.hover != null ? this.E.hover : this.E.zoneOpen ? this.zi() : null;
    return k == null ? null : zs[k] || null;
  }
  hover(k) { this.E.hover = k; this.app.paintHighlight(); this.paintDiagram(); }

  // ---------- thumbnails ----------
  // A canvas that the static renderer fills once the drawer is on the page. fn returns
  // the grid, so live boards (a clock) can be redrawn without rebuilding the drawer.
  thumb(key, rows, cols, fn, theme, extra) {
    this.specs.set(key, { rows, cols, fn, theme, pad: 0.35 });
    return h('canvas', Object.assign({ class: 'sf-thumb', 'data-thumb': key, style: `aspect-ratio:${aspect(rows, cols)}`, 'aria-hidden': 'true' }, extra || {}));
  }
  paintThumbs(force) {
    const root = this.app.drawer; if (!root) return;
    root.querySelectorAll('canvas[data-thumb]').forEach(cv => {
      const sp = this.specs.get(cv.dataset.thumb); if (!sp) return;
      let grid; try { grid = sp.fn(); } catch { grid = blank(sp.rows, sp.cols); }
      const r = cv.getBoundingClientRect(), sig = sp.theme + sp.rows + 'x' + sp.cols + Math.round(r.width) + ':' + grid.map(x => x.join('')).join('|');
      if (!force && cv._sig === sig) return;
      cv._sig = sig; renderStatic(cv, { rows: sp.rows, cols: sp.cols, grid, theme: sp.theme, pad: sp.pad });
    });
  }
  refreshThumbs(soon) {
    if (soon) { clearTimeout(this.thT); this.thT = setTimeout(() => this.paintThumbs(), 60); return; }
    this.paintThumbs();
  }
  pageGrid(p, b) { const d = b ? this.app.dimsOf(b) : this.app.dims(); return () => compose(p, d.rows, d.cols, Date.now(), this.lang, this.app.live.data); }

  // ---------- the drawer ----------
  render() {
    this.specs = new Map();
    const t = this.t, E = this.E;
    const anim = E.navKey !== this.lastNav ? (E.fx === 'back' ? ' sf-nav-back' : ' sf-nav-in') : '';
    this.lastNav = E.navKey;
    const body = E.sheet ? this.sheet() : {
      'sb:list': () => this.storyboardsLevel(), 'sb:sb': () => this.storyboardLevel(), 'sb:board': () => this.pageLevel(),
      'my:list': () => this.myBoardsLevel(), 'my:bp': () => this.pageLevel(),
      'ex:list': () => this.exploreLevel(), 'ex:tpl': () => this.templateLevel(),
      'acc:main': () => this.accountLevel(), 'acc:help': () => this.helpLevel(), 'acc:log': () => this.logLevel()
    }[E.sec + ':' + E.lv]();
    return h('aside', { class: 'sf-drawer', 'aria-label': t.editor },
      h('section', { class: 'sf-panel-col' }, this.head(), this.tabs(), h('div', { class: 'sf-panel-body' + anim, 'data-lv': E.sec + '-' + E.lv }, body)));
  }
  after() {
    this.paintThumbs(true); this.composer.after();
    // the week opens on the morning, once per visit to it
    const wk = this.app.drawer && this.app.drawer.querySelector('[data-week]');
    if (wk && this.weekScrolled !== this.E.navKey) { this.weekScrolled = this.E.navKey; wk.scrollTop = wk.scrollHeight / 24 * 6; }
  }

  head() {
    const t = this.t, E = this.E, b = this.app.cur(), p = this.page(), up = this.backTarget();
    const upLabel = !up ? '' : up.lv === 'sb' ? b.name : up.sec === 'sb' ? t.secStoryboards : up.sec === 'my' ? t.secMyBoards : up.sec === 'ex' ? t.secExplore : this.app.account.available ? t.secAccount : t.secSettings;
    const bp = this.bp();
    const tpl = E.tpl && TEMPLATES.find(x => x.id === E.tpl);
    const [kicker, title] = {
      'sb:list': ['Split-Flap', t.secStoryboards], 'sb:sb': [t.secStoryboards, b.name], 'sb:board': [b.name, p ? p.name || t.page : ''],
      'my:list': ['Split-Flap', t.secMyBoards], 'my:bp': [t.secMyBoards, bp ? bp.name : ''],
      'ex:list': ['Split-Flap', t.secExplore], 'ex:tpl': [t.secExplore, tpl ? tpl.name[this.lang] : ''],
      'acc:main': ['Split-Flap', this.app.account.available ? t.account : t.secSettings], 'acc:help': [t.secAccount, t.help], 'acc:log': [`v${VERSION}`, t.versionLog]
    }[E.sec + ':' + E.lv];
    return h('header', { class: 'sf-panel-head' },
      up ? h('button', { class: 'sf-back', 'data-k': 'back', onclick: () => this.back() }, h('span', { 'aria-hidden': 'true' }, '‹'), h('span', null, upLabel)) : null,
      h('div', { class: 'sf-panel-title', role: 'heading', 'aria-level': '2', tabindex: '-1' }, h('span', { class: 'sf-eyebrow' }, kicker),
        E.sec === 'sb' && E.lv === 'sb' ? this.boardName() : h('strong', null, title)),
      h('button', { class: 'sf-btn primary caps', 'data-k': 'done', 'aria-keyshortcuts': 'E', onclick: () => this.app.toggleEdit() }, t.done));
  }
  // The four sections, on every level, and the place for search.
  tabs() {
    const t = this.t, sec = this.E.sec;
    const tab = (id, label) => h('button', { class: 'sf-tab', role: 'tab', 'aria-selected': String(sec === id), 'data-k': 'tab-' + id, onclick: () => this.tab(id) }, label,
      id === 'acc' ? h('span', { class: 'sf-sync-fail', title: t.syncFailedMark, role: 'img', 'aria-label': t.syncFailedMark, 'data-sync-fail': '', hidden: this.app.account.status !== 'failed' }, ' !') : null);
    return h('nav', { class: 'sf-tabs', role: 'tablist', 'aria-label': t.editor },
      tab('sb', t.secStoryboards), tab('my', t.secMyBoards), tab('ex', t.secExplore), tab('acc', this.app.account.available ? t.secAccount : t.secSettings),
      h('span', { class: 'sf-grow' }),
      h('button', { class: 'sf-icon sf-search', disabled: true, title: t.searchLater, 'aria-label': t.searchLater, 'data-k': 'search' }, h('span', { 'aria-hidden': 'true' }, '⌕')));
  }
  dayLabel(d) { return `${this.t.dayShort[d.getDay()]} ${d.getDate()} ${this.t.monthShort[d.getMonth()]}`; }
  zoneName(k) { const p = this.page(); return p ? (this.t.zoneNames[p.layout] || [])[k] || '' : ''; }

  // ---------- the more menu ----------
  // One pattern everywhere: a ⋯ button, then the verbs in one fixed order. Verbs that do
  // not apply are left out; the order never changes. Delete sits under a rule, in red,
  // and asks twice.
  more(key, verbs) {
    const t = this.t, open = this.E.menu === key;
    const ORDER = ['open', 'rename', 'duplicate', 'save', 'copy', 'share', 'shareImage', 'export', 'delete'];
    const label = { open: t.mOpen, rename: t.mRename, duplicate: t.mDuplicate, save: t.mSave, copy: t.mCopyTo, share: t.mShare, shareImage: t.mShareImage, export: t.mExport, delete: t.mDelete };
    const items = ORDER.filter(v => verbs[v]).map(v => {
      const armed = v === 'delete' && this.E.confirm === 'menu-del-' + key;
      return [v === 'delete' ? h('hr', { class: 'sf-menu-rule' }) : null,
        h('button', { class: 'sf-more-item' + (v === 'delete' ? ' danger' : ''), role: 'menuitem', 'data-k': `more-${v}`, disabled: verbs[v] === 'off',
          onclick: e => { e.stopPropagation();
            if (v === 'delete' && !armed) { this.E.confirm = 'menu-del-' + key; this.app.render(); const el = this.app.drawer.querySelector('[data-k="more-delete"]'); if (el) el.focus(); return; }
            this.E.menu = null; this.E.confirm = null; verbs[v](); } }, armed ? t.mDeleteAgain : label[v])];
    });
    return h('div', { class: 'sf-more' + (open ? ' open' : '') },
      h('button', { class: 'sf-icon sf-more-btn', 'aria-haspopup': 'menu', 'aria-expanded': String(open), 'aria-label': t.more, title: t.more, 'data-k': 'more-' + key,
        onclick: e => { e.stopPropagation(); this.E.menu = open ? null : key; this.E.confirm = null; this.app.render(); if (!open) { const el = this.app.drawer.querySelector('.sf-more.open .sf-more-item'); if (el) el.focus(); } } }, '⋯'),
      open ? h('div', { class: 'sf-more-pop sf-pop', role: 'menu' }, items) : null);
  }

  // ---------- storyboards ----------
  storyboardsLevel() {
    const t = this.t, app = this.app, now = Date.now();
    const changed = getFlag('sf_words_070') !== '1' && app.hadBoards ? h('section', { class: 'sf-field sf-changed', role: 'note' },
      h('strong', null, t.changedTitle), h('span', { class: 'sf-hint' }, t.changedBody),
      h('dl', { class: 'sf-changed-rows' }, t.changedRows.map(([a, b]) => h('div', null, h('dt', null, a), h('dd', null, b)))),
      h('div', null, h('button', { class: 'sf-btn', 'data-k': 'changed-ok', onclick: () => { setFlag('sf_words_070', '1'); app.render(); } }, t.gotIt))) : null;
    const cards = app.boards.map((bd, i) => {
      const d = app.dimsOf(bd), here = i === app.active, seg = dayPlaylist(bd.pages, new Date(now)).find(s => now >= s.from && now < s.to);
      const nowNames = seg && seg.list.length ? seg.list.map(k => bd.pages[k].name || `${t.page} ${k + 1}`).join(', ') : t.clockOnly;
      return h('div', { class: 'sf-sb-card' + (here ? ' current' : ''), 'data-sb': i },
        h('button', { class: 'sf-sb-open', 'data-k': 'sb-' + i, onclick: () => this.openStoryboard(i) },
          this.thumb('sb-' + bd.id, d.rows, d.cols, () => compose(bd.pages[0], d.rows, d.cols, now, this.lang, app.live.data), bd.theme),
          h('span', { class: 'sf-board-text' }, h('strong', null, bd.name), h('span', { class: 'sf-meta' }, t.sbMeta(app.sizeLabel(bd), THEMES[bd.theme].label, bd.pages.length)),
            h('span', null, t.nowPlays(nowNames)), here ? h('span', { class: 'sf-tag' }, t.playingHere) : null)),
        this.more('sb-' + i, this.sbVerbs(i)));
    });
    return h('div', { class: 'sf-level' }, changed,
      h('p', { class: 'sf-note big' }, t.sbIntro),
      h('div', { class: 'sf-sb-list' }, cards),
      h('div', { class: 'sf-row' }, h('button', { class: 'sf-add', 'data-k': 'new-sb', disabled: app.boards.length >= 50, onclick: () => this.go({ sec: 'ex', lv: 'list' }) }, '+ ' + t.newStoryboard),
        h('span', { class: 'sf-count' }, `${app.boards.length} / 50`)),
      // the version line, as the page list had before 0.7: quiet, and one tap to the log
      h('button', { class: 'sf-version', 'data-k': 'version-line', onclick: () => this.go({ sec: 'acc', lv: 'log' }) }, `v${VERSION}`, h('span', { 'aria-hidden': 'true' }, ' · '), t.versionLog));
  }
  sbVerbs(i) {
    const app = this.app;
    return { open: () => this.openStoryboard(i), rename: () => { this.openStoryboard(i); this.startRename(); }, duplicate: () => app.duplicateBoard(i),
      share: () => { app.pickBoard(i); app.toggleEdit(); app.openShare(); }, export: () => app.exportJson(i), delete: app.boards.length > 1 ? () => app.deleteBoard(i) : 'off' };
  }
  storyboardLevel() {
    const t = this.t, E = this.E, b = this.app.cur();
    const views = h('div', { class: 'sf-subtabs', role: 'tablist' }, [['week', t.viewWeek], ['boards', t.viewBoards], ['display', t.viewDisplay]].map(([v, label]) =>
      h('button', { class: 'sf-seg', role: 'tab', 'aria-selected': String(E.view === v), 'aria-pressed': String(E.view === v), 'data-k': 'view-' + v, onclick: () => this.go({ sec: 'sb', lv: 'sb', sb: b.id, view: v }, { replace: true }) }, label)));
    const body = E.view === 'boards' ? this.boardsView() : E.view === 'display' ? this.settingsLevel() : weekView(this);
    return h('div', { class: 'sf-level' }, h('div', { class: 'sf-row between' }, views, this.more('sb-open', this.sbVerbs(this.app.active))), body);
  }

  // ---------- a storyboard's boards ----------
  pageItems() {
    const t = this.t, b = this.app.cur(), d = this.app.dims();
    return b.pages.map((p, i) => {
      const wins = pageWins(p), when = wins.length ? this.winLabel(wins[0]) + (wins.length > 1 ? ` +${wins.length - 1}` : '') : t.anyTime;
      return h('li', { class: 'sf-pl' + (this.E.drag === i ? ' drag' : ''), 'data-pl': i, style: `--hue:${hueOf(b, i)}` },
        h('button', { class: 'sf-pl-open', 'data-k': 'page-' + i, onclick: () => this.openBoard(i, 'boards') },
          this.thumb('pg-' + p.id, d.rows, d.cols, this.pageGrid(p, b), b.theme),
          h('span', { class: 'sf-pl-text' },
            h('span', { class: 'sf-pl-name' }, p.name || `${t.page} ${i + 1}`),
            h('span', { class: 'sf-pl-meta' }, when, p.alone && wins.length ? h('span', { class: 'sf-tag' }, t.aloneTag) : null),
            h('span', { class: 'sf-pl-meta' }, `${p.dur} s`))),
        h('button', { class: 'sf-handle', 'data-handle': i, 'data-k': 'handle-' + i, 'aria-label': t.moveNamed(p.name || `${t.page} ${i + 1}`), title: t.reorderHint,
          onpointerdown: e => this.dragStart(e, i), onkeydown: e => this.handleKey(e, i) }, '⋮⋮'),
        this.more('pg-' + i, this.pageVerbs(i)));
    });
  }
  pageVerbs(i) {
    const b = this.app.cur();
    return { open: () => this.openBoard(i), save: this.app.blueprints.length < MAX_MY ? () => this.saveToMy(b.pages[i], this.originOf(b.pages[i], b)) : 'off', rename: () => { this.openBoard(i); const el = this.app.drawer.querySelector('[data-k="page-name"]'); if (el) { el.focus(); el.select(); } },
      duplicate: () => { this.app.S.sel = i; this.dupPage(true); }, copy: this.app.boards.length > 1 ? () => { this.E.sheet = { kind: 'copy', page: i }; this.app.render(); } : 'off',
      shareImage: () => { this.app.S.sel = i; this.app.saveImage(); }, delete: b.pages.length > 1 ? () => { this.app.S.sel = i; this.delPage(); } : 'off' };
  }
  boardsView() {
    const t = this.t;
    return h('div', { class: 'sf-field' },
      h('ol', { class: 'sf-pls' }, this.pageItems()),
      h('button', { class: 'sf-add big', 'data-k': 'add-page', onclick: () => { this.E.sheet = { kind: 'add', tab: this.app.blueprints.length ? 'my' : 'tpl' }; this.app.render(); } }, '+ ' + t.addPage));
  }
  addPage() {
    const t = this.t, b = this.app.cur(), n = b.pages.length, id = newId('p');
    this.app.upd(bb => { bb.pages.push({ id, name: `${t.page} ${n + 1}`, layout: 'full', dur: 10, wins: [], hue: nextHue(bb), zones: [{ ch: 'message', o: {} }] }); }, true);
    this.go({ sec: 'sb', lv: 'board', sb: b.id, bd: id, from: this.E.lv === 'sb' ? this.E.view : 'boards' }, { zone: { zone: 0, zoneOpen: true, picking: true, fresh: true } });
  }
  // Copy a board into another storyboard: what it shows, not its times.
  sheet() {
    const t = this.t, S = this.E.sheet, app = this.app;
    if (S.kind === 'add') return this.addSheet();
    if (S.kind === 'import') return this.importSheet();
    if (S.kind === 'pickSb') return h('div', { class: 'sf-level sf-sheet' },
      h('div', { class: 'sf-row between' }, h('strong', null, t.addToSb), h('button', { class: 'sf-btn', 'data-k': 'sheet-close', onclick: () => { this.E.sheet = null; app.render(); } }, t.cancel)),
      h('div', { class: 'sf-sb-list' }, app.boards.map((bd, i) => h('button', { class: 'sf-sb-open row', 'data-k': 'pick-sb-' + i, disabled: bd.pages.length >= 50,
        onclick: () => { app.active = i; app.saveActive(); this.go({ sec: 'sb', lv: 'sb', sb: bd.id, view: 'boards' }); this.E.sheet = { kind: 'add', tab: 'my', src: { kind: 'blueprint', id: S.bp } }; this.previewAdd(); app.render(); } },
        h('span', { class: 'sf-board-text' }, h('strong', null, bd.name), h('span', { class: 'sf-meta' }, t.sbMeta(app.sizeLabel(bd), THEMES[bd.theme].label, bd.pages.length)))))));
    if (S.kind === 'copy') {
      const src = S.tplPage ? S.tplPage : app.cur().pages[S.page];
      return h('div', { class: 'sf-level sf-sheet' },
        h('div', { class: 'sf-row between' }, h('strong', null, t.copyToTitle), h('button', { class: 'sf-btn', 'data-k': 'sheet-close', onclick: () => { this.E.sheet = null; app.render(); } }, t.cancel)),
        h('p', { class: 'sf-note big' }, t.copyToNote),
        h('div', { class: 'sf-sb-list' }, app.boards.map((bd, i) => (S.tplPage || i !== app.active) ? h('button', { class: 'sf-sb-open row', 'data-k': 'copy-to-' + i, onclick: () => this.copyTo(src, i) },
          h('span', { class: 'sf-board-text' }, h('strong', null, bd.name), h('span', { class: 'sf-meta' }, t.sbMeta(app.sizeLabel(bd), THEMES[bd.theme].label, bd.pages.length)))) : null)));
    }
    return h('div', { class: 'sf-level' });
  }
  copyTo(src, i) {
    const app = this.app, target = app.boards[i];
    const c = clone(src); c.id = newId('p'); c.wins = []; delete c.win; delete c.alone; c.hue = nextHue(target);
    target.pages.push(c); app.save(); this.E.sheet = null; app.flash(this.t.copiedTo(target.name)); app.render();
  }
  // ---------- My boards (0.7.1) ----------
  // Save a board as a blueprint: a copy with the size and theme it was made at, no times.
  saveToMy(page, from, dims, theme) {
    const app = this.app; if (app.blueprints.length >= MAX_MY) { app.flash(this.t.myFull); return null; }
    const d = dims || app.dims(), c = clone(page);
    delete c.wins; delete c.win; delete c.alone; c.id = newId('p');
    const bp = { id: newId('m'), name: page.name || this.t.page, rows: d.rows, cols: d.cols, theme: theme || app.cur().theme, from, page: c };
    app.blueprints.unshift(bp); app.saveMy(); app.flash(this.t.savedToMy(bp.name)); app.render();
    return bp;
  }
  // Where a saved board came from, followed back to where it first came from (a template,
  // another blueprint, later the hub), so credit can reach its author. A board made from
  // scratch points at its storyboard and itself.
  originOf(page, sb) { return page.from ? clone(page.from) : { kind: 'storyboard', id: sb.id, board: page.id }; }
  bpVerbs(bp) {
    const app = this.app;
    return { open: () => this.go({ sec: 'my', lv: 'bp', bp: bp.id }),
      rename: () => { this.go({ sec: 'my', lv: 'bp', bp: bp.id }); const el = app.drawer.querySelector('[data-k="page-name"]'); if (el) { el.focus(); el.select(); } },
      duplicate: app.blueprints.length < MAX_MY ? () => { const c = clone(bp); c.id = newId('m'); c.name = bp.name + this.t.copySuffix; c.page.name = c.name; c.from = { kind: 'blueprint', id: bp.id };
        app.blueprints.splice(app.blueprints.indexOf(bp) + 1, 0, c); app.saveMy(); app.render(); } : 'off',
      copy: () => { this.E.sheet = { kind: 'pickSb', bp: bp.id }; app.render(); },
      export: () => app.exportBlueprint(bp),
      delete: () => { const was = this.onBlueprint(); app.deleteBlueprint(bp.id); if (was) this.go({ sec: 'my', lv: 'list' }, { back: true, replace: true }); } };
  }
  myBoardsLevel() {
    const t = this.t, app = this.app, E = this.E, now = Date.now(), list = app.blueprints;
    const sizes = [...new Set(list.map(x => `${x.rows}x${x.cols}`))], q = (E.mySearch || '').trim().toLowerCase();
    const shown = list.filter(x => (!E.mySize || `${x.rows}x${x.cols}` === E.mySize) && (!q || x.name.toLowerCase().includes(q)));
    const search = h('input', { type: 'search', class: 'sf-input', placeholder: t.searchMy, 'aria-label': t.searchMy, value: E.mySearch || '', 'data-k': 'my-search',
      oninput: e => { E.mySearch = e.target.value; app.render(); const el = app.drawer.querySelector('[data-k="my-search"]'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } } });
    if (!list.length) return h('div', { class: 'sf-level' },
      h('div', { class: 'sf-start-head' }, h('h2', null, t.myEmptyTitle), h('p', null, t.myEmptyBody)),
      h('div', { class: 'sf-row' }, h('button', { class: 'sf-btn primary', 'data-k': 'my-explore', onclick: () => this.go({ sec: 'ex', lv: 'list' }) }, t.browseExplore),
        h('button', { class: 'sf-btn', 'data-k': 'my-import', onclick: () => { E.sheet = { kind: 'import', tab: 'file' }; app.render(); } }, t.importShort)));
    return h('div', { class: 'sf-level' },
      h('div', { class: 'sf-row nowrap' }, search, h('button', { class: 'sf-btn', 'data-k': 'my-import', onclick: () => { E.sheet = { kind: 'import', tab: 'file' }; app.render(); } }, t.importShort)),
      sizes.length > 1 ? h('div', { class: 'sf-row wrap', role: 'group', 'aria-label': t.size }, [['', t.allSizes], ...sizes.map(z => [z, z.replace('x', ' × ')])].map(([z, label]) =>
        h('button', { class: 'sf-seg', 'aria-pressed': String((E.mySize || '') === z), 'data-k': 'my-size-' + (z || 'all'), onclick: () => { E.mySize = z; app.render(); } }, label))) : null,
      h('div', { class: 'sf-sb-list' }, shown.map(bp => h('div', { class: 'sf-sb-card', 'data-bp': bp.id },
        h('button', { class: 'sf-sb-open', 'data-k': 'bp-' + bp.id, onclick: () => this.go({ sec: 'my', lv: 'bp', bp: bp.id }) },
          this.thumb('bp-' + bp.id, bp.rows, bp.cols, () => compose(bp.page, bp.rows, bp.cols, now, this.lang, app.live.data), bp.theme),
          h('span', { class: 'sf-board-text' }, h('strong', null, bp.name), h('span', { class: 'sf-meta' }, `${bp.rows} × ${bp.cols} · ${THEMES[bp.theme].label}`))),
        this.more('bp-' + bp.id, this.bpVerbs(bp))))),
      shown.length ? null : h('p', { class: 'sf-note' }, t.noResults),
      h('span', { class: 'sf-count' }, `${list.length} / ${MAX_MY}`));
  }
  // + Add a board, on a storyboard: from My boards, from a template, or new. Choosing one
  // shows the copy on the big board at this storyboard's size before it is added.
  addSheet() {
    const t = this.t, S = this.E.sheet, app = this.app, b = app.cur(), d = app.dims(), now = Date.now(), key = `${d.rows}x${d.cols}`;
    const tabs = h('div', { class: 'sf-subtabs', role: 'tablist' }, [['my', t.secMyBoards], ['tpl', t.templatesShort], ['new', t.newBoardShort]].map(([k, label]) =>
      h('button', { class: 'sf-seg', role: 'tab', 'aria-selected': String(S.tab === k), 'aria-pressed': String(S.tab === k), 'data-k': 'add-tab-' + k, onclick: () => { if (k === 'new') { this.E.sheet = null; this.addPage(); return; } S.tab = k; S.src = null; this.E.preview = null; app.render(); app.tick(true); } }, label)));
    const pick = src => { S.src = src; this.previewAdd(); app.render(); };
    const row = (src, name, rows, cols, theme, page, dim) => h('button', { class: 'sf-sb-open row' + (dim ? ' dim' : '') + (S.src && S.src.id === src.id && S.src.kind === src.kind && S.src.i === src.i ? ' on' : ''), 'data-k': `add-${src.kind}-${src.id}${src.i != null ? '-' + src.i : ''}`, onclick: () => pick(src) },
      this.thumb(`add-${src.kind}-${src.id}-${src.i}`, rows, cols, () => compose(page, rows, cols, now, this.lang, previewLive(app.live.data, now)), theme),
      h('span', { class: 'sf-board-text' }, h('strong', null, name), h('span', { class: 'sf-meta' }, `${rows} × ${cols}`)));
    let body;
    if (S.tab === 'my') {
      const same = app.blueprints.filter(x => `${x.rows}x${x.cols}` === key), other = app.blueprints.filter(x => `${x.rows}x${x.cols}` !== key);
      body = app.blueprints.length ? [same.map(x => row({ kind: 'blueprint', id: x.id }, x.name, x.rows, x.cols, x.theme, x.page)),
        other.length ? (S.all ? other.map(x => row({ kind: 'blueprint', id: x.id }, x.name, x.rows, x.cols, x.theme, x.page, true))
          : h('button', { class: 'sf-link-btn', 'data-k': 'add-all-sizes', onclick: () => { S.all = true; app.render(); } }, t.showAllSizes(other.length))) : null,
        same.length || S.all ? null : h('p', { class: 'sf-note' }, t.noneThisSize)]
        : h('p', { class: 'sf-note big' }, t.myEmptyBody);
    } else {
      body = TEMPLATES.map(tp => { const nb = this.tplBoard(tp.id), td = app.dimsOf(nb);
        return h('section', { class: 'sf-field' }, h('h3', { class: 'sf-eyebrow' }, tp.name[this.lang]), nb.pages.map((p, i) => row({ kind: 'template', id: tp.id, i }, p.name || `${t.page} ${i + 1}`, td.rows, td.cols, nb.theme, p))); });
    }
    const cut = S.src ? this.addCopy(S.src).lost : 0;
    return h('div', { class: 'sf-level sf-sheet' },
      h('div', { class: 'sf-row between' }, h('strong', null, t.addPage), h('button', { class: 'sf-btn', 'data-k': 'sheet-close', onclick: () => { this.E.sheet = null; this.E.preview = null; app.render(); app.tick(true); } }, t.cancel)),
      tabs,
      S.src ? h('div', { class: 'sf-card static' }, h('span', { class: 'sf-hint' }, t.previewOnBoard(d.rows, d.cols)),
        cut ? h('span', { class: 'sf-hint warn', role: 'status', 'data-k': 'cut-warn' }, t.cutWarn(cut)) : null,
        h('div', { class: 'sf-row' }, h('button', { class: 'sf-btn primary', 'data-k': 'add-confirm', disabled: b.pages.length >= 50, onclick: () => this.confirmAdd() }, t.addHere))) : null,
      h('div', { class: 'sf-sb-list' }, body));
  }
  // The copy an add would make, at this storyboard's size, and how many fixed cells it cuts.
  addCopy(src) {
    const app = this.app, d = app.dims();
    let page, from, fd;
    if (src.kind === 'blueprint') { const bp = app.blueprints.find(x => x.id === src.id); if (!bp) return { page: null, lost: 0 }; page = bp.page; fd = bp; from = { kind: 'blueprint', id: bp.id }; }
    else { const nb = this.tplBoard(src.id); page = nb.pages[src.i]; fd = app.dimsOf(nb); from = { kind: 'template', id: src.id }; }
    const cut = fixedCut(page, fd.rows, fd.cols, d.rows, d.cols), c = clone(page);
    c.zones = cut.zones; c.id = newId('p'); c.wins = []; delete c.win; delete c.alone; c.from = from; c.hue = nextHue(app.cur());
    return { page: c, lost: cut.lost };
  }
  previewAdd() { const S = this.E.sheet; this.E.preview = S && S.src ? this.addCopy(S.src).page : null; this.app.tick(true); }
  confirmAdd() {
    const app = this.app, S = this.E.sheet, { page } = this.addCopy(S.src); if (!page) return;
    app.upd(bb => { bb.pages.push(page); }, true);
    this.E.sheet = null; this.E.preview = null; app.S.sel = app.cur().pages.length - 1;
    app.flash(this.t.addedTo(page.name || this.t.page, app.cur().name)); app.render(); app.tick(true);
  }
  // Import into My boards: a file (a storyboard or a board), or a pasted Vestaboard message.
  importSheet() {
    const t = this.t, S = this.E.sheet, app = this.app, E = this.E, d = app.dimsOf(app.cur());
    const tabs = h('div', { class: 'sf-subtabs', role: 'tablist' }, [['file', t.fromFile], ['vb', t.fromVestaboard]].map(([k, label]) =>
      h('button', { class: 'sf-seg', role: 'tab', 'aria-selected': String(S.tab === k), 'aria-pressed': String(S.tab === k), 'data-k': 'imp-tab-' + k, onclick: () => { S.tab = k; E.preview = null; app.render(); app.tick(true); } }, label)));
    const close = () => { E.sheet = null; E.preview = null; app.render(); app.tick(true); };
    let body;
    if (S.tab === 'file') {
      const file = h('input', { type: 'file', accept: 'application/json,.json', style: 'display:none', onchange: e => { app.importAny(e); close(); } });
      body = [h('p', { class: 'sf-note big' }, t.importFileNote), h('div', { class: 'sf-row' }, h('button', { class: 'sf-btn primary', 'data-k': 'imp-file', onclick: () => file.click() }, t.chooseFile), file), h('p', { class: 'sf-note' }, t.jsonNote)];
    } else {
      const upd = v => { S.vb = v; E.preview = Object.assign({ id: 'vb', name: '' }, vestaboard(v, d.rows, d.cols)); app.tick(true); };
      body = [h('p', { class: 'sf-note big' }, t.vbNote(d.rows, d.cols)),
        h('textarea', { class: 'sf-input sf-vb', rows: 6, spellcheck: 'false', 'aria-label': t.fromVestaboard, 'data-k': 'imp-vb', value: S.vb || '', oninput: e => { upd(e.target.value); const over = e.target.value.replace(/\s+$/, '').split('\n').length - d.rows, el = app.drawer.querySelector('[data-k=vb-over]'); if (el) { el.hidden = over <= 0; el.textContent = over > 0 ? t.vbTooMany(over) : ''; } } }, S.vb || ''),
        h('span', { class: 'sf-hint warn', role: 'status', 'data-k': 'vb-over', hidden: true }),
        h('div', { class: 'sf-row' }, h('button', { class: 'sf-btn primary', 'data-k': 'imp-vb-save', disabled: app.blueprints.length >= MAX_MY,
          onclick: () => { const page = Object.assign({ id: newId('p'), name: (S.vb || '').split('\n')[0].trim().slice(0, 40) || t.page }, vestaboard(S.vb, d.rows, d.cols)); this.saveToMy(page, null, d); close(); } }, t.mSave))];
    }
    return h('div', { class: 'sf-level sf-sheet' },
      h('div', { class: 'sf-row between' }, h('strong', null, t.importShort), h('button', { class: 'sf-btn', 'data-k': 'sheet-close', onclick: close }, t.cancel)), tabs, body);
  }

  movePage(i, j) {
    const b = this.app.cur(); if (j < 0 || j >= b.pages.length || i === j) return false;
    this.app.upd(bb => { const [x] = bb.pages.splice(i, 1); bb.pages.splice(j, 0, x); }, true);
    const s = this.app.S.sel; this.app.S.sel = s === i ? j : i < s && j >= s ? s - 1 : i > s && j <= s ? s + 1 : s;
    return true;
  }
  // Keyboard reorder: focus the handle and use the arrow keys. Focus follows the board.
  handleKey(e, i) {
    const j = e.key === 'ArrowUp' ? i - 1 : e.key === 'ArrowDown' ? i + 1 : null; if (j == null) return;
    e.preventDefault();
    if (!this.movePage(i, j)) return;
    this.app.render();
    const el = this.app.drawer && this.app.drawer.querySelector(`[data-handle="${j}"]`); if (el) el.focus();
  }
  dragStart(e, i) {
    if (e.button > 0) return;
    e.preventDefault();
    let cur = i; this.E.drag = i; this.app.render();
    const mv = ev => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY), li = el && el.closest ? el.closest('[data-pl]') : null;
      if (!li || !this.app.drawer || !this.app.drawer.contains(li)) return;
      const j = +li.dataset.pl;
      if (!isNaN(j) && j !== cur && this.movePage(cur, j)) { cur = j; this.E.drag = j; this.app.render(); }
    };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); this.E.drag = -1; this.app.render(); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  }

  // ---------- page ----------
  pageLevel() {
    const t = this.t, b = this.app.cur(), p = this.page(), d = this.app.dims();
    if (!p) return h('div', { class: 'sf-level' });
    const zs = this.zones();
    const layouts = h('div', { class: 'sf-layouts' }, LAYOUTS.map(id => {
      const [cols, rows, parts] = LAYOUT_PIC[id];
      return h('button', { class: 'sf-layout', 'aria-pressed': String(p.layout === id), 'data-k': 'layout-' + id, onclick: () => this.setLayout(id) },
        h('span', { class: 'sf-layout-pic', style: `grid-template-columns:${cols};grid-template-rows:${rows}` }, parts.map(([c, r, strong]) => h('span', { class: strong ? 'strong' : '', style: `grid-column:${c};grid-row:${r}` }))),
        h('span', null, t.layouts[id]));
    }));
    const zoneRows = h('div', { class: 'sf-zone-rows' }, zs.map((z, k) => {
      const tile = tileFor(p.zones[k]);
      const open = this.E.zoneOpen && this.zi() === k;
      return [h('button', { class: 'sf-zone-row' + (this.E.hover === k || open ? ' on' : ''), 'aria-expanded': String(open), 'data-k': 'zone-' + k, onclick: () => open ? (this.E.zoneOpen = false, this.app.render(), this.app.paintHighlight()) : this.openZone(k),
        onmouseenter: () => this.hover(k), onmouseleave: () => this.hover(null), onfocus: () => this.hover(k), onblur: () => this.hover(null) },
        h('span', { class: 'sf-zone-mark', 'aria-hidden': 'true' }),
        h('span', { class: 'sf-zone-text' }, h('span', null, `${this.zoneName(k)} · ${z.h} × ${z.w}`), h('strong', null, tile ? this.L(tile.name) : t.chooseContent)),
        h('span', { class: 'sf-chev', 'aria-hidden': 'true' }, open ? '⌄' : '›')),
        open ? h('div', { class: 'sf-zone-open' }, this.contentLevel()) : null];
    }));
    let diagram = null;
    if (zs.length > 1) {
      const g = staticGeom(d.rows, d.cols), box = z => ({
        left: ((g.pad + z.c * (GEOM.tileW + GEOM.gapX) - GEOM.gapX / 2) / g.uw * 100).toFixed(3) + '%', top: ((g.pad + z.r * (1 + GEOM.gapY) - GEOM.gapY / 2) / g.uh * 100).toFixed(3) + '%',
        width: ((z.w * GEOM.tileW + z.w * GEOM.gapX) / g.uw * 100).toFixed(3) + '%', height: ((z.h + z.h * GEOM.gapY) / g.uh * 100).toFixed(3) + '%' });
      diagram = h('div', { class: 'sf-diagram' },
        this.thumb('diag', d.rows, d.cols, this.pageGrid(p, b), b.theme),
        zs.map((z, k) => { const bx = box(z), tile = tileFor(p.zones[k]);
          return h('button', { class: 'sf-zone-box', 'data-zone': k, tabIndex: -1, 'aria-hidden': 'true', style: `left:${bx.left};top:${bx.top};width:${bx.width};height:${bx.height}`,
            onclick: () => this.openZone(k), onmouseenter: () => this.hover(k), onmouseleave: () => this.hover(null) },
          h('span', null, tile ? this.L(tile.name) : '+ ' + t.chooseContent)); }));
    }
    const di = DURS.findIndex(x => x >= p.dur), durStep = dir => this.app.updPage(pp => { const i = DURS.findIndex(x => x >= pp.dur); pp.dur = DURS[Math.max(0, Math.min(DURS.length - 1, (i < 0 ? DURS.length - 1 : i) + dir))]; });
    const bp = this.bp(), full = this.app.blueprints.length >= MAX_MY;
    return h('div', { class: 'sf-level' },
      bp ? h('div', { class: 'sf-row between' },
        h('div', { class: 'sf-row' }, h('button', { class: 'sf-btn primary', 'data-k': 'bp-add', onclick: () => { this.E.sheet = { kind: 'pickSb', bp: bp.id }; this.app.render(); } }, t.addToSb)),
        this.more('bp-open', this.bpVerbs(bp)))
      : h('div', { class: 'sf-row between' },
        h('div', { class: 'sf-row' },
          h('button', { class: 'sf-btn primary', 'data-k': 'save-my', disabled: full, title: full ? t.myFull : null, onclick: () => this.saveToMy(p, this.originOf(p, b)) }, t.mSave),
          h('button', { class: 'sf-btn', 'data-k': 'see-week', onclick: () => this.go({ sec: 'sb', lv: 'sb', sb: b.id, view: 'week' }) }, t.seeInWeek)),
        this.more('pg-open', this.pageVerbs(this.app.selIdx()))),
      h('label', { class: 'sf-field' }, h('span', { class: 'sf-eyebrow' }, t.pageName),
        h('input', { class: 'sf-input big', value: p.name, 'data-k': 'page-name', oninput: e => { this.app.updPage(pp => { pp.name = e.target.value.slice(0, 80); }, true); }, onchange: () => this.app.render() })),
      h('div', { class: 'sf-field' }, h('span', { class: 'sf-eyebrow' }, t.layout), layouts,
        bp ? h('span', { class: 'sf-hint' }, t.bpSize(d.rows, d.cols))
          : h('span', { class: 'sf-hint' }, t.gridIs(d.rows, d.cols), ' ', h('button', { class: 'sf-link-btn inline', 'data-k': 'grid-size', onclick: () => this.go({ sec: 'sb', lv: 'sb', sb: b.id, view: 'display' }) }, t.changeSize))),
      h('div', { class: 'sf-field' }, h('span', { class: 'sf-eyebrow' }, t.zones), h('span', { class: 'sf-sub' }, zs.length > 1 ? t.tapZone : t.tapZoneOne), diagram, zoneRows),
      h('div', { class: 'sf-field gap ruled' }, h('span', { class: 'sf-eyebrow' }, bp ? t.onScreen : t.whenShows),
        bp ? h('span', { class: 'sf-hint' }, t.bpNoTimes) : this.windowsEl(p),
        h('div', { class: 'sf-row between' }, h('span', { class: 'sf-label' }, t.showFor),
          this.stepper(`${p.dur} s`, () => durStep(-1), () => durStep(1), 'dur', di <= 0, p.dur >= DURS[DURS.length - 1])),
        h('div', { class: 'sf-field' }, h('span', { class: 'sf-label' }, t.pageTransition),
          h('div', { class: 'sf-row' }, [['', t.boardDefault(t.transitions[b.transition])], ...Object.entries(t.transitions)].map(([id, label]) =>
            h('button', { class: 'sf-seg', 'aria-pressed': String((p.tr || '') === id), 'data-k': 'ptr-' + (id || 'board'),
              onclick: () => { this.app.updPage(pp => { if (id) pp.tr = id; else delete pp.tr; }); this.app.previewTransition(); } }, label))))),
      );
  }
  // A page's time windows: the tick is the way in, then one card per window.
  windowsEl(p) {
    const t = this.t, wins = pageWins(p);
    const setWins = fn => this.app.updPage(pp => { const list = clone(pageWins(pp)); fn(list); pp.wins = list; delete pp.win; if (!list.length) delete pp.alone; });
    const card = (w, i) => {
      const days = w.days && w.days.length ? w.days : [];
      const set = fn => setWins(list => fn(list[i]));
      const dayBtns = [1, 2, 3, 4, 5, 6, 0].map(dn => h('button', { class: 'sf-day', 'aria-pressed': String(!days.length || days.includes(dn)), 'data-k': `day-${i}-${dn}`,
        onclick: () => set(ww => {
          let cur = ww.days && ww.days.length ? ww.days.slice() : [0, 1, 2, 3, 4, 5, 6];
          cur = cur.includes(dn) ? cur.filter(x => x !== dn) : cur.concat(dn);
          ww.days = cur.length === 7 || !cur.length ? [] : cur.sort();
        }) }, t.dayShort[dn]));
      const dated = !!w.date, today = new Date(), iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      return h('div', { class: 'sf-win' },
        h('div', { class: 'sf-row' },
          h('button', { class: 'sf-seg', 'aria-pressed': String(!dated), 'data-k': `win-mode-${i}-days`, onclick: () => set(ww => { delete ww.date; delete ww.yearly; }) }, t.winDays),
          h('button', { class: 'sf-seg', 'aria-pressed': String(dated), 'data-k': `win-mode-${i}-date`, onclick: () => set(ww => { if (!ww.date) { ww.date = iso; ww.days = []; } }) }, t.winDate)),
        dated ? h('div', { class: 'sf-row' },
          h('input', { type: 'date', class: 'sf-input', value: w.date, 'aria-label': t.winDate, 'data-k': `win-date-${i}`, onchange: e => { if (e.target.value) set(ww => { ww.date = e.target.value; }); } }),
          h('label', { class: 'sf-check' }, h('input', { type: 'checkbox', checked: !!w.yearly, 'data-k': `win-yearly-${i}`, onchange: e => set(ww => { if (e.target.checked) ww.yearly = true; else delete ww.yearly; }) }), h('span', null, t.everyYear)))
          : h('div', { class: 'sf-days', role: 'group', 'aria-label': t.daysLabel }, dayBtns),
        h('div', { class: 'sf-row' },
          h('span', { class: 'sf-label muted' }, t.from),
          h('input', { type: 'time', class: 'sf-time', value: w.from, 'aria-label': t.from, 'data-k': `win-from-${i}`, onchange: e => set(ww => { ww.from = e.target.value || '07:00'; }) }),
          h('span', { class: 'sf-label muted' }, t.to),
          h('input', { type: 'time', class: 'sf-time', value: w.to, 'aria-label': t.to, 'data-k': `win-to-${i}`, onchange: e => set(ww => { ww.to = e.target.value || '09:00'; }) }),
          h('span', { class: 'sf-grow' }),
          h('button', { class: 'sf-icon', 'aria-label': t.removeTime, title: t.removeTime, 'data-k': `win-rm-${i}`, onclick: () => setWins(list => { list.splice(i, 1); }) }, '×')));
    };
    return [
      wins.length ? null : h('span', { class: 'sf-hint' }, t.anyTimeHint),
      wins.map(card),
      wins.length < 8 ? h('div', null, h('button', { class: 'sf-link-btn', 'data-k': 'win-add', onclick: () => setWins(list => { const last = list[list.length - 1]; list.push(last ? { from: last.from, to: last.to, days: [] } : { from: '07:00', to: '09:00', days: [] }); }) }, '+ ' + t.addTime)) : null,
      wins.length ? h('div', { class: 'sf-field' },
        h('label', { class: 'sf-check' }, h('input', { type: 'checkbox', checked: !!p.alone, 'data-k': 'win-alone', onchange: e => this.app.updPage(pp => { if (e.target.checked) pp.alone = true; else delete pp.alone; }) }), h('span', null, t.showAlone)),
        h('span', { class: 'sf-hint' }, t.showAloneHint)) : null
    ];
  }
  winLabel(w) {
    if (w.date) {
      const [y, m, d] = w.date.split('-').map(Number), when = `${d} ${this.t.monthShort[m - 1]}${w.yearly ? '' : ' ' + y}`;
      return w.from === w.to ? when : `${when} ${w.from} ${this.t.to} ${w.to}`;
    }
    const t = this.t, days = w.days && w.days.length && w.days.length < 7 ? w.days.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(x => t.dayShort[x]).join(' ') + ' ' : '';
    return `${days}${w.from} ${t.to} ${w.to}`;
  }
  stepper(label, dec, inc, key, noDec, noInc) {
    const t = this.t;
    return h('div', { class: 'sf-stepper' },
      h('button', { 'aria-label': t.less, 'data-k': key + '-dec', disabled: !!noDec, onclick: dec }, '−'),
      h('span', { 'aria-live': 'polite' }, label),
      h('button', { 'aria-label': t.more1, 'data-k': key + '-inc', disabled: !!noInc, onclick: inc }, '+'));
  }
  setLayout(id) {
    this.app.updPage(p => {
      const need = id === 'full' ? 1 : 2; p.layout = id;
      while (p.zones.length < need) p.zones.push(id === 'ticker' ? { ch: 'message', o: { text: 'YOUR TICKER TEXT' } } : { ch: 'clock', o: { fmt: '24' } });
      p.zones.length = need;
    });
  }
  dupPage(stay) {
    const b = this.app.cur(), i = this.app.selIdx(b), id = newId('p');
    this.app.upd(bb => { const c = clone(bb.pages[i]); c.id = id; c.name = (c.name || this.t.page) + this.t.copySuffix; bb.pages.splice(i + 1, 0, c); }, true);
    this.app.S.sel = i + 1;
    if (stay) this.app.render(); else this.go({ sec: 'sb', lv: 'board', sb: b.id, bd: id, from: this.E.from });
  }
  delPage() {
    const b = this.app.cur(), i = this.app.selIdx(b); if (b.pages.length < 2) return;
    const wasOpen = this.onBoard();
    this.app.upd(bb => { bb.pages.splice(i, 1); }, true);
    this.app.S.sel = Math.max(0, i - 1);
    if (wasOpen) this.go({ sec: 'sb', lv: 'sb', sb: b.id, view: this.E.from || 'boards' }, { back: true, replace: true }); else this.app.render();
  }

  // ---------- content ----------
  // A zone's content, shown in place under its row on the board's level (0.7).
  contentLevel() {
    const t = this.t, zone = this.zone(), tile = tileFor(zone);
    if (this.E.picking || !tile) return h('div', { class: 'sf-level' }, this.picker());
    const body = [h('div', { class: 'sf-ch-head sf-land', 'data-k-land': this.E.landKey || 0 },
      h('div', null, h('strong', null, this.L(tile.name)), h('span', null, this.L(tile.desc))),
      h('button', { class: 'sf-btn', 'data-k': 'change', onclick: () => { this.E.picking = true; this.E.search = ''; this.app.render(); const s = this.app.drawer.querySelector('[data-k="pick-search"]'); if (s) s.focus(); } }, t.change))];
    if (zone.ch === 'message' && this.isTicker()) {
      body.push(this.field({ k: 'text', t: 'text', label: { en: t.text, sv: t.text }, upper: 1, len: 500 }, zone.o || {}));
    } else if (zone.ch === 'message') {
      body.push(this.composer.render(zone, this.zones()[this.zi()]));
    }
    body.push(...this.fields(tile, zone.o || {}));
    return h('div', { class: 'sf-level sf-land' }, body);
  }
  fields(tile, o) {
    const t = this.t, list = (tile.fields || []).filter(f => !f.show || f.show(o));
    const ess = list.filter(f => !f.adv), adv = list.filter(f => f.adv), open = !!this.E.adv[tile.id];
    const out = ess.map(f => this.field(f, o));
    if (adv.length) {
      out.push(h('button', { class: 'sf-disclose', 'aria-expanded': String(open), 'data-k': 'adv-' + tile.id, onclick: () => { this.E.adv[tile.id] = !open; this.app.render(); } },
        h('span', { 'aria-hidden': 'true' }, open ? '−' : '+'), h('span', null, open ? t.fewer : `${t.moreOptions} (${adv.length})`)));
      if (open) out.push(h('div', { class: 'sf-adv' }, adv.map(f => this.field(f, o))));
    }
    return out;
  }

  // The content picker: search, then groups of tiles drawn at the zone's own shape.
  picker() {
    const t = this.t, zd = this.zones()[this.zi()], zone = this.zone(), cur = tileFor(zone);
    const input = h('input', { type: 'search', class: 'sf-input big', placeholder: t.searchContent, 'aria-label': t.searchContent, value: this.E.search, 'data-k': 'pick-search', autocomplete: 'off',
      oninput: e => { this.E.search = e.target.value; groups.replaceWith(groups = this.pickerGroups(zd, cur)); this.paintThumbs(); } });
    let groups = this.pickerGroups(zd, cur);
    return h('div', { class: 'sf-picker' },
      h('div', { class: 'sf-field' }, input, h('span', { class: 'sf-sub' }, t.shapeNote(zd.h, zd.w), ' ', h('button', { class: 'sf-link-btn inline', 'data-k': 'grid-size', onclick: () => this.go({ sec: 'sb', lv: 'sb', sb: this.app.cur().id, view: 'display' }) }, t.changeSize))),
      groups);
  }
  pickerGroups(zd, cur) {
    const t = this.t, q = this.E.search.trim().toLowerCase(), wide = +aspect(zd.h, zd.w) > 3.2, ticker = this.isTicker();
    const match = x => !q || [x.name.en, x.name.sv, x.desc ? x.desc.en : '', x.desc ? x.desc.sv : ''].some(s => s.toLowerCase().includes(q));
    const b = this.app.cur(), now = Date.now(), pl = previewLive(this.app.live.data, now);
    const groups = GROUPS.map(([g, label]) => {
      const tiles = TILES.filter(x => x.g === g && match(x) && !(ticker && (x.id === 'draw' || x.id === 'photo')));
      if (!tiles.length) return null;
      return h('section', { class: 'sf-group' }, h('h3', { class: 'sf-eyebrow' }, this.L(label)),
        h('div', { class: 'sf-tiles' + (wide ? ' one' : '') }, tiles.map(x => x.later
          ? h('div', { class: 'sf-tile later' }, h('strong', null, this.L(x.name)), h('span', null, t.later))
          : h('button', { class: 'sf-tile', 'aria-pressed': String(cur === x), 'data-k': 'tile-' + x.id, onclick: () => this.pick(x) },
            this.thumb('tile-' + x.id, zd.h, zd.w, () => this.previewGrid(x, zd, now, pl, b.theme), b.theme),
            h('span', { class: 'sf-tile-text' }, h('strong', null, this.L(x.name)), h('span', null, this.L(x.desc)))))));
    }).filter(Boolean);
    return h('div', { class: 'sf-groups' }, groups.length ? groups : h('p', { class: 'sf-note big' }, t.noResults));
  }
  // What a tile's content looks like in this zone, with sample data where needed.
  previewGrid(tile, zd, now, pl, theme) {
    const o = this.defaults(tile, zd, theme, true);
    const page = { id: 'pv', layout: 'full', zones: [{ ch: tile.ch, o }] };
    return compose(page, zd.h, zd.w, now, this.lang, pl);
  }
  defaults(tile, zd, theme, preview) {
    const o = clone(tile.def || {}), home = this.app.live.data.home, loc = this.app.cur().loc;
    if (tile.id === 'message') {
      if (this.isTicker()) o.text = this.lang === 'sv' ? 'DIN LÖPTEXT HÄR' : 'YOUR TICKER TEXT';
      else if (preview) o.lines = zd.h >= 3 ? ['', this.lang === 'sv' ? 'HEJ' : 'HELLO', 'roygbv'] : [this.lang === 'sv' ? 'HEJ' : 'HELLO'];
    }
    // defaults in the page's language (0.7.3: the Swedish page started these in English)
    if (this.lang === 'sv' && tile.id === 'rotating') o.messages = ['GOD MORGON', 'KAFFET ÄR KLART', 'LUNCH KL 12'];
    if (this.lang === 'sv' && tile.id === 'menu') o.title = 'IDAG';
    if (tile.id === 'draw') { o.mode = 'paint'; o.cells = stamp(zd.h, zd.w, zd.h >= 6 && zd.w >= 7 ? HEART : ['rr.rr', '.rrr.']); }
    if (tile.id === 'photo') { o.mode = 'photo'; o.cells = this.samplePhoto(zd.h, zd.w, theme || this.app.cur().theme); }
    if (tile.id === 'sl') Object.assign(o, home ? { home: true } : { stations: [{ id: 9117, name: 'Odenplan' }] });
    if (tile.id === 'weather' && !(loc && loc.lat != null)) Object.assign(o, { city: 'Stockholm', lat: 59.33, lon: 18.07 });
    if (tile.id === 'url' && preview) o.url = 'sample';
    return o;
  }
  samplePhoto(h0, w0, theme) {
    this.photoCache = this.photoCache || new Map();
    const k = `${h0}x${w0}${theme}`;
    if (!this.photoCache.has(k)) this.photoCache.set(k, mapImage(sampleImage(), h0, w0, { theme, dither: true, blank: false }));
    return clone(this.photoCache.get(k));
  }
  pick(tile) {
    const zone = this.zone(), cur = tileFor(zone), zd = this.zones()[this.zi()];
    if (cur !== tile || this.E.fresh) {
      const o = this.defaults(tile, zd);
      this.composer.forget();
      this.updZone(z => { z.ch = tile.ch; z.o = o; });
    }
    Object.assign(this.E, { picking: false, fresh: false, search: '', landKey: (this.E.landKey || 0) + 1 });
    this.app.render();
  }

  // ---------- option fields ----------
  field(f, o) {
    const t = this.t, lab = f.label ? this.L(f.label) : '', hint = f.hint ? h('span', { class: 'sf-hint' }, this.L(f.hint)) : null;
    const val = f.k ? (o[f.k] != null ? o[f.k] : f.dflt) : null, key = 'f-' + (f.k || f.t);
    const set = (v, quiet) => this.setO(oo => { if (v === undefined) delete oo[f.k]; else oo[f.k] = v; }, quiet);
    const wrap = (...kids) => h('div', { class: 'sf-field' }, lab && f.t !== 'toggle' ? h('span', { class: 'sf-label' }, lab) : null, ...kids, hint);
    switch (f.t) {
      case 'text': return wrap(h('input', { class: 'sf-input mono' + (f.upper ? ' upper' : ''), value: val || '', spellcheck: 'false', autocomplete: 'off', 'data-k': key,
        oninput: e => set(e.target.value.slice(0, f.len || 200), true), onchange: () => this.app.render() }));
      case 'date': return wrap(h('input', { type: 'date', class: 'sf-input', value: val || '', 'data-k': key, onchange: e => set(e.target.value || undefined) }));
      case 'seg': return wrap(h('div', { class: 'sf-row' }, f.opts.map(([id, l]) => h('button', { class: 'sf-seg', 'aria-pressed': String(String(val) === String(id)), 'data-k': `${key}-${id}`,
        onclick: () => set(id) }, l ? this.L(l) : t[f.names][id]))));
      case 'chips': {
        const all = f.opts.map(x => x[0]), cur = Array.isArray(val) ? val : [];
        const on = id => f.all ? !cur.length || cur.includes(id) : cur.includes(id);
        const toggle = id => {
          let next = f.all && !cur.length ? all.slice() : cur.slice();
          next = next.includes(id) ? next.filter(x => x !== id) : next.concat(id);
          if (f.all) next = next.length === all.length || !next.length ? [] : next;
          else if (!next.length || (f.max && next.length > f.max)) return;
          set(next);
        };
        return wrap(h('div', { class: 'sf-row' }, f.opts.map(([id, l]) => h('button', { class: 'sf-chip-btn', 'aria-pressed': String(on(id)), 'data-k': `${key}-${id}`, onclick: () => toggle(id) },
          h('span', { 'aria-hidden': 'true' }, on(id) ? '✓' : '+'), h('span', null, this.L(l))))));
      }
      case 'toggle': return h('div', { class: 'sf-field' }, h('label', { class: 'sf-check' }, h('input', { type: 'checkbox', checked: !!val, 'data-k': key, onchange: e => set(e.target.checked) }), h('span', null, lab)), hint);
      case 'stepper': {
        const v = +val || 0, show = f.auto && !v ? this.L(f.auto) : `${v}${f.unit ? ' ' + f.unit : ''}`;
        const lo = f.auto ? 0 : f.min;
        return wrap(this.stepper(show, () => set(Math.max(lo, v - f.step) || (f.auto ? undefined : lo)), () => set(Math.min(f.max, Math.max(f.min, v + f.step))), key, v <= lo, v >= f.max));
      }
      case 'colour': return wrap(this.swatches(val || 'f', v => set(v), f.rainbow, key));
      case 'palette': {
        const cur = Array.isArray(val) ? val : [];
        return wrap(this.swatches(null, k => set(cur.includes(k) ? cur.filter(x => x !== k) : cur.concat(k)), false, key, cur));
      }
      case 'search': return wrap(this.cityField(o, key));
      case 'stations': return wrap(this.stationsField(o, key, f.max));
      case 'textlist': {
        const items = Array.isArray(val) ? val : [];
        return wrap(h('div', { class: 'sf-list' },
          items.map((v, i) => h('div', { class: 'sf-row nowrap' },
            h('input', { class: 'sf-input mono upper', value: v, spellcheck: 'false', 'aria-label': `${lab} ${i + 1}`, 'data-k': `${key}-${i}`,
              oninput: e => this.setO(oo => { oo[f.k] = (oo[f.k] || []).slice(); oo[f.k][i] = e.target.value.slice(0, f.len || 120); }, true) }),
            h('button', { class: 'sf-icon', 'aria-label': t.remove, 'data-k': `${key}-rm-${i}`, onclick: () => set(items.filter((_, j) => j !== i)) }, '×'))),
          items.length < (f.max || 12) ? h('button', { class: 'sf-link-btn', 'data-k': key + '-add', onclick: () => { set(items.concat('')); const el = this.app.drawer.querySelector(`[data-k="${key}-${items.length}"]`); if (el) el.focus(); } }, '+ ' + this.L(f.add)) : null));
      }
      case 'template': return wrap(this.templateField(o, key));
      case 'note': return h('p', { class: 'sf-note big' }, lab);
      case 'locnote': {
        const loc = this.app.cur().loc;
        if (loc && loc.lat != null) return h('p', { class: 'sf-note' }, t.sunFrom(loc.city));
        return h('p', { class: 'sf-note' }, t.sunNeedsLoc, ' ', h('button', { class: 'sf-link-btn inline', 'data-k': 'to-settings', onclick: () => this.go('settings') }, t.viewDisplay));
      }
      case 'slhome': return this.slHome(o);
      default: return null;
    }
  }
  swatches(cur, pick, rainbow, key, many) {
    const t = this.t, T = THEMES[this.app.cur().theme], names = CHIP_NAMES[this.lang];
    const sw = (id, bg, label) => { const on = many ? many.includes(id) : cur === id;
      return h('button', { class: 'sf-swatch', role: many ? null : 'radio', 'aria-checked': many ? null : String(on), 'aria-pressed': many ? String(on) : null, 'aria-label': label, title: label, 'data-k': `${key}-${id}`, style: `background:${bg}`, onclick: () => pick(id) }); };
    return h('div', { class: 'sf-swatches', role: many ? 'group' : 'radiogroup' },
      sw('f', T.filled, many ? names.f : t.themeColour),
      ['r', 'o', 'y', 'g', 'b', 'v', 'w', 'k'].filter(k => many || k !== 'k').map(k => sw(k, CHIPS[k], names[k])),
      rainbow ? sw('rainbow', 'linear-gradient(90deg,#D5352B,#EE7D22,#F2BE2E,#2C9A5A,#2B6FC4,#7A4DB2)', t.rainbow) : null);
  }
  // A search box whose suggestions update in place, so typing never rebuilds the drawer.
  searchBox(key, placeholder, search, pick, note) {
    const t = this.t, sugs = h('div', { class: 'sf-sugs', role: 'listbox' });
    let seq = 0;
    const input = h('input', { type: 'search', class: 'sf-input', placeholder, 'aria-label': placeholder, 'data-k': key, autocomplete: 'off',
      oninput: async e => {
        const q = e.target.value, my = ++seq;
        if (!q.trim()) { sugs.replaceChildren(); return; }
        const res = await search(q); if (my !== seq) return;
        sugs.replaceChildren(...(res.length ? res.map(r => h('button', { class: 'sf-sug', role: 'option', onclick: () => pick(r) }, h('span', null, r.name), h('span', null, note ? note(r) : r.note || ''))) : [h('div', { class: 'sf-sug' }, h('span', null, t.noMatch))]));
      } });
    return h('div', { class: 'sf-search' }, input, sugs);
  }
  cityField(o, key) {
    const t = this.t;
    return h('div', { class: 'sf-list' },
      o.lat != null ? h('div', { class: 'sf-chosen' }, h('span', null, o.city), h('button', { class: 'sf-icon', 'aria-label': t.remove, 'data-k': key + '-clear', onclick: () => this.setO(oo => { delete oo.city; delete oo.lat; delete oo.lon; }) }, '×')) : null,
      this.searchBox(key, o.lat != null ? t.changeCity : t.searchCity, q => searchCities(q, this.lang), r => this.setO(oo => { oo.city = r.name; oo.lat = r.lat; oo.lon = r.lon; })));
  }
  stationsField(o, key, max) {
    const t = this.t, list = Array.isArray(o.stations) && o.stations.length ? o.stations : o.sites && o.sites.length ? [{ id: o.sites[0], name: o.name || '' }] : [];
    const save = next => this.setO(oo => { oo.stations = next; delete oo.sites; delete oo.name; delete oo.site; });
    const note = r => r.modes ? [...r.modes].map(m => t.modeNames[MODE_LETTERS[m]]).join(', ') : r.note || '';
    return h('div', { class: 'sf-list' },
      list.map((s, i) => h('div', { class: 'sf-chosen' },
        h('span', { class: 'sf-num' }, String(i + 1)), h('span', null, s.name),
        h('button', { class: 'sf-icon', 'aria-label': t.moveUp, disabled: i === 0, 'data-k': `${key}-up-${i}`, onclick: () => { const n = list.slice(); [n[i - 1], n[i]] = [n[i], n[i - 1]]; save(n); } }, '↑'),
        h('button', { class: 'sf-icon', 'aria-label': t.remove, 'data-k': `${key}-rm-${i}`, onclick: () => save(list.filter((_, j) => j !== i)) }, '×'))),
      list.length < max ? this.searchBox(key, t.addStation, q => searchStations(q), r => { if (!list.some(x => x.id === r.id)) save(list.concat({ id: r.id, name: r.name })); }, note) : null,
      h('span', { class: 'sf-hint' }, t.maxStations));
  }
  slHome(o) {
    const t = this.t, home = this.app.live.data.home;
    const onMaclaine = /(^|\.)maclaine\.se$/.test(location.hostname) || location.hostname === 'localhost';
    return h('div', { class: 'sf-field' },
      h('label', { class: 'sf-check' }, h('input', { type: 'checkbox', checked: !!o.home, disabled: !home && !o.home, 'data-k': 'f-slhome', onchange: e => this.setO(oo => { if (e.target.checked) oo.home = true; else delete oo.home; }) }), h('span', null, t.slHome)),
      h('span', { class: 'sf-hint' }, home ? t.slHomeIs(home.name) : t.slHomeNone, onMaclaine ? [' ', h('a', { href: this.lang === 'sv' ? '/stockholm-sl-map' : '/en/stockholm-sl-map' }, t.slMapLink)] : null));
  }
  // Follow a URL: the template with buttons for the feed's fields, the first item as it
  // arrived, and what the board will print, drawn at the zone's real shape.
  templateField(o, key) {
    const t = this.t, zd = this.zones()[this.zi()], b = this.app.cur(), data = o.url && this.app.live.data.url[o.url];
    const items = data && data.items && data.items.length ? data.items : o.url ? null : SAMPLE_FEED;
    const first = items && items[0];
    const tokens = first ? Object.keys(first).filter(k => first[k] == null || typeof first[k] !== 'object').slice(0, 10) : [];
    const unknown = first ? templateTokens(o.tpl).filter(k => !(k.split('.')[0] in first)) : [];
    const input = h('input', { class: 'sf-input mono', value: o.tpl || '', spellcheck: 'false', 'data-k': key, 'aria-label': t.lineTemplate,
      oninput: e => this.setO(oo => { oo.tpl = e.target.value.slice(0, 200); }, true), onchange: () => this.app.render() });
    const insert = tok => { const v = input.value, a = input.selectionStart ?? v.length, s = v.slice(0, a) + `{{${tok}}}` + v.slice(input.selectionEnd ?? a); this.setO(oo => { oo.tpl = s.slice(0, 200); }); };
    const pl = items ? { url: { [o.url || 'sample']: { items } } } : this.app.live.data;
    const prevO = Object.assign({}, o, { url: o.url || 'sample' });
    return h('div', { class: 'sf-list' }, input,
      tokens.length ? h('div', { class: 'sf-row' }, h('span', { class: 'sf-hint' }, t.insert), tokens.map(k => h('button', { class: 'sf-token', 'data-k': `${key}-tok-${k}`, onclick: () => insert(k) }, k))) : null,
      h('span', { class: 'sf-hint' }, o.url ? t.firstItem : t.sampleFeed),
      h('code', { class: 'sf-code' }, first ? JSON.stringify(first, null, 1).slice(0, 400) : data && data.err ? t.feedErr : t.loadingFeed),
      h('span', { class: 'sf-hint' }, t.prints),
      this.thumb('urlprev', zd.h, zd.w, () => compose({ layout: 'full', zones: [{ ch: 'url', o: prevO }] }, zd.h, zd.w, Date.now(), this.lang, pl), b.theme, { class: 'sf-thumb big' }),
      unknown.length ? h('span', { class: 'sf-hint warn', role: 'status' }, unknown.map(k => t.unknownToken(k)).join(' ')) : null);
  }

  // ---------- board settings ----------
  settingsLevel() {
    const t = this.t, app = this.app, b = app.cur();
    const seg = (items, cur, pick, key) => items.map(([id, label]) => h('button', { class: 'sf-seg', 'aria-pressed': String(id === cur), 'data-k': key + '-' + id, onclick: () => pick(id) }, label));
    const sample = (T, d) => { const g = blank(d.rows, d.cols), txt = [...'HEJ ÅÄÖ']; txt.forEach((c, i) => { if (g[1] && i < d.cols) g[1][i + 1] = c; }); ['r', 'o', 'y', 'g', 'b', 'v'].forEach((k, i) => { if (g[2] && i + 1 < d.cols) g[2][i + 1] = k; }); return g; };
    const themes = h('div', { class: 'sf-themes' }, Object.values(THEMES).map(th => h('button', { class: 'sf-theme', 'aria-pressed': String(b.theme === th.id), 'data-k': 'theme-' + th.id, onclick: () => app.upd(bb => { bb.theme = th.id; }) },
      this.thumb('th-' + th.id, 4, 9, () => sample(th, { rows: 4, cols: 9 }), th.id), h('span', null, th.label))));
    const loc = b.loc;
    return h('div', { class: 'sf-level' },
      h('p', { class: 'sf-note' }, t.displayNote),
      h('section', { class: 'sf-field' }, h('h3', { class: 'sf-eyebrow' }, t.theme), themes),
      h('section', { class: 'sf-field' }, h('h3', { class: 'sf-eyebrow' }, t.size),
        h('div', { class: 'sf-row' }, seg([['6x22', '6 × 22'], ['3x15', '3 × 15'], ['fill', t.fill], ['custom', t.custom]], b.size, v => app.upd(bb => { if (v === 'custom' && bb.size !== 'custom') { const d = app.dims(); bb.rows = d.rows; bb.cols = d.cols; } bb.size = v; }), 'size')),
        b.size === 'custom' && h('div', { class: 'sf-row' },
          h('label', { class: 'sf-field' }, h('span', { class: 'sf-label' }, t.rows), h('input', { type: 'number', class: 'sf-input num', min: 1, max: 24, value: b.rows, 'data-k': 'rows', onchange: e => app.upd(bb => { bb.rows = Math.max(1, Math.min(24, +e.target.value || 6)); }) })),
          h('label', { class: 'sf-field' }, h('span', { class: 'sf-label' }, t.cols), h('input', { type: 'number', class: 'sf-input num', min: 4, max: 60, value: b.cols, 'data-k': 'cols', onchange: e => app.upd(bb => { bb.cols = Math.max(4, Math.min(60, +e.target.value || 22)); }) })))),
      h('section', { class: 'sf-field' }, h('h3', { class: 'sf-eyebrow' }, t.transition),
        h('div', { class: 'sf-row' }, seg(Object.entries(t.transitions), b.transition, v => { app.upd(bb => { bb.transition = v; }); app.previewTransition(); }, 'tr')),
        h('div', { class: 'sf-row' }, h('span', { class: 'sf-label muted w' }, t.speed), seg([['fast', t.speeds.fast], ['gentle', t.speeds.gentle], ['authentic', t.speeds.authentic]], b.speed, v => { app.upd(bb => { bb.speed = v; }); app.previewTransition(); }, 'sp')),
        h('div', null, h('button', { class: 'sf-small-btn', 'data-k': 'tr-preview', onclick: () => app.previewTransition() }, t.preview))),
      h('section', { class: 'sf-field' }, h('h3', { class: 'sf-eyebrow' }, t.boardLoc),
        loc && loc.lat != null ? h('div', { class: 'sf-chosen' }, h('span', null, loc.city), h('button', { class: 'sf-icon', 'aria-label': t.remove, 'data-k': 'loc-clear', onclick: () => app.upd(bb => { delete bb.loc; }) }, '×')) : null,
        this.searchBox('loc', loc && loc.lat != null ? t.changeCity : t.searchCity, q => searchCities(q, this.lang), r => app.upd(bb => { bb.loc = { city: r.name, lat: r.lat, lon: r.lon }; })),
        h('span', { class: 'sf-hint' }, t.locHint)),
      h('section', { class: 'sf-field' }, h('h3', { class: 'sf-eyebrow' }, t.rolls),
        h('label', { class: 'sf-check' }, h('input', { type: 'checkbox', checked: !!(b.roll && b.roll.start), 'data-k': 'roll-start', onchange: e => app.upd(bb => { bb.roll = Object.assign({ start: false, hourly: false }, bb.roll, { start: e.target.checked }); }) }), h('span', null, t.rollStart)),
        h('label', { class: 'sf-check' }, h('input', { type: 'checkbox', checked: !!(b.roll && b.roll.hourly), 'data-k': 'roll-hourly', onchange: e => app.upd(bb => { bb.roll = Object.assign({ start: false, hourly: false }, bb.roll, { hourly: e.target.checked }); }) }), h('span', null, t.rollHourly)),
        h('div', null, h('button', { class: 'sf-small-btn', 'data-k': 'roll-preview', onclick: () => app.board.roll('curtain') }, t.preview))),
      h('section', { class: 'sf-field' },
        h('label', { class: 'sf-check' }, h('input', { type: 'checkbox', checked: !!b.quiet.on, 'data-k': 'quiet-on', onchange: e => app.upd(bb => { bb.quiet.on = e.target.checked; }) }), h('span', { class: 'sf-eyebrow' }, t.quiet)),
        b.quiet.on && h('div', { class: 'sf-indent' }, h('div', { class: 'sf-row' },
          h('input', { type: 'time', class: 'sf-time', value: b.quiet.from, 'aria-label': t.from, 'data-k': 'q-from', onchange: e => app.upd(bb => { bb.quiet.from = e.target.value || '23:00'; }) }),
          h('span', { class: 'sf-label muted' }, t.to),
          h('input', { type: 'time', class: 'sf-time', value: b.quiet.to, 'aria-label': t.to, 'data-k': 'q-to', onchange: e => app.upd(bb => { bb.quiet.to = e.target.value || '07:00'; }) })),
          h('div', { class: 'sf-row' }, seg([['blank', t.quietBlank], ['dim', t.quietDim]], b.quiet.mode, v => app.upd(bb => { bb.quiet.mode = v; }), 'qm')))),
      h('section', { class: 'sf-field' },
        h('label', { class: 'sf-check' }, h('input', { type: 'checkbox', checked: !!b.sound, 'data-k': 'sound', onchange: () => app.toggleSound() }), h('span', { class: 'sf-eyebrow' }, t.sound)),
        h('div', { class: 'sf-row' }, h('span', { class: 'sf-label muted w' }, t.soundStyle),
          seg(sound.PROFILE_IDS.map(id => [id, t.sounds[id]]), b.soundStyle || 'clack', v => { app.upd(bb => { bb.soundStyle = v; }); sound.preview(v); }, 'ss')),
        app.volumeSlider(b),
        h('div', null, h('button', { class: 'sf-small-btn', 'data-k': 'ss-preview', onclick: () => sound.preview(b.soundStyle || 'clack') }, t.previewSound))));
  }

  // ---------- explore ----------
  // Templates to start from. A first visit lands here, with a way to keep the demo board.
  exploreLevel() {
    const t = this.t, app = this.app, first = app.startPending(), now = Date.now();
    const tplGrid = h('div', { class: 'sf-templates' }, TEMPLATES.map(tp => {
      const nb = this.tplBoard(tp.id), d = app.dimsOf(nb);
      return h('button', { class: 'sf-template', 'data-k': 'tpl-' + tp.id, onclick: () => this.go({ sec: 'ex', lv: 'tpl', tpl: tp.id }) },
        this.thumb('tpl-' + tp.id, d.rows, d.cols, () => compose(nb.pages[0], d.rows, d.cols, now, this.lang, previewLive(app.live.data, now)), nb.theme),
        h('span', { class: 'sf-tile-text' }, h('strong', null, tp.name[this.lang]), h('span', null, `${tp.desc[this.lang]} · ${t.boardsCount(nb.pages.length)}`)));
    }));
    const file = h('input', { type: 'file', accept: 'application/json,.json', style: 'display:none', onchange: e => app.importFile(e) });
    return h('div', { class: 'sf-level' },
      h('div', { class: 'sf-start-head' }, h('h2', null, t.startTitle), h('p', null, t.exIntro)),
      app.account.available && !app.account.signedIn() ? h('div', { class: 'sf-guest' }, h('span', null, t.startGuest), h('button', { class: 'sf-btn', 'data-k': 'start-signin', onclick: () => app.account.signIn() }, t.signInGoogle)) : null,
      first ? h('button', { class: 'sf-btn big', 'data-k': 'skip', onclick: () => { app.markStarted(); this.open(); } }, t.skip) : null,
      tplGrid,
      h('section', { class: 'sf-field ruled' }, h('h3', { class: 'sf-eyebrow' }, t.importTitle),
        h('div', { class: 'sf-row' }, h('button', { class: 'sf-btn', 'data-k': 'import', onclick: () => file.click() }, t.importB), file),
        h('p', { class: 'sf-note' }, t.jsonNote)),
      h('div', { class: 'sf-later' }, h('strong', null, t.fromOthers), h('span', null, t.laterShort)));
  }
  templateLevel() {
    const t = this.t, app = this.app, tp = TEMPLATES.find(x => x.id === this.E.tpl), nb = this.tplBoard(tp.id), d = app.dimsOf(nb), now = Date.now();
    return h('div', { class: 'sf-level' },
      h('p', { class: 'sf-note big' }, tp.desc[this.lang]),
      h('div', { class: 'sf-row' }, h('button', { class: 'sf-btn primary', 'data-k': 'use-tpl', disabled: app.boards.length >= 50, onclick: () => app.useTemplate(tp.id) }, t.useAsNew)),
      h('ol', { class: 'sf-pls' }, nb.pages.map((p, i) => h('li', { class: 'sf-pl', style: `--hue:${hueOf(nb, i)}` },
        h('div', { class: 'sf-pl-open static' },
          this.thumb(`tp-${tp.id}-${i}`, d.rows, d.cols, () => compose(p, d.rows, d.cols, now, this.lang, previewLive(app.live.data, now)), nb.theme),
          h('span', { class: 'sf-pl-text' }, h('span', { class: 'sf-pl-name' }, p.name || `${t.page} ${i + 1}`), h('span', { class: 'sf-pl-meta' }, `${p.dur} s`))),
        h('div', { class: 'sf-row' },
          h('button', { class: 'sf-small-btn', 'data-k': `tpl-save-${i}`, disabled: app.blueprints.length >= MAX_MY, onclick: () => this.saveToMy(p, { kind: 'template', id: tp.id }, d, nb.theme) }, t.mSave),
          h('button', { class: 'sf-small-btn', 'data-k': `tpl-copy-${i}`, onclick: () => { this.E.sheet = { kind: 'copy', tplPage: p }; app.render(); } }, t.addToSb))))));
  }
  tplBoard(id) {
    this.tplCache = this.tplCache || new Map();
    const k = id + this.lang;
    if (!this.tplCache.has(k)) this.tplCache.set(k, fromTemplate(id, this.lang, this.app.live.data.home));
    return this.tplCache.get(k);
  }

  // ---------- the board's name, renamed in place ----------
  // The name in the playlist header is a button; pressing it (or Rename in the board menu)
  // turns it into a text field. Enter or leaving the field saves, Escape keeps the old name.
  boardName() {
    const t = this.t, b = this.app.cur();
    if (!this.E.renaming) return h('button', { class: 'sf-name-btn', title: t.renameBoard, 'aria-label': `${t.renameBoard}: ${b.name}`, 'data-k': 'board-rename',
      onclick: () => this.startRename(), ondblclick: () => this.startRename() }, h('strong', null, b.name), h('span', { class: 'sf-name-pen', 'aria-hidden': 'true' }, '✎'));
    const done = save => {
      if (!this.E.renaming) return;
      this.E.renaming = false;
      const v = input.value.trim().slice(0, 80);
      if (save && v && v !== b.name) this.app.upd(bb => { bb.name = v; }); else this.app.render();
    };
    const input = h('input', { class: 'sf-input sf-rename', value: b.name, 'aria-label': t.boardName, 'data-k': 'rename-input', spellcheck: 'false',
      onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); done(true); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(false); } },
      onblur: () => done(true) });
    return input;
  }
  startRename() {
    this.E.renaming = true;
    if (!(this.E.sec === 'sb' && this.E.lv === 'sb')) this.go({ sec: 'sb', lv: 'sb', sb: this.app.cur().id, view: this.E.view || 'week' }); else this.app.render();
    const el = this.app.drawer && this.app.drawer.querySelector('[data-k="rename-input"]');
    if (el) { el.focus(); el.select(); }
  }

  // ---------- account ----------
  accountStatus() {
    const a = this.app.account, t = this.t;
    if (a.status === 'idle' && a.unsyncedCount()) return t.accSyncedExcept(a.unsyncedCount());   // a refused board is not waiting, but it is not synced either
    return a.status === 'signedout' ? t.accSignedOut : a.status === 'failed' ? t.accFailed : a.status === 'idle' ? t.accSynced : t.accWaiting;
  }
  accountSub() {
    const a = this.app.account;
    return a.signedIn() ? `${a.user.name} · ${this.accountStatus()}` : a.status === 'signedout' ? this.t.accSignedOut : this.t.accGuestSub;
  }
  privacyHref() {
    const alt = this.app.alt;
    return alt.en || alt.sv ? (this.lang === 'sv' ? '/split-flap/privacy' : '/en/split-flap/privacy') : './privacy.html';
  }
  // Sign out and delete account ask twice: the first press says what will happen.
  // Two presses. The second press's label stays short and the why goes in a note below,
  // so the button still reads as a button on a phone.
  confirmBtn(key, label, again, why, run, cls) {
    const armed = this.E.confirm === key;
    return [h('button', { class: 'sf-btn ' + (cls || ''), 'data-k': 'acc-' + key, onclick: async () => {
      if (!armed) { this.E.confirm = key; this.app.render(); return; }
      this.E.confirm = null; await run(); this.app.render();
    } }, armed ? again : label),
    armed ? h('p', { class: 'sf-note big sf-confirm-why', role: 'status', 'data-k': 'acc-' + key + '-why' }, why) : null];
  }
  // Language is the person's, not the board's: the editor, and what boards print (days,
  // months, the short words). Kept in this browser; on maclaine.se it also picks the page.
  langField(cls) {
    const seg = ([id, label]) => h('button', { class: 'sf-seg', 'aria-pressed': String(id === this.lang), lang: id, 'data-k': 'lang-' + id, onclick: () => this.app.setLang(id) }, label);
    return h('section', { class: 'sf-field' + (cls ? ' ' + cls : '') }, h('h3', { class: 'sf-eyebrow' }, this.t.lang),
      h('div', { class: 'sf-row' }, [['en', 'English'], ['sv', 'Svenska']].map(seg)), h('span', { class: 'sf-hint' }, this.t.langHint));
  }
  accountLevel() {
    const t = this.t, a = this.app.account, privacy = h('a', { href: this.privacyHref(), 'data-k': 'acc-privacy' }, t.accPrivacy);
    if (!a.available) return h('div', { class: 'sf-level' }, this.langField(), this.accountFoot());
    if (!a.signedIn()) return h('div', { class: 'sf-level' },
      a.status === 'signedout'
        ? h('div', { class: 'sf-field' }, h('p', { class: 'sf-note big' }, t.accSignedOutBody(a.unsyncedCount())))
        : h('div', { class: 'sf-field' }, h('p', { class: 'sf-note big' }, t.accGuestBody), h('p', { class: 'sf-note big' }, t.accSignInBody)),
      h('div', null, h('button', { class: 'sf-btn primary big', 'data-k': 'acc-signin', onclick: () => a.signIn() }, t.signInGoogle)),
      this.langField('ruled'),
      this.accountFoot(),
      h('p', { class: 'sf-note' }, privacy));
    const status = this.accountStatus();
    return h('div', { class: 'sf-level' },
      a.offerCount() ? this.offerEl() : null,
      h('section', { class: 'sf-field' },
        h('strong', { class: 'sf-acc-name' }, a.user.name), h('span', { class: 'sf-hint' }, a.user.email),
        h('span', { class: 'sf-acc-status' + (a.status === 'failed' ? ' fail' : ''), role: 'status', 'data-account-status': '' }, status)),
      a.refusedBoards().length ? h('section', { class: 'sf-field sf-refused' },
        a.refusedBoards().map(r => h('span', { class: 'sf-hint warn' }, t.refusedBoard(r.name, r.error)))) : null,
      h('div', { class: 'sf-row' },
        h('button', { class: 'sf-btn', 'data-k': 'acc-export', onclick: () => a.exportAll() }, t.exportAll),
        this.confirmBtn('signout', t.signOut, a.unsyncedCount() ? t.signOutAnyway : t.signOutAgain, a.unsyncedCount() ? t.confirmSignOutUnsynced(a.unsyncedCount()) : t.confirmSignOut, () => a.signOut())),
      this.langField('ruled'),
      this.accountFoot(),
      h('div', { class: 'sf-row ruled' }, this.confirmBtn('delete', t.deleteAccount, t.deleteAgain, t.confirmDelete, () => a.deleteAccount(), 'danger')),
      h('p', { class: 'sf-note' }, privacy));
  }

  // The first sign-in offer (0.6.3, two groups from 0.7.1): every storyboard and every board
  // in My boards from before, all ticked, and Keep counts the ticks.
  offerEl() {
    const t = this.t, a = this.app.account, sb = a.offer, my = a.offerMy(), all = sb.concat(my), n = all.filter(id => !a.unticked.has(id)).length;
    const item = (id, name) => h('label', { class: 'sf-check' }, h('input', { type: 'checkbox', checked: !a.unticked.has(id), 'data-k': 'offer-' + id, onchange: () => a.toggleOffer(id) }), h('span', null, name));
    const group = (title, ids, find) => ids.length ? h('div', { class: 'sf-offer-list' }, h('span', { class: 'sf-eyebrow' }, title), ids.map(id => { const x = find(id); return x ? item(id, x.name) : null; })) : null;
    return h('section', { class: 'sf-field sf-offer' },
      h('strong', null, t.offerTitle2(sb.length, my.length)), h('span', { class: 'sf-hint' }, t.offerBody(all.length)),
      all.length > 1 ? [group(t.secStoryboards, sb, id => this.app.boards.find(x => x.id === id)), group(t.secMyBoards, my, id => this.app.blueprints.find(x => x.id === id))] : null,
      h('div', { class: 'sf-row' },
        h('button', { class: 'sf-btn primary', 'data-k': 'offer-keep', disabled: !n, onclick: () => a.answerOffer(true) }, all.length > 1 ? t.offerKeepN(n) : t.offerKeep),
        h('button', { class: 'sf-btn', 'data-k': 'offer-leave', onclick: () => a.answerOffer(false) }, t.offerLeave(all.length))));
  }
  // What every Account shows: your data against the limits, Help and the version log, and
  // the places kept for later.
  accountFoot() {
    const t = this.t, row = (k, label, sub, go) => h('button', { class: 'sf-sec', 'data-k': k, onclick: go }, h('span', null, h('strong', null, label), h('span', null, sub)), h('span', { class: 'sf-chev', 'aria-hidden': 'true' }, '›'));
    return [
      h('section', { class: 'sf-field ruled' }, h('h3', { class: 'sf-eyebrow' }, t.yourData), h('span', { class: 'sf-hint' }, t.dataCounts(this.app.boards.length, 50))),
      h('div', { class: 'sf-secs' },
        row('open-help', t.help, t.helpSub, () => this.go({ sec: 'acc', lv: 'help' })),
        row('version', t.versionLog, `v${VERSION}`, () => this.go({ sec: 'acc', lv: 'log' }))),
      h('div', { class: 'sf-later' }, h('strong', null, t.connections), h('span', null, t.laterShort)),
      h('div', { class: 'sf-later' }, h('strong', null, t.submissions), h('span', null, t.laterShort))];
  }

  // ---------- help ----------
  // The guide, laid out like the Start panel and the steps below the board: a serif
  // title, then numbered sections, some with a small board drawn by the renderer.
  helpLevel() {
    const intro = INTRO[this.lang] || INTRO.en, part = x => typeof x === 'string' ? x : x.href === 'privacy' ? h('a', { href: this.privacyHref() }, x.t)
      : h('button', { class: 'sf-link-btn inline', 'data-k': 'help-' + x.k, onclick: () => this.go(x.k) }, x.t);
    return h('div', { class: 'sf-level sf-help' },
      h('div', { class: 'sf-start-head' }, h('h2', null, intro.title), h('p', null, intro.lede)),
      (HELP[this.lang] || HELP.en).map((sec, i) => h('section', { class: 'sf-help-sec' },
        h('span', { class: 'sf-help-num' }, String(i + 1).padStart(2, '0')),
        h('h3', null, sec.h),
        sec.fig ? this.helpFig(sec.fig) : null,
        (sec.p || []).map(p => h('p', null, Array.isArray(p) ? p.map(part) : p)),
        sec.keys ? h('dl', { class: 'sf-keys' }, sec.keys.map(([k, d]) => h('div', null, h('dt', null, k.split(' ').map(x => h('kbd', null, x))), h('dd', null, d)))) : null)));
  }
  helpFig(kind) {
    const b = this.app.cur(), T = b.theme, sv = this.lang === 'sv', t = this.t;
    const grid = (rows, cols, lines) => { const g = blank(rows, cols); lines.forEach((l, r) => { const a = [...l], off = Math.floor((cols - a.length) / 2); a.forEach((c, j) => { if (g[r] && off + j >= 0 && off + j < cols) g[r][off + j] = c; }); }); return g; };
    if (kind === 'board') {
      const d = this.app.dims(), p = b.pages[0];
      return h('figure', { class: 'sf-help-fig' }, this.thumb('help-board', d.rows, d.cols, () => compose(p, d.rows, d.cols, Date.now(), this.lang, this.app.live.data), T),
        h('figcaption', null, `${b.name} · ${t.pagesCount(b.pages.length)}`));
    }
    if (kind === 'layouts') return h('figure', { class: 'sf-help-fig' }, h('div', { class: 'sf-layouts' }, LAYOUTS.map(id => {
      const [cols, rows, parts] = LAYOUT_PIC[id];
      return h('span', { class: 'sf-layout', 'aria-hidden': 'true' },
        h('span', { class: 'sf-layout-pic', style: `grid-template-columns:${cols};grid-template-rows:${rows}` }, parts.map(([c, r, strong]) => h('span', { class: strong ? 'strong' : '', style: `grid-column:${c};grid-row:${r}` }))),
        h('span', null, t.layouts[id]));
    })));
    if (kind === 'message') return h('figure', { class: 'sf-help-fig small' }, this.thumb('help-msg', 4, 15, () => grid(4, 15, ['', sv ? 'FIKA KL 15' : 'FIKA AT 3', 'roygbv', '']), T));
    if (kind === 'week') return h('figure', { class: 'sf-help-fig small' }, this.thumb('help-week', 3, 15, () => grid(3, 15, [sv ? 'MÅN TILL FRE' : 'MON TO FRI', '06:30 07:30', 'bbyyyyyybb']), T),
      h('figcaption', null, sv ? 'En tavla med en tid visas bara då.' : 'A board with a time shows only then.'));
    return null;
  }

  // ---------- version log ----------
  logLevel() {
    const t = this.t, lang = this.lang;
    return h('div', { class: 'sf-level' },
      h('ol', { class: 'sf-log' }, CHANGELOG.map((r, i) => h('li', { class: 'sf-log-entry' + (i === 0 ? ' latest' : '') },
        h('div', { class: 'sf-log-head' },
          h('span', { class: 'sf-log-v' }, 'v' + r.v),
          h('span', { class: 'sf-log-tag' }, r.tag[lang]),
          h('time', { class: 'sf-log-date', datetime: r.date }, r.date)),
        h('p', { class: 'sf-log-desc' }, r.desc[lang]),
        h('ul', { class: 'sf-log-list' }, r.items[lang].map(it => h('li', null, it)))))),
      h('p', { class: 'sf-note' }, t.logNote, ' ', h('a', { href: 'https://github.com/MMacLaine/split-flap/blob/main/CHANGELOG.md' }, 'GitHub'), '.'));
  }

  // Keeps the zone boxes on the diagram in step with hover, without a rebuild.
  paintDiagram() {
    const root = this.app.drawer; if (!root) return;
    root.querySelectorAll('.sf-zone-box').forEach(el => el.classList.toggle('on', +el.dataset.zone === this.E.hover));
    root.querySelectorAll('.sf-zone-row').forEach((el, k) => el.classList.toggle('on', k === this.E.hover));
  }
}
