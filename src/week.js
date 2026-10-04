// The week (0.7): a storyboard's main view. Seven days on a wide screen, one at a time on
// a phone, with every board's times as blocks you can drag, and Today's playlist beside
// it. It edits the same `wins` the board's own form does, and what it draws comes from the
// rules in schedule.js, so it can never show something the wall would not play.

import { h } from './dom.js';
import { pageWins, blocksFor, dayPlaylist, comingDates, shiftWin, toMin, movedWin, newWin } from './schedule.js';

const HUES = [250, 190, 145, 35, 300, 0, 85, 110];
// A board's colour: its own hue (0.7.1), or for boards from before, the colour of its place.
export const hueOf = (b, i) => { const p = b.pages && b.pages[i]; return p && Number.isInteger(p.hue) ? p.hue : HUES[i % HUES.length]; };
// The first colour no board in the storyboard has yet, for a board being added.
export function nextHue(b) { const used = new Set((b.pages || []).map((p, i) => hueOf(b, i))); return HUES.find(x => !used.has(x)) ?? HUES[(b.pages || []).length % HUES.length]; }
const SNAP = 15, DAY = 1440;
const hm = m => { m = ((Math.round(m) % DAY) + DAY) % DAY; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
const snap = m => Math.round(m / SNAP) * SNAP;
const monday = (now, off) => { const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + off * 7); return d; };
const addDays = (d, k) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + k);
const sameDay = (a, b) => a.toDateString() === b.toDateString();
const name = (t, p, i) => p.name || `${t.page} ${i + 1}`;

// The day as rows, for Today's playlist: from, to, which boards, and whether one is alone.
export function playlistRows(b, day, t) {
  return dayPlaylist(b.pages, day).map(s => ({ from: s.from, to: s.to, alone: s.alone, list: s.list, names: s.list.map(i => name(t, b.pages[i], i)) }));
}
// "Now showing Weather until 17:00, then Welcome home", for the wall and the storyboard list.
export function nowShowing(b, now, t) {
  const rows = playlistRows(b, new Date(now), t), k = rows.findIndex(r => now >= r.from && now < r.to);
  if (k < 0) return '';
  const cur = rows[k], next = rows[k + 1], until = next ? hm(new Date(next.from).getHours() * 60 + new Date(next.from).getMinutes()) : null;
  const added = next ? next.names.filter(n => !cur.names.includes(n)) : [];
  return t.nowShowing(cur.names.length ? cur.names.join(', ') : t.clockOnly, until, added.length ? added.join(', ') : next ? (next.names.join(', ') || t.clockOnly) : null);
}

export function playlistPanel(ed, day) {
  const t = ed.t, b = ed.app.cur(), now = Date.now(), today = sameDay(day, new Date(now));
  const rows = playlistRows(b, day, t);
  // 0.10.2 (Q29): on a screen under 500 px tall it folds to one line above the week, and opens on a tap
  if (ed.phone() && typeof innerHeight !== 'undefined' && innerHeight < 500) {
    const on = rows.find(r => today && now >= r.from && now < r.to), names = on && on.list.length ? on.list.map(i => name(t, b.pages[i], i)).join(', ') : t.clockOnly;
    return h('details', { class: 'sf-playlist sf-playlist-fold', 'data-k': 'playlist-fold', open: !!ed.E.plOpen, ontoggle: e => { ed.E.plOpen = e.target.open; } },
      h('summary', null, h('span', { class: 'sf-eyebrow accent' }, today ? t.todaysPlaylist : t.playlistFor(ed.dayLabel(day))), h('span', { class: 'sf-hint' }, today ? t.nowPlays(names) : t.boardsCount(b.pages.length))),
      playlistBody(ed, b, rows, today, now, t));
  }
  return h('section', { class: 'sf-playlist', 'aria-label': t.todaysPlaylist },
    h('div', { class: 'sf-row' }, h('span', { class: 'sf-eyebrow accent' }, today ? t.todaysPlaylist : t.playlistFor(ed.dayLabel(day))), today ? h('span', { class: 'sf-hint' }, ed.dayLabel(day)) : null),
    playlistBody(ed, b, rows, today, now, t));
}
function playlistBody(ed, b, rows, today, now, t) {
  return [h('ol', { class: 'sf-pl-rows' }, rows.map(r => {
      const on = today && now >= r.from && now < r.to, f = new Date(r.from), e = new Date(r.to);
      return h('li', { class: 'sf-pl-row' + (on ? ' now' : '') },
        h('span', { class: 'sf-pl-when' }, `${hm(f.getHours() * 60 + f.getMinutes())} ${t.to} ${e.getDate() !== f.getDate() ? '24:00' : hm(e.getHours() * 60 + e.getMinutes())}`),
        h('span', { class: 'sf-pl-names' }, r.list.length ? r.list.map(i => h('span', { class: 'sf-pl-who', style: `--hue:${hueOf(b, i)}` }, name(t, b.pages[i], i))) : h('span', { class: 'sf-hint' }, t.clockOnly),
          r.alone ? h('span', { class: 'sf-tag' }, t.aloneTag) : null));
    })),
    h('span', { class: 'sf-hint' }, t.playlistNote)];
}

export function weekView(ed) {
  const t = ed.t, E = ed.E, app = ed.app, b = app.cur(), now = Date.now(), phone = ed.phone();
  E.weekOff = E.weekOff || 0;
  const start = monday(now, E.weekOff), days = [...Array(7)].map((_, k) => addDays(start, k));
  if (E.day == null) E.day = (new Date(now).getDay() + 6) % 7;
  const shown = phone ? [days[E.day]] : days;
  const anyTime = b.pages.map((p, i) => [p, i]).filter(([p]) => !pageWins(p).length);
  const noTimes = b.pages.every(p => !pageWins(p).length);
  const H = phone ? 34 : 32;   // tall enough on a wide screen for the week to open on 06:00

  const head = h('div', { class: 'sf-week-head' },
    h('button', { class: 'sf-icon', 'aria-label': t.prevWeek, 'data-k': 'week-prev', onclick: () => { E.weekOff--; app.render(); } }, '‹'),
    h('strong', null, phone ? t.weekOf(`${days[0].getDate()} ${t.monthShort[days[0].getMonth()]}`, `${days[6].getDate()} ${t.monthShort[days[6].getMonth()]}`) : t.weekOf(ed.dayLabel(days[0]), ed.dayLabel(days[6]))),
    h('button', { class: 'sf-icon', 'aria-label': t.nextWeek, 'data-k': 'week-next', onclick: () => { E.weekOff++; app.render(); } }, '›'),
    E.weekOff ? h('button', { class: 'sf-small-btn', 'data-k': 'week-today', onclick: () => { E.weekOff = 0; E.day = (new Date().getDay() + 6) % 7; app.render(); } }, t.today) : null,
    h('span', { class: 'sf-grow' }),
    h('button', { class: 'sf-small-btn', 'data-k': 'week-add', onclick: () => { E.card = { page: 0, win: -1, day: phone ? E.day : (new Date(now).getDay() + 6) % 7, s: 540, e: 600 }; app.S.sel = 0; app.render(); app.tick(true); } }, '+ ' + t.addATime));

  const chips = phone ? h('div', { class: 'sf-days', role: 'group', 'aria-label': t.daysLabel }, days.map((d, k) =>
    h('button', { class: 'sf-day', 'aria-pressed': String(E.day === k), 'data-k': 'day-chip-' + k, onclick: () => { E.day = k; app.render(); } },
      `${t.dayShort[d.getDay()]} ${d.getDate()}`))) : null;

  const strip = h('div', { class: 'sf-anytime' }, h('span', { class: 'sf-eyebrow' }, t.anyTime),
    anyTime.length ? anyTime.map(([p, i]) => h('button', { class: 'sf-pl-who', style: `--hue:${hueOf(b, i)}`, 'data-k': 'any-' + i, onclick: () => ed.openBoard(i, 'week') }, name(t, p, i)))
      : h('span', { class: 'sf-hint' }, t.anyTimeNone));

  const hours = h('div', { class: 'sf-hours', 'aria-hidden': 'true' }, [...Array(24)].map((_, k) => h('span', { style: `top:${k * H}px` }, String(k).padStart(2, '0'))));
  const cols = shown.map(d => {
    const k = (d.getDay() + 6) % 7, isToday = sameDay(d, new Date(now));
    const rail = dayPlaylist(b.pages, d).map(s => {
      const any = s.list.some(i => !pageWins(b.pages[i]).length), held = s.alone && anyTime.length;
      if (!any && !held) return null;
      const f = (s.from - d.getTime()) / 60000, e = (s.to - d.getTime()) / 60000;
      return h('span', { class: 'sf-rail-seg' + (held ? ' held' : ''), style: `top:${f / 60 * H}px;height:${(e - f) / 60 * H}px` });
    });
    const blocks = blocksFor(b.pages, d).map(x => {
      const p = b.pages[x.page], w = pageWins(p)[x.win], lw = 100 / x.lanes;
      const label = x.cont === 'prev' ? t.fromYesterday : `${w.from} ${t.to} ${w.to}`;
      const px = (x.e - x.s) / 60 * H;
      return h('button', { class: 'sf-block' + (p.alone ? ' alone' : '') + (x.cont ? ' cont-' + x.cont : '') + (px < 30 ? ' short' : ''), style: `--hue:${hueOf(b, x.page)};top:${x.s / 60 * H}px;height:${Math.max(12, (x.e - x.s) / 60 * H - 2)}px;left:calc(${x.lane * lw}% + 2px);width:calc(${lw}% - 4px)`,
        'data-k': `block-${x.page}-${x.win}-${k}${x.cont === 'prev' ? '-p' : ''}`, 'data-page': x.page, 'data-win': x.win, 'aria-label': `${name(t, p, x.page)}, ${ed.winLabel(w)}${p.alone ? ', ' + t.aloneTag : ''}`,
        onpointerdown: e => dragBlock(ed, e, x, k, H, phone), onkeydown: e => blockKey(ed, e, x) },
        h('strong', null, name(t, p, x.page)), px >= 30 ? h('span', null, label) : null, p.alone && px >= 48 ? h('span', { class: 'sf-tag' }, t.aloneTag) : null);
    });
    const nowMin = new Date(now).getHours() * 60 + new Date(now).getMinutes();
    return h('div', { class: 'sf-day-col' + (isToday ? ' today' : ''), 'data-day': k, style: `height:${24 * H}px`, onpointerdown: e => { if (e.target === e.currentTarget) dragNew(ed, e, k, H); } },
      h('span', { class: 'sf-rail-line' }), rail, blocks,
      isToday ? h('span', { class: 'sf-now', style: `top:${nowMin / 60 * H}px` }, h('span', null, hm(nowMin))) : null);
  });
  const dayHeads = phone ? null : h('div', { class: 'sf-day-heads' }, h('span'), days.map(d => h('span', { class: sameDay(d, new Date(now)) ? 'today' : '' }, `${t.dayShort[d.getDay()]} ${d.getDate()}`)));
  const grid = h('div', { class: 'sf-week-scroll', 'data-week': '' }, h('div', { class: 'sf-week-grid' + (phone ? ' one' : ''), style: `height:${24 * H}px` }, hours, cols));

  const coming = comingDates(b.pages, now);
  const comingEl = coming.length ? h('section', { class: 'sf-field' }, h('h3', { class: 'sf-eyebrow' }, t.comingDates),
    h('ul', { class: 'sf-coming' }, coming.map(c => { const p = b.pages[c.page], w = pageWins(p)[c.win];
      return h('li', null, h('button', { class: 'sf-coming-row', 'data-k': `coming-${c.page}-${c.win}`, onclick: () => { E.weekOff = Math.round((monday(c.day, 0) - monday(now, 0)) / (7 * 864e5)); E.day = (c.day.getDay() + 6) % 7; app.render(); } },
        h('span', { class: 'sf-pl-when' }, ed.dayLabel(c.day)), h('span', { class: 'sf-pl-who', style: `--hue:${hueOf(b, c.page)}` }, name(t, p, c.page)),
        h('span', { class: 'sf-hint' }, `${w.from === w.to ? t.allDay : `${w.from} ${t.to} ${w.to}`}${w.yearly ? ' · ' + t.everyYear.toLowerCase() : ''}`))); }))) : null;

  return h('div', { class: 'sf-week' },
    phone ? playlistPanel(ed, days[E.day]) : null,
    head, chips, strip, noTimes ? h('p', { class: 'sf-note big' }, t.weekEmpty) : null, dayHeads, grid, comingEl,
    E.card ? timeCard(ed, days) : null);
}

// ---------- making and changing times ----------
// Every change answers in the status line, with Undo (0.11.4). msg gets the board's name and
// the times after the change.
function setWin(ed, i, wi, fn, msg) {
  const app = ed.app, t = ed.t, p0 = app.cur().pages[i]; if (!p0) return;
  const before = pageWins(p0).map(w => Object.assign({}, w)), alone = !!p0.alone, id = p0.id;
  app.upd(bb => { const p = bb.pages[i]; const list = pageWins(p).map(w => Object.assign({}, w)); fn(list); p.wins = list; delete p.win; if (!list.length) delete p.alone; });
  if (!msg) return;
  const p1 = app.cur().pages[i];
  app.say(msg(name(t, p1, i), pageWins(p1)), { action: { label: t.undo, fn: () => app.upd(bb => { const p = bb.pages.find(x => x.id === id); if (!p) return; p.wins = before; delete p.win; if (alone) p.alone = true; else delete p.alone; }) } });
}
const said = (ed, kind, wi) => (bd, list) => { const t = ed.t, w = list[wi < 0 ? list.length - 1 : wi]; return kind === 'rm' ? t.stTimeRemoved(bd) : t[kind === 'add' ? 'stTimeAdded' : 'stTimeChanged'](bd, w ? ed.winLabel(w) : ''); };
// Drag down an empty part of a day: a time from where you pressed to where you let go.
// o.strip is a board's own strip (0.11.4): the time is this board's at once, and a finger
// draws too, since the strip's days take no scrolling (touch-action: none).
function dragNew(ed, e, day, H, o = {}) {
  if (e.button > 0) return;
  // In the week, on touch a swipe scrolls; a tap on an empty part of a day asks for a time
  // there (0.7.3). Drawing a time by dragging is for a mouse or a pen.
  if (e.pointerType === 'touch' && !o.strip) {
    const top = e.currentTarget.getBoundingClientRect().top, y0 = e.clientY, t0 = Date.now();
    const up = ev => { removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
      if (ev.type !== 'pointerup' || Math.abs(ev.clientY - y0) > 8 || Date.now() - t0 > 600) return;
      const s = Math.max(0, Math.min(DAY - 60, snap((y0 - top) / H * 60)));
      ed.E.card = { page: 0, win: -1, day, s, e: s + 60 }; ed.app.S.sel = 0; ed.app.render(); ed.app.tick(true); };
    addEventListener('pointerup', up); addEventListener('pointercancel', up);
    return;
  }
  e.preventDefault();
  const col = e.currentTarget, top = col.getBoundingClientRect().top, at = y => Math.max(0, Math.min(DAY, snap((y - top) / H * 60)));
  const s0 = Math.min(DAY - SNAP, at(e.clientY)), y0 = e.clientY; let e0 = s0 + 60, moved = false;
  const ghost = h('span', { class: 'sf-block ghost', style: `top:${s0 / 60 * H}px;height:${H}px;left:2px;right:2px` }); col.append(ghost);
  const mv = ev => { if (Math.abs(ev.clientY - y0) > 4) moved = true; if (!moved) return; e0 = Math.max(s0 + SNAP, at(ev.clientY)); ghost.style.height = `${(e0 - s0) / 60 * H}px`; };
  const up = ev => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); ghost.remove();
    if (ev.type === 'pointercancel') return;
    const end = Math.min(DAY, moved ? e0 : s0 + 60);   // a tap makes an hour
    if (o.strip) return o.add(s0, end);
    ed.E.card = { page: 0, win: -1, day, s: s0, e: end }; ed.app.S.sel = 0; ed.app.render(); ed.app.tick(true); };
  addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
}
// Drag a block to move it (sideways to another day on a wide screen), or its top or bottom
// edge to change the start or end. A press without a drag opens the board, or in a board's
// own strip the card to edit or remove the time.
function dragBlock(ed, e, x, day, H, phone, o = {}) {
  if (e.button > 0) return;
  const tap = () => (o.strip ? openStripCard(ed, x.win) : ed.openBoard(x.page, 'week'));
  if (e.pointerType === 'touch' && !o.strip) {   // in the week, on touch: a tap opens the board, a swipe scrolls
    const y0 = e.clientY, t0 = Date.now();
    const up = ev => { removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
      if (ev.type === 'pointerup' && Math.abs(ev.clientY - y0) <= 8 && Date.now() - t0 < 600) tap(); };
    addEventListener('pointerup', up); addEventListener('pointercancel', up);
    return;
  }
  e.preventDefault(); e.stopPropagation();
  const el = e.currentTarget, r = el.getBoundingClientRect(), y0 = e.clientY, x0 = e.clientX;
  const edge = e.pointerType === 'touch' ? 10 : 6;   // a finger gets a wider edge
  const mode = x.cont === 'prev' ? (r.bottom - e.clientY < edge ? 'end' : 'move') : x.cont === 'next' ? (e.clientY - r.top < edge ? 'start' : 'move')
    : e.clientY - r.top < edge ? 'start' : r.bottom - e.clientY < edge ? 'end' : 'move';
  const colW = el.parentElement.getBoundingClientRect().width;
  let dm = 0, dd = 0, moved = false;
  const mv = ev => {
    dm = snap((ev.clientY - y0) / H * 60); dd = phone || mode !== 'move' ? 0 : Math.round((ev.clientX - x0) / colW);
    if (Math.abs(ev.clientY - y0) > 4 || Math.abs(ev.clientX - x0) > 4) moved = true;
    if (!moved) return;
    if (mode === 'move') el.style.transform = `translate(${dd * colW}px, ${dm / 60 * H}px)`;
    else if (mode === 'start') { el.style.transform = `translateY(${dm / 60 * H}px)`; el.style.height = `${Math.max(12, r.height - dm / 60 * H)}px`; }
    else el.style.height = `${Math.max(12, r.height + dm / 60 * H)}px`;
  };
  const up = ev => {
    removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
    if (ev.type === 'pointercancel') { el.style.transform = ''; return; }
    if (!moved) { tap(); return; }
    moveWin(ed, x, mode, dm, dd);
  };
  addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
}
function moveWin(ed, x, mode, dm, dd) {
  setWin(ed, x.page, x.win, list => { list[x.win] = movedWin(list[x.win], mode, dm, dd, SNAP); }, said(ed, 'move', x.win));
}
// The keyboard route: arrows move a block by 15 minutes, Shift and the arrows change its
// end, left and right change the day, Enter opens the board, Delete removes the time.
function blockKey(ed, e, x) {
  const k = e.key, sh = e.shiftKey;
  const act = k === 'ArrowUp' ? () => moveWin(ed, x, sh ? 'end' : 'move', -SNAP, 0) : k === 'ArrowDown' ? () => moveWin(ed, x, sh ? 'end' : 'move', SNAP, 0)
    : k === 'ArrowLeft' ? () => moveWin(ed, x, 'move', 0, -1) : k === 'ArrowRight' ? () => moveWin(ed, x, 'move', 0, 1)
    : k === 'Enter' ? () => (x.strip ? openStripCard(ed, x.win) : ed.openBoard(x.page, 'week')) : k === 'Delete' || k === 'Backspace' ? () => setWin(ed, x.page, x.win, list => { list.splice(x.win, 1); }, said(ed, 'rm')) : null;
  if (!act) return;
  e.preventDefault(); act();
  if (k !== 'Enter' && k !== 'Delete' && k !== 'Backspace') { const el = ed.app.drawer && ed.app.drawer.querySelector(`[data-page="${x.page}"][data-win="${x.win}"]`); if (el) el.focus(); }
}
// The card after a drag or + Add a time: which board shows then, and its day and times.
function timeCard(ed, days) {
  const t = ed.t, C = ed.E.card, app = ed.app, b = app.cur(), d = days[C.day];
  const save = () => {
    const i = C.page;
    setWin(ed, i, -1, list => { if (list.length < 8) list.push(newWin(d, C.s, C.e)); }, said(ed, 'add', -1));
    ed.E.card = null; app.render();
  };
  return h('div', { class: 'sf-card sf-pop', role: 'dialog', 'aria-label': t.timeCardTitle },
    h('strong', null, t.timeCardTitle),
    h('div', { class: 'sf-row wrap' }, b.pages.map((p, i) => h('button', { class: 'sf-seg', 'aria-pressed': String(C.page === i), style: `--hue:${hueOf(b, i)}`, 'data-k': 'card-page-' + i, onclick: () => { C.page = i; app.S.sel = i; app.render(); app.tick(true); } }, name(t, p, i))),
      h('button', { class: 'sf-seg', 'data-k': 'card-new', onclick: () => { ed.E.card = null; ed.addPage(); } }, '+ ' + t.newBoardShort)),
    h('div', { class: 'sf-row' }, h('span', { class: 'sf-label muted' }, `${t.dayShort[d.getDay()]} ${d.getDate()}`),
      h('input', { type: 'time', class: 'sf-time', value: hm(C.s), 'aria-label': t.from, 'data-k': 'card-from', onchange: e => { C.s = toMin(e.target.value || '09:00'); } }),
      h('span', { class: 'sf-label muted' }, t.to),
      h('input', { type: 'time', class: 'sf-time', value: hm(C.e), 'aria-label': t.to, 'data-k': 'card-to', onchange: e => { C.e = toMin(e.target.value || '10:00'); } })),
    pageWins(b.pages[C.page] || {}).length >= 8 ? h('span', { class: 'sf-hint warn' }, t.maxTimes) : null,
    h('div', { class: 'sf-row' }, h('button', { class: 'sf-btn primary', 'data-k': 'card-save', onclick: save }, t.addATime),
      h('button', { class: 'sf-btn', 'data-k': 'card-cancel', onclick: () => { ed.E.card = null; app.render(); } }, t.cancel)));
}

// ---------- a board's own week (0.11.4) ----------
// The top of a board's When it shows: the week with this board's times as solid blocks and the
// playlist's other boards faint behind, in their hues. Drawn from blocksFor and changed through
// setWin, the same as the Week view, so the two can never disagree, and neither can the wall.
// Drag an empty slot to add a time, drag an edge to change it, a block to move it; a tap on a
// block opens a card to edit or remove it. On a phone, one day at a time.
const STRIP_H = 14;
export function weekStrip(ed, i) {
  const t = ed.t, E = ed.E, app = ed.app, b = app.cur(), p = b.pages[i], now = Date.now(), phone = ed.phone(), H = STRIP_H;
  if (!p) return null;
  E.stripOff = E.stripOff || 0;
  if (E.stripDay == null) E.stripDay = (new Date(now).getDay() + 6) % 7;
  const start = monday(now, E.stripOff), days = [...Array(7)].map((_, k) => addDays(start, k));
  const ks = phone ? [E.stripDay] : [0, 1, 2, 3, 4, 5, 6];
  const step = k => { if (phone) { let d = E.stripDay + k; if (d < 0) { d = 6; E.stripOff--; } if (d > 6) { d = 0; E.stripOff++; } E.stripDay = d; } else E.stripOff += k; app.render(); };
  const full = pageWins(p).length >= 8;
  const add = (k, s, e) => {
    if (full) { app.say(t.maxTimes); return; }
    setWin(ed, i, -1, list => { list.push(newWin(days[k], s, e)); }, said(ed, 'add', -1));
  };
  const head = h('div', { class: 'sf-strip-head' },
    h('button', { class: 'sf-icon', 'aria-label': phone ? t.prevDay : t.prevWeek, 'data-k': 'strip-prev', onclick: () => step(-1) }, '‹'),
    h('strong', null, phone ? `${t.dayShort[days[E.stripDay].getDay()]} ${days[E.stripDay].getDate()} ${t.monthShort[days[E.stripDay].getMonth()]}` : t.weekOf(ed.dayLabel(days[0]), ed.dayLabel(days[6]))),
    h('button', { class: 'sf-icon', 'aria-label': phone ? t.nextDay : t.nextWeek, 'data-k': 'strip-next', onclick: () => step(1) }, '›'),
    h('span', { class: 'sf-grow' }),
    h('span', { class: 'sf-hint' }, full ? t.maxTimes : t.stripHint));
  const heads = h('div', { class: 'sf-strip-days' + (phone ? ' one' : '') }, h('span'), ks.map(k => h('span', { class: sameDay(days[k], new Date(now)) ? 'today' : '' }, `${t.dayShort[days[k].getDay()]} ${days[k].getDate()}`)));
  const hours = h('div', { class: 'sf-hours', 'aria-hidden': 'true' }, [0, 6, 12, 18].map(k => h('span', { style: `top:${k * H}px` }, String(k).padStart(2, '0'))));
  const cols = ks.map(k => {
    const d = days[k], isToday = sameDay(d, new Date(now));
    const blocks = blocksFor(b.pages, d).map(x => {
      const q = b.pages[x.page], w = pageWins(q)[x.win], mine = x.page === i, lw = 100 / x.lanes;
      const style = `--hue:${hueOf(b, x.page)};top:${x.s / 60 * H}px;height:${Math.max(6, (x.e - x.s) / 60 * H - 1)}px;left:calc(${x.lane * lw}% + 1px);width:calc(${lw}% - 2px)`;
      if (!mine) return h('span', { class: 'sf-block faint', style, 'aria-hidden': 'true', title: name(t, q, x.page) });
      const sx = Object.assign({}, x, { strip: true });
      return h('button', { class: 'sf-block mine' + (x.cont ? ' cont-' + x.cont : ''), style, 'data-k': `strip-${x.win}-${k}${x.cont === 'prev' ? '-p' : ''}`, 'data-page': x.page, 'data-win': x.win,
        'aria-label': `${ed.winLabel(w)}. ${t.stripBlockHelp}`,
        onpointerdown: e => dragBlock(ed, e, sx, k, H, phone, { strip: true }), onkeydown: e => blockKey(ed, e, sx) },
        (x.e - x.s) / 60 * H >= 14 ? h('span', null, x.cont === 'prev' ? t.fromYesterday : `${w.from}–${w.to}`) : null);
    });
    return h('div', { class: 'sf-day-col strip' + (isToday ? ' today' : ''), 'data-day': k, 'data-k': 'strip-day-' + k, style: `height:${24 * H}px`,
      onpointerdown: e => { if (e.target === e.currentTarget) dragNew(ed, e, k, H, { strip: true, add: (s, en) => add(k, s, en) }); } }, blocks);
  });
  return h('div', { class: 'sf-strip', 'data-k': 'strip' },
    head, heads, h('div', { class: 'sf-week-grid sf-strip-grid' + (phone ? ' one' : ''), style: `height:${24 * H}px` }, hours, cols),
    E.stripCard ? stripCard(ed, i) : null);
}
function openStripCard(ed, wi) { ed.E.stripCard = { win: wi }; ed.app.render(); const el = ed.app.drawer && ed.app.drawer.querySelector('[data-k=strip-card-from]'); if (el) el.focus(); }
// The card for one time in the strip: its start and end, Remove and Done. The form below
// has the days and dates.
function stripCard(ed, i) {
  const t = ed.t, app = ed.app, C = ed.E.stripCard, p = app.cur().pages[i], w = p && pageWins(p)[C.win];
  if (!w) { ed.E.stripCard = null; return null; }
  const set = fn => setWin(ed, i, C.win, list => { fn(list[C.win]); }, said(ed, 'move', C.win));
  return h('div', { class: 'sf-card sf-pop', role: 'dialog', 'aria-label': ed.winLabel(w), 'data-k': 'strip-card' },
    h('strong', null, ed.winLabel(w)),
    h('div', { class: 'sf-row' },
      h('input', { type: 'time', class: 'sf-time', value: w.from, 'aria-label': t.from, 'data-k': 'strip-card-from', onchange: e => { if (e.target.value) set(ww => { ww.from = e.target.value; }); } }),
      h('span', { class: 'sf-label muted' }, t.to),
      h('input', { type: 'time', class: 'sf-time', value: w.to, 'aria-label': t.to, 'data-k': 'strip-card-to', onchange: e => { if (e.target.value) set(ww => { ww.to = e.target.value; }); } })),
    h('div', { class: 'sf-row' },
      h('button', { class: 'sf-btn', 'data-k': 'strip-card-rm', onclick: () => { ed.E.stripCard = null; setWin(ed, i, C.win, list => { list.splice(C.win, 1); }, said(ed, 'rm')); app.render(); } }, t.removeTime),
      h('button', { class: 'sf-btn primary', 'data-k': 'strip-card-done', onclick: () => { ed.E.stripCard = null; app.render(); } }, t.done)));
}
