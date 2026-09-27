// Calendar facts computed locally, so the Today channel works offline: ISO week
// numbers, Swedish red days and flag days, and sunrise and sunset for a place.
// Pure functions of a date (and coordinates), testable in Node.

const pad = n => String(n).padStart(2, '0');
const key = d => `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// ISO 8601 week: weeks start on Monday, week 1 holds the year's first Thursday.
export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())), day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  return Math.ceil(((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
}
export function dayOfYear(date) {
  return Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()) - new Date(date.getFullYear(), 0, 1)) / 864e5) + 1;
}

// Easter Sunday, Gregorian (the anonymous algorithm, also known as Meeus/Jones/Butcher).
export function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}
// The Saturday in a date range (Midsummer Day, All Saints' Day).
const saturdayFrom = (y, m, d) => { const s = new Date(y, m, d); return addDays(s, (6 - s.getDay() + 7) % 7); };

// Red days are public holidays. Eves are not red, but everyone treats them as if they
// were, so they are listed and marked. Flag days follow the ordinance on general flag
// days (förordning 1982:270), including the day of the general election to the Riksdag,
// the second Sunday of September every four years since 2014.
const cache = new Map();
export function swedishDays(y) {
  if (cache.has(y)) return cache.get(y);
  const E = easter(y), out = new Map();
  const add = (d, en, sv, kind) => {
    const k = key(d), cur = out.get(k);
    if (cur) { cur.red = cur.red || kind === 'red'; cur.flag = cur.flag || kind === 'flag'; return; }
    out.set(k, { en, sv, red: kind === 'red', flag: kind === 'flag', eve: kind === 'eve' });
  };
  const at = (m, d) => new Date(y, m - 1, d);
  add(at(1, 1), "NEW YEAR'S DAY", 'NYÅRSDAGEN', 'red');
  add(at(1, 6), 'EPIPHANY', 'TRETTONDEDAG JUL', 'red');
  add(addDays(E, -2), 'GOOD FRIDAY', 'LÅNGFREDAGEN', 'red');
  add(E, 'EASTER SUNDAY', 'PÅSKDAGEN', 'red');
  add(addDays(E, 1), 'EASTER MONDAY', 'ANNANDAG PÅSK', 'red');
  add(at(5, 1), 'MAY DAY', 'FÖRSTA MAJ', 'red');
  add(addDays(E, 39), 'ASCENSION DAY', 'KRISTI HIMMELSFÄRD', 'red');
  add(addDays(E, 49), 'WHIT SUNDAY', 'PINGSTDAGEN', 'red');
  add(at(6, 6), 'NATIONAL DAY', 'NATIONALDAGEN', 'red');
  const mid = saturdayFrom(y, 5, 20);
  add(addDays(mid, -1), 'MIDSUMMER EVE', 'MIDSOMMARAFTON', 'eve');
  add(mid, 'MIDSUMMER DAY', 'MIDSOMMARDAGEN', 'red');
  add(saturdayFrom(y, 9, 31), "ALL SAINTS' DAY", 'ALLA HELGONS DAG', 'red');
  add(at(12, 24), 'CHRISTMAS EVE', 'JULAFTON', 'eve');
  add(at(12, 25), 'CHRISTMAS DAY', 'JULDAGEN', 'red');
  add(at(12, 26), 'BOXING DAY', 'ANNANDAG JUL', 'red');
  add(at(12, 31), "NEW YEAR'S EVE", 'NYÅRSAFTON', 'eve');
  add(at(4, 30), 'WALPURGIS NIGHT', 'VALBORG', 'eve');
  // flag days (a red day that is also a flag day just gains the flag)
  [[1, 1], [1, 28, "THE KING'S NAME DAY", 'KONUNGENS NAMNSDAG'], [3, 12, "CROWN PRINCESS'S NAME DAY", 'KRONPRINSESSANS NAMNSDAG'],
    [4, 30, "THE KING'S BIRTHDAY", 'KONUNGENS FÖDELSEDAG'], [5, 1], [6, 6], [7, 14, "CROWN PRINCESS'S BIRTHDAY", 'KRONPRINSESSANS FÖDELSEDAG'],
    [8, 8, "THE QUEEN'S NAME DAY", 'DROTTNINGENS NAMNSDAG'], [10, 24, 'UNITED NATIONS DAY', 'FN-DAGEN'],
    [11, 6, 'GUSTAVUS ADOLPHUS DAY', 'GUSTAV ADOLFSDAGEN'], [12, 10, 'NOBEL DAY', 'NOBELDAGEN'], [12, 23, "THE QUEEN'S BIRTHDAY", 'DROTTNINGENS FÖDELSEDAG'], [12, 25]
  ].forEach(([m, d, en, sv]) => {
    const k = key(at(m, d)), cur = out.get(k);
    if (cur) cur.flag = true; else out.set(k, { en, sv, red: false, flag: true, eve: false });
  });
  for (const d of [E, addDays(E, 49), mid]) out.get(key(d)).flag = true;
  if (y >= 2014 && (y - 2014) % 4 === 0) {
    const sep1 = new Date(y, 8, 1), firstSun = addDays(sep1, (7 - sep1.getDay()) % 7);
    add(addDays(firstSun, 7), 'ELECTION DAY', 'VALDAGEN', 'flag');
  }
  cache.set(y, out);
  return out;
}
export function swedishDay(date) { return swedishDays(date.getFullYear()).get(key(date)) || null; }

// Sunrise and sunset (NOAA's simplified solar position equations), as epoch ms, for the
// local calendar day of `date`. Returns { up, down }, or { polar: 'day' | 'night' } when
// the sun does not cross the horizon that day. Accurate to about a minute.
export function sunTimes(date, lat, lon) {
  const rad = Math.PI / 180;
  const noonUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12) - lon / 15 * 36e5;
  const n = (noonUtc - Date.UTC(2000, 0, 1, 12)) / 864e5;
  const M = (357.5291 + 0.98560028 * n) % 360;
  const C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
  const L = (M + C + 180 + 102.9372) % 360;
  const transit = noonUtc + (0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * L * rad)) * 864e5;
  const dec = Math.asin(Math.sin(L * rad) * Math.sin(23.44 * rad));
  const cosH = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(dec)) / (Math.cos(lat * rad) * Math.cos(dec));
  if (cosH < -1) return { polar: 'day' };
  if (cosH > 1) return { polar: 'night' };
  const H = Math.acos(cosH) / rad / 360 * 864e5;
  return { up: transit - H, down: transit + H };
}
