// Markets (0.9): a line chart drawn in half flaps, green where the price rises and red
// where it falls, with the ticker beside it: name, where it trades, the price, the day's
// change, and whether the market is open, in the Place's own time. Pure functions of the
// data, the zone and the time, so they run in the Node tests as well as the browser.
//
// Data for a symbol, as live.js keeps it in live.mk[source + ':' + symbol]:
//   { name, cur, price, prev, closes: [{ d: 'YYYY-MM-DD', c }], ex, via, at, fails }
// closes are oldest first; prev is the close before the latest one (the day's change).

import { HALF, textToCells } from './charset.js';

// ---------- where things trade, and when ----------
// Hours are the exchange's own local time. Lunch breaks for Tokyo and Hong Kong. Holidays
// are approximated with the exchange country's public holidays (live.hol), when known.
export const EXCHANGES = {
  US: { city: 'NEW YORK', tz: 'America/New_York', cc: 'US', hours: [['09:30', '16:00']] },
  LON: { city: 'LONDON', tz: 'Europe/London', cc: 'GB', hours: [['08:00', '16:30']] },
  STO: { city: 'STOCKHOLM', tz: 'Europe/Stockholm', cc: 'SE', hours: [['09:00', '17:30']] },
  FRK: { city: 'FRANKFURT', tz: 'Europe/Berlin', cc: 'DE', hours: [['09:00', '17:30']] },
  DEX: { city: 'FRANKFURT', tz: 'Europe/Berlin', cc: 'DE', hours: [['09:00', '17:30']] },
  PAR: { city: 'PARIS', tz: 'Europe/Paris', cc: 'FR', hours: [['09:00', '17:30']] },
  AMS: { city: 'AMSTERDAM', tz: 'Europe/Amsterdam', cc: 'NL', hours: [['09:00', '17:30']] },
  TYO: { city: 'TOKYO', tz: 'Asia/Tokyo', cc: 'JP', hours: [['09:00', '11:30'], ['12:30', '15:30']] },
  HKG: { city: 'HONG KONG', tz: 'Asia/Hong_Kong', cc: 'HK', hours: [['09:30', '12:00'], ['13:00', '16:00']] },
  CRYPTO: { city: 'CRYPTO', tz: 'UTC', cc: null, hours: null }
};
// Alpha Vantage writes the exchange as a suffix: ISF.LON, IVS.FRK; none is the US.
export function exchangeOf(symbol) {
  const m = /\.([A-Z]{3})$/.exec(String(symbol || ''));
  return m && EXCHANGES[m[1]] ? m[1] : 'US';
}

// Wall time in a zone to an instant: the offset at a first guess, then corrected once, so
// a time just after a clock change lands right.
const PARTS = new Map();
function wall(tz, t) {
  if (!PARTS.has(tz)) PARTS.set(tz, new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'short' }));
  const p = Object.fromEntries(PARTS.get(tz).formatToParts(new Date(t)).map(x => [x.type, x.value]));
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday) };
}
export function instantIn(tz, y, mo, d, h, mi) {
  const want = Date.UTC(y, mo - 1, d, h, mi);
  let t = want;
  for (let i = 0; i < 2; i++) { const w = wall(tz, t); t += want - Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi); }
  return t;
}
const iso = (y, mo, d) => `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

// Open or closed now, and when that changes: { open, until } or { open: false, next }.
// closedOn(isoDate) says whether the exchange's country has a public holiday that day.
export function marketState(ex, now, closedOn = () => false) {
  const E = EXCHANGES[ex] || EXCHANGES.US;
  if (!E.hours) return { open: true, always: true };
  const today = wall(E.tz, now);
  for (let k = 0; k < 10; k++) {
    const day = new Date(Date.UTC(today.y, today.mo - 1, today.d + k)), y = day.getUTCFullYear(), mo = day.getUTCMonth() + 1, d = day.getUTCDate(), dow = day.getUTCDay();
    if (dow === 0 || dow === 6 || closedOn(iso(y, mo, d))) continue;
    for (const [a, b] of E.hours) {
      const [ah, am] = a.split(':').map(Number), [bh, bm] = b.split(':').map(Number);
      const start = instantIn(E.tz, y, mo, d, ah, am), end = instantIn(E.tz, y, mo, d, bh, bm);
      if (now < start) return { open: false, next: start };
      if (now < end) return { open: true, until: end };
    }
  }
  return { open: false, next: null };
}

// ---------- the chart ----------
// A series to an h x w grid of cells. Each row of flaps is two heights (the top and the
// bottom half), so the line has 2h levels. Each column fills the levels between the one
// before and its own, so the line never breaks, in green going up, red going down, and
// the glyph colour when flat. A cell with both halves filled in one colour is a whole chip.
// thick draws whole flaps; ref marks the first price across the chart, faintly.
export function lineChart(series, h, w, { thick = false, ref = false } = {}) {
  const cells = Array.from({ length: h }, () => Array(w).fill(' '));
  const vals = (series || []).filter(Number.isFinite);
  if (!vals.length || h < 1 || w < 1) return cells;
  const n = Math.min(w, vals.length);
  const pts = n === 1 ? [vals[vals.length - 1]] : Array.from({ length: n }, (_, i) => vals[Math.round(i * (vals.length - 1) / (n - 1))]);
  const lo = Math.min(...pts), hi = Math.max(...pts), L = 2 * h;
  const lvl = v => hi === lo ? Math.floor((L - 1) / 2) : Math.round((v - lo) / (hi - lo) * (L - 1));
  const left = w - n;   // a short series sits at the right, where the latest price is
  const marks = Array.from({ length: h }, () => Array(w).fill(null));   // { top, bottom, colour }
  const put = (k, c, col) => {
    const r = h - 1 - Math.floor(k / 2), m = marks[r][c] || (marks[r][c] = { top: false, bottom: false, col });
    if (thick) { m.top = m.bottom = true; } else if (k % 2) m.top = true; else m.bottom = true;
    m.col = col;
  };
  let prev = lvl(pts[0]);
  pts.forEach((v, i) => {
    const b = lvl(v), col = b > prev ? 'g' : b < prev ? 'r' : 'f';
    if (i === 0 || b === prev) put(b, left + i, i === 0 ? 'f' : col);
    else if (b > prev) for (let k = prev + 1; k <= b; k++) put(k, left + i, col);
    else for (let k = b; k < prev; k++) put(k, left + i, col);
    prev = b;
  });
  const key = { g: ['g', HALF.gTop, HALF.gBottom], r: ['r', HALF.rTop, HALF.rBottom], f: ['f', HALF.fTop, HALF.fBottom] };
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    const m = marks[r][c]; if (!m) continue;
    const [whole, top, bottom] = key[m.col];
    cells[r][c] = m.top && m.bottom ? whole : m.top ? top : bottom;
  }
  if (ref && vals.length > 1) {
    const k = lvl(pts[0]), r = h - 1 - Math.floor(k / 2), faint = '~' + (k % 2 ? HALF.fTop : HALF.fBottom);
    for (let c = left; c < w; c++) if (cells[r][c] === ' ') cells[r][c] = faint;
  }
  return cells;
}

// ---------- the Markets zone ----------
const WORDS = {
  en: { open: 'OPEN', closed: 'CLOSED', to: 'TO', opens: 'OPENS', always: 'OPEN 24/7', sample: 'SAMPLE', loading: 'LOADING', nodata: 'NO DATA YET', pick: '-', via: 'VIA',
    periods: { '1d': '1 DAY', '1w': '1 WEEK', '1m': '1 MONTH', '3m': '3 MONTHS', '1y': '1 YEAR' }, days: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], needsKey: 'NEEDS YOUR KEY', close: 'CLOSE', later: ['UPDATES TOMORROW', 'TOMORROW'] },
  sv: { open: 'ÖPPET', closed: 'STÄNGT', to: 'TILL', opens: 'ÖPPNAR', always: 'ÖPPET JÄMT', sample: 'EXEMPEL', loading: 'LADDAR', nodata: 'INGEN DATA ÄN', pick: '-', via: 'VIA',
    periods: { '1d': '1 DAG', '1w': '1 VECKA', '1m': '1 MÅNAD', '3m': '3 MÅNADER', '1y': '1 ÅR' }, days: ['SÖN', 'MÅN', 'TIS', 'ONS', 'TOR', 'FRE', 'LÖR'], needsKey: 'BEHÖVER DIN NYCKEL', close: 'STÄNGNING', later: ['UPPDATERAS I MORGON', 'I MORGON'] }
};
export const PERIOD_DAYS = { '1d': 1, '1w': 7, '1m': 31, '3m': 92, '1y': 366 };
const two = n => String(n).padStart(2, '0');
// 1038.6 to 1 038.60: a space every three digits, the decimal mark in the page's language
export function price(v, dec, lang) {
  if (!Number.isFinite(v)) return '-';
  const d = dec != null ? dec : v >= 1000 ? 0 : v >= 10 ? 2 : 4;
  const [i, f] = Math.abs(v).toFixed(d).split('.');
  return (v < 0 ? '-' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (f ? (lang === 'sv' ? ',' : '.') + f : '');
}
// The closes a period covers, oldest first, ending with the latest.
export function inPeriod(closes, period, now) {
  const days = PERIOD_DAYS[period] || 31, from = new Date(now - days * 864e5).toISOString().slice(0, 10);
  return (closes || []).filter(x => x && x.d >= from && Number.isFinite(x.c));
}

// Which symbol a zone shows now: they take turns, each for o.every seconds.
export function currentSymbol(o, now) {
  const list = Array.isArray(o.symbols) ? o.symbols.filter(s => s && s.s) : [];
  if (!list.length) return null;
  return list[Math.floor(now / 1000 / Math.max(5, +o.every || 12)) % list.length];
}

// The whole zone: the chart on one side (two thirds), the ticker on the other. On a board
// narrower than 24 flaps the chart takes the top rows and the ticker the last two.
// ctx: { lang, tz (the Place's, for opening times), closedOn(ex, isoDate) }.
export function marketsCells(o, z, now, live, ctx = {}) {
  const lang = ctx.lang === 'sv' ? 'sv' : 'en', w = WORDS[lang], H = z.h, W = z.w;
  const cells = Array.from({ length: H }, () => Array(W).fill(' '));
  const sym = currentSymbol(o, now), src = o.source || 'built';
  const data = sym && live && live.mk && live.mk[`${src}:${sym.s}`];
  const period = o.period || '1m';
  const sample = !sym || !data || !data.closes || !data.closes.length;
  // what the panel says, line by line
  const ex = sym ? (src === 'crypto' ? 'CRYPTO' : (data && data.ex) || exchangeOf(sym.s)) : 'US';
  const name = String((sym && (sym.name || (data && data.name) || sym.s)) || '').toUpperCase();
  let series, lines;
  if (sample) {
    // a line shape only, named SAMPLE, and dashes for the price, so it is never read as real
    series = Array.from({ length: 40 }, (_, i) => 100 + Math.sin(i / 4) * 6 + i * 0.4);
    // LOADING only while it is on its way; a symbol with nothing yet, or waiting for tomorrow's allowance, says so
    const waiting = !sym ? w.pick : data && data.needsKey ? w.needsKey : data && (data.status === 'no_data' || (data.fails || 0) >= 4) ? w.nodata : data && data.status === 'budget' ? w.later : w.loading;
    lines = [w.sample, sym ? name : '', '-----', '', waiting, ''];
  } else {
    const closes = inPeriod(data.closes, period, now), last = Number.isFinite(data.price) ? data.price : closes.length ? closes[closes.length - 1].c : null;
    series = closes.map(x => x.c); if (Number.isFinite(data.price) && closes.length && data.price !== closes[closes.length - 1].c) series.push(data.price);
    const prev = Number.isFinite(data.prev) ? data.prev : closes.length > 1 ? closes[closes.length - 2].c : null;
    const ch = Number.isFinite(last) && Number.isFinite(prev) && prev ? (last - prev) / prev * 100 : null;
    const st = marketState(ex, now, d => (ctx.closedOn ? ctx.closedOn(ex, d) : false));
    const at = t => { if (!t) return ''; const a = wall(ctx.tz || EXCHANGES[ex].tz, t), b = wall(ctx.tz || EXCHANGES[ex].tz, now); return (a.d !== b.d ? w.days[a.dow] + ' ' : '') + `${two(a.h)}:${two(a.mi)}`; };
    const place = data.via ? `${w.via} ${EXCHANGES[data.via] ? EXCHANGES[data.via].city : data.via}` : EXCHANGES[ex].city;
    lines = [name, place, price(last, o.dec, lang) + (data.cur ? ' ' + data.cur : ''),
      ch == null ? '' : [ch >= 0 ? 'g' : 'r', ' ', ...textToCells(`${ch >= 0 ? '+' : ''}${ch.toFixed(2).replace('.', lang === 'sv' ? ',' : '.')}%`)],
      // two lines, so the Swedish fits a 14-flap panel: OPEN / TO 16:30, CLOSED / OPENS MON 08:00
      st.always ? w.always : st.open ? w.open : w.closed,
      st.always ? '' : st.open ? `${w.to} ${at(st.until)}` : st.next ? [`${w.opens} ${at(st.next)}`, at(st.next)] : '',
      w.periods[period] || ''];
    // built in and your own key give the day's close, not a live price: say so, and which day
    if (data.closeOnly && closes.length) { const d = new Date(closes[closes.length - 1].d.slice(0, 10) + 'T12:00:00Z'); lines[4] = w.close; lines[5] = `${w.days[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`; }
  }
  // lay out the chart and the panel
  const narrow = W < 24 || o.panel === false;
  const pw = narrow ? 0 : Math.max(11, Math.min(16, Math.round(W * 0.34))), cw = narrow ? W : W - pw - 1;
  const ch = narrow && o.panel !== false ? Math.max(1, H - 2) : H;
  const chart = lineChart(series, ch, cw, { thick: o.line === 'thick', ref: o.ref === true });
  const c0 = o.side === 'right' && !narrow ? pw + 1 : 0;
  for (let r = 0; r < ch; r++) for (let c = 0; c < cw; c++) cells[r][c0 + c] = chart[r][c];
  const text = l => (Array.isArray(l) ? l : textToCells(l));
  if (!narrow) {
    // a line given as two strings is the long form and the short one, for a narrow panel
    const fit = l => Array.isArray(l) && l.length === 2 && typeof l[0] === 'string' ? (l[0].length <= pw ? l[0] : l[1]) : l;
    const p0 = o.side === 'right' ? 0 : cw + 1, shown = lines.map(fit).slice(0, H), top = Math.max(0, Math.floor((H - shown.length) / 2));
    shown.forEach((l, i) => text(l).slice(0, pw).forEach((x, j) => { cells[top + i][p0 + j] = x; }));
  } else if (o.panel !== false) {
    const row1 = text(lines[0]).slice(0, W), row2 = (Array.isArray(lines[3]) && lines[3].length ? text(lines[2]).concat([' '], lines[3]) : text(lines[2])).slice(0, W);
    [row1, row2].forEach((l, i) => l.forEach((x, j) => { if (H - 2 + i >= 0) cells[H - 2 + i][j] = x; }));
  }
  return cells;
}

// When the exchange last closed, at or before now: the daily series is worth asking for
// again only after that (and the Worker's object and the panel read the same table).
export function lastClose(ex, now) {
  const E = EXCHANGES[ex] || EXCHANGES.US;
  if (!E.hours) return now;
  const today = wall(E.tz, now);
  for (let k = 0; k < 10; k++) {
    const day = new Date(Date.UTC(today.y, today.mo - 1, today.d - k)), dow = day.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    const [bh, bm] = E.hours[E.hours.length - 1][1].split(':').map(Number);
    const end = instantIn(E.tz, day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), bh, bm);
    if (end <= now) return end;
  }
  return null;
}

// Alpha Vantage's TIME_SERIES_DAILY to closes, oldest first, or null with the reason: a
// reply that is a note about the key's limit is not data. Shared by the Worker and the app.
export function avDaily(j) {
  if (!j || typeof j !== 'object') return { error: 'bad_reply' };
  const t = j['Time Series (Daily)'];
  if (!t) return { error: /rate limit|requests per day|premium|spreading out/i.test(JSON.stringify(j)) ? 'limit' : 'no_data' };
  const closes = Object.keys(t).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().slice(-400)
    .map(d => ({ d, c: +t[d]['4. close'] })).filter(x => Number.isFinite(x.c));
  return closes.length ? { closes } : { error: 'no_data' };
}

// ---------- when to ask for a symbol again (0.9.0 review) ----------
// One rule for the Worker's object and for your own key, since both spend a key's small
// daily allowance. The reference is the last close that has had time to settle. A copy is
// fresh when its latest bar is from that trading day. Otherwise it is asked once after the
// close, and again at most twice, two hours apart, in case the day's bar was not posted
// yet. A symbol that answered nothing waits for the next close.
export const SETTLE = 30 * 60e3, RETRY = 2 * 36e5, MAX_TRIES = 3;
const dayIn = (tz, t) => { const w = wall(tz, t); return iso(w.y, w.mo, w.d); };
export function nextClose(ex, now) {
  const E = EXCHANGES[ex] || EXCHANGES.US;
  if (!E.hours) return now;
  const today = wall(E.tz, now);
  for (let k = 0; k < 10; k++) {
    const day = new Date(Date.UTC(today.y, today.mo - 1, today.d + k)), dow = day.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    const [bh, bm] = E.hours[E.hours.length - 1][1].split(':').map(Number);
    const end = instantIn(E.tz, day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), bh, bm);
    if (end > now) return end;
  }
  return now + 864e5;
}
// { due } now, or { due: false, next } with when it is worth asking again.
export function refresh(rec, ex, now) {
  const E = EXCHANGES[ex] || EXCHANGES.US, lc = lastClose(ex, now - SETTLE), later = nextClose(ex, now - SETTLE) + SETTLE;
  if (!rec) return { due: true };
  const closes = rec.closes || [], last = closes.length ? closes[closes.length - 1].d.slice(0, 10) : null;
  if (lc && last && last >= dayIn(E.tz, lc)) return { due: false, next: later };
  const same = rec.lc === lc, tries = same ? rec.tries || 0 : 0;
  if (!same) return { due: true };
  if (rec.error === 'no_data') return { due: false, next: later };
  if (tries < MAX_TRIES && now - (rec.tried || 0) >= RETRY) return { due: true };
  return { due: false, next: tries < MAX_TRIES ? (rec.tried || 0) + RETRY : later };
}
// A try recorded on a copy: what came back, when, for which close, and how many tries.
export function tried(rec, res, ex, now) {
  const lc = lastClose(ex, now - SETTLE), same = rec && rec.lc === lc;
  const base = { lc, tries: (same ? rec.tries || 0 : 0) + 1, tried: now };
  return res.closes ? Object.assign(base, { closes: res.closes, at: now }) : Object.assign({}, rec && rec.closes ? { closes: rec.closes, at: rec.at } : {}, base, { error: res.error });
}
