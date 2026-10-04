// Interest rates (0.9.2): central banks' policy rates, the date each last changed, and a
// step line over a year or five. Pure functions of the data, run by the app, the Worker
// (for the two sources that do not let browsers read them) and the Node tests.
//
// Where each comes from, checked on 30 September 2026:
//   ECB           deposit facility rate, ECB Data Portal, read from the browser
//   Fed           federal funds target range, New York Fed, read from the browser
//   Bank of England  Bank Rate, its database CSV, through the Worker (no CORS)
//   Riksbank      policy rate, SWEA, through the Worker (no CORS)
// A series is [{ d: 'YYYY-MM-DD', c }], oldest first; the Fed's also carries { from, to }.

import { lineChart } from './markets.js';
import { textToCells } from './charset.js';

export const BANKS = {
  ecb: { name: { en: 'ECB', sv: 'ECB' }, long: { en: 'DEPOSIT RATE', sv: 'INLÅNINGSRÄNTA' }, via: 'browser' },
  fed: { name: { en: 'FED', sv: 'FED' }, long: { en: 'TARGET RANGE', sv: 'MÅLINTERVALL' }, via: 'browser' },
  boe: { name: { en: 'BANK OF ENGLAND', sv: 'BANK OF ENGLAND' }, long: { en: 'BANK RATE', sv: 'BANK RATE' }, via: 'worker' },
  riks: { name: { en: 'RIKSBANK', sv: 'RIKSBANKEN' }, long: { en: 'POLICY RATE', sv: 'STYRRÄNTA' }, via: 'worker' }
};
// Which bank a place starts with: its own, where it has one of these.
const EURO = new Set(['AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES']);
export const bankFor = cc => cc === 'SE' ? 'riks' : cc === 'GB' ? 'boe' : cc === 'US' ? 'fed' : EURO.has(cc) ? 'ecb' : 'ecb';

export const upstream = {
  ecb: from => `https://data-api.ecb.europa.eu/service/data/FM/D.U2.EUR.4F.KR.DFR.LEV?startPeriod=${from}&format=jsondata`,
  fed: (from, to) => `https://markets.newyorkfed.org/api/rates/unsecured/effr/search.json?startDate=${from}&endDate=${to}`,
  boe: from => { const d = new Date(from + 'T12:00:00Z'), M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes&SeriesCodes=IUDBEDR&CSVF=TN&UsingCodes=Y&Datefrom=${String(d.getUTCDate()).padStart(2, '0')}/${M[d.getUTCMonth()]}/${d.getUTCFullYear()}&Dateto=now`; },
  riks: (from, to) => `https://api.riksbank.se/swea/v1/Observations/SECBREPOEFF/${from}/${to}`
};

// ---------- the four replies to one shape ----------
export function ecbSeries(j) {
  const ds = j && j.dataSets && j.dataSets[0], dims = j && j.structure && j.structure.dimensions && j.structure.dimensions.observation && j.structure.dimensions.observation[0];
  const ser = ds && ds.series && Object.values(ds.series)[0];
  if (!ser || !dims) return [];
  return Object.keys(ser.observations).map(i => ({ d: dims.values[+i] && dims.values[+i].id, c: ser.observations[i][0] })).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x.d || '') && Number.isFinite(x.c)).sort((a, b) => a.d < b.d ? -1 : 1);
}
// The Fed publishes the effective rate daily with the target range beside it; the range is
// the rate people quote, so the series follows its top, and keeps both ends.
export function fedSeries(j) {
  return ((j && j.refRates) || []).filter(x => x && /^\d{4}-\d{2}-\d{2}$/.test(x.effectiveDate) && Number.isFinite(x.targetRateTo))
    .map(x => ({ d: x.effectiveDate, c: x.targetRateTo, from: x.targetRateFrom, to: x.targetRateTo, eff: x.percentRate })).sort((a, b) => a.d < b.d ? -1 : 1);
}
const MON = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
export function boeSeries(text) {
  return String(text || '').split(/\r?\n/).map(l => /^(\d{2}) ([A-Z][a-z]{2}) (\d{4}),\s*([\d.]+)/.exec(l.trim())).filter(Boolean)
    .map(m => ({ d: `${m[3]}-${String(MON[m[2]]).padStart(2, '0')}-${m[1]}`, c: +m[4] })).filter(x => x.d.length === 10 && Number.isFinite(x.c)).sort((a, b) => a.d < b.d ? -1 : 1);
}
export function riksSeries(j) {
  return (Array.isArray(j) ? j : []).filter(x => x && /^\d{4}-\d{2}-\d{2}$/.test(x.date) && Number.isFinite(x.value)).map(x => ({ d: x.date, c: x.value })).sort((a, b) => a.d < b.d ? -1 : 1);
}

// The day the rate last moved: the first day of the latest run of one value.
export function lastChange(series) {
  if (!series || !series.length) return null;
  const v = series[series.length - 1].c;
  for (let i = series.length - 2; i >= 0; i--) if (series[i].c !== v) return series[i + 1].d;
  return null;   // no change in the period we have
}

// ---------- the zone ----------
const WORDS = {
  en: { since: 'SINCE', loading: 'LOADING', nodata: 'NO DATA YET', pick: '-', name: 'RATES', months: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'], years: n => n === 1 ? '1 YEAR' : `${n} YEARS`, off: 'NOT AVAILABLE' },
  sv: { since: 'SEDAN', loading: 'LADDAR', nodata: 'INGEN DATA ÄN', pick: '-', name: 'RÄNTOR', months: ['JAN', 'FEB', 'MAR', 'APR', 'MAJ', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEC'], years: n => n === 1 ? '1 ÅR' : `${n} ÅR`, off: 'INTE TILLGÄNGLIG' }
};
const pct = (v, lang) => { const s = (Math.round(v * 100) / 100).toFixed(2); return (lang === 'sv' ? s.replace('.', ',') : s) + '%'; };
export function rateText(bank, s, lang) {
  const last = s[s.length - 1];
  if (bank === 'fed' && Number.isFinite(last.from)) return `${pct(last.from, lang).slice(0, -1)}-${pct(last.to, lang)}`;
  return pct(last.c, lang);
}
const dateText = (d, w) => d ? `${+d.slice(8, 10)} ${w.months[+d.slice(5, 7) - 1]}${d.slice(0, 4) !== String(new Date().getFullYear()) ? ' ' + d.slice(0, 4) : ''}` : '';

const pad = (l, W) => { const a = Array.isArray(l) ? l : textToCells(l); return a.slice(0, W); };
// A list of banks, a line each (and when it last moved, with room); or, for one bank on a
// wide zone, a step line of the period with the rate beside it.
export function ratesCells(o, z, live, lang) {
  const w = WORDS[lang === 'sv' ? 'sv' : 'en'], L = lang === 'sv' ? 'sv' : 'en', H = z.h, Wd = z.w, W = Wd > 8 ? Wd - 2 : Wd;
  const cells = Array.from({ length: H }, () => Array(Wd).fill(' '));
  const banks = (Array.isArray(o.banks) ? o.banks : []).filter(b => BANKS[b]).slice(0, 4);
  const put = (r, c, l) => pad(l, Wd - c).forEach((x, j) => { if (cells[r]) cells[r][c + j] = x; });
  const data = b => live && live.rates && live.rates[`${b}:${o.years || 5}`];
  // unset: its name over a dash, as every tile with nothing set (0.10.3)
  if (!banks.length) { const r0 = Math.max(0, Math.floor(H / 2) - (H > 1 ? 1 : 0)); if (H > 1) put(r0, Math.max(0, Math.floor((Wd - w.name.length) / 2)), w.name); put(H > 1 ? r0 + 1 : r0, Math.max(0, Math.floor((Wd - w.pick.length) / 2)), w.pick); return cells; }
  const wait = b => { const d = data(b); return d && d.off ? w.off : d && (d.fails || 0) >= 4 ? w.nodata : w.loading; };
  if (banks.length === 1 && o.view !== 'list' && Wd >= 24 && H >= 4) {
    const b = banks[0], d = data(b), s = d && d.series;
    const pw = Math.max(15, Math.min(16, Math.round(Wd * 0.36))), cw = Wd - pw - 1;   // 15 fits BANK OF ENGLAND
    const lines = s && s.length ? [BANKS[b].name[L], BANKS[b].long[L], rateText(b, s, lang), lastChange(s) ? `${w.since} ${dateText(lastChange(s), w)}` : '', w.years(o.years || 5)]
      : [BANKS[b].name[L], '', wait(b)];
    const chart = lineChart(s && s.length ? s.map(x => x.c) : [], H, cw, { thick: o.line === 'thick' });
    for (let r = 0; r < H; r++) for (let c = 0; c < cw; c++) cells[r][c] = chart[r][c];
    const top = Math.max(0, Math.floor((H - lines.length) / 2));
    lines.forEach((l, i) => put(top + i, cw + 1, typeof l === 'string' && l.length > pw ? l.slice(0, pw) : l));
    return cells;
  }
  // the list: one line per bank, and its last change under it when there is room for both
  const two = H >= banks.length * 2, rows = [];
  for (const b of banks) {
    const d = data(b), s = d && d.series, name = BANKS[b].name[L];
    const right = s && s.length ? rateText(b, s, lang) : wait(b), room = W - right.length - 1;
    rows.push(name.slice(0, Math.max(3, room)).padEnd(Math.max(0, W - right.length)) + right);
    if (two) rows.push(s && s.length && lastChange(s) ? `${w.since} ${dateText(lastChange(s), w)}` : '');
  }
  const top = Math.max(0, Math.floor((H - Math.min(rows.length, H)) / 2)), inset = Wd > 8 ? 1 : 0;
  rows.slice(0, H).forEach((l, i) => put(top + i, inset, l));
  return cells;
}
