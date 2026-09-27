// What the board says: layouts, zone maths and channel formatting. Everything here is
// a pure function of (page, grid size, time, language, live data), so it runs in Node
// tests as well as the browser. Live data is fetched elsewhere (live.js) and passed in.
//
// Ported from the design handoff (design/board-content.js); the mock SL and weather
// tables are replaced by the live cache, and the strings moved to strings.js.

import { textToCells } from './charset.js';

const DAYS = {
  en: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
  sv: ['SÖNDAG', 'MÅNDAG', 'TISDAG', 'ONSDAG', 'TORSDAG', 'FREDAG', 'LÖRDAG']
};
const MONTHS = {
  en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
  sv: ['JAN', 'FEB', 'MAR', 'APR', 'MAJ', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEC']
};
const WORDS = {
  en: { now: 'NOW', min: 'MIN', today: 'TODAY', days: 'DAYS', day: 'DAY', hours: 'HOURS', hour: 'HOUR', togo: 'TO GO', loading: 'LOADING', nodata: 'NO DATA YET', nodeps: 'NO DEPARTURES', pick: 'PICK A STATION', pickCity: 'PICK A CITY' },
  sv: { now: 'NU', min: 'MIN', today: 'IDAG', days: 'DAGAR', day: 'DAG', hours: 'TIMMAR', hour: 'TIMME', togo: 'KVAR', loading: 'LADDAR', nodata: 'INGEN DATA ÄN', nodeps: 'INGA AVGÅNGAR', pick: 'VÄLJ EN STATION', pickCity: 'VÄLJ EN STAD' }
};

// WMO weather codes, as Open-Meteo reports them, to a word that fits on a board.
export function weatherWord(code, lang) {
  const sv = lang === 'sv';
  if (code === 0) return sv ? 'KLART' : 'CLEAR';
  if (code === 1 || code === 2) return sv ? 'HALVKLART' : 'FAIR';
  if (code === 3) return sv ? 'MULET' : 'CLOUDY';
  if (code === 45 || code === 48) return sv ? 'DIMMA' : 'FOG';
  if (code >= 51 && code <= 57) return sv ? 'DUGG' : 'DRIZZLE';
  if (code >= 61 && code <= 67) return sv ? 'REGN' : 'RAIN';
  if (code >= 71 && code <= 77) return sv ? 'SNÖ' : 'SNOW';
  if (code >= 80 && code <= 82) return sv ? 'SKURAR' : 'SHOWERS';
  if (code === 85 || code === 86) return sv ? 'SNÖBYAR' : 'SNOW SHOWERS';
  if (code >= 95) return sv ? 'ÅSKA' : 'THUNDER';
  return '';
}

export const QUOTES = {
  en: [
    'WELL BEGUN IS HALF DONE',
    'SLOW IS SMOOTH AND SMOOTH IS FAST',
    'THE BEST TIME TO PLANT A TREE WAS TWENTY YEARS AGO. THE SECOND BEST TIME IS NOW.',
    'MEASURE TWICE CUT ONCE',
    'FORTUNE FAVOURS THE BOLD',
    'A JOURNEY OF A THOUSAND MILES BEGINS WITH A SINGLE STEP',
    'WHAT GETS MEASURED GETS MANAGED',
    'DONE IS BETTER THAN PERFECT'
  ],
  sv: [
    'BÄTTRE EN FÅGEL I HANDEN ÄN TIO I SKOGEN',
    'DEN SOM GAPAR EFTER MYCKET MISTER OFTA HELA STYCKET',
    'MAN SKA INTE SÄLJA SKINNET FÖRRÄN BJÖRNEN ÄR SKJUTEN',
    'ALLA VÄGAR BÄR TILL ROM',
    'DEN SOM SPAR HAN HAR',
    'LAGOM ÄR BÄST',
    'BORTA BRA MEN HEMMA BÄST',
    'MORGONSTUND HAR GULD I MUND'
  ]
};

export const CHANNELS = ['message', 'clock', 'countdown', 'sl', 'weather', 'quote'];
export const LAYOUTS = ['full', 'header', 'split', 'ticker'];

export function zonesFor(l, R, C) {
  if (l === 'header' && R > 1) return [{ r: 0, c: 0, h: 1, w: C }, { r: 1, c: 0, h: R - 1, w: C }];
  if (l === 'split' && C > 3) { const a = Math.floor((C - 1) / 2); return [{ r: 0, c: 0, h: R, w: a }, { r: 0, c: a + 1, h: R, w: C - a - 1 }]; }
  if (l === 'ticker' && R > 1) return [{ r: 0, c: 0, h: R - 1, w: C }, { r: R - 1, c: 0, h: 1, w: C }];
  return [{ r: 0, c: 0, h: R, w: C }];
}

export const blank = (R, C) => Array.from({ length: R }, () => Array(C).fill(' '));

// Place a string (already board characters) on one row of a zone.
function put(g, r, c0, w, s, align) {
  const a = textToCells(s).slice(0, w);
  const off = align === 'left' ? 0 : align === 'right' ? w - a.length : Math.floor((w - a.length) / 2);
  a.forEach((ch, i) => { if (g[r] && c0 + off + i < g[r].length && c0 + off + i >= 0) g[r][c0 + off + i] = ch; });
}

// Word wrap to a width, hard-cutting words longer than a line.
export function wrap(s, w) {
  const out = []; let cur = '';
  String(s || '').split(/\s+/).filter(Boolean).forEach(word => {
    while (word.length > w) { if (cur) { out.push(cur); cur = ''; } out.push(word.slice(0, w)); word = word.slice(w); }
    if (!word) return;
    if (!cur) cur = word; else if ((cur + ' ' + word).length <= w) cur += ' ' + word; else { out.push(cur); cur = word; }
  });
  if (cur) out.push(cur);
  return out;
}

function block(g, z, lines, align) {
  const L = lines.slice(0, z.h), top = z.r + Math.floor((z.h - L.length) / 2), inset = align === 'left' && z.w > 8 ? 1 : 0;
  L.forEach((l, i) => put(g, top + i, z.c + inset, z.w - inset * 2, l, align));
}

// A message zone's stored content to an h x w grid. Three shapes are accepted:
// cells (typed on the grid), lines (centred rows) and text (word wrapped).
export function toCells(o, h, w) {
  const out = blank(h, w);
  if (o.cells) {
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) out[r][c] = (o.cells[r] && o.cells[r][c]) || ' ';
  } else if (o.lines) {
    const L = o.lines.slice(0, h), top = Math.floor((h - L.length) / 2);
    L.forEach((l, i) => {
      // lines may carry chip keys (lowercase), so they are placed raw, not uppercased
      const a = [...l].slice(0, w), off = Math.floor((w - a.length) / 2);
      a.forEach((ch, j) => { out[top + i][off + j] = ch; });
    });
  } else if (o.text) {
    block(out, { r: 0, c: 0, h, w }, wrap(String(o.text).toUpperCase(), w), 'center');
  }
  return out;
}

function row(num, dest, right, W) {
  let left = num.padEnd(3) + dest;
  if (left.length + 1 + right.length > W) left = left.slice(0, Math.max(0, W - right.length - 1));
  return left.padEnd(W - right.length) + right;
}

// Wall-clock fields in Stockholm for an instant, whatever the viewer's timezone.
// SL timestamps carry no offset and are Stockholm local, so they are compared in the
// same frame (the SL map's depMinutes does the same).
const STHLM = typeof Intl !== 'undefined' ? new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
}) : null;
export function stockholmWall(now) {
  const g = {};
  for (const x of STHLM.formatToParts(new Date(now))) g[x.type] = x.value;
  return Date.UTC(+g.year, +g.month - 1, +g.day, (+g.hour) % 24, +g.minute, +g.second);
}
export function depMinutes(ts, now) {
  if (!ts) return null;
  const p = ts.split(/[-T:]/).map(Number);
  const target = Date.UTC(p[0], p[1] - 1, p[2], p[3], p[4], p[5] || 0);
  return Math.floor((target - stockholmWall(now)) / 60000);
}

export function channelLines(ch, o, z, now, lang, live) {
  const d = new Date(now), W = z.w > 8 ? z.w - 2 : z.w, w = WORDS[lang] || WORDS.en;
  if (ch === 'clock') {
    const hh = d.getHours(), mm = String(d.getMinutes()).padStart(2, '0');
    const time = o.fmt === '12' ? `${(hh % 12) || 12}:${mm} ${hh < 12 ? 'AM' : 'PM'}` : `${String(hh).padStart(2, '0')}:${mm}`;
    const day = DAYS[lang][d.getDay()], mon = MONTHS[lang][d.getMonth()];
    if (z.h === 1) {
      const left = `${day.slice(0, 3)} ${d.getDate()} ${mon}`;
      return { exact: left.slice(0, Math.max(0, W - time.length - 1)).padEnd(W - time.length) + time };
    }
    if (z.h < 4) return { lines: [day, time], align: 'center' };
    return { lines: [day, `${d.getDate()} ${mon}`, '', time], align: 'center' };
  }
  if (ch === 'countdown') {
    const target = new Date((o.date || '2027-06-25') + 'T00:00:00').getTime(), diff = target - now;
    const days = Math.ceil(diff / 864e5), hrs = Math.max(0, Math.ceil(diff / 36e5));
    const val = diff <= 0 ? w.today : days > 1 ? `${days} ${w.days}` : `${hrs} ${hrs === 1 ? w.hour : w.hours}`;
    return { lines: [(o.label || '').toUpperCase(), '', val, diff > 0 ? w.togo : ''], align: 'center' };
  }
  if (ch === 'sl') {
    if (!o.site) return { lines: ['SL', w.pick], align: 'center' };
    const name = (o.name || '').toUpperCase(), data = live && live.sl && live.sl[o.site];
    if (!data || !data.deps) return { lines: [name, '', data && data.err ? w.nodata : w.loading], align: 'center' };
    const modes = Array.isArray(o.modes) && o.modes.length ? o.modes : null;
    const deps = data.deps
      .filter(x => !modes || modes.includes(x.mode))
      .map(x => ({ ...x, m: depMinutes(x.expected || x.scheduled, now) }))
      .filter(x => x.m != null && x.m >= 0)
      .sort((a, b) => a.m - b.m);
    if (!deps.length) return { lines: [name, '', w.nodeps], align: 'center' };
    const eta = x => o.eta === 'clock' ? (x.expected || x.scheduled).slice(11, 16) : x.m === 0 ? w.now : `${x.m} ${w.min}`;
    return { lines: [name].concat(deps.slice(0, z.h - 1).map(x => row(x.line, x.dest.toUpperCase(), eta(x), W))), align: 'left' };
  }
  if (ch === 'weather') {
    if (o.lat == null) return { lines: [lang === 'sv' ? 'VÄDER' : 'WEATHER', w.pickCity], align: 'center' };
    const city = (o.city || '').toUpperCase(), data = live && live.wx && live.wx[wxKey(o)];
    if (!data || data.t == null) return { lines: [city, '', data && data.err ? w.nodata : w.loading], align: 'center' };
    const now1 = `${Math.round(data.t)}° ${weatherWord(data.code, lang)}`.trim();
    const days = (data.daily || []).slice(1, 4).map(f => `${DAYS[lang][new Date(f.date + 'T12:00:00').getDay()].slice(0, 3)} ${Math.round(f.max)}°`);
    if (W < 16) return { lines: [city, now1, ''].concat(days), align: 'center' };
    return { lines: [city, now1, '', days.join('  ')], align: 'center' };
  }
  if (ch === 'quote') {
    const list = QUOTES[lang] || QUOTES.en, q = list[Math.floor(now / 60000) % list.length];
    return { lines: wrap(q, W), align: 'center' };
  }
  return { lines: wrap(String(o.text || '').toUpperCase(), W), align: 'center' };
}

export const wxKey = o => `${(+o.lat).toFixed(2)},${(+o.lon).toFixed(2)}`;

export function compose(page, R, C, now, lang, live) {
  const g = blank(R, C); if (!page) return g;
  zonesFor(page.layout, R, C).forEach((z, i) => {
    const zd = page.zones[i] || { ch: 'message', o: {} }, o = zd.o || {}, ticker = page.layout === 'ticker' && i === 1;
    if (zd.ch === 'message' && !ticker) {
      const cells = toCells(o, z.h, z.w);
      for (let r = 0; r < z.h; r++) for (let c = 0; c < z.w; c++) g[z.r + r][z.c + c] = cells[r][c];
      return;
    }
    const res = channelLines(zd.ch, o, z, now, lang, live);
    if (res.exact != null) { put(g, z.r, z.c + (z.w > 8 ? 1 : 0), z.w > 8 ? z.w - 2 : z.w, res.exact, 'left'); return; }
    if (z.h === 1) {  // ticker rows page through word-wrapped segments; flaps cannot scroll smoothly
      const segs = wrap(res.lines.filter(Boolean).join('   '), z.w);
      put(g, z.r, z.c, z.w, segs[Math.floor(now / 3500) % Math.max(1, segs.length)] || '', 'center'); return;
    }
    block(g, z, res.lines, res.align);
  });
  return g;
}

// What the board shows when no page is allowed right now (every page has a time
// window and none is open): the clock, so a wall display is never stale.
export const FALLBACK_PAGE = { id: 'fallback', name: 'Clock', layout: 'full', dur: 60, win: null, zones: [{ ch: 'clock', o: { fmt: '24' } }] };

export function demoPages(lang) {
  const sv = lang === 'sv';
  return [
    { id: 'p1', name: sv ? 'Välkommen' : 'Welcome', layout: 'full', dur: 12, win: null, zones: [{ ch: 'message', o: { lines: ['', sv ? 'HEJ FRÅN' : 'HELLO FROM', sv ? 'EN LEDIG SKÄRM' : 'A SPARE MONITOR', '', 'roygbv', ''] } }] },
    { id: 'p2', name: sv ? 'Morgonpendling' : 'Morning commute', layout: 'header', dur: 14, win: null, zones: [{ ch: 'clock', o: { fmt: '24' } }, { ch: 'sl', o: { site: 9117, name: 'Odenplan', modes: ['METRO', 'TRAIN'], eta: 'min' } }] },
    { id: 'p3', name: sv ? 'Väder och nedräkning' : 'Weather and countdown', layout: 'split', dur: 12, win: null, zones: [{ ch: 'weather', o: { city: 'Stockholm', lat: 59.33, lon: 18.07 } }, { ch: 'countdown', o: { label: 'MIDSOMMAR', date: '2027-06-25' } }] },
    { id: 'p4', name: sv ? 'Dagens ord' : 'Quote of the hour', layout: 'ticker', dur: 14, win: null, zones: [{ ch: 'quote', o: {} }, { ch: 'message', o: { text: sv ? 'GRATIS, INGET KONTO. ALLT STANNAR I DIN WEBBLÄSARE.' : 'FREE, NO ACCOUNT. EVERYTHING STAYS IN YOUR BROWSER.' } }] },
    { id: 'p5', name: sv ? 'Klocka' : 'Clock', layout: 'full', dur: 10, win: null, zones: [{ ch: 'clock', o: { fmt: '24' } }] }
  ];
}

export function newId(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

export function defaultBoard(name, lang) {
  return {
    id: newId('b'), name: name || (lang === 'sv' ? 'Demotavla' : 'Demo board'),
    size: '6x22', rows: 6, cols: 22, theme: 'black', transition: 'classic', speed: 'fast', sound: false,
    quiet: { on: false, from: '23:00', to: '07:00', mode: 'dim' }, pages: demoPages(lang)
  };
}
