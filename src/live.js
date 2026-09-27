// Live data, fetched straight from the browser. Both sources are keyless and send open
// CORS headers, so there is no server of ours in the path:
//   SL departures: transport.integration.sl.se (the SL Transport API, via Trafiklab)
//   Weather and city search: Open-Meteo (CC BY 4.0)
// Only what the current board uses is fetched. Failed fetches keep the last good data,
// and the board says how old it is.

import { wxKey } from './content.js';

const SL_EVERY = 60e3, WX_EVERY = 15 * 60e3, RETRY = 60e3;

export class Live {
  constructor(onUpdate) {
    this.onUpdate = onUpdate;
    this.data = { sl: {}, wx: {} };
    this.wanted = { sl: new Map(), wx: new Map() };
    this.timer = setInterval(() => this.poll(), 5000);
    addEventListener('online', () => this.poll(true));
  }
  // Tell the fetcher which stations and places the board needs. Called whenever the
  // board changes; unneeded sources simply stop being refreshed.
  want(board) {
    const sl = new Map(), wx = new Map();
    for (const p of (board && board.pages) || []) for (const z of p.zones) {
      if (z.ch === 'sl' && z.o.site) sl.set(z.o.site, true);
      if (z.ch === 'weather' && z.o.lat != null) wx.set(wxKey(z.o), { lat: z.o.lat, lon: z.o.lon });
    }
    this.wanted = { sl, wx };
    this.poll();
  }
  poll(force) {
    const now = Date.now();
    const due = (entry, every) => force || !entry || (!entry.busy && now - (entry.tried || 0) >= (entry.err ? RETRY : every));
    for (const site of this.wanted.sl.keys()) if (due(this.data.sl[site], SL_EVERY)) this.fetchSl(site);
    for (const [k, p] of this.wanted.wx) if (due(this.data.wx[k], WX_EVERY)) this.fetchWx(k, p);
  }
  async fetchSl(site) {
    const e = this.data.sl[site] || (this.data.sl[site] = {});
    e.busy = true; e.tried = Date.now();
    try {
      const r = await fetch(`https://transport.integration.sl.se/v1/sites/${encodeURIComponent(site)}/departures?forecast=90`);
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      e.deps = (j.departures || []).filter(d => d.line).map(d => ({
        line: String(d.line.designation || '').slice(0, 4), dest: String(d.destination || '').slice(0, 40),
        expected: d.expected || null, scheduled: d.scheduled || null, mode: d.line.transport_mode || ''
      }));
      e.at = Date.now(); e.err = false;
    } catch { e.err = true; }
    e.busy = false; this.onUpdate();
  }
  async fetchWx(k, p) {
    const e = this.data.wx[k] || (this.data.wx[k] = {});
    e.busy = true; e.tried = Date.now();
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4`);
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      e.t = j.current.temperature_2m; e.code = j.current.weather_code;
      e.daily = (j.daily.time || []).map((date, i) => ({ date, max: j.daily.temperature_2m_max[i], min: j.daily.temperature_2m_min[i] }));
      e.at = Date.now(); e.err = false;
    } catch { e.err = true; }
    e.busy = false; this.onUpdate();
  }
  // Minutes since the oldest source this page depends on last updated, or 0 if fresh.
  // SL counts as stale after 3 minutes (departures move); weather after 45.
  staleMinutes(page) {
    if (!page) return 0;
    const now = Date.now(); let worst = 0;
    for (const z of page.zones) {
      let e = null, limit = 0;
      if (z.ch === 'sl' && z.o.site) { e = this.data.sl[z.o.site]; limit = 3 * 60e3; }
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
const fold = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Stations by name: prefix matches first, then anywhere in the name.
export async function searchStations(q) {
  const list = await loadSites(), f = fold(q.trim());
  if (!f) return [];
  const a = [], b = [];
  for (const [id, name, note] of list) {
    const n = fold(name);
    if (n.startsWith(f)) a.push({ id, name, note }); else if (n.includes(f)) b.push({ id, name, note });
    if (a.length >= 8) break;
  }
  return a.concat(b).slice(0, 8);
}

export async function searchCities(q, lang) {
  if (q.trim().length < 2) return [];
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=6&language=${lang === 'sv' ? 'sv' : 'en'}&format=json`);
    const j = await r.json();
    return (j.results || []).map(x => ({ name: x.name, note: [x.admin1, x.country].filter(Boolean).join(', '), lat: +x.latitude.toFixed(3), lon: +x.longitude.toFixed(3) }));
  } catch { return []; }
}
