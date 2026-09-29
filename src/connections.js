// Your own sources (0.9): an Alpha Vantage key or a published sheet, for symbols that are
// not built in. They are kept in this browser only, under their own key in localStorage,
// and never in a board, a blueprint, a board link, an export or the account sync, since a
// key is a secret and a sheet is yours. Syncing them with the account is planned for 0.9.1.
//
// A sheet with a history block per symbol gives its closes directly (parseSheetHistory).
// Without one, this screen builds the line itself: it keeps every price it reads today,
// and the last one of each day, and the chart grows from them.

import { refresh, tried, exchangeOf, avDaily, EXCHANGES } from './markets.js';
import { feedUrl } from './feeds.js';

const CONN = 'sf_connections', HIST = 'sf_mk_hist', AVC = 'sf_av_cache';
const ls = () => { try { return window.localStorage; } catch { return null; } };
const read = (k, d) => { try { return JSON.parse((ls() && ls().getItem(k)) || 'null') || d; } catch { return d; } };
const write = (k, v) => { try { ls() && ls().setItem(k, JSON.stringify(v)); } catch { /* full or blocked: the chart just starts again */ } };

// Your connections, as a list in this browser (0.9.2). The 0.9 shape, one key and one
// sheet under sf_connections, becomes two entries the first time the list is read.
const LIST = 'sf_conns';
export function loadConns() {
  let list = read(LIST, null);
  if (!Array.isArray(list)) {
    const old = read(CONN, {}), now = Date.now(); list = [];
    if (typeof old.av === 'string' && old.av) list.push({ id: 'c' + now.toString(36) + 'a', kind: 'av', name: 'Alpha Vantage', value: old.av, updated: now });
    if (typeof old.sheet === 'string' && old.sheet) list.push({ id: 'c' + now.toString(36) + 's', kind: 'sheet', name: 'Sheet', value: old.sheet, updated: now });
    write(LIST, list);
    try { ls() && ls().removeItem(CONN); } catch { /* blocked */ }
  }
  return list.map(sanitizeConnection).filter(Boolean).slice(0, 50);
}
export const saveConns = list => write(LIST, list.map(sanitizeConnection).filter(Boolean));
// The value a tile uses: the connection it names, else the first of that kind.
export function connFor(list, kind, id) {
  const x = (id && list.find(c => c.id === id && c.kind === kind)) || list.find(c => c.kind === kind);
  return x ? x.value : '';
}
// The 0.9 calls, kept for the fetchers: the first key and the first sheet.
export function getConn() { const l = loadConns(); return { av: connFor(l, 'av'), sheet: connFor(l, 'sheet') }; }

// A published sheet's CSV: one row per symbol, found by its header names in any order
// (Symbol, Name, Price, Change %, Currency, Exchange). Numbers may use a decimal comma and
// spaces between thousands, as a Swedish sheet writes them.
export function csvRows(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}
export const num = s => {
  let t = String(s == null ? '' : s).replace(/[\s %]/g, '');
  // a comma with exactly three digits after it and no point is thousands (5,432 in an
  // English sheet); any other lone comma is the decimal mark (78,42 in a Swedish one)
  if (/^-?\d{1,3}(,\d{3})+$/.test(t)) t = t.replace(/,/g, '');
  else if (/,\d+$/.test(t) && !/\.\d+$/.test(t)) t = t.replace(/\./g, '').replace(',', '.'); else t = t.replace(/,/g, '');
  const n = parseFloat(t); return Number.isFinite(n) ? n : null;
};
export function parseSheet(text) {
  const rows = csvRows(String(text || '')); if (rows.length < 2) return {};
  const head = rows[0].map(h => h.trim().toLowerCase()), col = re => head.findIndex(h => re.test(h));
  const S = col(/^symbol|^ticker|^symbol/), N = col(/^name|^namn/), P = col(/^price|^pris/), C = col(/change|förändr|%/), K = col(/^currency|^valuta/), E = col(/^exchange|^börs/);
  if (S < 0 || P < 0) return {};
  const out = {};
  for (const r of rows.slice(1, 60)) {
    const s = String(r[S] || '').trim().toUpperCase().slice(0, 30), price = num(r[P]);
    if (!s || price == null) continue;
    out[s] = { name: N >= 0 ? String(r[N] || '').trim().slice(0, 40) : s, price, pct: C >= 0 ? num(r[C]) : null, cur: K >= 0 ? String(r[K] || '').trim().toUpperCase().slice(0, 4) : '', ex: E >= 0 ? String(r[E] || '').trim().toUpperCase().slice(0, 6) : '' };
  }
  return out;
}

// The line a sheet builds: today's prices as points, and the last price of each earlier
// day as its close. At most 300 points today and 400 days kept per symbol.
// the trading day in the exchange's own time zone, so Tokyo's day is not split at midnight UTC
const dayOf = (t, tz) => { try { return new Intl.DateTimeFormat('sv-SE', { timeZone: tz || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t)); } catch { return new Date(t).toISOString().slice(0, 10); } };
export function recordPoint(hist, sym, price, now, tz) {
  const today = dayOf(now, tz), h = hist[sym] || (hist[sym] = { days: {}, today: [], day: today });
  if (h.day !== today) { if (h.today.length) h.days[h.day] = h.today[h.today.length - 1].c; h.today = []; h.day = today; }
  const last = h.today[h.today.length - 1];
  if (!last || last.c !== price || now - Date.parse(last.d) > 30 * 60e3) h.today.push({ d: new Date(now).toISOString(), c: price });
  if (h.today.length > 300) h.today.splice(0, h.today.length - 300);
  const ks = Object.keys(h.days).sort(); for (const k of ks.slice(0, Math.max(0, ks.length - 400))) delete h.days[k];
  return hist;
}
export function historyOf(hist, sym) {
  const h = hist[sym]; if (!h) return [];
  return Object.keys(h.days).sort().filter(d => d !== h.day).map(d => ({ d, c: h.days[d] })).concat(h.today);
}
export const loadHist = () => read(HIST, {});
export const saveHist = h => write(HIST, h);

// Your own key's daily series, kept here so a reload does not spend the key's allowance.
export const loadAv = () => read(AVC, {});
export const saveAv = c => write(AVC, c);

// One turn of your own key (0.9.0 review): at most one call, for the first symbol the
// shared rule says is due, so a mistyped symbol is asked once per close and never holds
// up the others. A reply saying the key's limit is reached stops this key until the next
// UTC day. Returns the cache, updated. getJson(url) fetches; now is passed in for tests.
export async function ownKeyStep(cache, symbols, key, now, getJson) {
  const today = new Date(now).toISOString().slice(0, 10);
  if (!key || cache._limit === today) return cache;
  const s = symbols.find(x => refresh(cache[x] || null, exchangeOf(x), now).due);
  if (!s) return cache;
  let res;
  try { res = avDaily(await getJson(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(s)}&outputsize=compact&apikey=${encodeURIComponent(key)}`)); }
  catch { res = { error: 'failed' }; }
  if (res.error === 'limit') { cache._limit = today; return cache; }
  cache[s] = tried(cache[s] || null, res, exchangeOf(s), now);
  return cache;
}
export const exchangeTz = ex => (EXCHANGES[ex] || EXCHANGES.US).tz;

// History from a published sheet (0.9.1). A sheet can publish GOOGLEFINANCE's history
// after all (Matthew's test sheet, 30 September, gave 20 closes), so a sheet may carry a
// block per symbol: a row naming the symbol, and under it the Date and Close columns the
// function fills in. Dates come as the sheet's locale writes them: 01/09/2026 in the UK,
// 9/1/2026 in the US, 2026-09-01 in Sweden, each with a time after it.
const HEAD_DATE = /^(date|datum)$/i, HEAD_CLOSE = /^(close|stängning|stängningskurs)/i;
function parseDates(cells) {
  const parts = cells.map(s => /^(\d{4})-(\d{2})-(\d{2})/.exec(s) ? { iso: s.slice(0, 10) } : (m => m ? { a: +m[1], b: +m[2], y: +m[3] } : null)(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s)));
  const two = n => String(n).padStart(2, '0');
  const as = dmy => parts.map(p => !p ? null : p.iso ? p.iso : dmy ? `${p.y}-${two(p.b)}-${two(p.a)}` : `${p.y}-${two(p.a)}-${two(p.b)}`);
  if (parts.some(p => p && !p.iso && p.a > 12)) return as(true);
  if (parts.some(p => p && !p.iso && p.b > 12)) return as(false);
  // no day above 12 yet: the order that runs forward is the right one
  const d = as(true), inc = l => l.filter(Boolean).every((x, i, a) => !i || a[i - 1] < x);
  return inc(d) ? d : as(false);
}
export function parseSheetHistory(text) {
  const rows = csvRows(String(text || '')), out = {};
  for (let i = 1; i < rows.length; i++) {
    if (!HEAD_DATE.test((rows[i][0] || '').trim()) || !HEAD_CLOSE.test((rows[i][1] || '').trim())) continue;
    // the symbol is the nearest row above with text in its first cell that is not a number
    let sym = null;
    for (let k = i - 1; k >= Math.max(0, i - 3); k--) { const c = (rows[k][0] || '').trim(); if (c && num(c) == null) { sym = c.toUpperCase().slice(0, 30); break; } }
    if (!sym) continue;
    const block = [];
    for (let j = i + 1; j < rows.length && (rows[j][0] || '').trim(); j++) block.push(rows[j]);
    const dates = parseDates(block.map(r => (r[0] || '').trim()));
    out[sym] = block.map((r, j) => ({ d: dates[j], c: num(r[1]) })).filter(x => x.d && Number.isFinite(x.c)).slice(-400);
  }
  return out;
}

// ---------- Connections (0.9.2) ----------
// A connection is one source of your own: { id, kind, name, value, updated }. kind is av
// (an Alpha Vantage key), sheet (a published CSV link), feed (RSS or Atom, 0.9.3) or json.
// value is the key or the link: a secret, so it is sealed on the server and never goes
// into a board, a link, a blueprint or an export. Tiles name a connection by id.
export const CONN_KINDS = ['av', 'sheet', 'feed', 'json'];
const HTTPS = /^https:\/\/[^\s/?#]+\.[^\s/?#]+[^\s]{0,480}$/;
export function sanitizeConnection(x) {
  if (!x || typeof x !== 'object' || !CONN_KINDS.includes(x.kind)) return null;
  const id = typeof x.id === 'string' && /^c[A-Za-z0-9_-]{1,39}$/.test(x.id) ? x.id : null;
  const value = typeof x.value === 'string' ? x.value.trim() : '';
  const ok = x.kind === 'av' ? /^[A-Za-z0-9]{8,64}$/.test(value) : x.kind === 'feed' || x.kind === 'json' ? !!feedUrl(value) : HTTPS.test(value);
  if (!id || !ok) return null;
  return { id, kind: x.kind, name: (typeof x.name === 'string' ? x.name.trim() : '').slice(0, 60) || x.kind, value, updated: Number.isFinite(+x.updated) ? +x.updated : 0 };
}
