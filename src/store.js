// Boards live in this browser's localStorage and nowhere else. A board link carries a
// whole board in the URL fragment (after #), which browsers never send to the server.
//
// Anything arriving from outside (a link, an imported file) goes through sanitizeBoard,
// which rebuilds the board field by field, so a hand-edited or hostile payload can only
// ever produce a valid board.

import { CHANNELS, LAYOUTS, defaultBoard, newId } from './content.js';
import { cellChar } from './charset.js';

const K = { boards: 'sf_boards', active: 'sf_active' };
const SIZES = ['6x22', '3x15', 'fill', 'custom'];
const THEMES = ['black', 'white', 'solari'];
const SPEEDS = ['fast', 'gentle', 'authentic'];
const TRANSITIONS = ['classic', 'wave', 'drift', 'curtain'];
const MODES = ['METRO', 'TRAIN', 'TRAM', 'BUS', 'SHIP'];

const pick = (v, list, dflt) => list.includes(v) ? v : dflt;
const str = (v, max, dflt = '') => typeof v === 'string' ? v.slice(0, max) : dflt;
const int = (v, lo, hi, dflt) => { const n = Math.round(+v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt; };
const time = (v, dflt) => /^\d{2}:\d{2}$/.test(v) ? v : dflt;
const num = (v, lo, hi) => { const n = +v; return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };

function sanitizeZone(z) {
  const ch = pick(z && z.ch, CHANNELS, 'message'), o = (z && typeof z.o === 'object' && z.o) || {}, out = {};
  if (ch === 'message') {
    if (Array.isArray(o.cells)) out.cells = o.cells.slice(0, 24).map(r => (Array.isArray(r) ? r : []).slice(0, 60).map(c => cellChar(typeof c === 'string' ? c : ' ')));
    else if (Array.isArray(o.lines)) out.lines = o.lines.slice(0, 24).map(l => str(l, 60));
    else if (typeof o.text === 'string') out.text = str(o.text, 500);
  } else if (ch === 'clock') out.fmt = o.fmt === '12' ? '12' : '24';
  else if (ch === 'countdown') { out.label = str(o.label, 60); out.date = /^\d{4}-\d{2}-\d{2}$/.test(o.date) ? o.date : '2027-06-25'; }
  else if (ch === 'sl') {
    const site = int(o.site, 1, 99999999, null);
    if (site) { out.site = site; out.name = str(o.name, 80); }
    if (Array.isArray(o.modes)) out.modes = o.modes.filter(m => MODES.includes(m));
    out.eta = o.eta === 'clock' ? 'clock' : 'min';
  } else if (ch === 'weather') {
    const lat = num(o.lat, -90, 90), lon = num(o.lon, -180, 180);
    if (lat != null && lon != null) { out.lat = lat; out.lon = lon; out.city = str(o.city, 80); }
  }
  return { ch, o: out };
}

function sanitizeWin(w) {
  if (!w || typeof w !== 'object') return null;
  const days = Array.isArray(w.days) ? [...new Set(w.days.map(d => int(d, 0, 6, -1)).filter(d => d >= 0))] : [];
  return { on: !!w.on, from: time(w.from, '07:00'), to: time(w.to, '09:00'), days };
}

export function sanitizeBoard(b) {
  if (!b || typeof b !== 'object' || !Array.isArray(b.pages)) return null;
  const d = defaultBoard();
  const q = (b.quiet && typeof b.quiet === 'object') ? b.quiet : {};
  const pages = b.pages.slice(0, 50).map(p => {
    const layout = pick(p && p.layout, LAYOUTS, 'full'), need = layout === 'full' ? 1 : 2;
    const zones = (Array.isArray(p && p.zones) ? p.zones : []).slice(0, need).map(sanitizeZone);
    while (zones.length < need) zones.push({ ch: 'message', o: {} });
    return { id: str(p && p.id, 40) || newId('p'), name: str(p && p.name, 80), layout, dur: int(p && p.dur, 3, 3600, 10), win: sanitizeWin(p && p.win), zones };
  });
  if (!pages.length) return null;
  return {
    id: str(b.id, 40) || newId('b'), name: str(b.name, 80) || d.name,
    size: pick(b.size, SIZES, '6x22'), rows: int(b.rows, 1, 24, 6), cols: int(b.cols, 4, 60, 22),
    theme: pick(b.theme, THEMES, 'black'), transition: pick(b.transition, TRANSITIONS, 'classic'), speed: pick(b.speed, SPEEDS, 'fast'),
    sound: !!b.sound,
    quiet: { on: !!q.on, from: time(q.from, '23:00'), to: time(q.to, '07:00'), mode: q.mode === 'blank' ? 'blank' : 'dim' },
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

export async function encodeBoard(board) {
  const json = new TextEncoder().encode(JSON.stringify(board));
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
