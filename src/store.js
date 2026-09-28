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

const K = { boards: 'sf_boards', active: 'sf_active' };
const SIZES = ['6x22', '3x15', 'fill', 'custom'];
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
const place = o => { const lat = num(o.lat, -90, 90), lon = num(o.lon, -180, 180); return lat != null && lon != null ? { lat, lon, city: str(o.city, 80) } : null; };
const CURRENCIES = ['EUR', 'USD', 'GBP', 'NOK', 'DKK', 'SEK', 'CHF', 'JPY', 'PLN'];

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
  } else if (ch === 'weather') {
    const pl = place(o); if (pl) Object.assign(out, pl);
    out.view = pick(o.view, ['now', 'hours', 'days'], 'now');
    if (o.units === 'f') out.units = 'f';
    if (o.wind === false) out.wind = false;
  } else if (ch === 'quote') { if (o.set === 'work') out.set = 'work'; }
  else if (ch === 'rotating') {
    out.messages = list(o.messages, 12, 120); out.interval = int(o.interval, 3, 120, 8);
    if (o.order === 'shuffle') out.order = 'shuffle';
  } else if (ch === 'menu') {
    out.title = str(o.title, 60); out.items = list(o.items, 16, 60); out.suffix = pick(o.suffix, ['', ' KR', ':-'], '');
  } else if (ch === 'letterclock') { if (o.dots === false) out.dots = false; }
  else if (ch === 'today') { if (o.week === false) out.week = false; if (o.sun === false) out.sun = false; if (o.days === false) out.days = false; if (o.doy) out.doy = true; }
  else if (ch === 'electricity') { out.area = AREAS[o.area] ? o.area : 'SE3'; out.view = o.view === 'chart' ? 'chart' : 'now'; if (o.vat === false) out.vat = false; }
  else if (ch === 'currency') {
    out.base = o.base === 'EUR' ? 'EUR' : 'SEK'; out.dec = int(o.dec, 0, 4, 2);
    const pairs = [...new Set((Array.isArray(o.pairs) ? o.pairs : []).filter(c => CURRENCIES.includes(c)))].slice(0, 6);
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

export function sanitizeBoard(b) {
  if (!b || typeof b !== 'object' || !Array.isArray(b.pages)) return null;
  const d = defaultBoard();
  const q = (b.quiet && typeof b.quiet === 'object') ? b.quiet : {};
  const pages = b.pages.slice(0, 50).map(p => {
    const layout = pick(p && p.layout, LAYOUTS, 'full'), need = layout === 'full' ? 1 : 2;
    const zones = (Array.isArray(p && p.zones) ? p.zones : []).slice(0, need).map(sanitizeZone);
    while (zones.length < need) zones.push({ ch: 'message', o: {} });
    const wins = sanitizeWins(p);
    return { id: str(p && p.id, 40) || newId('p'), name: str(p && p.name, 80), layout, dur: int(p && p.dur, 3, 3600, 10), wins, win: legacyWin(wins),
      ...(p.alone === true && wins.length ? { alone: true } : {}), ...(TRANSITIONS.includes(p.tr) ? { tr: p.tr } : {}), zones };
  });
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

export function loadBoards() {
  const s = ls(); let boards = [], active = 0;
  try { boards = (JSON.parse(s.getItem(K.boards)) || []).map(sanitizeBoard).filter(Boolean); active = +s.getItem(K.active) || 0; } catch { boards = []; }
  return { boards, active: boards[active] ? active : 0 };
}
export function saveBoards(boards, active) {
  const s = ls(); if (!s) return;
  try { s.setItem(K.boards, JSON.stringify(boards)); s.setItem(K.active, String(active)); } catch { /* storage full or blocked: the board still runs */ }
}
export function saveActiveOnly(active) { try { ls().setItem(K.active, String(active)); } catch { /* storage blocked */ } }
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
