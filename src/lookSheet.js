// The look sheet (0.11.0): one component, opened from every Change. Its look follows the
// design handover (_local/plans/0.11/handoff, decisions 1, 13 to 17). The cards are real
// thumbnails of the board being changed, each drawn in its look. Opening a card previews it on
// the board behind, under the gold bar; Use this look keeps it, with a status line and Undo;
// leaving puts it back. Make your own offers only what looks.js MATRIX allows.
//
// A sheet is editor state, E.sheet = { kind: 'look', ctx, sel, prev, ownOpen, own }:
//   ctx  what is being changed: { kind: 'board', id } a board in your Boards, { kind:
//        'template', id }, { kind: 'default' } the account's, { kind: 'playlist', id } every
//        board in a playlist, or { kind: 'screen' } this screen's pin
//   sel  the card picked, as { id, parts? } (id may be 'default' or 'follow')
//   prev the look that picks shows on the screen, resolved ({ id, parts }), or null

import { h, clone } from './dom.js';
import { LOOKS, SHIPPED, MATERIALS, TYPES, MOTION, MATRIX, RELEASED, partsOf, swatch, lookOf, defaultOf, wallPreset, sanitizeParts, legacyLook, templateLook, lookFor } from './looks.js';
import { compose } from './content.js';

const same = (a, b) => !!a && !!b && a.id === b.id && (a.id !== 'custom' || JSON.stringify(a.parts) === JSON.stringify(b.parts));

// What a look is called. l is { id, parts? }; 'default' names what it is.
export function lookLabel(app, l) {
  const t = app.t.lk;
  if (!l || !l.id) return '';
  if (l.id === 'custom') return t.yourOwn;
  if (l.id === 'follow') return t.followBoards;
  if (l.id === 'default') { const d = defaultOf(app.lookSetting()); return t.defaultIs(lookLabel(app, d)); }
  return LOOKS[l.id] ? LOOKS[l.id].label : '';
}
// A board's own look as the sheet and the rows show it: { id, parts? }, id may be 'default'.
export function ownLook(x) { const o = lookOf(x); return { id: o.look, parts: o.lookParts }; }
// The look a value shows, resolved for drawing: never 'default' or 'follow'.
function resolved(app, l, page) {
  if (l.id === 'default') return defaultOf(app.lookSetting()).id === 'custom' ? defaultOf(app.lookSetting()) : { id: defaultOf(app.lookSetting()).id, parts: partsOf(defaultOf(app.lookSetting()).id) };
  if (l.id === 'follow') return lookFor(page, null, app.lookSetting(), null);
  return { id: l.id, parts: l.id === 'custom' ? l.parts : partsOf(l.id) };
}

// The 40 x 28 swatch (decision 15): the wall, a face in the material's colour, and "Aa" in the
// look's face and letter colour, lit where the letters are lit. One function, used everywhere.
export function swatchEl(app, l, page) {
  const r = resolved(app, l, page), s = swatch(r.parts || partsOf(r.id));
  return h('span', { class: 'sf-swatch-lk', 'aria-hidden': 'true', style: `background:${s.wall}` },
    h('span', { style: `background:${s.face};color:${s.ink};font-family:${s.font};font-weight:${s.weight};${s.lit ? `text-shadow:0 0 6px ${s.ink}` : ''}` }, 'Aa'));
}

// What a context's look is now.
export function ctxValue(ed, ctx) {
  const app = ed.app;
  if (ctx.kind === 'board') { const b = app.blueprints.find(x => x.id === ctx.id); return b ? ownLook(b) : { id: 'default' }; }
  if (ctx.kind === 'template') return (ed.E.tplLooks || {})[ctx.id] || naturalTemplate(ed, ctx.id);
  if (ctx.kind === 'default') return defaultOf(app.lookSetting());
  if (ctx.kind === 'screen') return app.pin() || { id: 'follow' };
  return { id: null };
}
// A template's own look: its look from TEMPLATE_LOOKS once shipped, else its 0.10 theme's.
export function naturalTemplate(ed, id) { const l = templateLook(id); if (l) return { id: l }; const nb = ed.tplBoard(id); return { id: legacyLook(nb.pages[0] && nb.pages[0].theme || nb.theme) }; }
// The board a context's cards draw, with its size: { page, rows, cols }.
function ctxBoard(ed, ctx) {
  const app = ed.app;
  if (ctx.kind === 'board') { const b = app.blueprints.find(x => x.id === ctx.id); if (b) { const d = app.dimsOf(b); return { page: b.page, look: b, rows: d.rows, cols: d.cols }; } }
  if (ctx.kind === 'template') { const nb = ed.tplBoard(ctx.id), p = nb.pages[0], d = app.dimsOf(nb); return { page: p, look: p, rows: d.rows, cols: d.cols }; }
  const b = ctx.kind === 'playlist' ? (app.boards.find(x => x.id === ctx.id) || app.shown()) : app.shown(), p = b.pages[Math.max(0, app.S.pageIdx)] || b.pages[0], d = app.dimsOf(p.size ? p : b);
  return { page: p, look: p, rows: d.rows, cols: d.cols };
}
function ctxName(ed, ctx) {
  const app = ed.app;
  if (ctx.kind === 'board') { const b = app.blueprints.find(x => x.id === ctx.id); return b ? b.name : ''; }
  if (ctx.kind === 'template') { const tp = ed.tplInfo(ctx.id); return tp ? tp.name[ed.lang] : ''; }
  if (ctx.kind === 'playlist') { const b = app.boards.find(x => x.id === ctx.id); return b ? b.name : ''; }
  return '';
}

export function openLook(ed, ctx) {
  ed.E.sheet = { kind: 'look', ctx, sel: null, prev: null, ownOpen: false, own: null };
  ed.app.lastInput = Date.now(); ed.app.render(); ed.app.tick(true);
}
// The gold bar's line while a look is previewed (handover 6.2: one bar, saying the look).
export function barLine(ed) {
  const S = ed.E.sheet, t = ed.t.lk, l = lookLabel(ed.app, S.sel), n = ctxName(ed, S.ctx);
  return S.ctx.kind === 'board' || S.ctx.kind === 'template' ? t.previewLook(l, n) : S.ctx.kind === 'default' ? t.previewDefault(l) : S.ctx.kind === 'playlist' ? t.previewAll(l, n) : t.previewScreen(l);
}
// A card, or a Make your own change: previewed behind the sheet, unless it is what is on.
function pick(ed, l) {
  const S = ed.E.sheet, app = ed.app, t = ed.t.lk, cur = ctxValue(ed, S.ctx);
  if (S.ctx.kind !== 'playlist' && same(l, cur)) { S.sel = null; S.prev = null; app.say(t.stAlready(lookLabel(app, l))); }
  else { S.sel = clone(l); S.prev = resolved(app, l, ctxBoard(ed, S.ctx).look); app.say(t.stPreview(lookLabel(app, l)), { key: 'look' }); }
  app.lastInput = Date.now(); app.render(); app.tick(true);
}
// Leaving the sheet without Use this look puts the look back, and says so.
export function closeLook(ed) {
  const S = ed.E.sheet, app = ed.app;
  if (S && S.kind === 'look' && S.prev) app.say(ed.t.lk.stBack(lookLabel(app, S.ctx.kind === 'playlist' ? lookFor(app.currentPage(), app.pin(), app.lookSetting(), null) : ctxValue(ed, S.ctx))));
  ed.E.sheet = null; app.render(); app.tick(true);
}

// Use this look: the look goes where the sheet was opened for, with Undo.
export function commitLook(ed) {
  const S = ed.E.sheet, app = ed.app, t = ed.t.lk; if (!S || !S.sel) return;
  const l = clone(S.sel), label = lookLabel(app, l), ctx = S.ctx, pin = app.pin();
  const staysPinned = pin && ctx.kind !== 'screen' ? ' ' + t.stStaysPinned(lookLabel(app, pin)) : '';
  ed.E.sheet = null;
  if (ctx.kind === 'board') {
    const prev = app.setBoardLook(ctx.id, l), name = ctxName(ed, ctx); app.saveMy();
    app.say(t.stOnBoard(label, name) + staysPinned, { action: { label: app.t.undo, fn: () => { app.setBoardLook(ctx.id, prev); app.saveMy(); app.say(t.stUndone); app.refresh(); } } });
  } else if (ctx.kind === 'template') {
    ed.E.tplLooks = Object.assign({}, ed.E.tplLooks, { [ctx.id]: l });
    app.say(t.stTemplate(ctxName(ed, ctx), label));
  } else if (ctx.kind === 'default') {
    const prev = app.lookSetting();
    app.putSetting(l.id === 'custom' ? { id: 'look', look: 'custom', parts: l.parts } : { id: 'look', look: l.id });
    app.say(t.stDefault(lookLabel(app, l), app.followCount()), { action: { label: app.t.undo, fn: () => { app.putSetting(prev || { id: 'look', look: 'classic' }); app.say(t.stUndone); app.refresh(); } } });
  } else if (ctx.kind === 'playlist') {
    const b = app.boards.find(x => x.id === ctx.id); if (!b) return;
    const ids = [...new Set(b.pages.filter(p => !p.missing).map(p => p.id))], prev = ids.map(id => [id, app.setBoardLook(id, l)]);
    app.saveMy();
    const names = ids.map(id => (app.blueprints.find(x => x.id === id) || {}).name).filter(Boolean), also = ids.filter(id => app.usedIn(id).some(pl => pl.id !== b.id)).length;
    const list = names.join(' and ').replace(/ and (?=.* and )/g, ', '), andWord = app.S.lang === 'sv' ? ' och ' : ' and ';
    app.say(t.stSame(label, app.S.lang === 'sv' ? names.join(andWord).replace(/ och (?=.* och )/g, ', ') : list) + (also ? ' ' + t.stSameElsewhere(also) : '') + staysPinned,
      { action: { label: app.t.undo, fn: () => { prev.forEach(([id, p]) => app.setBoardLook(id, p)); app.saveMy(); app.say(t.stUndone); app.refresh(); } } });
  } else if (ctx.kind === 'screen') {
    const prev = pin;
    app.setPin(l.id === 'follow' ? null : l);
    app.say(l.id === 'follow' ? t.stUnpin : t.stPin(label), { action: { label: app.t.undo, fn: () => { app.setPin(prev); app.say(t.stUndone); app.refresh(); } } });
  }
  app.refresh();
}

// The sheet itself.
export function lookSheet(ed) {
  const app = ed.app, t = ed.t.lk, S = ed.E.sheet, ctx = S.ctx, cur = ctxValue(ed, ctx), sel = S.sel || cur, cb = ctxBoard(ed, ctx), now = Date.now();
  const forLine = ctx.kind === 'board' ? t.forBoard(ctxName(ed, ctx)) : ctx.kind === 'template' ? t.forTemplate(ctxName(ed, ctx)) : ctx.kind === 'default' ? t.forDefault : ctx.kind === 'screen' ? t.forScreen : t.forPlaylist(ctxName(ed, ctx));
  // the first card (decision 16): Default for a board, a template and Same look for all;
  // Follow the boards on This screen; none in Account, where the default is chosen
  const ids = (ctx.kind === 'screen' ? ['follow'] : ctx.kind === 'default' ? [] : ['default']).concat(SHIPPED);
  if (cur.id && LOOKS[cur.id] && LOOKS[cur.id].named) ids.push(cur.id);           // Paper or Solari, for a board that has it
  const own = S.own || (cur.id === 'custom' ? cur.parts : null);
  if (own && ctx.kind !== 'screen') ids.push('custom');
  const cards = ids.map(id => {
    const l = id === 'custom' ? { id, parts: own } : { id }, r = resolved(app, l, cb.look), th = app.drawOf(r).id, on = same(l, sel) || (id === sel.id && id !== 'custom');
    const hint = id === 'default' ? lookLabel(app, defaultOf(app.lookSetting())) : id === 'follow' ? t.eachOwn : id === 'custom' ? t.inkOf(MATERIALS[r.parts.material].label, TYPES[r.parts.type].label.toLowerCase()) : same(l, cur) ? t.onNow : LOOKS[id].hint;
    return h('button', { class: 'sf-lk-card' + (on ? ' on' : ''), 'aria-pressed': String(on), 'data-k': 'lk-card-' + id, onclick: () => pick(ed, l) },
      h('span', { class: 'sf-lk-well' }, ed.thumb(`lk-${id}-${th}`, cb.rows, cb.cols, () => compose(cb.page, cb.rows, cb.cols, now, ed.lang, app.live.data), th)),
      h('strong', null, id === 'default' ? t.deflt : id === 'follow' ? t.followBoards : id === 'custom' ? t.yourOwn : LOOKS[id].label), h('span', { class: 'sf-meta' }, hint));
  });
  return h('div', { class: 'sf-level sf-sheet sf-lk' },
    h('div', { class: 'sf-row between' }, h('strong', null, ctx.kind === 'default' ? t.defaultLook : t.look),
      h('button', { class: 'sf-btn', 'data-k': 'sheet-close', onclick: () => closeLook(ed) }, app.t.cancel)),
    h('p', { class: 'sf-hint' }, forLine),
    ctx.kind === 'screen' && app.pin() ? h('p', { class: 'sf-hint' }, t.pinNote(lookLabel(app, app.pin()))) : null,
    h('div', { class: 'sf-lk-cards' }, cards),
    S.sel ? h('div', { class: 'sf-row' }, h('button', { class: 'sf-btn primary', 'data-k': 'lk-use', onclick: () => commitLook(ed) }, t.useLook)) : null,
    ctx.kind !== 'screen' ? h('details', { class: 'sf-adv', open: !!S.ownOpen, ontoggle: e => { if (e.target.open === !!S.ownOpen) return; S.ownOpen = e.target.open; if (S.ownOpen && !S.own) startOwn(ed, sel, cb); else app.render(); } },
      h('summary', { 'data-k': 'lk-own' }, h('span', null, t.makeOwn)), S.ownOpen ? ownRows(ed) : null) : null);
}

function startOwn(ed, from, cb) {
  const S = ed.E.sheet, app = ed.app, r = resolved(app, from.id ? from : { id: 'default' }, cb.look);
  const base = r.id === 'custom' ? clone(r.parts) : clone(partsOf(r.id));
  if (!RELEASED.includes(base.material)) base.material = 'flap';
  S.own = sanitizeParts(base);
  pick(ed, { id: 'custom', parts: S.own });
  app.say(ed.t.lk.ownFrom(lookLabel(app, from)));
}
function setPart(ed, k, v) {
  const S = ed.E.sheet, p = clone(S.own);
  if (k === 'material') { p.material = v; if (!MATRIX.walls[v].includes(p.wall.kind)) p.wall = wallPreset(MATRIX.walls[v][0], v); }
  else if (k === 'wall') p.wall = wallPreset(v, p.material);
  else p[k] = v;
  S.own = sanitizeParts(p);
  pick(ed, { id: 'custom', parts: S.own });
}
// Make your own: Material, Type, Letters, Motion, Wall, each only what MATRIX allows.
function ownRows(ed) {
  const t = ed.t.lk, p = ed.E.sheet.own; if (!p) return null;
  const m = MATERIALS[p.material];
  const seg = (label, items) => h('div', { class: 'sf-field' }, h('span', { class: 'sf-eyebrow' }, label),
    h('div', { class: 'sf-row wrap', role: 'group', 'aria-label': label }, items.map(it => h('button', { class: 'sf-seg' + (it.sw ? ' sw' : ''), 'aria-pressed': String(!!it.on), 'aria-label': it.aria || null, 'data-k': it.k, onclick: it.fn },
      it.sw ? h('span', { class: 'sf-ink-dot', style: `background:${it.sw}` }) : null, it.sw ? null : it.label))));
  const inks = m.inks.map(([k, label, hex]) => ({ k: 'lk-ink-' + k, label, aria: t.lettersIn(label.toLowerCase()), sw: hex, on: p.ink === k, fn: () => setPart(ed, 'ink', k) }));
  if (m.lit && !m.alwaysLit) inks.push({ k: 'lk-lit', label: t.litLetters, on: p.lit, fn: () => setPart(ed, 'lit', !p.lit) });
  return h('div', { class: 'sf-lk-own' },
    seg(t.material, RELEASED.map(k => ({ k: 'lk-mat-' + k, label: MATERIALS[k].label, on: p.material === k, fn: () => setPart(ed, 'material', k) }))),
    seg(t.type, MATRIX.types[p.material].map(k => ({ k: 'lk-type-' + k, label: TYPES[k].label, on: p.type === k, fn: () => setPart(ed, 'type', k) }))),
    seg(t.letters, inks),
    seg(t.motion, [['playlist', t.motionPlaylist], ...Object.entries(MOTION).map(([k, v]) => [k, v.label])].map(([k, label]) => ({ k: 'lk-mo-' + k, label, on: p.motion === k, fn: () => setPart(ed, 'motion', k) }))),
    seg(t.wall, MATRIX.walls[p.material].map(k => ({ k: 'lk-wall-' + k, label: t.walls[k], on: p.wall.kind === k, fn: () => setPart(ed, 'wall', k) }))));
}

// The Look row, with its swatch and Change (the five places).
export function lookRow(ed, label, value, l, page, ctx, sub) {
  return h('div', { class: 'sf-lk-row' },
    h('span', { class: 'sf-lk-row-text' }, h('span', { class: 'sf-eyebrow' }, label), h('strong', null, value), sub ? h('span', { class: 'sf-hint' }, sub) : null),
    swatchEl(ed.app, l, page),
    h('button', { class: 'sf-link-btn', 'data-k': 'lk-change-' + ctx.kind, onclick: () => openLook(ed, ctx) }, ed.app.t.change));
}
