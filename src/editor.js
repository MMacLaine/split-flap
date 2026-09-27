// The editor drawer, from the editor handoff (DESIGN-HANDOVER-editor.md). Three levels,
// drilled with a back control: Playlist, Page, Content. Board settings, Boards and
// templates, and the version log are secondary levels reached from the playlist.
// From 1024 px wide the playlist stays beside the panel as a rail, so Page and Content
// always sit next to the list of pages; narrower, one level shows at a time.
//
// Like the rest of the app it is plain DOM, rebuilt whole on structural changes. Typing
// updates the board in place (app.upd with quiet) so inputs keep focus.

import { h, clone } from './dom.js';
import { THEMES, renderStatic, staticGeom, GEOM } from './renderer.js';
import { CHIPS, CHIP_NAMES } from './charset.js';
import { compose, zonesFor, LAYOUTS, newId, blank, templateTokens } from './content.js';
import { TEMPLATES, fromTemplate } from './templates.js';
import { searchStations, searchCities, MODE_LETTERS } from './live.js';
import { GROUPS, TILES, tileFor, previewLive, SAMPLE_FEED } from './catalogue.js';
import { sampleImage, mapImage, stamp, HEART } from './photo.js';
import { Composer } from './composer.js';
import { CHANGELOG, VERSION } from './changelog.js';
import { pageWins } from './schedule.js';
import { HELP, INTRO } from './help.js';
import * as sound from './sound.js';

const DURS = [3, 5, 8, 10, 12, 15, 20, 30, 45, 60, 90, 120, 180, 300, 600, 900, 1800, 3600];
const LAYOUT_PIC = { full: ['1fr', '1fr', [['1', '1', 1]]], header: ['1fr', '1fr 2.4fr', [['1', '1', 0], ['1', '2', 1]]], split: ['1fr 1fr', '1fr', [['1', '1', 1], ['2', '1', 0]]],
  ticker: ['1fr', '2.4fr 1fr', [['1', '1', 1], ['1', '2', 0]]], stacked: ['1fr', '1fr 1fr', [['1', '1', 1], ['1', '2', 0]]] };
const aspect = (rows, cols, pad) => { const g = staticGeom(rows, cols, pad); return (g.uw / g.uh).toFixed(4); };

export class Editor {
  constructor(app) {
    this.app = app;
    this.E = { lv: 'playlist', zone: 0, picking: false, search: '', adv: {}, hover: null, navKey: 0, fx: 'in', drag: -1 };
    this.specs = new Map();
    this.lastNav = -1;
    this.composer = new Composer(app, this);
  }
  get t() { return this.app.t; }
  get lang() { return this.app.S.lang; }
  L(x) { return x ? x[this.lang] || x.en : ''; }
  phone() { return this.app.isMobile(); }
  // The level shown in the panel. On a wide screen the playlist is the rail, so the
  // panel shows the page being edited instead.
  panelLv() { const lv = this.E.lv; return !this.phone() && lv === 'playlist' ? 'page' : lv; }

  // ---------- navigation ----------
  go(lv, extra, back) {
    this.composer.leave(); this.E.confirm = null;
    Object.assign(this.E, { lv, fx: back ? 'back' : 'in', navKey: this.E.navKey + 1, hover: null, search: '' }, extra || {});
    this.app.S.cz = -1;
    this.app.render(); this.app.tick(true);
    const body = this.app.drawer && this.app.drawer.querySelector('.sf-panel-body'); if (body) body.scrollTop = 0;
    // Keyboard and screen reader users land on the new level's title. Going back keeps focus
    // where it was if that is still in the drawer (the Back button, say).
    const d = this.app.drawer, title = d && d.querySelector('.sf-panel-title');
    if (title && (!back || !d.contains(document.activeElement))) title.focus({ preventScroll: true });
  }
  backTarget() {
    const lv = this.E.lv;
    if (lv === 'log' || lv === 'help' || lv === 'account') return this.prevLv || 'playlist';
    return this.phone() ? { page: 'playlist', content: 'page', settings: 'playlist', start: 'playlist' }[lv] : { content: 'page', settings: 'playlist', start: 'playlist' }[lv];
  }
  back() { const b = this.backTarget(); if (b) this.go(b, {}, true); else this.app.toggleEdit(); }
  // Escape: out of the picker when the zone already had content, else up one level.
  escape() {
    if (this.E.lv === 'content' && this.E.picking && !this.E.fresh) { this.E.picking = false; this.app.render(); return; }
    this.back();
  }
  // Opening the editor: the Start panel on the very first edit, else the playlist.
  open() {
    this.E.drag = -1;
    if (this.app.startPending()) { this.go('start'); return; }
    this.go(this.phone() ? 'playlist' : 'page');
  }
  openPage(i) { this.app.S.sel = i; this.go('page'); }
  openZone(k) { this.go('content', { zone: k, picking: false, fresh: false }); }

  zones() { const p = this.page(), d = this.app.dims(); return p ? zonesFor(p.layout, d.rows, d.cols) : []; }
  page() { const b = this.app.cur(); return b.pages[this.app.selIdx(b)]; }
  zi() { return Math.max(0, Math.min(this.E.zone, this.zones().length - 1)); }
  zone() { const p = this.page(); return p ? p.zones[this.zi()] : null; }
  isTicker(k = this.zi()) { const p = this.page(); return p && p.layout === 'ticker' && k === 1; }
  updZone(fn, quiet) { const k = this.zi(); this.app.updPage(p => { while (p.zones.length <= k) p.zones.push({ ch: 'message', o: {} }); fn(p.zones[k]); }, quiet); }
  setO(fn, quiet) { this.updZone(z => { z.o = Object.assign({}, z.o); fn(z.o); }, quiet); if (quiet) this.refreshThumbs(true); }

  // The zone outlined on the big board: the one hovered, else the one being edited.
  hlRect() {
    if (!this.app.S.editing) return null;
    const lv = this.panelLv(); if (lv !== 'page' && lv !== 'content') return null;
    const zs = this.zones(); if (zs.length < 2) return null;
    const k = this.E.hover != null ? this.E.hover : lv === 'content' ? this.zi() : null;
    return k == null ? null : zs[k] || null;
  }
  hover(k) { this.E.hover = k; this.app.paintHighlight(); this.paintDiagram(); }

  // ---------- thumbnails ----------
  // A canvas that the static renderer fills once the drawer is on the page. fn returns
  // the grid, so live pages (a clock) can be redrawn without rebuilding the drawer.
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
  pageGrid(p, b) { const d = this.app.dims(); return () => compose(p, d.rows, d.cols, Date.now(), this.lang, this.app.live.data); }

  // ---------- the drawer ----------
  render() {
    this.specs = new Map();
    const t = this.t, lv = this.E.lv, plv = this.panelLv(), rail = !this.phone() && lv !== 'start' && lv !== 'log' && lv !== 'help' && lv !== 'account';
    const anim = this.E.navKey !== this.lastNav ? (this.E.fx === 'back' ? ' sf-nav-back' : ' sf-nav-in') : '';
    this.lastNav = this.E.navKey;
    const body = { playlist: () => this.playlistLevel(), page: () => this.pageLevel(), content: () => this.contentLevel(), settings: () => this.settingsLevel(), start: () => this.startLevel(), log: () => this.logLevel(), help: () => this.helpLevel(), account: () => this.accountLevel() }[plv]();
    return h('aside', { class: 'sf-drawer' + (rail ? ' with-rail' : ''), 'aria-label': t.editor },
      rail ? this.rail() : null,
      h('section', { class: 'sf-panel-col' }, this.head(plv), h('div', { class: 'sf-panel-body' + anim, 'data-lv': plv }, body)));
  }
  after() { this.paintThumbs(true); this.composer.after(); }

  head(plv) {
    const t = this.t, b = this.app.cur(), back = this.backTarget(), p = this.page();
    const backLabel = { playlist: t.playlist, page: p ? p.name || t.page : t.page }[back] || t.back;
    const tile = tileFor(this.zone());
    const [kicker, title] = {
      playlist: [t.playlist, b.name],
      page: [t.pageOf(this.app.selIdx() + 1, b.pages.length), p ? p.name || t.page : ''],
      content: [`${p ? p.name || t.page : ''} · ${this.zoneName(this.zi())}`, this.E.picking || !tile ? t.chooseContent : this.L(tile.name)],
      settings: [b.name, t.boardSettings], start: [t.boardsTemplates, t.startTitle], log: [`v${VERSION}`, t.versionLog], help: ['Split-Flap', t.help], account: ['Split-Flap', t.account]
    }[plv];
    return h('header', { class: 'sf-panel-head' },
      back ? h('button', { class: 'sf-back', 'data-k': 'back', onclick: () => this.back() }, h('span', { 'aria-hidden': 'true' }, '‹'), h('span', null, backLabel)) : null,
      h('div', { class: 'sf-panel-title', role: 'heading', 'aria-level': '2', tabindex: '-1' }, h('span', { class: 'sf-eyebrow' }, kicker), plv === 'playlist' ? this.boardName() : h('strong', null, title)),
      h('button', { class: 'sf-btn primary caps', 'data-k': 'done', 'aria-keyshortcuts': 'E', onclick: () => this.app.toggleEdit() }, t.done));
  }
  zoneName(k) { const p = this.page(); return p ? (this.t.zoneNames[p.layout] || [])[k] || '' : ''; }

  // ---------- playlist ----------
  pageItems(compact) {
    const t = this.t, b = this.app.cur(), d = this.app.dims(), sel = this.app.selIdx(), plv = this.panelLv();
    return b.pages.map((p, i) => {
      const cur = i === sel && (plv === 'page' || plv === 'content'), wins = pageWins(p);
      const badge = wins.length ? this.winLabel(wins[0]) + (wins.length > 1 ? ` +${wins.length - 1}` : '') : null;
      return h('li', { class: 'sf-pl' + (cur ? ' current' : '') + (this.E.drag === i ? ' drag' : ''), 'data-pl': i },
        h('button', { class: 'sf-pl-open', 'aria-current': cur ? 'page' : null, 'data-k': 'page-' + i, onclick: () => this.openPage(i) },
          this.thumb('pg-' + p.id, d.rows, d.cols, this.pageGrid(p, b), b.theme),
          h('span', { class: 'sf-pl-text' },
            h('span', { class: 'sf-pl-name' }, compact ? h('span', { class: 'sf-pl-num' }, String(i + 1).padStart(2, '0')) : null, p.name || `${t.page} ${i + 1}`),
            h('span', { class: 'sf-pl-meta' }, `${p.dur} s`, badge ? h('span', { class: 'sf-badge', title: t.window }, compact ? '◷' : badge) : null))),
        h('button', { class: 'sf-handle', 'data-handle': i, 'data-k': 'handle-' + i, 'aria-label': t.moveNamed(p.name || `${t.page} ${i + 1}`), title: t.reorderHint,
          onpointerdown: e => this.dragStart(e, i), onkeydown: e => this.handleKey(e, i) }, '⋮⋮'));
    });
  }
  secondary(compact) {
    const t = this.t, b = this.app.cur();
    const row = (k, label, sub, lv) => h('button', { class: 'sf-sec' + (this.E.lv === lv ? ' on' : ''), 'data-k': k, onclick: () => this.go(lv) },
      h('span', null, h('strong', null, label), h('span', null, sub)), compact ? null : h('span', { class: 'sf-chev', 'aria-hidden': 'true' }, '›'));
    return h('div', { class: 'sf-secs' },
      row('open-settings', t.boardSettings, `${this.app.sizeLabel(b)} · ${THEMES[b.theme].label}`, 'settings'),
      row('open-start', t.boardsTemplates, `${t.boardsCount(this.app.boards.length)} · ${t.templatesCount(TEMPLATES.length)}`, 'start'),
      h('button', { class: 'sf-sec' + (this.E.lv === 'help' ? ' on' : ''), 'data-k': 'open-help', onclick: () => { this.prevLv = this.E.lv; this.go('help'); } },
        h('span', null, h('strong', null, t.help), h('span', null, t.helpSub)), compact ? null : h('span', { class: 'sf-chev', 'aria-hidden': 'true' }, '›')),
      this.app.account.available ? h('button', { class: 'sf-sec' + (this.E.lv === 'account' ? ' on' : ''), 'data-k': 'open-account', onclick: () => { this.prevLv = this.E.lv; this.go('account'); } },
        h('span', null, h('strong', null, t.account), h('span', { 'data-account-sub': '' }, this.accountSub())), compact ? null : h('span', { class: 'sf-chev', 'aria-hidden': 'true' }, '›')) : null);
  }
  rail() {
    const t = this.t, b = this.app.cur();
    return h('nav', { class: 'sf-rail', 'aria-label': t.playlist },
      h('div', { class: 'sf-rail-head' }, h('span', { class: 'sf-eyebrow' }, t.playlist, h('span', { class: 'sf-sync-fail', title: t.syncFailedMark, role: 'img', 'aria-label': t.syncFailedMark, 'data-sync-fail': '', hidden: this.app.account.status !== 'failed' }, ' !')), this.boardName()),
      h('ol', { class: 'sf-pls compact' }, this.pageItems(true), h('li', null, h('button', { class: 'sf-add', 'data-k': 'add-page', onclick: () => this.addPage() }, '+ ' + t.addPage))),
      h('div', { class: 'sf-rail-foot' }, this.secondary(true),
        h('button', { class: 'sf-version', 'data-k': 'version', onclick: () => { this.prevLv = this.E.lv; this.go('log'); } }, `v${VERSION}`, h('span', { 'aria-hidden': 'true' }, ' · '), t.versionLog)));
  }
  playlistLevel() {
    const t = this.t;
    return h('div', { class: 'sf-level' },
      h('ol', { class: 'sf-pls' }, this.pageItems(false)),
      h('button', { class: 'sf-add big', 'data-k': 'add-page', onclick: () => this.addPage() }, '+ ' + t.addPage),
      this.secondary(false),
      h('button', { class: 'sf-version', 'data-k': 'version', onclick: () => { this.prevLv = this.E.lv; this.go('log'); } }, `v${VERSION}`, h('span', { 'aria-hidden': 'true' }, ' · '), t.versionLog));
  }
  addPage() {
    const t = this.t, b = this.app.cur(), n = b.pages.length;
    this.app.upd(bb => { bb.pages.push({ id: newId('p'), name: `${t.page} ${n + 1}`, layout: 'full', dur: 10, wins: [], zones: [{ ch: 'message', o: {} }] }); }, true);
    this.app.S.sel = n;
    this.go('content', { zone: 0, picking: true, fresh: true });
  }
  movePage(i, j) {
    const b = this.app.cur(); if (j < 0 || j >= b.pages.length || i === j) return false;
    this.app.upd(bb => { const [x] = bb.pages.splice(i, 1); bb.pages.splice(j, 0, x); }, true);
    const s = this.app.S.sel; this.app.S.sel = s === i ? j : i < s && j >= s ? s - 1 : i > s && j <= s ? s + 1 : s;
    return true;
  }
  // Keyboard reorder: focus the handle and use the arrow keys. Focus follows the page.
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
      return h('button', { class: 'sf-zone-row' + (this.E.hover === k ? ' on' : ''), 'data-k': 'zone-' + k, onclick: () => this.openZone(k),
        onmouseenter: () => this.hover(k), onmouseleave: () => this.hover(null), onfocus: () => this.hover(k), onblur: () => this.hover(null) },
        h('span', { class: 'sf-zone-mark', 'aria-hidden': 'true' }),
        h('span', { class: 'sf-zone-text' }, h('span', null, `${this.zoneName(k)} · ${z.h} × ${z.w}`), h('strong', null, tile ? this.L(tile.name) : t.chooseContent)),
        h('span', { class: 'sf-chev', 'aria-hidden': 'true' }, '›'));
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
    return h('div', { class: 'sf-level' },
      h('label', { class: 'sf-field' }, h('span', { class: 'sf-eyebrow' }, t.pageName),
        h('input', { class: 'sf-input big', value: p.name, 'data-k': 'page-name', oninput: e => { this.app.updPage(pp => { pp.name = e.target.value.slice(0, 80); }, true); }, onchange: () => this.app.render() })),
      h('div', { class: 'sf-field' }, h('span', { class: 'sf-eyebrow' }, t.layout), layouts,
        h('span', { class: 'sf-hint' }, t.gridIs(d.rows, d.cols), ' ', h('button', { class: 'sf-link-btn inline', 'data-k': 'grid-size', onclick: () => this.go('settings') }, t.changeSize))),
      h('div', { class: 'sf-field' }, h('span', { class: 'sf-eyebrow' }, t.zones), h('span', { class: 'sf-sub' }, zs.length > 1 ? t.tapZone : t.tapZoneOne), diagram, zoneRows),
      h('div', { class: 'sf-field gap' }, h('span', { class: 'sf-eyebrow' }, t.timing),
        h('div', { class: 'sf-row between' }, h('span', { class: 'sf-label' }, t.showFor),
          this.stepper(`${p.dur} s`, () => durStep(-1), () => durStep(1), 'dur', di <= 0, p.dur >= DURS[DURS.length - 1])),
        this.windowsEl(p),
        h('div', { class: 'sf-field' }, h('span', { class: 'sf-label' }, t.pageTransition),
          h('div', { class: 'sf-row' }, [['', t.boardDefault(t.transitions[b.transition])], ...Object.entries(t.transitions)].map(([id, label]) =>
            h('button', { class: 'sf-seg', 'aria-pressed': String((p.tr || '') === id), 'data-k': 'ptr-' + (id || 'board'),
              onclick: () => { this.app.updPage(pp => { if (id) pp.tr = id; else delete pp.tr; }); this.app.previewTransition(); } }, label))))),
      h('div', { class: 'sf-row ruled' },
        h('button', { class: 'sf-btn', 'data-k': 'dup-page', onclick: () => this.dupPage() }, t.dupPage),
        h('button', { class: 'sf-btn', 'data-k': 'save-image', onclick: () => this.app.saveImage() }, t.saveImage),
        h('button', { class: 'sf-btn muted', 'data-k': 'del-page', disabled: b.pages.length < 2, onclick: () => this.delPage() }, t.delPage)));
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
      h('label', { class: 'sf-check' }, h('input', { type: 'checkbox', checked: wins.length > 0, 'data-k': 'win-on',
        onchange: e => setWins(list => { if (e.target.checked) { if (!list.length) list.push(...(this.E.lastWins && this.E.lastWins[p.id] || [{ from: '07:00', to: '09:00', days: [] }])); } else { this.E.lastWins = Object.assign({}, this.E.lastWins, { [p.id]: clone(list) }); list.length = 0; } }) }),
        h('span', null, t.window)),
      wins.length ? h('div', { class: 'sf-indent' },
        wins.map(card),
        wins.length < 8 ? h('button', { class: 'sf-link-btn', 'data-k': 'win-add', onclick: () => setWins(list => { const last = list[list.length - 1]; list.push({ from: last.from, to: last.to, days: [] }); }) }, '+ ' + t.addTime) : null,
        h('div', { class: 'sf-field' },
          h('label', { class: 'sf-check' }, h('input', { type: 'checkbox', checked: !!p.alone, 'data-k': 'win-alone', onchange: e => this.app.updPage(pp => { if (e.target.checked) pp.alone = true; else delete pp.alone; }) }), h('span', null, t.showAlone)),
          h('span', { class: 'sf-hint' }, t.showAloneHint))) : null
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
  dupPage() {
    const b = this.app.cur(), i = this.app.selIdx(b);
    this.app.upd(bb => { const c = clone(bb.pages[i]); c.id = newId('p'); c.name = (c.name || this.t.page) + this.t.copySuffix; bb.pages.splice(i + 1, 0, c); }, true);
    this.app.S.sel = i + 1; this.go('page');
  }
  delPage() {
    const b = this.app.cur(), i = this.app.selIdx(b); if (b.pages.length < 2) return;
    this.app.upd(bb => { bb.pages.splice(i, 1); }, true);
    this.app.S.sel = Math.max(0, i - 1); this.go(this.phone() ? 'playlist' : 'page', {}, true);
  }

  // ---------- content ----------
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
      h('div', { class: 'sf-field' }, input, h('span', { class: 'sf-sub' }, t.shapeNote(zd.h, zd.w), ' ', h('button', { class: 'sf-link-btn inline', 'data-k': 'grid-size', onclick: () => this.go('settings') }, t.changeSize))),
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
        return h('p', { class: 'sf-note' }, t.sunNeedsLoc, ' ', h('button', { class: 'sf-link-btn inline', 'data-k': 'to-settings', onclick: () => this.go('settings') }, t.boardSettings));
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
      h('label', { class: 'sf-field' }, h('span', { class: 'sf-eyebrow' }, t.boardName),
        h('input', { class: 'sf-input big', value: b.name, 'data-k': 'board-name', oninput: e => app.upd(bb => { bb.name = e.target.value.slice(0, 80); }, true), onchange: () => app.render() }),
        h('span', { class: 'sf-hint' }, t.saved)),
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
        h('div', null, h('button', { class: 'sf-small-btn', 'data-k': 'ss-preview', onclick: () => sound.preview(b.soundStyle || 'clack') }, t.previewSound))),
      h('section', { class: 'sf-field' }, h('h3', { class: 'sf-eyebrow' }, t.lang),
        h('div', { class: 'sf-row' }, seg([['en', 'English'], ['sv', 'Svenska']], this.lang, v => app.setLang(v), 'lang'))));
  }

  // ---------- boards and templates ----------
  startLevel() {
    const t = this.t, app = this.app, first = app.startPending();
    const tplGrid = h('div', { class: 'sf-templates' }, TEMPLATES.map(tp => {
      const nb = this.tplBoard(tp.id), d = app.dimsOf(nb);
      return h('button', { class: 'sf-template', 'data-k': 'tpl-' + tp.id, onclick: () => app.useTemplate(tp.id) },
        this.thumb('tpl-' + tp.id, d.rows, d.cols, () => compose(nb.pages[0], d.rows, d.cols, Date.now(), this.lang, previewLive(app.live.data, Date.now())), nb.theme),
        h('span', { class: 'sf-tile-text' }, h('strong', null, tp.name[this.lang]), h('span', null, tp.desc[this.lang])));
    }));
    const file = h('input', { type: 'file', accept: 'application/json,.json', style: 'display:none', onchange: e => app.importFile(e) });
    return h('div', { class: 'sf-level' },
      h('div', { class: 'sf-start-head' }, h('h2', null, t.startTitle), h('p', null, t.startBody)),
      app.account.available && !app.account.signedIn() ? h('div', { class: 'sf-guest' }, h('span', null, t.startGuest), h('button', { class: 'sf-btn', 'data-k': 'start-signin', onclick: () => app.account.signIn() }, t.signInGoogle)) : null,
      tplGrid,
      first ? h('button', { class: 'sf-btn big', 'data-k': 'skip', onclick: () => { app.markStarted(); this.go(this.phone() ? 'playlist' : 'page'); } }, t.skip) : null,
      h('section', { class: 'sf-field ruled' }, h('h3', { class: 'sf-eyebrow' }, t.yourBoards),
        app.boards.map((bd, i) => {
          const d = app.dimsOf(bd), cur = i === app.active;
          return h('div', { class: 'sf-board' + (cur ? ' current' : '') },
            this.thumb('bd-' + bd.id, d.rows, d.cols, () => compose(bd.pages[0], d.rows, d.cols, Date.now(), this.lang, app.live.data), bd.theme),
            h('span', { class: 'sf-board-text' }, h('strong', null, bd.name), h('span', null, `${app.sizeLabel(bd)} · ${t.pagesCount(bd.pages.length)}`)),
            h('div', { class: 'sf-row' },
              h('button', { class: 'sf-small-btn', disabled: cur, 'data-k': `bd-open-${i}`, onclick: () => { app.pickBoard(i); this.go(this.phone() ? 'playlist' : 'page'); } }, cur ? t.current : t.open),
              h('button', { class: 'sf-small-btn', 'data-k': `bd-dup-${i}`, onclick: () => app.duplicateBoard(i) }, t.duplicate),
              h('button', { class: 'sf-small-btn', 'data-k': `bd-exp-${i}`, onclick: () => app.exportJson(i) }, t.exportB),
              h('button', { class: 'sf-small-btn muted', disabled: app.boards.length < 2, 'data-k': `bd-del-${i}`, onclick: () => app.deleteBoard(i) }, t.del)));
        }),
        h('div', { class: 'sf-row' }, h('button', { class: 'sf-btn', 'data-k': 'import', onclick: () => file.click() }, t.importB), file),
        h('p', { class: 'sf-note' }, t.jsonNote)));
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
    if (this.phone() && this.E.lv !== 'playlist') { this.go('playlist'); } else this.app.render();
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
  accountLevel() {
    const t = this.t, a = this.app.account, privacy = h('a', { href: this.privacyHref(), 'data-k': 'acc-privacy' }, t.accPrivacy);
    if (!a.signedIn()) return h('div', { class: 'sf-level' },
      a.status === 'signedout'
        ? h('div', { class: 'sf-field' }, h('p', { class: 'sf-note big' }, t.accSignedOutBody(a.unsyncedCount())))
        : h('div', { class: 'sf-field' }, h('p', { class: 'sf-note big' }, t.accGuestBody), h('p', { class: 'sf-note big' }, t.accSignInBody)),
      h('div', null, h('button', { class: 'sf-btn primary big', 'data-k': 'acc-signin', onclick: () => a.signIn() }, t.signInGoogle)),
      h('p', { class: 'sf-note' }, privacy));
    const status = this.accountStatus();
    return h('div', { class: 'sf-level' },
      a.offer.length ? h('section', { class: 'sf-field sf-offer' },
        h('strong', null, t.offerTitle(a.offer.length)), h('span', { class: 'sf-hint' }, t.offerBody(a.offer.length)),
        h('div', { class: 'sf-row' },
          h('button', { class: 'sf-btn primary', 'data-k': 'offer-keep', onclick: () => a.answerOffer(true) }, t.offerKeep),
          h('button', { class: 'sf-btn', 'data-k': 'offer-leave', onclick: () => a.answerOffer(false) }, t.offerLeave))) : null,
      h('section', { class: 'sf-field' },
        h('strong', { class: 'sf-acc-name' }, a.user.name), h('span', { class: 'sf-hint' }, a.user.email),
        h('span', { class: 'sf-acc-status' + (a.status === 'failed' ? ' fail' : ''), role: 'status', 'data-account-status': '' }, status)),
      a.refusedBoards().length ? h('section', { class: 'sf-field sf-refused' },
        a.refusedBoards().map(r => h('span', { class: 'sf-hint warn' }, t.refusedBoard(r.name, r.error)))) : null,
      h('div', { class: 'sf-row' },
        h('button', { class: 'sf-btn', 'data-k': 'acc-export', onclick: () => a.exportAll() }, t.exportAll),
        this.confirmBtn('signout', t.signOut, a.unsyncedCount() ? t.signOutAnyway : t.signOutAgain, a.unsyncedCount() ? t.confirmSignOutUnsynced(a.unsyncedCount()) : t.confirmSignOut, () => a.signOut())),
      h('div', { class: 'sf-row ruled' }, this.confirmBtn('delete', t.deleteAccount, t.deleteAgain, t.confirmDelete, () => a.deleteAccount(), 'muted')),
      h('p', { class: 'sf-note' }, privacy));
  }

  // ---------- help ----------
  // The guide, laid out like the Start panel and the steps below the board: a serif
  // title, then numbered sections, some with a small board drawn by the renderer.
  helpLevel() {
    const intro = INTRO[this.lang] || INTRO.en, part = x => typeof x === 'string' ? x : x.href === 'privacy' ? h('a', { href: this.privacyHref() }, x.t)
      : x.k === 'account' && !this.app.account.available ? x.t : h('button', { class: 'sf-link-btn inline', 'data-k': 'help-' + x.k, onclick: () => { if (x.k === 'account') this.prevLv = 'help'; this.go(x.k); } }, x.t);
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
      h('figcaption', null, sv ? 'En sida med en tid visas bara då.' : 'A page with a time shows only then.'));
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
