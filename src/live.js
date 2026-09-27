// Live data, fetched straight from the browser. Both sources are keyless and send open
// CORS headers, so there is no server of ours in the path:
//   SL departures: transport.integration.sl.se (the SL Transport API, via Trafiklab)
//   Weather and city search: Open-Meteo (CC BY 4.0)
// Only what the current board uses is fetched. Failed fetches keep the last good data,
// and the board says how old it is.

import { wxKey, slSource } from './content.js';

const SL_EVERY = 60e3, WX_EVERY = 15 * 60e3;
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
    this.data = { sl: {}, wx: {} };
    this.wanted = { sl: new Map(), wx: new Map() };
    this.timer = setInterval(() => this.poll(), 2000);
    addEventListener('online', () => this.poll(true));
  }
  // Tell the fetcher which stations and places the board needs. Called whenever the
  // board changes; unneeded sources simply stop being refreshed.
  want(board) {
    const sl = new Map(), wx = new Map();
    for (const p of (board && board.pages) || []) for (const z of p.zones) {
      if (z.ch === 'sl') { const src = slSource(z.o, this.data); if (src) for (const id of src.sites) sl.set(id, true); }
      if (z.ch === 'weather' && z.o.lat != null) wx.set(wxKey(z.o), { lat: z.o.lat, lon: z.o.lon });
    }
    this.wanted = { sl, wx };
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
  // SL counts as stale after 3 minutes (departures move); weather after 45.
  staleMinutes(page) {
    if (!page) return 0;
    const now = Date.now(); let worst = 0;
    for (const z of page.zones) {
      let e = null, limit = 0;
      if (z.ch === 'sl') { const src = slSource(z.o, this.data); if (src) { e = this.data.sl[src.sites[0]]; limit = 3 * 60e3; } }
      if (z.ch === 'weather' && z.o.lat != null) { e = this.data.wx[wxKey(z.o)]; limit = 45 * 60e3; }
      if (e && e.at && now - e.at > limit) worst = Math.max(worst, Math.floor((now - e.at) / 60e3));
    }
    return worst;
  }
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
