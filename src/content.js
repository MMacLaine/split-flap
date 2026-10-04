// What the board says: layouts, zone maths and channel formatting. Everything here is
// a pure function of (page, grid size, time, language, live data), so it runs in Node
// tests as well as the browser. Live data is fetched elsewhere (live.js) and passed in.
//
// Ported from the design handoff (design/board-content.js); the mock SL and weather
// tables are replaced by the live cache, and the strings moved to strings.js.

import { textToCells, isChip, boardText, printable } from './charset.js';
import { drawPixels, pixelPages, pixelWidth, drawPattern } from './pixels.js';
import { isoWeek, dayOfYear, swedishDay, sunTimes } from './almanac.js';
import { wallIn } from './place.js';
import { marketsCells, EXCHANGES } from './markets.js';
import { ratesCells } from './rates.js';
import { restGrid } from './meter.js';

const DAYS = {
  en: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
  sv: ['SÖNDAG', 'MÅNDAG', 'TISDAG', 'ONSDAG', 'TORSDAG', 'FREDAG', 'LÖRDAG']
};
const MONTHS = {
  en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
  sv: ['JAN', 'FEB', 'MAR', 'APR', 'MAJ', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEC']
};
// 0.10.3: a tile with nothing set prints its name and a dash, never an instruction; what to
// do is said in the editor beside the tile (unsetOf, below).
export const UNSET = '-';
const WORDS = {
  en: { tomorrow: 'TOMORROW', yesterday: 'YESTERDAY', now: 'NOW', min: 'MIN', today: 'TODAY', days: 'DAYS', day: 'DAY', hours: 'HOURS', hour: 'HOUR', togo: 'TO GO', loading: 'LOADING', nodata: 'NO DATA YET', nodeps: 'NO DEPARTURES', messages: 'MESSAGES', web: 'FROM THE WEB', nohome: 'NO HOME STATION', feels: 'FEELS', wind: 'WIND', rain: 'RAIN', sun: 'SUN', weather: 'WEATHER', dry: 'DRY',
    week: 'WEEK', midnightSun: 'MIDNIGHT SUN', polarNight: 'POLAR NIGHT', power: 'POWER', ore: 'ÖRE', kwh: 'ÖRE/KWH', empty: 'NOTHING IN THE FEED', otd: 'ON THIS DAY',
    deps: 'DEPARTURES', canc: 'CANC', cancelled: 'CANCELLED', onTime: 'ON TIME', plat: 'PLAT', off: 'NOT AVAILABLE', headlines: 'HEADLINES', holiday: 'NEXT HOLIDAY', worldClock: 'WORLD CLOCK',
    meter: { idle: ['MUSIC METER', '', 'PRESS LISTEN'], listening: 'LISTENING', stopped: 'STOPPED', refused: ['NO MICROPHONE', '', 'PRESS LISTEN AGAIN'], noMic: ['NO MICROPHONE'], busy: ['MICROPHONE IN USE', '', 'PRESS LISTEN AGAIN'], insecure: ['NO MICROPHONE', '', 'NEEDS HTTPS'] }, rainIn: m => `RAIN IN ${m} MIN`, dryIn: m => `DRY IN ${m} MIN`, rainNow: 'RAIN NOW' },
  sv: { tomorrow: 'I MORGON', yesterday: 'I GÅR', now: 'NU', min: 'MIN', today: 'IDAG', days: 'DAGAR', day: 'DAG', hours: 'TIMMAR', hour: 'TIMME', togo: 'KVAR', loading: 'LADDAR', nodata: 'INGEN DATA ÄN', nodeps: 'INGA AVGÅNGAR', messages: 'MEDDELANDEN', web: 'FRÅN WEBBEN', nohome: 'INGEN HEMSTATION', feels: 'KÄNNS', wind: 'VIND', rain: 'REGN', sun: 'SOL', weather: 'VÄDER', dry: 'TORRT',
    week: 'VECKA', midnightSun: 'MIDNATTSSOL', polarNight: 'POLARNATT', power: 'EL', ore: 'ÖRE', kwh: 'ÖRE/KWH', empty: 'INGET I FLÖDET', otd: 'DEN HÄR DAGEN',
    deps: 'AVGÅNGAR', canc: 'INST', cancelled: 'INSTÄLLD', onTime: 'I TID', plat: 'SPÅR', off: 'INTE TILLGÄNGLIG', headlines: 'RUBRIKER', holiday: 'NÄSTA HELGDAG', worldClock: 'VÄRLDSKLOCKA',
    meter: { idle: ['MUSIKMÄTARE', '', 'TRYCK PÅ LYSSNA'], listening: 'LYSSNAR', stopped: 'STOPPAT', refused: ['INGEN MIKROFON', '', 'TRYCK PÅ LYSSNA IGEN'], noMic: ['INGEN MIKROFON'], busy: ['MIKROFONEN ANVÄNDS', '', 'TRYCK PÅ LYSSNA IGEN'], insecure: ['INGEN MIKROFON', '', 'KRÄVER HTTPS'] }, rainIn: m => `REGN OM ${m} MIN`, dryIn: m => `UPPEHÅLL OM ${m} MIN`, rainNow: 'REGN NU' }
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
  'rotating', 'menu', 'wordclock', 'today', 'electricity', 'currency', 'onthisday', 'url', 'letterclock', 'departures', 'worldtime', 'markets', 'rates', 'headlines', 'meter'];
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
    let date = o.date || '2027-06-25', label = (o.label || '').toUpperCase();
    if (o.to === 'holiday') {   // 0.8: the next public holiday, with its own name
      const nh = nextHoliday(now, lang, live);
      if (!nh) return { lines: [w.holiday, '', live && live.hol && live.cc && live.hol[live.cc] && (live.hol[live.cc].fails || 0) >= 4 ? w.nodata : w.loading], align: 'center' };
      date = nh.date; label = nh.name;
    }
    const target = new Date(date + 'T00:00:00').getTime();
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
  if (ch === 'departures') return depLines(o, z, now, W, w, live);
  if (ch === 'worldtime') return worldLines(o, z, now, W, w);
  // Markets (0.9) draws its own cells: the chart in half flaps and the ticker beside it,
  // with opening times in the Place's time zone and holidays from the exchange's country
  if (ch === 'rates') return { cells: ratesCells(o, z, live, lang) };
  if (ch === 'headlines') return headlineLines(o, z, now, W, w, live);
  if (ch === 'markets') return { cells: marketsCells(o, z, now, live, { lang, tz: live && live.loc && live.loc.tz,
    closedOn: (ex, day) => { const cc = EXCHANGES[ex] && EXCHANGES[ex].cc, hd = cc && live && live.hol && live.hol[cc]; return !!(hd && hd.days && hd.days[day]); } }) };
  if (ch === 'weather') {
    const place = wxPlace(o, live);
    if (!place) return { lines: [w.weather, UNSET], align: 'center' };
    const city = (place.city || '').toUpperCase(), data = live && live.wx && live.wx[wxKey(place)];
    if (!data || data.t == null) return { lines: [city, '', data && (data.fails || 0) >= 4 ? w.nodata : w.loading], align: 'center' };
    return weatherLines(o, city, data, z, W, lang, w, now);
  }
  if (ch === 'quote') {
    const set = QUOTES[o.set] || QUOTES.proverbs, list = set[lang] || set.en, q = list[Math.floor(now / 60000) % list.length];
    return { lines: wrap(q, W), align: 'center' };
  }
  if (ch === 'rotating') {
    const msgs = (o.messages || []).map(m => String(m || '').trim()).filter(Boolean);
    if (!msgs.length) return { lines: [w.messages, UNSET], align: 'center' };
    const slot = Math.floor(now / 1000 / Math.max(3, +o.interval || 8)), n = msgs.length;
    const i = o.order === 'shuffle' ? order(n, Math.floor(slot / n))[slot % n] : slot % n;
    return { lines: wrap(msgs[i].toUpperCase(), W), align: 'center' };
  }
  if (ch === 'menu') {
    const sfx = o.suffix || '', pre = o.prefix === '$' ? '$' : '', rows = (o.items || []).map(x => String(x || '').trim().toUpperCase()).filter(Boolean).map(x => {
      const m = /^(.*?)\s+(\d+(?:[.,]\d+)?)$/.exec(x);   // a price at the end lines up on the right
      return m ? lr(m[1], pre + m[2] + sfx, W) : x;
    });
    const title = String(o.title || '').toUpperCase();
    return { lines: (title && z.h > rows.length ? [title] : []).concat(rows), align: 'left' };
  }
  if (ch === 'electricity') return powerLines(o, z, now, W, w, live);
  if (ch === 'currency') return currencyLines(o, z, W, lang, w, live);
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
    if (!o.url) return { lines: [w.web, UNSET], align: 'center' };
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

// Holidays (0.8): Sweden's red and flag days are worked out here, as before; any other
// country's public holidays come from Nager.Date through live.hol. Which country is the
// board's Place, else the browser's (live.cc), and Sweden when neither is known.
const isoDay = d => `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
const ownDays = live => !live || !live.cc || live.cc === 'SE';
export function holidayOn(d, lang, live) {
  if (ownDays(live)) { const sd = swedishDay(d); return sd ? { name: sd[lang === 'sv' ? 'sv' : 'en'], red: sd.red, flag: sd.flag } : null; }
  const h = live.hol && live.hol[live.cc] && live.hol[live.cc].days && live.hol[live.cc].days[isoDay(d)];
  if (!h) return null;
  const name = lang === 'sv' ? printable(h.local, h.en) : printable(h.en, h.local);
  return name ? { name, red: true, flag: false } : null;
}
// The next public holiday from a day on (today counts), or null while the list loads.
export function nextHoliday(now, lang, live) {
  const d0 = new Date(now); d0.setHours(0, 0, 0, 0);
  if (ownDays(live)) {
    for (let i = 0; i < 400; i++) { const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i), sd = swedishDay(d); if (sd && sd.red) return { date: isoDay(d), name: sd[lang === 'sv' ? 'sv' : 'en'] }; }
    return null;
  }
  const days = live.hol && live.hol[live.cc] && live.hol[live.cc].days; if (!days) return null;
  const k = Object.keys(days).sort().find(x => x >= isoDay(d0)); if (!k) return null;
  return { date: k, name: lang === 'sv' ? printable(days[k].local, days[k].en) : printable(days[k].en, days[k].local) };
}

function todayLines(o, z, d, W, lang, w, live) {
  const day = DAYS[lang][d.getDay()], mon = MONTHS[lang][d.getMonth()], date = `${d.getDate()} ${mon} ${d.getFullYear()}`;
  const sd = o.days !== false ? holidayOn(d, lang, live) : null;
  // Chips before the name: red for a red day, blue and yellow for a flag day.
  const special = sd ? [...(sd.red ? ['r', ' '] : sd.flag ? ['b', 'y', ' '] : []), ...textToCells(sd.name)].slice(0, W) : null;
  let sun = null;
  if (o.sun !== false && live && live.loc && live.loc.lat != null) {
    const s = sunTimes(d, live.loc.lat, live.loc.lon);
    sun = s.polar ? (s.polar === 'day' ? w.midnightSun : w.polarNight) : W >= 16 ? `${w.sun} ${hm(s.up)} ${hm(s.down)}` : `${hm(s.up)} ${hm(s.down)}`;
  }
  if (z.h === 1) return { exact: lr(`${day.slice(0, 3)} ${d.getDate()} ${mon}`, o.week !== false ? `${w.week} ${isoWeek(d)}` : '', W) };
  // in a big zone's panes (0.10.2): under big digits the day and date are one line; under the
  // day in big letters the day is not printed again
  const lines = o.dayLine ? [`${day} ${d.getDate()} ${mon}${o.ampm ? '  ' + o.ampm : ''}`] : o.noDay ? [date] : [day, date];
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
  if (!stations.length) return { lines: ['SL', o.home ? w.nohome : UNSET], align: 'center' };
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

// ---------- Headlines (0.9.3) ----------
// The latest items from one or more feeds, one at a time, with the feed's name above it.
// In a ticker row the lines are packed and page through as the ticker does.
export function headlineLines(o, z, now, W, w, live) {
  const feeds = (Array.isArray(o.feeds) ? o.feeds : []).filter(f => f && f.url);
  if (!feeds.length) return { lines: [w.headlines, UNSET], align: 'center' };
  const per = Math.max(1, Math.min(10, +o.count || 5)), all = [];
  for (const f of feeds) {
    const d = live && live.feeds && live.feeds[f.url];
    if (d && d.items) for (const it of d.items.slice(0, per)) all.push({ src: boardText(f.name || d.title || '').toUpperCase(), text: boardText(it.title).toUpperCase() });
  }
  if (!all.length) {
    const d = live && live.feeds && live.feeds[feeds[0].url];
    return { lines: [boardText(feeds[0].name || '').toUpperCase(), '', d && d.notAdded ? w.off : d && (d.fails || 0) >= 4 ? w.nodata : w.loading], align: 'center' };
  }
  const it = all[Math.floor(now / 1000 / Math.max(5, +o.every || 10)) % all.length];
  const body = wrap(it.text, W).slice(0, Math.max(1, z.h - (z.h >= 3 ? 2 : 0)));
  return { lines: z.h >= 3 ? [it.src, ''].concat(body) : body, align: z.h >= 3 ? 'left' : 'center' };
}

// ---------- World clock (0.8) ----------
// The time in a few cities, from the browser's own time zone data, so it needs no
// source. A city a day ahead of or behind this screen gets +1 or -1 after its time.
export function worldLines(o, z, now, W, w) {
  const list = (Array.isArray(o.places) ? o.places : []).filter(p => p && p.tz).slice(0, 6);
  if (!list.length) return { lines: [w.worldClock, UNSET], align: 'center' };
  const here = new Date(now).getDay();
  const rows = list.map(p => {
    let t; try { t = wallIn(p.tz, now); } catch { return lr(boardText(p.city).toUpperCase(), '--:--', W); }
    const hh = o.fmt === '12' ? `${(t.h % 12) || 12}:${two(t.m)} ${t.h < 12 ? 'AM' : 'PM'}` : `${two(t.h)}:${two(t.m)}`;
    const diff = ((t.dow - here + 7) % 7), mark = diff === 1 ? ' +1' : diff === 6 ? ' -1' : '';
    return lr(boardText(p.city).toUpperCase(), hh + (W >= 16 ? mark : ''), W);
  });
  return { lines: rows.slice(0, z.h), align: 'left' };
}

// ---------- Currency and crypto ----------
// Any of Frankfurter's currencies as the base (0.8, it was SEK or EUR), and coins from
// CoinGecko priced in the same base, each with a green or red chip for its day.
export const COINS = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', XRP: 'ripple', ADA: 'cardano', DOGE: 'dogecoin' };
const group = (v, dec, lang) => {   // 612345.5 to 612 345 (a space every three digits, as SV and SI write it)
  const [i, f] = Math.abs(v).toFixed(dec).split('.'), g = i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (v < 0 ? '-' : '') + g + (f ? (lang === 'sv' ? ',' : '.') + f : '');
};
function currencyLines(o, z, W, lang, w, live) {
  const base = o.base || 'SEK', data = live && live.fx && live.fx[base];
  const pairs = (Array.isArray(o.pairs) && o.pairs.length ? o.pairs : ['EUR', 'USD', 'GBP']).filter(p => p !== base);
  const coins = pairs.filter(p => COINS[p]), cdata = coins.length ? live && live.coin && live.coin[base] : null;
  const ready = (!pairs.some(p => !COINS[p]) || (data && data.rates)) && (!coins.length || (cdata && cdata.prices));
  if (!ready) return { lines: [base, '', ((data && data.fails) || (cdata && cdata.fails) || 0) >= 4 ? w.nodata : w.loading], align: 'center' };
  const dec = o.dec == null ? 2 : +o.dec;
  // a currency worth under a tenth of the base (the yen against the pound) is quoted per 100,
  // as a bank's board does, so it never prints as 0.00
  const unit = p => !COINS[p] && data && data.rates && data.rates[p] && 1 / data.rates[p] < 0.1 ? 100 : 1;
  const val = p => {
    if (COINS[p]) { const c = cdata.prices[COINS[p]]; return c && c.price != null ? group(c.price, c.price >= 1000 ? 0 : dec, lang) : '-'; }
    const r = data.rates[p]; return r ? group(unit(p) / r, dec, lang) : '-';
  };
  const chip = p => { const c = COINS[p] && cdata.prices[COINS[p]]; return c && c.change != null ? (c.change >= 0 ? 'g' : 'r') : null; };
  if (z.h === 1) return { lines: [pairs.map(p => `${unit(p) > 1 ? unit(p) + ' ' : ''}${p} ${val(p)}`).join('  ')], align: 'center' };
  return { lines: pairs.map(p => {
    const line = lr(W >= 14 ? `${unit(p)} ${p}` : unit(p) > 1 ? `${unit(p)}${p}` : p, W >= 14 ? `${val(p)} ${base}` : val(p), W - (chip(p) ? 2 : 0)), c = chip(p);
    return c ? [c, ' ', ...textToCells(line)] : line;
  }), align: 'left' };
}

// ---------- Departures (0.8) ----------
// A stop is { src, id, name }: src 'tr' is Transitous (anywhere), 'sl' is SL's own API
// (Stockholm, with its deviations). Both become { line, dest, m, clock, platform,
// cancelled, late, mode } here, so the layouts below never know which one answered.
// near: the stop nearest the board's Place, found by live.js (templates use it, so they
// can be built for a place before anyone has picked a stop).
export const nearKey = loc => loc && loc.lat != null ? `${Math.round(loc.lat * 1000) / 1000},${Math.round(loc.lon * 1000) / 1000}` : null;
export function depStops(o, live) {
  const own = (Array.isArray(o.stops) ? o.stops : []).filter(s => s && s.id != null && (s.src === 'tr' || s.src === 'sl'));
  if (own.length || !o.near) return own;
  const k = nearKey(live && live.loc), n = k && live.near && live.near[k];
  // near: 'rail' (the station board) takes the nearest stop that has trains, if there is one
  const st = n && n.stops && ((o.near === 'rail' && n.stops.find(x => (x.modes || []).includes('TRAIN'))) || n.stops[0]);
  return st ? [{ src: 'tr', id: st.id, name: st.name }] : [];
}
const CLOCKS = new Map();
function clockIn(tz, t, fmt) {
  const k = (tz || '') + fmt;
  if (!CLOCKS.has(k)) { try { CLOCKS.set(k, new Intl.DateTimeFormat('en-GB', { timeZone: tz || undefined, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })); } catch { CLOCKS.set(k, new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })); } }
  const hhmm = CLOCKS.get(k).format(new Date(t)), hh = +hhmm.slice(0, 2);
  return fmt === '12' ? `${(hh % 12) || 12}:${hhmm.slice(3)} ${hh < 12 ? 'AM' : 'PM'}` : hhmm;
}
export function stopDeps(stop, now, fmt, live) {
  if (stop.src === 'sl') {
    const d = live && live.sl && live.sl[stop.id];
    if (!d || !d.deps) return { fails: d ? d.fails || 0 : 0 };
    return { deps: d.deps.map(x => {
      const ts = x.expected || x.scheduled, m = depMinutes(ts, now), hhmm = ts ? ts.slice(11, 16) : '', hh = +hhmm.slice(0, 2);
      const late = x.expected && x.scheduled ? depMinutes(x.expected, now) - depMinutes(x.scheduled, now) : 0;
      return { line: x.line, dest: String(x.dest || '').toUpperCase(), m, clock: fmt === '12' ? `${(hh % 12) || 12}:${hhmm.slice(3)} ${hh < 12 ? 'AM' : 'PM'}` : hhmm,
        sched: x.scheduled ? x.scheduled.slice(11, 16) : hhmm, platform: '', cancelled: false, late, mode: x.mode };
    }) };
  }
  const d = live && live.tr && live.tr[stop.id];
  if (!d || !d.deps) return { fails: d ? d.fails || 0 : 0, off: !!(d && d.off) };
  return { alert: d.alert, deps: d.deps.map(x => {
    const t = Date.parse(x.time), s0 = Date.parse(x.sched || x.time);
    return { line: x.line, dest: x.dest, m: Math.floor((t - now) / 60000), clock: clockIn(d.tz, t, fmt), sched: clockIn(d.tz, s0, '24'), platform: x.platform || '',
      cancelled: !!x.cancelled, late: Math.round((t - s0) / 60000), mode: x.mode };
  }) };
}
function depLines(o, z, now, W, w, live) {
  const stops = depStops(o, live);
  if (!stops.length) return { lines: [w.deps, o.near ? w.loading : UNSET], align: 'center' };   // near: waiting for the place, not unset
  const modes = Array.isArray(o.modes) && o.modes.length ? o.modes : null, walk = +o.walk || 0;
  const only = String(o.lines || '').toUpperCase().split(/[\s,]+/).filter(Boolean);
  const showClock = o.eta === 'clock' || (o.eta === 'cycle' && Math.floor(now / 6000) % 2 === 1);
  const eta = x => x.cancelled ? w.canc : showClock ? x.clock : x.m <= 0 ? w.now : `${x.m} ${w.min}`;
  const per = stops.map(st => {
    const r = stopDeps(st, now, o.fmt, live);
    const deps = (r.deps || []).filter(x => x.m != null && x.m >= walk && (!modes || modes.includes(x.mode)) && (!only.length || only.includes(String(x.line).toUpperCase()))
      && !(x.cancelled && o.cancelled === 'hide')).sort((a, b) => a.m - b.m);
    const wait = r.off ? w.off : (r.fails || 0) >= 4 ? w.nodata : w.loading;
    return { name: boardText(st.name).toUpperCase(), got: !!r.deps, wait, deps, alert: r.alert };
  });
  // Several stops merged into one list, soonest first, when asked (the commute board).
  if (o.merge && per.length > 1) {
    const all = per.flatMap(p => p.deps).sort((a, b) => a.m - b.m);
    if (!per.some(p => p.got)) return { lines: [w.deps, '', per[0].wait], align: 'center' };
    per.splice(0, per.length, { name: String(o.title || w.deps).toUpperCase(), got: true, deps: all, alert: per.map(p => p.alert).find(Boolean) });
  }
  // The line column is as wide as the longest line shown (2 for SL's 17, 6 for IC 1300),
  // so a train number never runs into its destination.
  const lw = Math.min(6, Math.max(2, ...per.flatMap(p => p.deps.slice(0, z.h).map(x => String(x.line).length))));
  // The station board: time, line, destination, platform and a remark, when the zone is wide.
  const board = o.view === 'board' && W >= 28;
  // Station boards lead with the time and the destination; the line goes in from 40 flaps.
  const wide = W >= 38, rw = wide ? 9 : 7;
  const boardRight = x => `${(x.platform || '').padStart(4)} ${(x.cancelled ? (wide ? w.cancelled : w.canc) : x.late >= 2 ? x.clock : w.onTime).padEnd(rw).slice(0, rw)}`;
  // Only the destination is ever cut, so the time, the line and the platform always show.
  const cut = (prefix, dest, right) => prefix + dest.slice(0, Math.max(0, W - right.length - 1 - prefix.length));
  const rowOf = x => {
    const ln = String(x.line).padEnd(lw).slice(0, lw) + ' ';
    if (!board) { const r = eta(x); return lr(cut(ln, x.dest, r), r, W); }
    return lr(cut(`${x.sched} ${wide ? ln : ''}`, x.dest, boardRight(x)), boardRight(x), W);
  };
  const alertLine = p => o.alert && p.alert ? [p.alert] : [];
  if (per.length === 1) {
    const p = per[0];
    if (!p.got) return { lines: [p.name, '', p.wait], align: 'center' };
    if (!p.deps.length) return { lines: [p.name, '', w.nodeps], align: 'center' };
    const head = board ? lr(p.name, w.plat.padStart(4) + ' '.repeat(rw + 1), W) : p.name, al = alertLine(p);
    const n = Math.min(z.h - 1 - al.length, o.rows || Infinity);
    return { lines: [head].concat(p.deps.slice(0, Math.max(1, n)).map(rowOf), al.map(a => a.slice(0, W))), align: 'left' };
  }
  const each = Math.max(1, Math.min(o.rows || Infinity, Math.floor((z.h - per.length) / per.length)));
  const lines = [];
  for (const p of per) {
    lines.push(p.name);
    if (!p.got) lines.push(p.wait);
    else if (!p.deps.length) lines.push(w.nodeps);
    else p.deps.slice(0, each).forEach(x => lines.push(rowOf(x)));
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
function weatherLines(o, city, d, z, W, lang, w, now) {
  const view = o.view || 'now', deg = t => `${Math.round(o.units === 'f' ? t * 9 / 5 + 32 : t)}°`;
  const word = weatherWord(d.code, lang), today = (d.daily || [])[0] || {};
  const dayName = date => DAYS[lang][new Date(date + 'T12:00:00').getDay()].slice(0, 3);
  if (view === 'hours') {
    const hrs = (d.hourly || []).slice(0, Math.max(1, Math.floor(W / 3)));
    const cells = f => hrs.flatMap(h => [...f(h).padEnd(3).slice(0, 3)]);
    return { lines: [
      ...(o.bare ? [] : [`${city} ${deg(d.t)}`]),
      cells(h => h.time.slice(11, 13)),
      hrs.flatMap(h => [weatherChip(h.code), weatherChip(h.code), ' ']),
      cells(h => deg(h.t)),
      cells(h => !h.pp ? '' : `${Math.min(99, h.pp)}%`)
    ], align: 'left' };
  }
  if (view === 'days') {
    const days = (d.daily || []).slice(0, Math.max(1, o.bare ? Math.min(3, z.h) : z.h - 1));
    return { lines: (o.bare ? [] : [city]).concat(days.map((f, i) => {
      const name = i === 0 ? w.today.slice(0, 5) : dayName(f.date);
      const txt = `${deg(f.max)} ${deg(f.min)}`, rain = f.pp != null && W >= 18 ? ` ${f.pp}%` : '';
      return [...name.padEnd(6), weatherChip(f.code), ...(W >= 15 ? [' '] : []), ...txt, ...rain];   // no gap after the chip in a narrow pane
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
  const soon = o.soon === false ? null : rainSoon(d, now, w);
  if (z.h >= 5) lines.push(soon || (today.pp != null ? `${w.rain} ${today.pp}%  ${(today.sum || 0).toFixed(1)} MM` : w.dry));
  else if (soon && z.h === 4 && lines.length === 3) lines[2] = soon;
  if (z.h >= 6 && today.sunrise) lines.push(`${w.sun} ${today.sunrise.slice(11, 16)} / ${today.sunset.slice(11, 16)}`);
  if (z.h < 4) lines.length = Math.min(lines.length, z.h);
  return { lines, align: W >= 18 ? 'left' : 'center' };
}

// Rain starting or stopping within two hours, from the 15-minute forecast (0.8), or null
// when nothing changes. A slot counts as rain from 0.2 mm, so a stray drop is not rain.
function rainSoon(d, now, w = WORDS.en) {
  if (!d.soon || !d.soon.length) return null;
  const ago = d.at ? Math.max(0, (now - d.at) / 60e3) : 0, slots = d.soon.map(x => ({ min: x.min - ago, wet: x.mm >= 0.2 })).filter(x => x.min > -15 && x.min <= 120);
  if (!slots.length) return null;
  const nowWet = slots[0].wet, change = slots.find(x => x.wet !== nowWet && x.min > 0);
  const mins = change ? Math.max(5, Math.round(change.min / 5) * 5) : null;
  if (nowWet) return mins ? w.dryIn(mins) : w.rainNow;
  return mins ? w.rainIn(mins) : null;
}

export function compose(page, R, C, now, lang, live) {
  const g = blank(R, C); if (!page) return g;
  zonesFor(page.layout, R, C).forEach((z, i) => {
    const zd = page.zones[i] || { ch: 'message', o: {} }, o = zd.o || {}, ticker = page.layout === 'ticker' && i === 1;
    // the Meter (0.11.2): the tick's grid while Listen runs, the unlit meter with its words when not
    if (zd.ch === 'meter') {
      const L = live && live.listen, words = (WORDS[lang] || WORDS.en).meter;
      const cells = L && L.running() ? L.gridFor(z.h, z.w, o.style, words) : restGrid(z.h, z.w, o.style, L ? L.state : 'idle', words);
      for (let r = 0; r < z.h; r++) for (let c = 0; c < z.w; c++) g[z.r + r][z.c + c] = cells[r][c];
      return;
    }
    if (zd.ch === 'message' && !ticker) {
      const cells = toCells(o, z.h, z.w);
      for (let r = 0; r < z.h; r++) for (let c = 0; c < z.w; c++) g[z.r + r][z.c + c] = cells[r][c];
      return;
    }
    // Pixel glyphs are 5 flaps tall; in a shorter zone the big channels print normally.
    if (DRAWN.has(zd.ch) && (zd.ch === 'art' || z.h >= 5)) { drawChannel(g, zd.ch, o, z, now); return; }
    // 0.10.2: a big zone (12 x 40, or the body under a header) has its own layout for the tiles
    // people use most, instead of a 6 x 22 block in the middle of the dark (QA C-H1)
    if (isBig(z) && !o._part && BIG[zd.ch] && BIG[zd.ch](g, z, o, now, lang, live)) return;
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

// ---------- big zones (0.10.2) ----------
// A zone at least 9 rows by 30 columns. Each layout is made of panes, and each pane is the
// tile's own small layout, composed on its own and copied in, so the big boards use the same
// words, states and formats as the small ones.
export const isBig = z => z.h >= 9 && z.w >= 30;
function pane(g, z, r, c, h, w, ch, o, now, lang, live) {
  if (h < 1 || w < 1) return;
  const sub = compose({ layout: 'full', zones: [{ ch, o: Object.assign({}, o, { _part: true }) }] }, h, w, now, lang, live);
  for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) if (z.r + r + i < g.length) g[z.r + r + i][z.c + c + j] = sub[i][j];
}
const half = (list, n = Math.ceil(list.length / 2)) => [list.slice(0, n), list.slice(n)];
const BIG = {
  // the time in big digits, the day and date under it
  clock: (g, z, o, now, lang, live) => {
    const two = z.h >= 11, digits = two ? 10 : 5, top = o.date === false ? Math.floor((z.h - digits) / 2) : two ? 0 : Math.max(0, Math.floor((z.h - 8) / 2));
    pane(g, z, top, 0, digits, z.w, 'bigclock', { fmt: o.fmt, color: 'f' }, now, lang, live);
    // 12 hours: AM or PM goes on the date line, since the digits have no room for it (0.10.2 review)
    const ampm = o.fmt === '12' ? (new Date(now).getHours() < 12 ? 'AM' : 'PM') : '';
    if (o.date !== false) pane(g, z, top + digits, 0, Math.min(3, z.h - top - digits), z.w, 'today', { dayLine: true, ampm, sun: false, days: false, week: !!o.week }, now, lang, live);
    else if (ampm) put(g, z.r + Math.min(z.h - 1, top + digits), z.c, z.w, ampm, 'center');
    return true;
  },
  // the day in big letters (or its short form), then the date, the holiday, the week and the sun
  today: (g, z, o, now, lang, live) => {
    const d = new Date(now), day = DAYS[lang][d.getDay()], word = pixelWidth(day) <= z.w ? day : day.slice(0, 3);
    pane(g, z, 1, 0, 5, z.w, 'bigtext', { text: word, color: 'f' }, now, lang, live);
    pane(g, z, 7, 0, z.h - 7, z.w, 'today', Object.assign({}, o, { noDay: true }), now, lang, live);
    return true;
  },
  // a column per city, with its time and its day against this screen's
  // (0.10.2 review) all six cities: up to three in a row, a second row for four to six, and a
  // name on two lines rather than cut
  worldtime: (g, z, o, now, lang, live) => {
    const list = (Array.isArray(o.places) ? o.places : []).filter(p => p && p.tz).slice(0, 6);
    if (list.length < 2) return false;
    const bands = list.length > 3 ? [list.slice(0, Math.ceil(list.length / 2)), list.slice(Math.ceil(list.length / 2))] : [list];
    const bh = Math.floor(z.h / bands.length), here = new Date(now).getDay(), w = WORDS[lang] || WORDS.en;
    bands.forEach((band, bi) => {
      const cw = Math.floor(z.w / band.length), off = Math.floor((z.w - cw * band.length) / 2);
      band.forEach((p, i) => {
        const name = wrap(boardText(p.city).toUpperCase(), cw - 1).slice(0, 2);
        let t = null; try { t = wallIn(p.tz, now); } catch { t = null; }
        const hh = !t ? '--:--' : o.fmt === '12' ? `${(t.h % 12) || 12}:${two(t.m)}` : `${two(t.h)}:${two(t.m)}`, diff = t ? (t.dow - here + 7) % 7 : 0;
        const ap = t && o.fmt === '12' ? (t.h < 12 ? 'AM' : 'PM') : '', word = diff === 1 ? w.tomorrow : diff === 6 ? w.yesterday : '', short = diff === 1 ? '+1' : diff === 6 ? '-1' : '';
        const fit = s => s.length <= cw - 1;
        const lines = bands.length === 1 ? [...name, '', hh, ap, fit(word) ? word : short]
          : [...name, hh, [ap, word].filter(Boolean).join(' ')].map((l, k, a) => k === a.length - 1 && !fit(l) ? [ap, short].filter(Boolean).join(' ') : l);
        block(g, { r: z.r + bi * bh, c: z.c + off + i * cw, h: bh, w: cw }, lines, 'center');
      });
    });
    return true;
  },
  // now across the top, the next hours and three days side by side under it
  weather: (g, z, o, now, lang, live) => {
    const place = wxPlace(o, live), data = place && live && live.wx && live.wx[wxKey(place)];
    if (!data || data.t == null) return false;
    // the two lower panes start on the same row (0.10.2 review): both four rows, from the top
    const top = Math.min(6, z.h - 5), hw = Math.floor(z.w / 2), lh = Math.min(4, z.h - top - 1);
    pane(g, z, 0, 0, top, z.w, 'weather', Object.assign({}, o, { view: 'now' }), now, lang, live);
    pane(g, z, top + 1, 0, lh, hw, 'weather', Object.assign({}, o, { view: 'hours', bare: true }), now, lang, live);
    pane(g, z, top + 1, hw, lh, z.w - hw, 'weather', Object.assign({}, o, { view: 'days', bare: true }), now, lang, live);
    return true;
  },
  // the pairs in two columns
  currency: (g, z, o, now, lang, live) => {
    const pairs = (Array.isArray(o.pairs) && o.pairs.length ? o.pairs : ['EUR', 'USD', 'GBP']).filter(p => p !== (o.base || 'SEK'));
    if (pairs.length < 3) return false;
    // until every rate is in, the small layout says LOADING or NO DATA YET (0.10.2 review)
    const base = o.base || 'SEK', fx = live && live.fx && live.fx[base], coins = pairs.filter(p => COINS[p]), cd = coins.length ? live && live.coin && live.coin[base] : null;
    if ((pairs.some(p => !COINS[p]) && !(fx && fx.rates)) || (coins.length && !(cd && cd.prices))) return false;
    const [a, b] = half(pairs), hw = Math.floor(z.w / 2), n = a.length, gap = n * 2 - 1 <= z.h ? 2 : 1, top = Math.floor((z.h - (n - 1) * gap - 1) / 2);
    [a, b].forEach((col, j) => col.forEach((p, i) => pane(g, z, top + i * gap, j ? hw : 0, 2, j ? z.w - hw : hw, 'currency', Object.assign({}, o, { pairs: [p] }), now, lang, live)));
    return true;
  },
  // the title across the top, the items in two columns under it
  menu: (g, z, o, now, lang, live) => {
    const items = (o.items || []).filter(x => String(x || '').trim());
    if (items.length < 4) return false;
    // two columns only when every item fits its half whole (0.10.2 review); else one, as before
    const hw0 = Math.floor(z.w / 2), extra = (o.prefix === '$' ? 1 : 0) + String(o.suffix || '').length;
    if (items.some(x => String(x).trim().length + extra > hw0 - 2)) return false;
    const title = String(o.title || '').toUpperCase(), [a, b] = half(items), hw = Math.floor(z.w / 2), t0 = title ? 2 : 0;
    if (title) put(g, z.r, z.c, z.w, title, 'center');
    const n = a.length, gap = t0 + n * 2 - 1 <= z.h ? 2 : 1, top = t0 + Math.max(0, Math.floor((z.h - t0 - (n - 1) * gap - 1) / 2));
    [a, b].forEach((col, j) => col.forEach((x, i) => pane(g, z, top + i * gap, j ? hw : 0, 2, j ? z.w - hw : hw, 'menu', Object.assign({}, o, { title: '', items: [x] }), now, lang, live)));
    return true;
  }
};

// Big clock, big text and patterns paint colour chips straight into the grid.
function drawChannel(g, ch, o, z, now) {
  const color = o.color || 'f';
  if (ch === 'art') { drawPattern(g, z, o.pattern || 'rainbow', now, o.step, o.palette); return; }
  if (ch === 'bigclock') {
    const d = new Date(now), hh = d.getHours();
    const time = o.fmt === '12' ? `${(hh % 12) || 12}:${two(d.getMinutes())}` : `${two(hh)}:${two(d.getMinutes())}`;
    // twice the size where it fits (0.10.2): with the colon, then without, then at one size
    const tries = [[time, 2], [time.replace(':', ''), 2], [time, 1], [time.replace(':', ''), 1]].filter(([s, k]) => (k === 1 || z.h >= 10) && pixelWidth(s) * k <= z.w);
    const [t, k] = tries[0] || [time.replace(':', ''), 1];
    drawPixels(g, z, t, color, now, k);
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

// What a tile still needs before it can show anything, for the editor's hint beside it (0.10.3),
// or null when it is set. The board itself prints only the tile's name and a dash.
export function unsetOf(zone, live) {
  const ch = zone && zone.ch, o = (zone && zone.o) || {};
  if (ch === 'weather') return wxPlace(o, live) ? null : 'weather';
  if (ch === 'rotating') return (o.messages || []).some(m => String(m || '').trim()) ? null : 'rotating';
  if (ch === 'url') return o.url ? null : 'url';
  if (ch === 'sl') return o.home || (o.stations && o.stations.length) || (o.sites && o.sites.length) || o.site ? null : 'sl';
  if (ch === 'headlines') return (o.feeds || []).length ? null : 'headlines';
  if (ch === 'worldtime') return (o.places || []).some(p => p && p.tz) ? null : 'worldtime';
  if (ch === 'departures') return (o.stops || []).length ? null : o.near ? (live && live.loc ? null : 'departuresNear') : 'departures';
  if (ch === 'markets') return (o.symbols || []).length ? null : 'markets';
  if (ch === 'rates') return (o.banks || []).length ? null : 'rates';
  return null;
}
