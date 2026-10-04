// Boards live in this browser's localStorage and nowhere else. A board link carries a
// whole board in the URL fragment (after #), which browsers never send to the server.
//
// Anything arriving from outside (a link, an imported file) goes through sanitizeBoard,
// which rebuilds the board field by field, so a hand-edited or hostile payload can only
// ever produce a valid board.

import { CHANNELS, LAYOUTS, AREAS, defaultBoard, newId } from './content.js';
import { cellChar, CHIP_KEYS } from './charset.js';
import { PATTERNS } from './pixels.js';
import { PROFILE_IDS } from './sound.js';
import { validTz, FX_CURRENCIES } from './place.js';
import { COINS } from './content.js';
import { STOP_ID } from './transit.js';
import { feedUrl } from './feeds.js';
import { LOOKS, sanitizeParts } from './looks.js';

// Before 0.10.1: storyboards (sf_boards, sf_active) and My boards (sf_myboards). They are
// read once, by the migration, and never written again, so a tab still running 0.10.0
// and a 0.10.1 tab never talk through the same key.
const K = { boards: 'sf_boards', active: 'sf_active', my: 'sf_myboards', library: 'sf_library', playlists: 'sf_playlists', shown: 'sf_shown', settings: 'sf_settings' };
const SIZES = ['6x22', '3x15', '12x40', 'fill', 'custom'];
const THEMES = ['black', 'white', 'solari'];
const SPEEDS = ['fast', 'gentle', 'authentic'];
const TRANSITIONS = ['classic', 'wave', 'drift', 'curtain'];
const MODES = ['METRO', 'TRAIN', 'TRAM', 'BUS', 'SHIP'];

const pick = (v, list, dflt) => list.includes(v) ? v : dflt;
const str = (v, max, dflt = '') => typeof v === 'string' ? v.slice(0, max) : dflt;
const int = (v, lo, hi, dflt) => { const n = Math.round(+v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt; };
const color = v => v === 'rainbow' || CHIP_KEYS.includes(v) ? v : 'f';
const time = (v, dflt) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : dflt;
const num = (v, lo, hi) => { const n = +v; return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
const list = (v, n, len) => (Array.isArray(v) ? v : []).slice(0, n).map(x => str(x, len));
const chipList = v => [...new Set((Array.isArray(v) ? v : []).filter(k => CHIP_KEYS.includes(k)))].slice(0, 9);
// A city with its coordinates; since 0.8 also its country and time zone (the Place).
const place = o => {
  const lat = num(o.lat, -90, 90), lon = num(o.lon, -180, 180);
  if (lat == null || lon == null) return null;
  return Object.assign({ lat, lon, city: str(o.city, 80) }, /^[A-Z]{2}$/.test(o.cc) ? { cc: o.cc } : {}, validTz(o.tz) ? { tz: o.tz } : {});
};

function sanitizeZone(z) {
  const ch = pick(z && z.ch, CHANNELS, 'message'), o = (z && typeof z.o === 'object' && z.o) || {}, out = {};
  if (ch === 'message') {
    if (Array.isArray(o.cells)) out.cells = o.cells.slice(0, 24).map(r => (Array.isArray(r) ? r : []).slice(0, 60).map(c => cellChar(typeof c === 'string' ? c : ' ')));
    else if (Array.isArray(o.lines)) out.lines = o.lines.slice(0, 24).map(l => str(l, 60));
    else if (typeof o.text === 'string') out.text = str(o.text, 500);
    if (o.mode === 'paint' || o.mode === 'photo') out.mode = o.mode;   // which composer mode the editor opens in
  } else if (ch === 'clock') { out.fmt = o.fmt === '12' ? '12' : '24'; if (o.date === false) out.date = false; if (o.week) out.week = true; }
  else if (ch === 'countdown') {
    out.label = str(o.label, 60); out.date = /^\d{4}-\d{2}-\d{2}$/.test(o.date) ? o.date : '2027-06-25';
    if (o.dir === 'up') out.dir = 'up';
    if (o.to === 'holiday') out.to = 'holiday';
    if (o.unit === 'days') out.unit = 'days';
  }
  else if (ch === 'bigclock') { out.fmt = o.fmt === '12' ? '12' : '24'; out.color = color(o.color); }
  else if (ch === 'bigtext') { out.text = str(o.text, 80, 'HEJ'); out.color = color(o.color); }
  else if (ch === 'art') {
    out.pattern = pick(o.pattern, PATTERNS, 'rainbow'); out.step = int(o.step, 2, 60, 4);
    const pal = chipList(o.palette); if (pal.length) out.palette = pal;
  } else if (ch === 'sl') {
    if (o.home) out.home = true;
    const stations = (Array.isArray(o.stations) ? o.stations : []).slice(0, 6).map(x => x && typeof x === 'object' ? { id: int(x.id, 1, 99999999, null), name: str(x.name, 80) } : null).filter(x => x && x.id);
    if (stations.length) out.stations = stations;
    else {
      const sites = (Array.isArray(o.sites) ? o.sites : [o.site]).map(v => int(v, 1, 99999999, null)).filter(Boolean).slice(0, 6);
      if (sites.length) { out.sites = sites; out.name = str(o.name, 80); }
    }
    if (Array.isArray(o.modes)) out.modes = o.modes.filter(m => MODES.includes(m));
    out.eta = pick(o.eta, ['min', 'clock', 'cycle'], 'min'); out.fmt = o.fmt === '12' ? '12' : '24';
    if (o.rows != null) out.rows = int(o.rows, 1, 12, 3);
    if (o.walk) out.walk = int(o.walk, 0, 30, 0);
  } else if (ch === 'departures') {
    // stops from Transitous (id as it writes them) or SL (a site number), up to four (0.8)
    out.stops = (Array.isArray(o.stops) ? o.stops : []).slice(0, 4).map(x => {
      if (!x || typeof x !== 'object') return null;
      if (x.src === 'sl') { const id = int(x.id, 1, 99999999, null); return id ? { src: 'sl', id, name: str(x.name, 80) } : null; }
      return x.src === 'tr' && STOP_ID.test(x.id || '') ? { src: 'tr', id: x.id, name: str(x.name, 80) } : null;
    }).filter(Boolean);
    if (Array.isArray(o.modes)) out.modes = o.modes.filter(m => MODES.includes(m));
    out.eta = pick(o.eta, ['min', 'clock', 'cycle'], 'min'); out.fmt = o.fmt === '12' ? '12' : '24';
    if (o.view === 'board') out.view = 'board';
    if (o.rows != null) out.rows = int(o.rows, 1, 12, 3);
    if (o.walk) out.walk = int(o.walk, 0, 30, 0);
    if (typeof o.lines === 'string' && o.lines.trim()) out.lines = str(o.lines, 60);
    if (o.cancelled === 'hide') out.cancelled = 'hide';
    if (o.alert === true) out.alert = true;
    if (o.merge === true) out.merge = true;
    if (o.near === true || o.near === 'rail') out.near = o.near;
  } else if (ch === 'headlines') {
    // feed addresses are not secret, and a wall screen needs them to ask for the feed (0.9.3)
    out.feeds = (Array.isArray(o.feeds) ? o.feeds : []).slice(0, 6).map(f => f && feedUrl(f.url) ? { url: feedUrl(f.url), name: str(f.name, 40) } : null).filter(Boolean);
    out.every = int(o.every, 5, 120, 10); out.count = int(o.count, 1, 10, 5);
  } else if (ch === 'rates') {
    out.banks = [...new Set((Array.isArray(o.banks) ? o.banks : []).filter(b => ['ecb', 'fed', 'boe', 'riks'].includes(b)))].slice(0, 4);
    if (!out.banks.length) out.banks = ['ecb'];
    out.years = o.years === 1 ? 1 : 5;
    if (o.view === 'list') out.view = 'list';
    if (o.line === 'thick') out.line = 'thick';
  } else if (ch === 'markets') {
    // symbols and how they look; never a key or a sheet link, which stay in this browser (0.9)
    out.source = pick(o.source, ['built', 'crypto', 'key', 'sheet'], 'built');
    out.symbols = (Array.isArray(o.symbols) ? o.symbols : []).slice(0, 8).filter(x => x && typeof x === 'object' && /^[A-Z0-9][A-Z0-9.\-:^]{0,29}$/.test(x.s || '')).map(x => Object.assign({ s: x.s }, str(x.name, 40) ? { name: str(x.name, 40) } : {}));
    out.period = pick(o.period, ['1d', '1w', '1m', '3m', '1y'], '1m');
    out.every = int(o.every, 5, 600, 12);
    if (o.line === 'thick') out.line = 'thick';
    if (o.ref === true) out.ref = true;
    if (o.side === 'right') out.side = 'right';
    if (o.panel === false) out.panel = false;
    if (o.dec != null && o.dec !== '') out.dec = int(o.dec, 0, 4, 2);
    if (/^[A-Z]{3}$/.test(o.cur || '')) out.cur = o.cur;
  } else if (ch === 'worldtime') {
    out.places = (Array.isArray(o.places) ? o.places : []).slice(0, 6).filter(x => x && typeof x === 'object' && validTz(x.tz)).map(x => ({ city: str(x.city, 40), tz: x.tz }));
    out.fmt = o.fmt === '12' ? '12' : '24';
  } else if (ch === 'weather') {
    const pl = place(o); if (pl) Object.assign(out, pl);
    out.view = pick(o.view, ['now', 'hours', 'days'], 'now');
    if (o.units === 'f') out.units = 'f';
    if (o.wind === false) out.wind = false;
    if (o.soon === false) out.soon = false;
  } else if (ch === 'quote') { if (o.set === 'work') out.set = 'work'; }
  else if (ch === 'rotating') {
    out.messages = list(o.messages, 12, 120); out.interval = int(o.interval, 3, 120, 8);
    if (o.order === 'shuffle') out.order = 'shuffle';
  } else if (ch === 'menu') {
    out.title = str(o.title, 60); out.items = list(o.items, 16, 60); out.suffix = /^[ A-Z:$.-]{0,5}$/.test(o.suffix || '') ? o.suffix || '' : '';
    if (o.prefix === '$') out.prefix = '$';   // 0.8: dollar prices, $3.50
  } else if (ch === 'letterclock') { if (o.dots === false) out.dots = false; }
  else if (ch === 'meter') { if (o.style === 'bars' || o.style === 'mirror') out.style = o.style; }   // 0.11.2; Mixer is the default
  else if (ch === 'today') { if (o.week === false) out.week = false; if (o.sun === false) out.sun = false; if (o.days === false) out.days = false; if (o.doy) out.doy = true; }
  else if (ch === 'electricity') { out.area = AREAS[o.area] ? o.area : 'SE3'; out.view = o.view === 'chart' ? 'chart' : 'now'; if (o.vat === false) out.vat = false; }
  else if (ch === 'currency') {
    out.base = FX_CURRENCIES.includes(o.base) ? o.base : 'SEK'; out.dec = int(o.dec, 0, 4, 2);
    const pairs = [...new Set((Array.isArray(o.pairs) ? o.pairs : []).filter(c => FX_CURRENCIES.includes(c) || COINS[c]))].slice(0, 6);
    out.pairs = pairs.length ? pairs : ['EUR', 'USD', 'GBP'];
  } else if (ch === 'url') {
    // https only: a page on https cannot read http anyway, and it keeps javascript: and data: out.
    const u = str(o.url, 500).trim(); out.url = /^https:\/\/[^\s]+$/.test(u) ? u : '';
    out.every = pick(String(o.every), ['1', '5', '15', '60'], '5'); out.tpl = str(o.tpl, 200);
    out.path = str(o.path, 100).replace(/[^\w.]/g, ''); out.max = int(o.max, 1, 12, 4); out.header = str(o.header, 60);
  }
  return { ch, o: out };
}

// One time window. Days are Date.getDay() numbers; an empty list is every day.
function sanitizeWin(w) {
  if (!w || typeof w !== 'object') return null;
  const days = Array.isArray(w.days) ? [...new Set(w.days.map(Number).filter(d => Number.isInteger(d) && d >= 0 && d <= 6))].sort() : [];
  const out = { from: time(w.from, '07:00'), to: time(w.to, '09:00'), days };
  if (realDate(w.date)) { out.date = w.date; out.days = []; if (w.yearly === true) out.yearly = true; }
  return out;
}
// YYYY-MM-DD and a day that exists (no 31 April).
function realDate(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number), t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}
// A page's windows: the 0.3 list, else the one 0.2 window if it was switched on.
const MAX_WINS = 8;
function sanitizeWins(p) {
  const src = Array.isArray(p && p.wins) ? p.wins : p && p.win && p.win.on ? [p.win] : [];
  return src.slice(0, MAX_WINS).map(sanitizeWin).filter(Boolean);
}
// A board saved by 0.3 may be opened by a wall screen still running 0.2, which only
// reads win. So the first window is also written in the old shape for now.
// A window on a date has no 0.2 shape, so the first window by days is used; a page with
// only dated windows shows at any time on such a screen until it reloads.
const legacyWin = wins => { const w = wins.find(x => !x.date); return w ? { on: true, from: w.from, to: w.to, days: w.days } : null; };

// Where a copy came from (0.7.1): a template, a blueprint in My boards, a storyboard,
// or later the community hub. Nothing reads it yet; it is kept for credit and for an
// "update from my boards" later.
const FROM_KINDS = ['template', 'blueprint', 'storyboard', 'community'];
const origin = f => f && typeof f === 'object' && FROM_KINDS.includes(f.kind) && str(f.id, 64) ? { from: Object.assign({ kind: f.kind, id: str(f.id, 64) }, str(f.board, 40) ? { board: str(f.board, 40) } : {}) } : {};
const hueOf = h => Number.isInteger(h) && h >= 0 && h < 360 ? { hue: h } : {};
// One board: a layout, its zones, how long it shows, its transition, and (in a storyboard)
// its times. A blueprint's board has no times.
function sanitizePage(p, withTimes = true) {
  const layout = pick(p && p.layout, LAYOUTS, 'full'), need = layout === 'full' ? 1 : 2;
  const zones = (Array.isArray(p && p.zones) ? p.zones : []).slice(0, need).map(sanitizeZone);
  while (zones.length < need) zones.push({ ch: 'message', o: {} });
  const base = { id: str(p && p.id, 40) || newId('p'), name: str(p && p.name, 80), layout, dur: int(p && p.dur, 3, 3600, 10) };
  const extra = { ...(TRANSITIONS.includes(p && p.tr) ? { tr: p.tr } : {}), ...hueOf(p && p.hue), ...origin(p && p.from) };
  if (!withTimes) return Object.assign(base, extra, { zones });
  // 0.10.1: a board in a playlist has its own size and theme, so a link carries them. A page
  // without them is at its storyboard's size, as before.
  if (p && SIZES.includes(p.size)) Object.assign(extra, { size: p.size, rows: int(p.rows, 1, 24, 6), cols: int(p.cols, 4, 60, 22) });
  if (p && THEMES.includes(p.theme)) extra.theme = p.theme;
  Object.assign(extra, lookFields(p));   // 0.11: a board's look travels in a link too
  const wins = sanitizeWins(p);
  return Object.assign(base, { wins, win: legacyWin(wins) }, p && p.alone === true && wins.length ? { alone: true } : {}, extra, { zones });
}
// A board's look (0.11): 'default', a look's id, or 'custom' with its parts, checked against
// looks.js. A board with none is read by the fixed rule in looks.js lookOf (theme black is
// Default, white Paper, solari Solari), so nothing is written until the board is changed.
function lookFields(x) {
  if (!x || typeof x !== 'object' || typeof x.look !== 'string') return {};
  if (x.look === 'custom') { const p = sanitizeParts(x.lookParts); return p ? { look: 'custom', lookParts: p } : {}; }
  return x.look === 'default' || Object.prototype.hasOwnProperty.call(LOOKS, x.look) ? { look: x.look } : {};
}
// A blueprint in My boards (0.7.1): one board with the size and theme it was made at.
// From 0.10.1 every board is one of these, in your Boards, and may say its size by name
// (fill follows the screen); one without a size is at its rows and columns.
export function sanitizeBlueprint(x) {
  if (!x || typeof x !== 'object' || !x.page || typeof x.page !== 'object') return null;
  return { id: str(x.id, 40) || newId('m'), name: str(x.name, 80) || str(x.page.name, 80) || 'Board',
    ...(SIZES.includes(x.size) ? { size: x.size } : {}),
    rows: int(x.rows, 1, 24, 6), cols: int(x.cols, 4, 60, 22), theme: pick(x.theme, THEMES, 'black'), ...lookFields(x),
    ...origin(x.from), page: sanitizePage(x.page, false) };
}
// A board's size by name: the one it says, else the preset its rows and columns match.
export function sizeOf(x) {
  if (x && SIZES.includes(x.size)) return x.size;
  const k = `${x && x.rows}x${x && x.cols}`;
  return ['6x22', '3x15', '12x40'].includes(k) ? k : 'custom';
}
// Rows and columns for a size by name. Fill has no fixed answer: the app measures the screen.
export function dimsOfSize(x) {
  const s = sizeOf(x);
  if (s === 'custom' || s === 'fill') return { rows: int(x.rows, 1, 24, 6), cols: int(x.cols, 4, 60, 22) };
  const [r, c] = s.split('x').map(Number); return { rows: r, cols: c };
}
// A playlist (0.10.1): its settings, and the boards it shows by id, each with its times.
export function sanitizePlaylist(x) {
  if (!x || typeof x !== 'object' || !Array.isArray(x.items)) return null;
  const q = (x.quiet && typeof x.quiet === 'object') ? x.quiet : {}, seen = new Set();
  const items = x.items.slice(0, 50).map(it => {
    const id = it && typeof it === 'object' ? str(it.id, 40) : '';
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id) || seen.has(id)) return null;
    seen.add(id);
    const wins = sanitizeWins(it);
    return Object.assign({ id, dur: int(it.dur, 3, 3600, 10), wins }, it.alone === true && wins.length ? { alone: true } : {}, hueOf(it.hue));
  }).filter(Boolean);
  return {
    id: str(x.id, 40) || newId('b'), name: str(x.name, 80) || 'Playlist',
    ...(x.solo === true && items.length === 1 ? { solo: true } : {}),
    transition: pick(x.transition, TRANSITIONS, 'classic'), speed: pick(x.speed, SPEEDS, 'fast'),
    sound: !!x.sound, soundStyle: pick(x.soundStyle, PROFILE_IDS, 'clack'), volume: int(x.volume, 0, 100, 70),
    ...(typeof x.from === 'string' && /^[a-z]{2,12}$/.test(x.from) ? { from: x.from } : {}),
    quiet: { on: !!q.on, from: time(q.from, '23:00'), to: time(q.to, '07:00'), mode: q.mode === 'blank' ? 'blank' : 'dim' },
    ...(x.loc && typeof x.loc === 'object' && place(x.loc) ? { loc: place(x.loc) } : {}),
    ...(x.roll && (x.roll.start === true || x.roll.hourly === true) ? { roll: { start: x.roll.start === true, hourly: x.roll.hourly === true } } : {}),
    items
  };
}
// Settings kept with the account (0.10.1), one row each: home (the city, stops and currency
// new tiles start from) and last (what this account last put on a screen).
export function sanitizeSettings(x) {
  if (!x || typeof x !== 'object') return null;
  if (x.id === 'home') {
    const stops = (Array.isArray(x.stops) ? x.stops : []).slice(0, 4).map(s => {
      if (!s || typeof s !== 'object') return null;
      if (s.src === 'sl') { const id = int(s.id, 1, 99999999, null); return id ? { src: 'sl', id, name: str(s.name, 80) } : null; }
      return s.src === 'tr' && STOP_ID.test(s.id || '') ? { src: 'tr', id: s.id, name: str(s.name, 80) } : null;
    }).filter(Boolean);
    return Object.assign({ id: 'home' }, x.place && typeof x.place === 'object' && place(x.place) ? { place: place(x.place) } : {},
      { stops }, FX_CURRENCIES.includes(x.cur) ? { cur: x.cur } : {});
  }
  // the account's default look (0.11): a look's id, or custom with its parts
  if (x.id === 'look') {
    if (x.look === 'custom') { const p = sanitizeParts(x.parts); return p ? { id: 'look', look: 'custom', parts: p } : null; }
    return typeof x.look === 'string' && Object.prototype.hasOwnProperty.call(LOOKS, x.look) && x.look !== 'custom' ? { id: 'look', look: x.look } : null;
  }
  if (x.id === 'last') {
    const pl = str(x.pl, 40);
    return /^[A-Za-z0-9_-]{1,40}$/.test(pl) ? { id: 'last', pl, name: str(x.name, 80), at: int(x.at, 0, 1e14, 0) } : null;
  }
  return null;
}
export function sanitizeBoard(b) {
  if (!b || typeof b !== 'object' || !Array.isArray(b.pages)) return null;
  const d = defaultBoard();
  const q = (b.quiet && typeof b.quiet === 'object') ? b.quiet : {};
  const pages = b.pages.slice(0, 50).map(p => sanitizePage(p));
  if (!pages.length) return null;
  return {
    id: str(b.id, 40) || newId('b'), name: str(b.name, 80) || d.name,
    size: pick(b.size, SIZES, '6x22'), rows: int(b.rows, 1, 24, 6), cols: int(b.cols, 4, 60, 22),
    theme: pick(b.theme, THEMES, 'black'), transition: pick(b.transition, TRANSITIONS, 'classic'), speed: pick(b.speed, SPEEDS, 'fast'),
    sound: !!b.sound, soundStyle: pick(b.soundStyle, PROFILE_IDS, 'clack'), volume: int(b.volume, 0, 100, 70),
    ...(typeof b.from === 'string' && /^[a-z]{2,12}$/.test(b.from) ? { from: b.from } : {}),
    quiet: { on: !!q.on, from: time(q.from, '23:00'), to: time(q.to, '07:00'), mode: q.mode === 'blank' ? 'blank' : 'dim' },
    ...(b.loc && typeof b.loc === 'object' && place(b.loc) ? { loc: place(b.loc) } : {}),
    ...(b.roll && (b.roll.start === true || b.roll.hourly === true) ? { roll: { start: b.roll.start === true, hourly: b.roll.hourly === true } } : {}),
    pages
  };
}

// --- localStorage ---
function ls() { try { return window.localStorage; } catch { return null; } }

export function loadBlueprints() {
  let raw; try { raw = JSON.parse(ls().getItem(K.my)) || []; } catch { return []; }
  return (Array.isArray(raw) ? raw : []).map(x => { try { return sanitizeBlueprint(x); } catch { return null; } }).filter(Boolean);
}
export function saveBlueprints(list) { try { ls().setItem(K.my, JSON.stringify(list)); } catch { /* storage full or blocked */ } }
export function loadBoards() {
  const s = ls(); let boards = [], active = 0;
  let raw = []; try { raw = JSON.parse(s.getItem(K.boards)) || []; active = +s.getItem(K.active) || 0; } catch { raw = []; }
  // each board on its own, so one damaged entry is dropped and the rest still load
  boards = (Array.isArray(raw) ? raw : []).map(b => { try { return sanitizeBoard(b); } catch { return null; } }).filter(Boolean);
  return { boards, active: boards[active] ? active : 0 };
}
export function saveBoards(boards, active) {
  const s = ls(); if (!s) return;
  try { s.setItem(K.boards, JSON.stringify(boards)); s.setItem(K.active, String(active)); } catch { /* storage full or blocked: the board still runs */ }
}
// 0.11.3: the keys of before 0.10.1 go two weeks after this version first loads here. The
// first 0.11.3 load stamps sf_moved_at; a load 14 days or more after it removes them. Only
// once the playlists exist, so a browser that has not moved yet keeps its only copy.
export const OLD_KEYS = [K.boards, K.active, K.my, 'sf_sync', 'sf_sync_my'];   // with the 0.9 sync state of the old boards
export function purgeOld(now = Date.now(), s = ls()) {
  if (!s || !s.getItem(K.playlists) || !OLD_KEYS.some(k => s.getItem(k) != null)) return false;
  const at = +s.getItem('sf_moved_at');
  if (!at) { try { s.setItem('sf_moved_at', String(now)); } catch { /* storage blocked */ } return false; }
  if (now - at < 14 * 864e5) return false;
  for (const k of OLD_KEYS) s.removeItem(k);
  s.removeItem('sf_moved_at');   // nothing left to count for
  return true;
}
export function saveActiveOnly(active) { try { ls().setItem(K.active, String(active)); } catch { /* storage blocked */ } }

// --- 0.10.1: the library, the playlists, what this screen shows, and the settings ---
const loadList = (key, ok) => { let raw; try { raw = JSON.parse(ls().getItem(key)); } catch { return null; } if (!Array.isArray(raw)) return null; return raw.map(x => { try { return ok(x); } catch { return null; } }).filter(Boolean); };
export const loadLibrary = () => loadList(K.library, sanitizeBlueprint);
export const loadPlaylists = () => loadList(K.playlists, sanitizePlaylist);
export const loadSettings = () => loadList(K.settings, sanitizeSettings) || [];
export function saveLibrary(list) { try { ls().setItem(K.library, JSON.stringify(list)); } catch { /* storage full or blocked */ } }
export function savePlaylists(list) { try { ls().setItem(K.playlists, JSON.stringify(list)); } catch { /* storage full or blocked: the board still runs */ } }
export function saveSettings(list) { try { ls().setItem(K.settings, JSON.stringify(list)); } catch { /* storage blocked */ } }
// What this screen shows, by playlist id: each screen keeps its own, never synced.
export const loadShown = () => getFlag(K.shown) || '';
export function saveShown(id) { setFlag(K.shown, id || ''); }
export function getFlag(k) { try { return ls().getItem(k); } catch { return null; } }
export function setFlag(k, v) { try { ls().setItem(k, v); } catch { /* ignore */ } }

// --- board links: #b=<base64url(deflate-raw(JSON))> ---
function b64url(bytes) {
  let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64url(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}
async function pipe(bytes, stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

// Sanitized on the way out as well, so the link carries the same shape as a saved board
// (and the old-shape win stays in step with the windows).
export async function encodeBoard(board) {
  const json = new TextEncoder().encode(JSON.stringify(sanitizeBoard(board) || board));
  return b64url(await pipe(json, new CompressionStream('deflate-raw')));
}
// Returns a sanitized board, or null for anything damaged. A payload that inflates
// past 256 kB is refused rather than parsed.
export async function decodeBoard(s) {
  try {
    if (!s || s.length > 12000) return null;
    const raw = await pipe(unb64url(s), new DecompressionStream('deflate-raw'));
    if (raw.length > 262144) return null;
    return sanitizeBoard(JSON.parse(new TextDecoder().decode(raw)));
  } catch { return null; }
}
