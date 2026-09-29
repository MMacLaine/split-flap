// Live data, fetched straight from the browser. Every source is keyless and sends open
// CORS headers, so there is no server of ours in the path:
//   SL departures: transport.integration.sl.se (the SL Transport API, via Trafiklab)
//   Weather and city search: Open-Meteo (CC BY 4.0)
//   Electricity spot prices: elprisetjustnu.se
//   Exchange rates: Frankfurter (European Central Bank reference rates)
//   On this day: Wikipedia's featured feed (CC BY-SA 4.0)
//   Follow a URL: whatever address the board names, if it allows browsers to read it
//   Departures anywhere (0.8): Transitous, through our Worker's cache (see src/transit.js)
// Only what the current board uses is fetched. Failed fetches keep the last good data,
// and the board says how old it is.

import { wxKey, wxPlace, slStations, AREAS, stockholmWall, depStops, nearKey } from './content.js';
import { stoptimes, stops as stopList, upstream, roundLL } from './transit.js';
import { COINS } from './content.js';
import { upstream as rateUrl, ecbSeries, fedSeries } from './rates.js';
import { parseFeed } from './feeds.js';
const FEED_EVERY = 15 * 60e3;
const RATES_EVERY = 6 * 36e5;
import { placeOf } from './place.js';
import { lastClose, avDaily, exchangeOf, PERIOD_DAYS } from './markets.js';
import { getConn, parseSheet, parseSheetHistory, recordPoint, historyOf, loadHist, saveHist, loadAv, saveAv, ownKeyStep, exchangeTz } from './connections.js';

// Markets (0.9): the coins CoinGecko knows by id, and their names on the board.
export const COIN_IDS = { BTC: ['bitcoin', 'BITCOIN'], ETH: ['ethereum', 'ETHER'], SOL: ['solana', 'SOLANA'], XRP: ['ripple', 'XRP'], ADA: ['cardano', 'CARDANO'], DOGE: ['dogecoin', 'DOGECOIN'] };
const MK_EVERY = 15 * 60e3, MK_WAIT = 60e3, SHEET_EVERY = 5 * 60e3, AV_GAP = 15e3;
const EX_CC = { LON: 'GB', US: 'US', FRK: 'DE', DEX: 'DE', PAR: 'FR', AMS: 'NL', TYO: 'JP', HKG: 'HK' };

// Our Worker's data routes (0.8). Whether this page has a Worker behind it is decided
// once per page load (Fable's 0.8.0 review), so a Worker that fails mid-run never sends
// every screen straight to the source, uncached:
//   on maclaine.se there always is one, so answers come from the Worker or not at all;
//   elsewhere (local development, a copy hosted without the Worker) /data/status is
//   asked once, and a 404 means asking the source directly for the rest of the load.
// A network failure is not remembered, so a screen that starts before its network is up
// asks again. Either way the answer is shaped the same way.
const DATA = '/split-flap/api/data';
let mode = null;
export function dataMode(host = typeof location !== 'undefined' ? location.hostname : '') {
  if (/(^|\.)maclaine\.se$/.test(host)) return Promise.resolve({ worker: true });
  if (!mode) mode = (async () => {
    try {
      const r = await fetch(DATA + '/status', { credentials: 'omit' });
      return { worker: r.status !== 404 };
    } catch { mode = null; return { worker: false }; }
  })();
  return mode;
}
export const resetDataMode = () => { mode = null; };
// Only our own "switched off" answer counts as off. Cloudflare also answers 503 when a
// Worker runs out of CPU time, and that is a failure like any other, retried as usual.
export async function viaWorker(path, direct, shape, host) {
  if (!(await dataMode(host)).worker) { if (!direct) throw new Error('no_worker'); return shape(await get(direct)); }
  const r = await fetch(DATA + path, { credentials: 'omit', cache: 'no-store' });
  if (r.ok && /json/.test(r.headers.get('content-type') || '')) return await r.json();
  if (r.status === 503) {
    let j = null; try { j = await r.json(); } catch { j = null; }
    if (j && j.error === 'source_off') { const e = new Error('off'); e.off = true; throw e; }
  }
  throw new Error(String(r.status));
}

const COIN_EVERY = 5 * 60e3, HOL_EVERY = 24 * 36e5, TR_EVERY = 2 * 60e3, TR_BOARD_EVERY = 60e3, NEAR_EVERY = 24 * 36e5, STATUS_EVERY = 30 * 60e3, SL_EVERY = 60e3, WX_EVERY = 15 * 60e3, EL_EVERY = 30 * 60e3, FX_EVERY = 3 * 36e5, OTD_EVERY = 6 * 36e5;
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
    this.data = { sl: {}, wx: {}, el: {}, fx: {}, otd: {}, url: {}, tr: {}, near: {}, coin: {}, hol: {}, mk: {}, mkq: {}, rates: {}, feeds: {}, off: [], loc: null, cc: null };
    this.ratesWant = new Set(); this.feedsWant = new Set();
    this.mkWant = { built: [], crypto: new Map(), key: new Set(), sheet: new Set() };
    this.wanted = { sl: new Map(), wx: new Map(), el: new Set(), fx: new Set(), otd: new Set(), url: new Map(), tr: new Map(), near: new Map(), coin: new Map(), hol: new Set() };
    this.status = { tried: 0 };
    this.timer = setInterval(() => this.poll(), 2000);
    addEventListener('online', () => this.poll(true));
  }
  // Tell the fetcher which stations and places the board needs. Called whenever the
  // board changes; unneeded sources simply stop being refreshed.
  // lang picks the Wikipedia edition for On this day.
  want(board, lang) {
    this.board = board; this.lang = lang;
    const sl = new Map(), wx = new Map(), el = new Set(), fx = new Set(), otd = new Set(), url = new Map(), tr = new Map(), near = new Map(), coin = new Map(), hol = new Set();
    this.data.loc = board && board.loc && board.loc.lat != null ? board.loc : null;
    this.data.cc = placeOf(board, { langs: typeof navigator !== 'undefined' ? navigator.languages : [] }).cc;
    const ownHolidays = !this.data.cc || this.data.cc === 'SE';   // Sweden's red and flag days are worked out here
    for (const p of (board && board.pages) || []) for (const z of p.zones) {
      const o = z.o || {};
      if (z.ch === 'sl') for (const st of slStations(o, this.data)) for (const id of st.sites) sl.set(id, true);
      if (z.ch === 'weather') { const pl = wxPlace(o, this.data); if (pl) wx.set(wxKey(pl), { lat: pl.lat, lon: pl.lon }); }
      if (z.ch === 'electricity') el.add(AREAS[o.area] ? o.area : 'SE3');
      if (z.ch === 'currency') {
        const base = o.base || 'SEK', pairs = Array.isArray(o.pairs) ? o.pairs : [];
        if (!pairs.length || pairs.some(p => !COINS[p])) fx.add(base);
        for (const p of pairs) if (COINS[p]) coin.set(base, (coin.get(base) || new Set()).add(COINS[p]));
      }
      if (!ownHolidays && ((z.ch === 'today' && o.days !== false) || (z.ch === 'countdown' && o.to === 'holiday'))) hol.add(this.data.cc);
      if (z.ch === 'onthisday') otd.add(lang === 'sv' ? 'sv' : 'en');
      if (z.ch === 'url' && /^https:\/\//.test(o.url || '')) url.set(o.url, { every: Math.max(1, +o.every || 5) * 60e3, path: o.path || '' });
      if (z.ch === 'departures') {
        if (o.near && this.data.loc) near.set(nearKey(this.data.loc), { lat: this.data.loc.lat, lon: this.data.loc.lon });
        // every two minutes, counted down locally in between; a station board, where
        // platforms change, every minute (Fable's 0.8.0 review: the Worker's daily allowance)
        const every = o.view === 'board' ? TR_BOARD_EVERY : TR_EVERY;
        for (const st of depStops(o, this.data)) { if (st.src === 'sl') sl.set(st.id, true); else tr.set(st.id, Math.min(every, tr.get(st.id) || Infinity)); }
      }
    }
    // Markets: built-in symbols in lists of up to eight (one Worker request each), coins
    // by currency and the longest period asked for, and your own key's and sheet's symbols.
    // The exchange's country's holidays are asked for too, for open or closed.
    const built = new Set(), crypto = new Map(), key = new Set(), sheet = new Set();
    for (const p of (board && board.pages) || []) for (const z of p.zones) {
      if (z.ch !== 'markets') continue;
      const o = z.o || {}, src = o.source || 'built';
      for (const { s } of (o.symbols || []).filter(x => x && x.s)) {
        if (src === 'built') built.add(s);
        else if (src === 'crypto' && COIN_IDS[s]) { const k = `${s}|${o.cur || 'USD'}`, d = Math.min(365, PERIOD_DAYS[o.period || '1m'] || 31); crypto.set(k, Math.max(d, crypto.get(k) || 0)); }
        else if (src === 'key') key.add(s);
        else if (src === 'sheet') sheet.add(s);
        const cc = src === 'crypto' ? null : EX_CC[exchangeOf(s)];
        if (cc) hol.add(cc);
      }
    }
    const list = [...built].sort(), chunks = [];
    for (let i = 0; i < list.length; i += 8) chunks.push(list.slice(i, i + 8));
    this.mkWant = { built: chunks, crypto, key, sheet };
    // interest rates (0.9.2): each bank and period on the board
    const rates = new Set();
    for (const p of (board && board.pages) || []) for (const z of p.zones) if (z.ch === 'rates') for (const b of ((z.o || {}).banks || [])) rates.add(`${b}:${(z.o || {}).years || 5}`);
    this.ratesWant = rates;
    const feeds = new Set();
    for (const p of (board && board.pages) || []) for (const z of p.zones) if (z.ch === 'headlines') for (const f of ((z.o || {}).feeds || [])) if (f && f.url) feeds.add(f.url);
    this.feedsWant = feeds;
    this.wanted = { sl, wx, el, fx, otd, url, tr, near, coin, hol };
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
    // Transitous the same way: one stop per poll, most overdue first.
    const trDue = [...this.wanted.tr.keys()].filter(id => due(this.data.tr[id], this.wanted.tr.get(id))).sort((a, b) => ((this.data.tr[a] || {}).tried || 0) - ((this.data.tr[b] || {}).tried || 0));
    if (trDue.length) this.fetchTr(trDue[0]);
    for (const [k, p] of this.wanted.near) if (due(this.data.near[k], NEAR_EVERY)) this.fetchNear(k, p);
    if (now - this.status.tried > STATUS_EVERY) this.fetchStatus();   // so the picker knows before a tile asks
    // markets: every 15 minutes, or every minute while a symbol is still on its way
    for (const ch of this.mkWant.built) {
      const k = ch.join(','), e = this.data.mkq[k];
      if (due(e, (e && e.every) || MK_EVERY)) this.fetchMarkets(k, ch);
    }
    for (const [k, days] of this.mkWant.crypto) if (due(this.data.mkq['c:' + k], MK_EVERY)) this.fetchCrypto(k, days);
    if (this.mkWant.sheet.size && due(this.data.mkq.sheet, SHEET_EVERY)) this.fetchSheet();
    if (this.mkWant.key.size && due(this.data.mkq.key, AV_GAP)) this.fetchOwnKey();
    for (const k of this.ratesWant) if (due(this.data.rates[k], RATES_EVERY)) this.fetchRates(k);
    for (const u of this.feedsWant) if (due(this.data.feeds[u], FEED_EVERY)) this.fetchFeed(u);
    for (const [k, p] of this.wanted.wx) if (due(this.data.wx[k], WX_EVERY)) this.fetchWx(k, p);
    for (const a of this.wanted.el) { const e = this.data.el[a]; if (due(e, EL_EVERY) || this.elStale(e, now)) this.fetchEl(a); }
    for (const b of this.wanted.fx) if (due(this.data.fx[b], FX_EVERY)) this.fetchFx(b);
    for (const [b, ids] of this.wanted.coin) { const e = this.data.coin[b]; if (due(e, COIN_EVERY) || (e && !e.busy && e.ids !== [...ids].sort().join())) this.fetchCoin(b, [...ids].sort()); }
    for (const cc of this.wanted.hol) { const e = this.data.hol[cc]; if (due(e, HOL_EVERY) || (e && !e.busy && e.year !== new Date(now).getFullYear())) this.fetchHol(cc); }
    for (const l of this.wanted.otd) { const e = this.data.otd[l]; if (due(e, OTD_EVERY) || (e && !e.busy && e.md !== monthDay(now))) this.fetchOtd(l); }
    for (const [u, p] of this.wanted.url) if (due(this.data.url[u], p.every)) this.fetchUrl(u, p);
  }
  fetchTr(id) {
    return this.run('tr', id, async e => {
      try { Object.assign(e, await viaWorker(`/transit/departures?stop=${encodeURIComponent(id)}&n=12`, upstream.departures(id, 12), stoptimes)); e.off = false; }
      catch (err) { if (err.off) { e.off = true; delete e.deps; } throw err; }
    });
  }
  fetchNear(k, p) {
    return this.run('near', k, async e => {
      const lat = roundLL(p.lat), lon = roundLL(p.lon);
      e.stops = (await viaWorker(`/transit/near?lat=${lat}&lon=${lon}`, upstream.near(lat, lon), j => ({ stops: stopList(j) }))).stops || [];
      this.want(this.board, this.lang);   // the stop is known now, so its departures can be asked for
    });
  }
  // Built-in symbols through the Worker's Markets object: daily closes, shared by every
  // screen. The price shown is the last close, and the panel says so.
  // The next ask waits as long as the Worker says nothing will change (0.9.0 review):
  // a minute while a symbol is on its way, else until the soonest next try, 15 minutes at most.
  fetchMarkets(k, list) {
    return this.run('mkq', k, async e => {
      const j = await viaWorker(`/markets?s=${list.map(encodeURIComponent).join(',')}`, null, null), now = Date.now();
      let wait = MK_EVERY;
      for (const s of list) {
        const d = j.data && j.data[s]; if (!d) continue;
        const closes = Array.isArray(d.closes) && d.closes.length ? d.closes : null;
        this.data.mk['built:' + s] = { name: d.name, ex: d.ex, cur: d.cur, via: d.via, closes, closeOnly: true, status: d.status,
          price: closes ? closes[closes.length - 1].c : null, prev: closes && closes.length > 1 ? closes[closes.length - 2].c : null };
        if (d.status === 'queued') wait = Math.min(wait, MK_WAIT);
        else if (d.next) wait = Math.min(wait, Math.max(MK_WAIT, d.next - now));
      }
      e.every = wait;
    });
  }
  // A coin's price history from CoinGecko (keyless), daily over a period, every few minutes for a day.
  fetchCrypto(k, days) {
    const [s, cur] = k.split('|');
    return this.run('mkq', 'c:' + k, async () => {
      const j = await get(`https://api.coingecko.com/api/v3/coins/${COIN_IDS[s][0]}/market_chart?vs_currency=${cur.toLowerCase()}&days=${days}${days > 1 ? '&interval=daily' : ''}`);
      const pts = (j.prices || []).filter(p => Array.isArray(p) && Number.isFinite(p[1])).map(([t, c]) => ({ d: new Date(t).toISOString(), c }));
      const last = pts[pts.length - 1], dayAgo = pts.slice().reverse().find(p => Date.parse(p.d) <= Date.now() - 864e5 + 30 * 60e3);
      this.data.mk['crypto:' + s] = { name: COIN_IDS[s][1], ex: 'CRYPTO', cur, closes: pts, price: last ? last.c : null, prev: dayAgo ? dayAgo.c : null };
    });
  }
  // Your published sheet: every five minutes, each price kept so the line builds on this screen.
  fetchSheet() {
    return this.run('mkq', 'sheet', async () => {
      const url = getConn().sheet;
      if (!url) { for (const s of this.mkWant.sheet) this.data.mk['sheet:' + s] = { needsKey: true }; return; }
      const ac = new AbortController(), timer = setTimeout(() => ac.abort(), 12e3);
      let text;
      try { const r = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: ac.signal }); if (!r.ok) throw new Error(r.status); text = await r.text(); }
      finally { clearTimeout(timer); }
      const rows = parseSheet(text), hists = parseSheetHistory(text), hist = loadHist(), now = Date.now();
      for (const s of this.mkWant.sheet) {
        // a symbol can be a row in the table (its price and name), a history block, or both;
        // the sheet's own history wins, else this screen builds the line from the prices it reads
        const x = rows[s], hc = hists[s];
        if (!x && !(hc && hc.length)) { this.data.mk['sheet:' + s] = { status: 'no_data' }; continue; }
        const ex = x && /^(LON|STO|US|FRK|PAR|AMS|TYO|HKG)$/.test(x.ex) ? x.ex : exchangeOf(s);
        const price = x ? x.price : hc[hc.length - 1].c;
        if (x) recordPoint(hist, s, x.price, now, exchangeTz(ex));
        const closes = hc && hc.length ? hc.concat(x && hc[hc.length - 1].d < new Date(now).toISOString().slice(0, 10) && x.price !== hc[hc.length - 1].c ? [{ d: new Date(now).toISOString(), c: x.price }] : []) : historyOf(hist, s);
        const prev = x && Number.isFinite(x.pct) ? x.price / (1 + x.pct / 100) : hc && hc.length > 1 ? hc[hc.length - 2].c : null;
        this.data.mk['sheet:' + s] = { name: x ? x.name : s, cur: x ? x.cur : '', ex, price, prev, closes, ...(x ? {} : { closeOnly: true }) };
      }
      saveHist(hist);
    });
  }
  // Your own Alpha Vantage key, from this browser: one daily series per symbol after each
  // close, kept here so a reload spends nothing, and one call per poll at most.
  fetchOwnKey() {
    return this.run('mkq', 'key', async () => {
      const key = getConn().av, now = Date.now();
      if (!key) { for (const s of this.mkWant.key) this.data.mk['key:' + s] = { needsKey: true }; return; }
      const cache = await ownKeyStep(loadAv(), [...this.mkWant.key], key, now, get);
      // the key was changed or removed while the call was out: that answer is not this key's
      if (getConn().av !== key) { for (const s of this.mkWant.key) this.data.mk['key:' + s] = getConn().av ? { status: 'queued' } : { needsKey: true }; return; }
      saveAv(cache);
      for (const s of this.mkWant.key) {
        const c = cache[s];
        if (c && c.closes && c.closes.length) { const cl = c.closes; this.data.mk['key:' + s] = { ex: exchangeOf(s), closes: cl, closeOnly: true, price: cl[cl.length - 1].c, prev: cl.length > 1 ? cl[cl.length - 2].c : null }; }
        else this.data.mk['key:' + s] = { status: c && c.error === 'no_data' ? 'no_data' : cache._limit ? 'budget' : 'queued' };
      }
    });
  }
  // A central bank's rate over one or five years: the ECB and the Fed from the browser, the
  // Bank of England and the Riksbank through the Worker, which they need (no CORS).
  fetchRates(k) {
    const [b, y] = k.split(':');
    return this.run('rates', k, async e => {
      const now = Date.now(), to = new Date(now).toISOString().slice(0, 10), from = new Date(now - (+y || 5) * 366 * 864e5).toISOString().slice(0, 10);
      try {
        e.series = b === 'ecb' ? ecbSeries(await get(rateUrl.ecb(from))) : b === 'fed' ? fedSeries(await get(rateUrl.fed(from, to)))
          : (await viaWorker(`/rates?b=${b}&y=${y}`, null, null)).series || [];
        e.off = false;
      } catch (err) { if (err.off) e.off = true; throw err; }
      if (!e.series.length) throw new Error('empty');
    });
  }
  // A feed (0.9.3): straight from the browser when the feed allows it, else through the
  // Worker, which fetches only the built-in feeds and ones an account has added. Which way
  // worked is remembered, so a feed that blocks browsers is not asked directly again.
  fetchFeed(u) {
    return this.run('feeds', u, async e => {
      let text = null;
      if (e.direct !== false) {
        try { const r = await fetch(u, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(10e3) }); if (r.ok) { text = await r.text(); e.direct = true; } }
        catch { e.direct = false; }
      }
      if (text == null) {
        if (!(await dataMode()).worker) throw new Error('no_worker');
        const r = await fetch(`${DATA}/feed?u=${encodeURIComponent(u)}`, { credentials: 'omit', cache: 'no-store' });
        if (r.status === 404) { e.notAdded = true; throw new Error('not_added'); }
        if (!r.ok) throw new Error(r.status);
        text = await r.text(); e.notAdded = false;
      }
      const f = parseFeed(text);
      if (!f.items.length) throw new Error('empty');
      e.title = f.title; e.items = f.items;
    });
  }
  // Which sources the Worker has switched off. No Worker (local), nothing is off.
  async fetchStatus() {
    this.status.tried = Date.now();
    if (!(await dataMode()).worker) return;
    try { const r = await fetch(DATA + '/status', { credentials: 'omit' }); if (r.ok && /json/.test(r.headers.get('content-type') || '')) { const j = await r.json(); this.data.off = Array.isArray(j.off) ? j.off.slice(0, 20) : []; this.onUpdate(); } }
    catch { /* keep what we had */ }
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
  // CoinGecko's public price call, one per base currency for every coin on the board.
  fetchCoin(base, ids) {
    return this.run('coin', base, async e => {
      const j = await get(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=${base.toLowerCase()}&include_24hr_change=true`);
      const k = base.toLowerCase(), prices = {};
      for (const id of ids) if (j[id] && Number.isFinite(j[id][k])) prices[id] = { price: j[id][k], change: Number.isFinite(j[id][k + '_24h_change']) ? j[id][k + '_24h_change'] : null };
      e.prices = prices; e.ids = ids.join();
    });
  }
  // A country's public holidays this year and next, from Nager.Date: only the ones the
  // whole country has off (a Bavarian holiday is not Hamburg's).
  fetchHol(cc) {
    return this.run('hol', cc, async e => {
      const y = new Date().getFullYear(), days = {};
      for (const yr of [y, y + 1]) {
        try {
          const j = await get(`https://date.nager.at/api/v3/PublicHolidays/${yr}/${cc}`);
          for (const x of Array.isArray(j) ? j : []) if (x && /^\d{4}-\d{2}-\d{2}$/.test(x.date) && x.global !== false) days[x.date] = { en: String(x.name || '').slice(0, 60), local: String(x.localName || '').slice(0, 60) };
        } catch (err) { if (yr === y) throw err; }
      }
      e.days = days; e.year = y;
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
        + '&minutely_15=precipitation&forecast_minutely_15=12'
        + '&timezone=auto&forecast_days=4&wind_speed_unit=ms');
      const c = j.current, h = j.hourly, dl = j.daily;
      e.t = c.temperature_2m; e.feels = c.apparent_temperature; e.code = c.weather_code; e.wind = c.wind_speed_10m;
      // hourly from the current hour onwards (times are local to the place, as is current.time)
      const from = Math.max(0, h.time.findIndex(t => t >= c.time.slice(0, 13)));
      e.hourly = h.time.slice(from, from + 24).map((time, i) => ({ time, t: h.temperature_2m[from + i], pp: h.precipitation_probability[from + i], code: h.weather_code[from + i] }));
      // rain in the next hours, 15 minutes at a time, as minutes from now (0.8)
      const q = j.minutely_15, t0 = Date.parse(c.time + ':00Z');
      e.soon = q && Array.isArray(q.time) ? q.time.map((time, i) => ({ min: Math.round((Date.parse(time + ':00Z') - t0) / 60e3), mm: q.precipitation[i] })).filter(x => x.min >= -14 && Number.isFinite(x.mm)) : null;
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
      if (z.ch === 'departures') for (const st of depStops(o, this.data)) check((st.src === 'sl' ? this.data.sl : this.data.tr)[st.id], st.src === 'sl' ? 3 * 60e3 : 5 * 60e3);
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

// Stops by name for the Departures tile: SL's own list first when the screen is in
// Sweden (or has no place yet), then Transitous, which covers most of Europe and North
// America. Each result says which source it is from.
export async function searchStops(q, lang, place) {
  const text = q.trim(); if (text.length < 2) return [];
  const sl = !place || !place.cc || place.cc === 'SE' ? (await searchStations(text)).slice(0, 4).map(r => ({ src: 'sl', id: r.id, name: r.name, note: 'SL', modes: r.modes })) : [];
  let tr = [];
  try { tr = (await viaWorker(`/transit/search?text=${encodeURIComponent(text)}&lang=${lang === 'sv' ? 'sv' : 'en'}`, upstream.search(text, lang === 'sv' ? 'sv' : 'en'), j => ({ stops: stopList(j) }))).stops || []; }
  catch { tr = []; }
  return sl.concat(tr.map(r => ({ src: 'tr', id: r.id, name: r.name, note: r.note || '', modes: r.modes }))).slice(0, 10);
}
export async function nearStops(lat, lon) {
  try { return (await viaWorker(`/transit/near?lat=${roundLL(lat)}&lon=${roundLL(lon)}`, upstream.near(roundLL(lat), roundLL(lon)), j => ({ stops: stopList(j) }))).stops || []; }
  catch { return []; }
}

export async function searchCities(q, lang) {
  if (q.trim().length < 2) return [];
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=6&language=${lang === 'sv' ? 'sv' : 'en'}&format=json`);
    const j = await r.json();
    return (j.results || []).map(x => ({ name: x.name, note: [x.admin1, x.country].filter(Boolean).join(', '), lat: +x.latitude.toFixed(3), lon: +x.longitude.toFixed(3),
      ...(x.country_code ? { cc: String(x.country_code).toUpperCase() } : {}), ...(x.timezone ? { tz: x.timezone } : {}) }));
  } catch { return []; }
}
