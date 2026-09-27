// Live data, fetched straight from the browser. Every source is keyless and sends open
// CORS headers, so there is no server of ours in the path:
//   SL departures: transport.integration.sl.se (the SL Transport API, via Trafiklab)
//   Weather and city search: Open-Meteo (CC BY 4.0)
//   Electricity spot prices: elprisetjustnu.se
//   Exchange rates: Frankfurter (European Central Bank reference rates)
//   On this day: Wikipedia's featured feed (CC BY-SA 4.0)
//   Follow a URL: whatever address the board names, if it allows browsers to read it
// Only what the current board uses is fetched. Failed fetches keep the last good data,
// and the board says how old it is.

import { wxKey, wxPlace, slStations, AREAS, stockholmWall } from './content.js';

const SL_EVERY = 60e3, WX_EVERY = 15 * 60e3, EL_EVERY = 30 * 60e3, FX_EVERY = 3 * 36e5, OTD_EVERY = 6 * 36e5;
// SL's open API throttles intermittently (HTTP 429 in streaks of a few requests, even
// a minute apart), so failures retry fast and then back off. Weather rarely fails.
const RETRY = [4e3, 8e3, 15e3, 30e3, 60e3];
const retryAfter = fails => RETRY[Math.min(fails, RETRY.length) - 1] || RETRY[0];

// fetch with a deadline: a request that never answers must not block refreshes forever
async function get(url) {
  const ac = new AbortController(), timer = setTimeout(() => ac.abort(), 12e3);
  try { const r = await fetch(url, { signal: ac.signal }); if (!r.ok) throw new Error(r.status); return await r.json(); }
  finally { clearTimeout(timer); }
}

export class Live {
  constructor(onUpdate) {
    this.onUpdate = onUpdate;
    this.data = { sl: {}, wx: {}, el: {}, fx: {}, otd: {}, url: {}, loc: null };
    this.wanted = { sl: new Map(), wx: new Map(), el: new Set(), fx: new Set(), otd: new Set(), url: new Map() };
    this.timer = setInterval(() => this.poll(), 2000);
    addEventListener('online', () => this.poll(true));
  }
  // Tell the fetcher which stations and places the board needs. Called whenever the
  // board changes; unneeded sources simply stop being refreshed.
  // lang picks the Wikipedia edition for On this day.
  want(board, lang) {
    const sl = new Map(), wx = new Map(), el = new Set(), fx = new Set(), otd = new Set(), url = new Map();
    this.data.loc = board && board.loc && board.loc.lat != null ? board.loc : null;
    for (const p of (board && board.pages) || []) for (const z of p.zones) {
      const o = z.o || {};
      if (z.ch === 'sl') for (const st of slStations(o, this.data)) for (const id of st.sites) sl.set(id, true);
      if (z.ch === 'weather') { const pl = wxPlace(o, this.data); if (pl) wx.set(wxKey(pl), { lat: pl.lat, lon: pl.lon }); }
      if (z.ch === 'electricity') el.add(AREAS[o.area] ? o.area : 'SE3');
      if (z.ch === 'currency') fx.add(o.base === 'EUR' ? 'EUR' : 'SEK');
      if (z.ch === 'onthisday') otd.add(lang === 'sv' ? 'sv' : 'en');
      if (z.ch === 'url' && /^https:\/\//.test(o.url || '')) url.set(o.url, { every: Math.max(1, +o.every || 5) * 60e3, path: o.path || '' });
    }
    this.wanted = { sl, wx, el, fx, otd, url };
    this.poll();
  }
  poll(force) {
    const now = Date.now();
    const due = (entry, every) => !entry || (!entry.busy && (force || now - (entry.tried || 0) >= (entry.err ? retryAfter(entry.fails) : every)));
    // One SL station per 2 second poll, most overdue first, rather than all at once
    // when a board with several stations opens: bursts are what SL throttles.
    const slDue = [...this.wanted.sl.keys()].filter(site => due(this.data.sl[site], SL_EVERY))
      .sort((a, b) => ((this.data.sl[a] || {}).tried || 0) - ((this.data.sl[b] || {}).tried || 0));
    if (slDue.length) this.fetchSl(slDue[0]);
    for (const [k, p] of this.wanted.wx) if (due(this.data.wx[k], WX_EVERY)) this.fetchWx(k, p);
    for (const a of this.wanted.el) { const e = this.data.el[a]; if (due(e, EL_EVERY) || this.elStale(e, now)) this.fetchEl(a); }
    for (const b of this.wanted.fx) if (due(this.data.fx[b], FX_EVERY)) this.fetchFx(b);
    for (const l of this.wanted.otd) { const e = this.data.otd[l]; if (due(e, OTD_EVERY) || (e && !e.busy && e.md !== monthDay(now))) this.fetchOtd(l); }
    for (const [u, p] of this.wanted.url) if (due(this.data.url[u], p.every)) this.fetchUrl(u, p);
  }
  // The prices for today are missing (just past midnight), or tomorrow's are not in yet
  // after they are published around 13:00: fetch again sooner than the usual half hour.
  elStale(e, now) {
    if (!e || e.busy || !e.days || now - (e.tried || 0) < 10 * 60e3) return false;
    const today = new Date(stockholmWall(now)).toISOString().slice(0, 10), tomorrow = new Date(stockholmWall(now) + 864e5).toISOString().slice(0, 10);
    return !e.days[today] || (new Date(stockholmWall(now)).getUTCHours() >= 13 && !e.days[tomorrow]);
  }
  async run(bucket, k, fn) {
    const e = this.data[bucket][k] || (this.data[bucket][k] = {});
    e.busy = true; e.tried = Date.now();
    try { await fn(e); e.at = Date.now(); e.err = false; e.fails = 0; } catch { e.err = true; e.fails = (e.fails || 0) + 1; }
    e.busy = false; this.onUpdate();
  }
  // Today and tomorrow in Stockholm time. Tomorrow answers 404 until it is published.
  fetchEl(area) {
    return this.run('el', area, async e => {
      const now = Date.now(), days = {};
      for (const off of [0, 1]) {
        const date = new Date(stockholmWall(now) + off * 864e5).toISOString().slice(0, 10);
        try {
          const j = await get(`https://www.elprisetjustnu.se/api/v1/prices/${date.slice(0, 4)}/${date.slice(5)}_${area}.json`);
          const hours = Array.from({ length: 24 }, () => []);
          for (const x of j) { const h = +String(x.time_start).slice(11, 13); if (h >= 0 && h < 24 && Number.isFinite(x.SEK_per_kWh)) hours[h].push(x.SEK_per_kWh * 100); }
          days[date] = hours.map(v => v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
        } catch (err) { if (off === 0) throw err; }
      }
      e.days = days;
    });
  }
  fetchFx(base) {
    return this.run('fx', base, async e => {
      const j = await get(`https://api.frankfurter.dev/v1/latest?base=${base}`);
      e.rates = j.rates || {}; e.date = j.date;
    });
  }
  fetchOtd(lang) {
    return this.run('otd', lang, async e => {
      const md = monthDay(Date.now());
      const j = await get(`https://${lang}.wikipedia.org/api/rest_v1/feed/onthisday/selected/${md.replace('-', '/')}`);
      e.items = (j.selected || []).filter(x => x && x.text && x.year != null).slice(0, 30).map(x => ({ year: x.year, text: String(x.text).slice(0, 300) }));
      e.md = md;
    });
  }
  // JSON: the list at path (a.b.c), else the first list found; each item is an object
  // (a plain value becomes { text }). Plain text: one item per non-empty line.
  fetchUrl(url, p) {
    return this.run('url', url, async e => {
      const ac = new AbortController(), timer = setTimeout(() => ac.abort(), 12e3);
      let body;
      try {
        const r = await fetch(url, { signal: ac.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
        if (!r.ok) throw new Error(r.status);
        body = await r.text();
      } finally { clearTimeout(timer); }
      if (body.length > 1e6) throw new Error('too big');
      e.items = feedItems(body, p.path).slice(0, 50);
    });
  }
  async fetchSl(site) {
    const e = this.data.sl[site] || (this.data.sl[site] = {});
    e.busy = true; e.tried = Date.now();
    try {
      const j = await get(`https://transport.integration.sl.se/v1/sites/${encodeURIComponent(site)}/departures?forecast=90`);
      e.deps = (j.departures || []).filter(d => d.line).map(d => ({
        line: String(d.line.designation || '').slice(0, 4), dest: String(d.destination || '').slice(0, 40),
        expected: d.expected || null, scheduled: d.scheduled || null, mode: d.line.transport_mode || ''
      }));
      e.at = Date.now(); e.err = false; e.fails = 0;
    } catch { e.err = true; e.fails = (e.fails || 0) + 1; }
    e.busy = false; this.onUpdate();
  }
  async fetchWx(k, p) {
    const e = this.data.wx[k] || (this.data.wx[k] = {});
    e.busy = true; e.tried = Date.now();
    try {
      const j = await get(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}`
        + '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day'
        + '&hourly=temperature_2m,precipitation_probability,weather_code'
        + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset'
        + '&timezone=auto&forecast_days=4&wind_speed_unit=ms');
      const c = j.current, h = j.hourly, dl = j.daily;
      e.t = c.temperature_2m; e.feels = c.apparent_temperature; e.code = c.weather_code; e.wind = c.wind_speed_10m;
      // hourly from the current hour onwards (times are local to the place, as is current.time)
      const from = Math.max(0, h.time.findIndex(t => t >= c.time.slice(0, 13)));
      e.hourly = h.time.slice(from, from + 24).map((time, i) => ({ time, t: h.temperature_2m[from + i], pp: h.precipitation_probability[from + i], code: h.weather_code[from + i] }));
      e.daily = dl.time.map((date, i) => ({ date, code: dl.weather_code[i], max: dl.temperature_2m_max[i], min: dl.temperature_2m_min[i], sum: dl.precipitation_sum[i], pp: dl.precipitation_probability_max[i], sunrise: dl.sunrise[i], sunset: dl.sunset[i] }));
      e.at = Date.now(); e.err = false; e.fails = 0;
    } catch { e.err = true; e.fails = (e.fails || 0) + 1; }
    e.busy = false; this.onUpdate();
  }
  // Minutes since the oldest source this page depends on last updated, or 0 if fresh.
  // SL counts as stale after 3 minutes (departures move); weather and prices after 45.
  staleMinutes(page) {
    if (!page) return 0;
    const now = Date.now(); let worst = 0;
    const check = (e, limit) => { if (e && e.at && now - e.at > limit) worst = Math.max(worst, Math.floor((now - e.at) / 60e3)); };
    for (const z of page.zones) {
      const o = z.o || {};
      if (z.ch === 'sl') for (const st of slStations(o, this.data)) for (const id of st.sites) check(this.data.sl[id], 3 * 60e3);
      if (z.ch === 'weather') { const pl = wxPlace(o, this.data); if (pl) check(this.data.wx[wxKey(pl)], 45 * 60e3); }
      if (z.ch === 'electricity') check(this.data.el[AREAS[o.area] ? o.area : 'SE3'], 75 * 60e3);
      if (z.ch === 'url' && o.url) check(this.data.url[o.url], Math.max(1, +o.every || 5) * 60e3 * 3);
    }
    return worst;
  }
}

const monthDay = now => { const d = new Date(now); return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export function feedItems(body, path) {
  let j = null;
  try { j = JSON.parse(body); } catch { j = null; }
  if (j == null) return String(body).split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(text => ({ text }));
  let list = path ? String(path).split('.').filter(Boolean).reduce((x, k) => (x != null ? x[k] : undefined), j) : j;
  if (!Array.isArray(list) && list && typeof list === 'object') list = Object.values(list).find(Array.isArray) || [list];
  if (!Array.isArray(list)) list = list == null ? [] : [list];
  return list.map(x => x && typeof x === 'object' ? x : { text: x });
}

// --- search ---
let sites = null;
async function loadSites() {
  if (!sites) sites = fetch(new URL('../data/sl-sites.json', import.meta.url)).then(r => r.json()).catch(() => { sites = null; return []; });
  return sites;
}
// Two spellings of every name: diacritics stripped (Västra to vastra) and Swedish
// sounds as people often type them (ä to e, å to o), so "vestra skogen" still finds
// Västra skogen. Past that, one typo per five letters is forgiven.
const fold = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const sound = s => s.toLowerCase().replace(/ä/g, 'e').replace(/å/g, 'o').replace(/ö/g, 'o').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function close(a, b) {   // edit distance of a against the start of b, capped
  const max = Math.floor(a.length / 5); if (!max) return false;
  const t = b.slice(0, a.length + max);
  let prev = Array.from({ length: t.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= t.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === t[j - 1] ? 0 : 1));
    prev = cur;
  }
  return Math.min(...prev.slice(a.length - max)) <= max;
}

export const MODE_LETTERS = { M: 'METRO', R: 'TRAIN', T: 'TRAM' };

// Stations by name. Rank: starts with the query, a word starts with it, contains it,
// then near misses; rail stations before bus stops within each rank.
export async function searchStations(q) {
  const list = await loadSites(), f = fold(q.trim()), v = sound(q.trim());
  if (!f) return [];
  const hits = [];
  for (const [id, name, note = '', modes = ''] of list) {
    const a = fold(name), b = sound(name);
    let rank = -1;
    if (a.startsWith(f) || b.startsWith(v)) rank = 0;
    else if (a.includes(' ' + f) || b.includes(' ' + v) || a.includes('/' + f)) rank = 1;
    else if (a.includes(f) || b.includes(v)) rank = 2;
    else if (f.length >= 5 && (close(f, a) || close(v, b))) rank = 3;
    if (rank >= 0) hits.push({ id, name, note, modes, rank: rank * 2 + (modes ? 0 : 1) });
  }
  hits.sort((x, y) => x.rank - y.rank || x.name.length - y.name.length);
  return hits.slice(0, 8);
}

export async function searchCities(q, lang) {
  if (q.trim().length < 2) return [];
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=6&language=${lang === 'sv' ? 'sv' : 'en'}&format=json`);
    const j = await r.json();
    return (j.results || []).map(x => ({ name: x.name, note: [x.admin1, x.country].filter(Boolean).join(', '), lat: +x.latitude.toFixed(3), lon: +x.longitude.toFixed(3) }));
  } catch { return []; }
}
