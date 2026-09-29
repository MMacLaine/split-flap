// One Durable Object in front of Alpha Vantage (0.9, from Fable's review of the second
// plan). The edge cache is kept per data centre and isolates share nothing, so without it
// every data centre would spend the key's allowance on its own. The object keeps one copy
// of each symbol's daily closes for the whole world, asks Alpha Vantage only when an
// exchange has closed since that copy was made, one request at a time, and counts the
// day's calls against the key's allowance (AV_PER_DAY, AV_PER_MIN). When the allowance is
// spent it answers with what it has and its age, never an error.
//
// The Worker reaches it at /split-flap/api/data/markets?s=SPY,ISF.LON (see data.js),
// after the edge cache. Symbols are from data/markets.json only.

import { avDaily, refresh, tried } from '../../src/markets.js';

const AV = 'https://www.alphavantage.co/query';

// Kept for the tests and older callers: whether a copy is worth replacing now.
export const due = (rec, ex, now) => refresh(rec, ex, now).due;
const dayKey = now => new Date(now).toISOString().slice(0, 10);
const tomorrow = now => Date.parse(dayKey(now) + 'T00:05:00Z') + 864e5;

export class Markets {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.storage = ctx.storage; this.fetchImpl = (...a) => fetch(...a); }
  get perDay() { return Math.max(1, +this.env.AV_PER_DAY || 25); }
  get gap() { return Math.ceil(60e3 / Math.max(1, +this.env.AV_PER_MIN || 5)); }

  // POST { symbols: [{ s, ex }] }: what is stored for each, and why a missing one is
  // missing (queued, no_data or budget) with when it will be tried, so the Worker can
  // cache the answer that long. Stale symbols join the queue, counted by how often
  // screens ask for them, so the ones on the most boards are fetched first.
  async fetch(req) {
    const { symbols } = await req.json(), now = Date.now(), out = {};
    const queue = (await this.storage.get('queue2')) || {}, used = (await this.storage.get('used:' + dayKey(now))) || 0, spent = used >= this.perDay;
    for (const { s, ex } of symbols) {
      const rec = (await this.storage.get('d:' + s)) || null, r = refresh(rec, ex, now);
      const has = rec && rec.closes ? { closes: rec.closes, at: rec.at } : { closes: null, at: null };
      if (r.due) {
        const k = JSON.stringify({ s, ex }); queue[k] = (queue[k] || 0) + 1;
        out[s] = Object.assign(has, spent ? { status: 'budget', next: tomorrow(now) } : { status: 'queued' });
      } else out[s] = Object.assign(has, { status: rec && rec.error === 'no_data' && !rec.closes ? 'no_data' : 'ok', next: r.next });
    }
    await this.storage.put('queue2', queue);
    if (Object.keys(queue).length && !(await this.storage.getAlarm())) await this.storage.setAlarm(spent ? tomorrow(now) : now + 50);
    return Response.json({ data: out, left: Math.max(0, this.perDay - used) });
  }

  // One symbol per alarm, the most asked for first, spaced by the key's per-minute limit,
  // until the queue or the day's allowance runs out. A reply that says the limit is
  // reached ends the day early. The queue is read again after the call, since fetch()
  // may have added symbols while it waited.
  async alarm() {
    const now = Date.now(), day = dayKey(now), q = (await this.storage.get('queue2')) || {}, keys = Object.keys(q);
    if (!keys.length) return;
    const used = (await this.storage.get('used:' + day)) || 0;
    if (used >= this.perDay) { await this.storage.setAlarm(tomorrow(now)); return; }
    const k = keys.sort((a, b) => q[b] - q[a])[0], { s, ex } = JSON.parse(k), rec = (await this.storage.get('d:' + s)) || null;
    const drop = async () => { const q2 = (await this.storage.get('queue2')) || {}; delete q2[k]; await this.storage.put('queue2', q2); return q2; };
    if (!refresh(rec, ex, now).due) { const q2 = await drop(); if (Object.keys(q2).length) await this.storage.setAlarm(now + 50); return; }
    await this.storage.put('used:' + day, used + 1);
    let res = { error: 'failed' };
    try {
      const r = await this.fetchImpl(`${AV}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(s)}&outputsize=compact&apikey=${this.env.ALPHAVANTAGE_KEY}`, { signal: AbortSignal.timeout(15e3) });
      res = r.ok ? avDaily(await r.json()) : { error: 'upstream_' + r.status };
    } catch { res = { error: 'failed' }; }
    if (res.error === 'limit') {
      // the key's own count says the day is spent: keep the symbol queued for tomorrow
      await this.storage.put('used:' + day, this.perDay);
      await this.storage.setAlarm(tomorrow(now));
      return;
    }
    await this.storage.put('d:' + s, tried(rec, res, ex, now));
    const q2 = await drop();
    if (Object.keys(q2).length) await this.storage.setAlarm(now + this.gap);
  }
}
