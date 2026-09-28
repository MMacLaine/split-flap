// What the board says: layouts, zone maths and channel formatting. Everything here is
// a pure function of (page, grid size, time, language, live data), so it runs in Node
// tests as well as the browser. Live data is fetched elsewhere (live.js) and passed in.
//
// Ported from the design handoff (design/board-content.js); the mock SL and weather
// tables are replaced by the live cache, and the strings moved to strings.js.

import { textToCells, isChip } from './charset.js';
import { drawPixels, pixelPages, pixelWidth, drawPattern } from './pixels.js';
import { isoWeek, dayOfYear, swedishDay, sunTimes } from './almanac.js';

const DAYS = {
  en: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
  sv: ['SÖNDAG', 'MÅNDAG', 'TISDAG', 'ONSDAG', 'TORSDAG', 'FREDAG', 'LÖRDAG']
};
const MONTHS = {
  en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
  sv: ['JAN', 'FEB', 'MAR', 'APR', 'MAJ', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEC']
};
const WORDS = {
  en: { now: 'NOW', min: 'MIN', today: 'TODAY', days: 'DAYS', day: 'DAY', hours: 'HOURS', hour: 'HOUR', togo: 'TO GO', loading: 'LOADING', nodata: 'NO DATA YET', nodeps: 'NO DEPARTURES', pick: 'PICK A STATION', pickCity: 'PICK A CITY', nohome: 'NO HOME STATION', feels: 'FEELS', wind: 'WIND', rain: 'RAIN', sun: 'SUN', weather: 'WEATHER', dry: 'DRY',
    week: 'WEEK', midnightSun: 'MIDNIGHT SUN', polarNight: 'POLAR NIGHT', power: 'POWER', ore: 'ÖRE', kwh: 'ÖRE/KWH', noUrl: 'ADD A WEB ADDRESS', empty: 'NOTHING IN THE FEED', noMessages: 'ADD A MESSAGE', otd: 'ON THIS DAY' },
  sv: { now: 'NU', min: 'MIN', today: 'IDAG', days: 'DAGAR', day: 'DAG', hours: 'TIMMAR', hour: 'TIMME', togo: 'KVAR', loading: 'LADDAR', nodata: 'INGEN DATA ÄN', nodeps: 'INGA AVGÅNGAR', pick: 'VÄLJ EN STATION', pickCity: 'VÄLJ EN STAD', nohome: 'INGEN HEMSTATION', feels: 'KÄNNS', wind: 'VIND', rain: 'REGN', sun: 'SOL', weather: 'VÄDER', dry: 'TORRT',
    week: 'VECKA', midnightSun: 'MIDNATTSSOL', polarNight: 'POLARNATT', power: 'EL', ore: 'ÖRE', kwh: 'ÖRE/KWH', noUrl: 'LÄGG TILL EN WEBBADRESS', empty: 'INGET I FLÖDET', noMessages: 'LÄGG TILL ETT MEDDELANDE', otd: 'DEN HÄR DAGEN' }
};

// Hours in words for the word clock, twelve first so hour % 12 indexes it.
const HOUR_WORDS = {
  en: ['TWELVE', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN'],
  sv: ['TOLV', 'ETT', 'TVÅ', 'TRE', 'FYRA', 'FEM', 'SEX', 'SJU', 'ÅTTA', 'NIO', 'TIO', 'ELVA']
};
// The time in words, to the nearest five minutes. Swedish counts the half hour towards
// the next hour (halv elva is 10:30) and the minutes around it (fem i halv elva, 10:25).
// floor: round down to the five minutes (the letter clock, whose corner dots count the
// minutes in between) instead of to the nearest five (the word clock).
export function timeInWords(d, lang, floor) {
  let m = (floor ? Math.floor : Math.round)(d.getMinutes() / 5) * 5, hr = d.getHours();
  if (m === 60) { m = 0; hr++; }
  const W = HOUR_WORDS[lang] || HOUR_WORDS.en, H = k => W[(hr + k) % 12];
  if (lang === 'sv') return 'KLOCKAN ÄR ' + ({ 0: H(0), 5: 'FEM ÖVER ' + H(0), 10: 'TIO ÖVER ' + H(0), 15: 'KVART ÖVER ' + H(0), 20: 'TJUGO ÖVER ' + H(0),
    25: 'FEM I HALV ' + H(1), 30: 'HALV ' + H(1), 35: 'FEM ÖVER HALV ' + H(1), 40: 'TJUGO I ' + H(1), 45: 'KVART I ' + H(1), 50: 'TIO I ' + H(1), 55: 'FEM I ' + H(1) })[m];
  return 'IT IS ' + ({ 0: H(0) + " O'CLOCK", 5: 'FIVE PAST ' + H(0), 10: 'TEN PAST ' + H(0), 15: 'QUARTER PAST ' + H(0), 20: 'TWENTY PAST ' + H(0),
    25: 'TWENTY FIVE PAST ' + H(0), 30: 'HALF PAST ' + H(0), 35: 'TWENTY FIVE TO ' + H(1), 40: 'TWENTY TO ' + H(1), 45: 'QUARTER TO ' + H(1), 50: 'TEN TO ' + H(1), 55: 'FIVE TO ' + H(1) })[m];
}

// The letter clock: a fixed grid of letters where the words for the time are lit and
// the rest are faint. The grids are this board's own, one per board language; hourAt is where the hour words start, so the minute TEN is never read as
// the hour. Letters that are not part of any phrase are filler. 9 rows of 13 flaps draw
// close to square, since a flap is taller than it is wide.
export const LETTER_GRIDS = {
  en: { hourAt: [3, 0], rows: ['ITRISXQUARTER', 'TWENTYHALFTEN', 'FIVEZPASTKTOW', 'ONETWOTHREEXU', 'FOURFIVESIXLY', 'SEVENEIGHTRAY', 'NINETENELEVEN', 'TWELVEZSPLITQ', 'FLAPSUNOCLOCK'] },
  sv: { hourAt: [4, 0], rows: ['KLOCKANVÄRSNU', 'PRECISTIOFEMA', 'KVARTTJUGOLNÄ', 'ÖVERSIKHALVBÖ', 'ETTTVÅTREFYRA', 'FEMSEXSJUÅTTA', 'NIOTIOELVADUG', 'TOLVFÄLLBLADS', 'TAVLAQXÖNMGRY'] }
};
// The words to light for a time, in reading order, and which of them is the hour.
export function letterWords(d, lang) {
  const sv = lang === 'sv', words = timeInWords(d, sv ? 'sv' : 'en', true).replace("O'CLOCK", 'OCLOCK').split(' ');
  if (sv && d.getMinutes() < 5) words.splice(2, 0, 'PRECIS');   // KLOCKAN ÄR PRECIS TIO
  return { words, hour: words[words.length - 1] === 'OCLOCK' ? words.length - 2 : words.length - 1 };
}
// Finds each word in the grid, left to right and top to bottom, each after the last; the
// hour word is looked for from hourAt on. Returns the lit cells as row * width + column, or
// null if a word is missing (the tests check every five minutes in both grids).
export function letterCells(grid, words, hour) {
  const lit = new Set(), gw = grid.rows[0].length; let r = 0, c = 0;
  for (let i = 0; i < words.length; i++) {
    if (i === hour && (r < grid.hourAt[0] || (r === grid.hourAt[0] && c < grid.hourAt[1]))) [r, c] = grid.hourAt;
    let at = -1;
    while (r < grid.rows.length && (at = grid.rows[r].indexOf(words[i], c)) < 0) { r++; c = 0; }
    if (at < 0) return null;
    for (let k = 0; k < words[i].length; k++) lit.add(r * gw + at + k);
    c = at + words[i].length;
  }
  return lit;
}
// Faint cells are written '~' + the character; the renderer draws them dim.
function letterClock(o, z, d, lang) {
  const G = LETTER_GRIDS[lang === 'sv' ? 'sv' : 'en'], gh = G.rows.length, gw = G.rows[0].length, W = z.w > 8 ? z.w - 2 : z.w;
  if (z.h < gh || z.w < gw) return { lines: wrap(timeInWords(d, lang), W), align: 'center' };   // too small for the grid
  const { words, hour } = letterWords(d, lang), lit = letterCells(G, words, hour) || new Set();
  const cells = blank(z.h, z.w), top = Math.floor((z.h - gh) / 2), left = Math.floor((z.w - gw) / 2);
  G.rows.forEach((row, r) => [...row].forEach((ch, c) => { cells[top + r][left + c] = lit.has(r * gw + c) ? ch : '~' + ch; }));
  // the minutes past the five, as dots in the corners around the grid, clockwise from top left
  if (o.dots !== false && top >= 1 && left >= 1 && top + gh < z.h && left + gw < z.w) {
    const n = d.getMinutes() % 5;
    [[top - 1, left - 1], [top - 1, left + gw], [top + gh, left + gw], [top + gh, left - 1]].forEach(([r, c], k) => { cells[r][c] = k < n ? 'f' : '~f'; });
  }
  return { cells };
}

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

// A colour chip that reads as the weather at a glance: sun yellow, part sun orange,
// cloud in the theme's glyph colour (a white chip would vanish on the white board),
// snow white, rain blue, thunder violet.
export function weatherChip(code) {
  if (code == null) return ' ';
  if (code <= 1) return 'y';
  if (code === 2) return 'o';
  if (code === 3 || code === 45 || code === 48) return 'f';
  if (code >= 71 && code <= 77 || code === 85 || code === 86) return 'w';
  if (code >= 95) return 'v';
  return 'b';
}

export const QUOTES = {
  proverbs: {
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
  },
  work: {
    en: ['MEASURE TWICE CUT ONCE', 'SLOW IS SMOOTH AND SMOOTH IS FAST', 'MANY HANDS MAKE LIGHT WORK', 'DONE IS BETTER THAN PERFECT', 'WHAT GETS MEASURED GETS MANAGED', 'WELL BEGUN IS HALF DONE'],
    sv: ['ÖVNING GÖR MÄSTARE', 'SKYNDA LÅNGSAMT', 'MÅNGA BÄCKAR SMÅ GÖR EN STOR Å', 'ÄRLIGHET VARAR LÄNGST', 'LITEN TUVA STJÄLPER OFTA STORT LASS', 'DEN SOM GAPAR EFTER MYCKET MISTER OFTA HELA STYCKET']
  }
};

export const CHANNELS = ['message', 'clock', 'bigclock', 'bigtext', 'countdown', 'sl', 'weather', 'art', 'quote',
  'rotating', 'menu', 'wordclock', 'today', 'electricity', 'currency', 'onthisday', 'url', 'letterclock'];
// Channels that paint cells directly (pixel font, patterns) instead of printing lines.
const DRAWN = new Set(['bigclock', 'bigtext', 'art']);
export const LAYOUTS = ['full', 'header', 'split', 'ticker', 'stacked'];

export function zonesFor(l, R, C) {
  if (l === 'stacked' && R > 1) { const a = Math.floor(R / 2); return [{ r: 0, c: 0, h: a, w: C }, { r: a, c: 0, h: R - a, w: C }]; }
  if (l === 'header' && R > 1) return [{ r: 0, c: 0, h: 1, w: C }, { r: 1, c: 0, h: R - 1, w: C }];
  if (l === 'split' && C > 3) { const a = Math.floor((C - 1) / 2); return [{ r: 0, c: 0, h: R, w: a }, { r: 0, c: a + 1, h: R, w: C - a - 1 }]; }
  if (l === 'ticker' && R > 1) return [{ r: 0, c: 0, h: R - 1, w: C }, { r: R - 1, c: 0, h: 1, w: C }];
  return [{ r: 0, c: 0, h: R, w: C }];
}

export const blank = (R, C) => Array.from({ length: R }, () => Array(C).fill(' '));

// Place a string (already board characters) on one row of a zone.
// A line may also be an array of cells (so channels can place colour chips).
function put(g, r, c0, w, s, align) {
  const a = (Array.isArray(s) ? s : textToCells(s)).slice(0, w);
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

// Left text and right text on one line of width W, with at least one space between.
// When the left has to be cut it loses whole words, as long as that keeps at least half
// the room; a long single word is cut at the letter.
export function lr(left, right, W) {
  left = String(left); right = String(right);
  const room = Math.max(0, W - right.length - 1);
  if (left.length > room) {
    const sp = left.lastIndexOf(' ', room);
    left = sp >= Math.ceil(room / 2) ? left.slice(0, sp).trimEnd() : left.slice(0, room);
  }
  return left.padEnd(Math.max(0, W - right.length)) + right;
}
const row = (num, dest, right, W) => lr(num.padEnd(3) + dest, right, W);

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

const hm = (t, fmt) => {   // epoch ms to local HH:MM, or h:MM AM in 12 h
  const d = new Date(t), hh = d.getHours(), mm = two(d.getMinutes());
  return fmt === '12' ? `${(hh % 12) || 12}:${mm} ${hh < 12 ? 'AM' : 'PM'}` : `${two(hh)}:${mm}`;
};
// A stable shuffle of 0..n-1 for one pass through a list, so a shuffled rotation
// still shows every message once before any repeats.
function order(n, pass) {
  const a = Array.from({ length: n }, (_, i) => i); let x = (pass * 2654435761 + 1) >>> 0;
  for (let i = n - 1; i > 0; i--) { x = (x * 1103515245 + 12345) >>> 0; const j = x % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function channelLines(ch, o, z, now, lang, live) {
  const d = new Date(now), W = z.w > 8 ? z.w - 2 : z.w, w = WORDS[lang] || WORDS.en;
  if (ch === 'clock') {
    const time = hm(now, o.fmt), day = DAYS[lang][d.getDay()], mon = MONTHS[lang][d.getMonth()];
    const showDate = o.date !== false, date = `${d.getDate()} ${mon}`;
    if (z.h === 1) {
      const left = showDate ? `${day.slice(0, 3)} ${date}` : o.week ? `${w.week} ${isoWeek(d)}` : day;
      return { exact: lr(left, time, W) };
    }
    if (z.h < 4) return { lines: [showDate && W >= day.length + date.length + 1 ? `${day} ${date}` : day, time], align: 'center' };
    const lines = [day];
    if (showDate) lines.push(date);
    if (o.week) lines.push(`${w.week} ${isoWeek(d)}`);
    lines.push('', time);
    return { lines: lines.slice(-z.h), align: 'center' };
  }
  if (ch === 'countdown') {
    const target = new Date((o.date || '2027-06-25') + 'T00:00:00').getTime(), label = (o.label || '').toUpperCase();
    // Count up ("days since") once the date has passed; before it, it counts down as usual.
    if (o.dir === 'up' && now >= target) {
      const days = Math.floor((now - target) / 864e5), val = days === 0 ? w.today : `${days} ${days === 1 ? w.day : w.days}`;
      if (z.h === 1) return { exact: lr(label, val, W) };
      return { lines: z.h >= 4 ? [label, '', val] : [label, val], align: 'center' };
    }
    const diff = target - now, days = Math.ceil(diff / 864e5), hrs = Math.max(0, Math.ceil(diff / 36e5));
    const val = diff <= 0 ? w.today : days > 1 || o.unit === 'days' ? `${days} ${days === 1 ? w.day : w.days}` : `${hrs} ${hrs === 1 ? w.hour : w.hours}`;
    if (z.h === 1) return { exact: lr(label, val, W) };
    return { lines: z.h >= 4 ? [label, '', val, diff > 0 ? w.togo : ''] : [label, val], align: 'center' };
  }
  if (ch === 'wordclock') return { lines: wrap(timeInWords(d, lang), W), align: 'center' };
  if (ch === 'letterclock') return letterClock(o, z, d, lang);
  if (ch === 'today') return todayLines(o, z, d, W, lang, w, live);
  if (ch === 'sl') return slLines(o, z, now, W, w, live);
  if (ch === 'weather') {
    const place = wxPlace(o, live);
    if (!place) return { lines: [w.weather, w.pickCity], align: 'center' };
    const city = (place.city || '').toUpperCase(), data = live && live.wx && live.wx[wxKey(place)];
    if (!data || data.t == null) return { lines: [city, '', data && (data.fails || 0) >= 4 ? w.nodata : w.loading], align: 'center' };
    return weatherLines(o, city, data, z, W, lang, w);
  }
  if (ch === 'quote') {
    const set = QUOTES[o.set] || QUOTES.proverbs, list = set[lang] || set.en, q = list[Math.floor(now / 60000) % list.length];
    return { lines: wrap(q, W), align: 'center' };
  }
  if (ch === 'rotating') {
    const msgs = (o.messages || []).map(m => String(m || '').trim()).filter(Boolean);
    if (!msgs.length) return { lines: [w.noMessages], align: 'center' };
    const slot = Math.floor(now / 1000 / Math.max(3, +o.interval || 8)), n = msgs.length;
    const i = o.order === 'shuffle' ? order(n, Math.floor(slot / n))[slot % n] : slot % n;
    return { lines: wrap(msgs[i].toUpperCase(), W), align: 'center' };
  }
  if (ch === 'menu') {
    const sfx = o.suffix || '', rows = (o.items || []).map(x => String(x || '').trim().toUpperCase()).filter(Boolean).map(x => {
      const m = /^(.*?)\s+(\d+(?:[.,]\d+)?)$/.exec(x);   // a price at the end lines up on the right
      return m ? lr(m[1], m[2] + sfx, W) : x;
    });
    const title = String(o.title || '').toUpperCase();
    return { lines: (title && z.h > rows.length ? [title] : []).concat(rows), align: 'left' };
  }
  if (ch === 'electricity') return powerLines(o, z, now, W, w, live);
  if (ch === 'currency') {
    const base = o.base === 'EUR' ? 'EUR' : 'SEK', data = live && live.fx && live.fx[base];
    const pairs = (Array.isArray(o.pairs) && o.pairs.length ? o.pairs : ['EUR', 'USD', 'GBP']).filter(p => p !== base);
    if (!data || !data.rates) return { lines: [base, '', data && (data.fails || 0) >= 4 ? w.nodata : w.loading], align: 'center' };
    const dec = o.dec == null ? 2 : +o.dec;
    const val = p => { const r = data.rates[p]; if (!r) return '-'; const v = (1 / r).toFixed(dec); return lang === 'sv' ? v.replace('.', ',') : v; };
    if (z.h === 1) return { lines: [pairs.map(p => `${p} ${val(p)}`).join('  ')], align: 'center' };
    return { lines: pairs.map(p => lr(W >= 14 ? `1 ${p}` : p, W >= 14 ? `${val(p)} ${base}` : val(p), W)), align: 'left' };
  }
  if (ch === 'onthisday') {
    const data = live && live.otd && live.otd[lang === 'sv' ? 'sv' : 'en'], md = `${two(d.getMonth() + 1)}-${two(d.getDate())}`;
    if (!data || data.md !== md || !data.items || !data.items.length) return { lines: [w.otd, '', data && (data.fails || 0) >= 4 ? w.nodata : w.loading], align: 'center' };
    // Prefer events short enough to fit the zone whole; rotate among them every minute.
    const rows = Math.max(1, z.h - 1), fits = data.items.filter(x => wrap(x.text.toUpperCase(), W).length <= rows);
    const pool = fits.length ? fits : data.items.slice().sort((a, b) => a.text.length - b.text.length).slice(0, 3);
    const it = pool[Math.floor(now / 60000) % pool.length];
    if (z.h === 1) return { lines: [`${it.year} ${it.text.toUpperCase()}`], align: 'center' };
    return { lines: [String(it.year)].concat(wrap(it.text.toUpperCase(), W).slice(0, rows)), align: 'center' };
  }
  if (ch === 'url') {
    if (!o.url) return { lines: [w.noUrl], align: 'center' };
    const data = live && live.url && live.url[o.url];
    if (!data || !data.items) return { lines: ['', data && (data.fails || 0) >= 4 ? w.nodata : w.loading], align: 'center' };
    const lines = (o.header ? [String(o.header).toUpperCase()] : []).concat(data.items.slice(0, o.max || 4).map(it => applyTemplate(o.tpl, it)));
    return { lines: lines.length ? lines : [w.empty], align: 'left' };
  }
  return { lines: wrap(String(o.text || '').toUpperCase(), W), align: 'center' };
}

// {{name}} and {{a.b}} tokens filled from one item of a feed, printed in capitals.
// With no template, the item's plain values in order, separated by spaces.
export function applyTemplate(tpl, item) {
  if (!tpl) return Object.values(item || {}).filter(v => v != null && typeof v !== 'object').join(' ').toUpperCase().replace(/\s+/g, ' ').trim();
  return String(tpl).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) => {
    const v = k.split('.').reduce((x, p) => (x != null && typeof x === 'object' ? x[p] : undefined), item);
    return v == null || typeof v === 'object' ? '' : String(v);
  }).toUpperCase().replace(/\s+/g, ' ').trim();
}
export function templateTokens(tpl) { const out = []; String(tpl || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) => { if (!out.includes(k)) out.push(k); return m; }); return out; }

// The weather zone's own city, else the board location.
export function wxPlace(o, live) {
  if (o.lat != null && o.lon != null) return { lat: o.lat, lon: o.lon, city: o.city || '' };
  const l = live && live.loc; return l && l.lat != null ? { lat: l.lat, lon: l.lon, city: l.city || '' } : null;
}

function todayLines(o, z, d, W, lang, w, live) {
  const day = DAYS[lang][d.getDay()], mon = MONTHS[lang][d.getMonth()], date = `${d.getDate()} ${mon} ${d.getFullYear()}`;
  const sd = o.days !== false ? swedishDay(d) : null;
  // Chips before the name: red for a red day, blue and yellow for a flag day.
  const special = sd ? [...(sd.red ? ['r', ' '] : sd.flag ? ['b', 'y', ' '] : []), ...textToCells(sd[lang === 'sv' ? 'sv' : 'en'])].slice(0, W) : null;
  let sun = null;
  if (o.sun !== false && live && live.loc && live.loc.lat != null) {
    const s = sunTimes(d, live.loc.lat, live.loc.lon);
    sun = s.polar ? (s.polar === 'day' ? w.midnightSun : w.polarNight) : W >= 16 ? `${w.sun} ${hm(s.up)} ${hm(s.down)}` : `${hm(s.up)} ${hm(s.down)}`;
  }
  if (z.h === 1) return { exact: lr(`${day.slice(0, 3)} ${d.getDate()} ${mon}`, o.week !== false ? `${w.week} ${isoWeek(d)}` : '', W) };
  const lines = [day, date];
  if (special) lines.push(special);
  if (o.week !== false) lines.push(`${w.week} ${isoWeek(d)}`);
  if (sun) lines.push(sun);
  if (o.doy) lines.push(`${w.day} ${dayOfYear(d)}`);
  return { lines: lines.slice(0, z.h), align: 'center' };
}

// Which stations a zone shows, each { name, sites }. o.home follows the home station
// starred on the maclaine.se SL map (read by the app into live.home); o.stations is the
// zone's own list (up to six); o.sites and o.name are the one-station shape from before.
// Interchanges can be several sites (Kungsträdgården's metro and tram are two).
export function slStations(o, live) {
  if (o.home) { const h = live && live.home; return h && h.sites && h.sites.length ? [{ name: h.name, sites: h.sites }] : []; }
  if (Array.isArray(o.stations) && o.stations.length) return o.stations.map(s => ({ name: s.name || '', sites: [s.id] }));
  const sites = Array.isArray(o.sites) && o.sites.length ? o.sites : o.site ? [o.site] : [];
  return sites.length ? [{ name: o.name || '', sites }] : [];
}
export function slSource(o, live) {
  const st = slStations(o, live);
  return st.length ? { name: st[0].name, sites: st.flatMap(s => s.sites) } : null;
}

function slLines(o, z, now, W, w, live) {
  const stations = slStations(o, live);
  if (!stations.length) return { lines: ['SL', o.home ? w.nohome : w.pick], align: 'center' };
  const modes = Array.isArray(o.modes) && o.modes.length ? o.modes : null, walk = +o.walk || 0;
  // Minutes away, or the clock time in 24 h or 12 h. SL timestamps are Stockholm local.
  // 'cycle' alternates the two every six seconds, so a glance gets both.
  const showClock = o.eta === 'clock' || (o.eta === 'cycle' && Math.floor(now / 6000) % 2 === 1);
  const eta = x => {
    if (!showClock) return x.m === 0 ? w.now : `${x.m} ${w.min}`;
    const hhmm = (x.expected || x.scheduled).slice(11, 16);
    if (o.fmt !== '12') return hhmm;
    const hh = +hhmm.slice(0, 2);
    return `${(hh % 12) || 12}:${hhmm.slice(3)} ${hh < 12 ? 'AM' : 'PM'}`;
  };
  const per = stations.map(st => {
    const got = st.sites.map(id => live && live.sl && live.sl[id]).filter(Boolean);
    const deps = got.flatMap(d => d.deps || [])
      .filter(x => !modes || modes.includes(x.mode))
      .map(x => ({ ...x, m: depMinutes(x.expected || x.scheduled, now) }))
      .filter(x => x.m != null && x.m >= walk)
      .sort((a, b) => a.m - b.m);
    return { name: st.name.toUpperCase(), got, deps };
  });
  if (stations.length === 1) {
    const { name, got, deps } = per[0];
    // Say "no data" only after several failed tries in a row; SL often refuses the
    // first request or two and then answers.
    if (!got.some(d => d.deps)) return { lines: [name, '', got.some(d => (d.fails || 0) >= 4) ? w.nodata : w.loading], align: 'center' };
    if (!deps.length) return { lines: [name, '', w.nodeps], align: 'center' };
    const n = Math.min(z.h - 1, o.rows || Infinity);
    return { lines: [name].concat(deps.slice(0, n).map(x => row(x.line, x.dest.toUpperCase(), eta(x), W))), align: 'left' };
  }
  // Several stations: a name line and its next departures for each, as many as fit.
  const each = Math.max(1, Math.min(o.rows || Infinity, Math.floor((z.h - stations.length) / stations.length)));
  const lines = [];
  for (const st of per) {
    lines.push(st.name);
    if (!st.got.some(d => d.deps)) lines.push(st.got.some(d => (d.fails || 0) >= 4) ? w.nodata : w.loading);
    else if (!st.deps.length) lines.push(w.nodeps);
    else st.deps.slice(0, each).forEach(x => lines.push(row(x.line, x.dest.toUpperCase(), eta(x), W)));
  }
  return { lines: lines.slice(0, z.h), align: 'left' };
}

// Spot prices from elprisetjustnu.se, stored as 24 hourly averages (öre per kWh before
// VAT) per Stockholm date. The market prices in 15 minute slots, so each hour is the
// mean of its four. Hours are coloured by where they sit in the day's range.
export const AREAS = { SE1: 'LULEÅ', SE2: 'SUNDSVALL', SE3: 'STOCKHOLM', SE4: 'MALMÖ' };
function powerLines(o, z, now, W, w, live) {
  const area = AREAS[o.area] ? o.area : 'SE3', data = live && live.el && live.el[area];
  const wall = new Date(stockholmWall(now)), today = wall.toISOString().slice(0, 10), hr = wall.getUTCHours();
  const tomorrow = new Date(stockholmWall(now) + 864e5).toISOString().slice(0, 10);
  const day = data && data.days && data.days[today];
  if (!day) return { lines: [`${w.power} ${area}`, '', data && (data.fails || 0) >= 4 ? w.nodata : w.loading], align: 'center' };
  const vat = o.vat === false ? 1 : 1.25, P = day.map(p => p == null ? null : Math.round(p * vat));
  const next = P.concat((data.days[tomorrow] || []).map(p => p == null ? null : Math.round(p * vat)));
  const known = P.filter(p => p != null).sort((a, b) => a - b), lo = known[Math.floor(known.length / 3)], hi = known[Math.floor(known.length * 2 / 3)];
  const lvl = p => p == null ? ' ' : p <= lo ? 'g' : p <= hi ? 'y' : 'r', now$ = P[hr];
  if (z.h === 1) return { exact: lr(`${w.power} ${area}`, `${now$} ${w.ore}`, W) };
  if (o.view === 'chart' && z.h >= 3) {
    // Header row, then one bar per hour across the zone, the current hour in the theme's glyph colour.
    const cells = blank(z.h, z.w), max = Math.max(...known, 1), bh = z.h - 1;
    [...lr(`${area} ${w.today}`, `${now$} ${w.ore}`, W)].forEach((ch, i) => { cells[0][(z.w > 8 ? 1 : 0) + i] = ch; });
    for (let c = 0; c < z.w; c++) {
      const i = Math.min(23, Math.floor(c * 24 / z.w)), p = P[i]; if (p == null) continue;
      const n = Math.max(1, Math.round(p / max * bh));
      for (let k = 0; k < n; k++) cells[z.h - 1 - k][c] = i === hr ? 'f' : lvl(p);
    }
    return { cells };
  }
  const lines = [W >= 16 ? `${w.power} ${area} ${AREAS[area]}` : `${w.power} ${area}`, W >= 14 ? `${w.now} ${now$} ${w.kwh}` : `${now$} ${w.ore}`];
  if (z.h >= 3) lines.push(Array.from({ length: W }, (_, i) => lvl(next[hr + i])));
  return { lines: lines.slice(0, z.h), align: 'center' };
}

export const wxKey = o => `${(+o.lat).toFixed(2)},${(+o.lon).toFixed(2)}`;

const two = n => String(n).padStart(2, '0');

// Three weather views. Chip icons are placed as cells (arrays) so they are not
// uppercased into letters on the way to the grid.
function weatherLines(o, city, d, z, W, lang, w) {
  const view = o.view || 'now', deg = t => `${Math.round(o.units === 'f' ? t * 9 / 5 + 32 : t)}°`;
  const word = weatherWord(d.code, lang), today = (d.daily || [])[0] || {};
  const dayName = date => DAYS[lang][new Date(date + 'T12:00:00').getDay()].slice(0, 3);
  if (view === 'hours') {
    const hrs = (d.hourly || []).slice(0, Math.max(1, Math.floor(W / 3)));
    const cells = f => hrs.flatMap(h => [...f(h).padEnd(3).slice(0, 3)]);
    return { lines: [
      `${city} ${deg(d.t)}`,
      cells(h => h.time.slice(11, 13)),
      hrs.flatMap(h => [weatherChip(h.code), weatherChip(h.code), ' ']),
      cells(h => deg(h.t)),
      cells(h => !h.pp ? '' : `${Math.min(99, h.pp)}%`)
    ], align: 'left' };
  }
  if (view === 'days') {
    const days = (d.daily || []).slice(0, Math.max(1, z.h - 1));
    return { lines: [city].concat(days.map((f, i) => {
      const name = i === 0 ? w.today.slice(0, 5) : dayName(f.date);
      const txt = `${deg(f.max)} ${deg(f.min)}`, rain = f.pp != null && W >= 18 ? ` ${f.pp}%` : '';
      return [...name.padEnd(6), weatherChip(f.code), ' ', ...txt, ...rain];
    })), align: 'left' };
  }
  // now: the detail view
  const lines = [city, [weatherChip(d.code), ' ', ...`${deg(d.t)} ${word}`]];
  if (d.feels != null && z.h >= 4) {
    // "FEELS 9°  WIND 4 M/S" is a flap too long for 6 x 22 once the margins are off: close
    // the gap first, then drop the unit, never cut it in half
    const a = `${w.feels} ${deg(d.feels)}`, b = `${w.wind} ${Math.round(d.wind)}`;
    lines.push(o.wind === false ? a : [`${a}  ${b} M/S`, `${a} ${b} M/S`, `${a}  ${b}`, `${a} ${b}`].find(s => s.length <= W) || a);
  }
  if (z.h >= 5) lines.push(today.pp != null ? `${w.rain} ${today.pp}%  ${(today.sum || 0).toFixed(1)} MM` : w.dry);
  if (z.h >= 6 && today.sunrise) lines.push(`${w.sun} ${today.sunrise.slice(11, 16)} / ${today.sunset.slice(11, 16)}`);
  if (z.h < 4) lines.length = Math.min(lines.length, z.h);
  return { lines, align: W >= 18 ? 'left' : 'center' };
}

export function compose(page, R, C, now, lang, live) {
  const g = blank(R, C); if (!page) return g;
  zonesFor(page.layout, R, C).forEach((z, i) => {
    const zd = page.zones[i] || { ch: 'message', o: {} }, o = zd.o || {}, ticker = page.layout === 'ticker' && i === 1;
    if (zd.ch === 'message' && !ticker) {
      const cells = toCells(o, z.h, z.w);
      for (let r = 0; r < z.h; r++) for (let c = 0; c < z.w; c++) g[z.r + r][z.c + c] = cells[r][c];
      return;
    }
    // Pixel glyphs are 5 flaps tall; in a shorter zone the big channels print normally.
    if (DRAWN.has(zd.ch) && (zd.ch === 'art' || z.h >= 5)) { drawChannel(g, zd.ch, o, z, now); return; }
    const ch = zd.ch === 'bigclock' ? 'clock' : zd.ch === 'bigtext' ? 'message' : zd.ch;
    // a one-row zone (the ticker) asks the channel for a few rows' worth, then pages through them
    const res = channelLines(ch, o, z.h === 1 ? Object.assign({}, z, { h: 4 }) : z, now, lang, live);
    if (res.cells) { for (let r = 0; r < z.h; r++) for (let c = 0; c < z.w; c++) g[z.r + r][z.c + c] = res.cells[r][c]; return; }
    if (res.exact != null) { put(g, z.r, z.c + (z.w > 8 ? 1 : 0), z.w > 8 ? z.w - 2 : z.w, res.exact, 'left'); return; }
    if (z.h === 1) {  // ticker rows page through segments; flaps cannot scroll smoothly
      // Lines are packed whole, so an item keeps its price and a label its value; only a line
      // wider than the row is wrapped (0.7.3).
      const flat = res.lines.map(l => (Array.isArray(l) ? l.map(c => isChip(c) ? ' ' : c).join('') : l).replace(/\s{2,}/g, ' ').trim()).filter(Boolean);
      const segs = []; let cur = '';
      for (const l of flat) for (const part of (l.length > z.w ? wrap(l, z.w) : [l])) {
        if (!cur) cur = part; else if (cur.length + 3 + part.length <= z.w) cur += '   ' + part; else { segs.push(cur); cur = part; }
      }
      if (cur) segs.push(cur);
      put(g, z.r, z.c, z.w, segs[Math.floor(now / 3500) % Math.max(1, segs.length)] || '', 'center'); return;
    }
    block(g, z, res.lines, res.align);
  });
  return g;
}

// Big clock, big text and patterns paint colour chips straight into the grid.
function drawChannel(g, ch, o, z, now) {
  const color = o.color || 'f';
  if (ch === 'art') { drawPattern(g, z, o.pattern || 'rainbow', now, o.step, o.palette); return; }
  if (ch === 'bigclock') {
    const d = new Date(now), hh = d.getHours();
    const time = o.fmt === '12' ? `${(hh % 12) || 12}:${two(d.getMinutes())}` : `${two(hh)}:${two(d.getMinutes())}`;
    drawPixels(g, z, pixelWidth(time) <= z.w ? time : time.replace(':', ''), color, now);
    return;
  }
  // bigtext: word-wrapped pages of pixel text, one page every 4 seconds
  const pages = pixelPages(o.text || 'HEJ', z.w);
  drawPixels(g, z, pages[Math.floor(now / 4000) % pages.length], color, now);
}

// What the board shows when no page is allowed right now (every page has a time
// window and none is open): the clock, so a wall display is never stale.
export const FALLBACK_PAGE = { id: 'fallback', name: 'Clock', layout: 'full', dur: 60, wins: [], zones: [{ ch: 'clock', o: { fmt: '24' } }] };

export function demoPages(lang) {
  const sv = lang === 'sv';
  return [
    { id: 'p1', name: sv ? 'Välkommen' : 'Welcome', layout: 'full', dur: 12, wins: [], zones: [{ ch: 'message', o: { lines: ['', sv ? 'HEJ FRÅN' : 'HELLO FROM', sv ? 'EN LEDIG SKÄRM' : 'A SPARE MONITOR', '', 'roygbv', ''] } }] },
    { id: 'p2', name: sv ? 'Morgonpendling' : 'Morning commute', layout: 'header', dur: 14, wins: [], zones: [{ ch: 'clock', o: { fmt: '24' } }, { ch: 'sl', o: { site: 9117, name: 'Odenplan', modes: ['METRO', 'TRAIN'], eta: 'min' } }] },
    { id: 'p3', name: sv ? 'Väder och nedräkning' : 'Weather and countdown', layout: 'split', dur: 12, wins: [], zones: [{ ch: 'weather', o: { city: 'Stockholm', lat: 59.33, lon: 18.07 } }, { ch: 'countdown', o: { label: 'MIDSOMMAR', date: '2027-06-25' } }] },
    { id: 'p4', name: sv ? 'Dagens ord' : 'Quote of the hour', layout: 'ticker', dur: 14, wins: [], zones: [{ ch: 'quote', o: {} }, { ch: 'message', o: { text: sv ? 'GRATIS, INGET KONTO. ALLT STANNAR I DIN WEBBLÄSARE.' : 'FREE, NO ACCOUNT. EVERYTHING STAYS IN YOUR BROWSER.' } }] },
    { id: 'p5', name: sv ? 'Klocka' : 'Clock', layout: 'full', dur: 10, wins: [], zones: [{ ch: 'clock', o: { fmt: '24' } }] }
  ];
}

export function newId(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

export function defaultBoard(name, lang) {
  return {
    id: newId('b'), name: name || 'Demo',
    size: '6x22', rows: 6, cols: 22, theme: 'black', transition: 'classic', speed: 'fast', sound: false,
    quiet: { on: false, from: '23:00', to: '07:00', mode: 'dim' }, pages: demoPages(lang)
  };
}

// ---------- My boards (0.7.1) ----------
// A board copied to a storyboard of another size: channels are laid out again when drawn,
// so only cells typed, painted or photographed on the grid are fixed. They are centred in
// the new zone, and whatever falls outside is cut. Returns the zones for the new size and
// how many non-blank cells were lost, so the add flow can warn only when it is above zero.
export function fixedCut(page, fr, fc, tr, tc) {
  const from = zonesFor(page.layout, fr, fc), to = zonesFor(page.layout, tr, tc);
  let lost = 0;
  const zones = page.zones.map((z, i) => {
    if (!z || z.ch !== 'message' || !z.o || !Array.isArray(z.o.cells) || !from[i] || !to[i]) return JSON.parse(JSON.stringify(z));
    const a = from[i], b = to[i], out = blank(b.h, b.w), oy = Math.floor((a.h - b.h) / 2), ox = Math.floor((a.w - b.w) / 2);
    for (let r = 0; r < a.h; r++) for (let c = 0; c < a.w; c++) {
      const ch = (z.o.cells[r] && z.o.cells[r][c]) || ' ', rr = r - oy, cc = c - ox;
      if (rr >= 0 && rr < b.h && cc >= 0 && cc < b.w) out[rr][cc] = ch; else if (ch !== ' ') lost++;
    }
    return { ch: z.ch, o: Object.assign({}, z.o, { cells: out }) };
  });
  return { lost, zones };
}
// A Vestaboard message pasted as text: one line per row, in capitals, centred.
export function vestaboard(text, rows, cols) {
  const lines = String(text || '').toUpperCase().split(/\r?\n/).map(l => l.trim().slice(0, cols)).slice(0, rows);
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  return { layout: 'full', dur: 10, zones: [{ ch: 'message', o: { lines } }] };
}
