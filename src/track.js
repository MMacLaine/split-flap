// Anonymous usage counts (0.11.5). What people use, where they stop and what breaks,
// counted, never who they are: no id, no cookie, nothing that follows a person. Events
// queue here and go to the Worker in one small batch a minute, or when the page is
// hidden. The Worker checks them again (worker/src/events.js).

import { getFlag, setFlag } from './store.js';

const URL_E = '/split-flap/api/e', EVERY = 60000, MAX_QUEUE = 40;

// The kind of screen, from its size. A wall is a big screen in kiosk mode or fullscreen.
export function deviceOf(w, h, wall) {
  if (wall && Math.max(w, h) >= 1000) return 'wall';
  const short = Math.min(w, h);
  return short < 600 ? 'phone' : short < 900 ? 'tablet' : 'desktop';
}
// Counts in bands, so a number never singles anyone out.
export const band = n => n <= 0 ? '0' : n === 1 ? '1' : n <= 3 ? '2-3' : n <= 9 ? '4-9' : '10+';
// An error's message without what could be personal: numbers and quoted text go.
export const errText = m => String(m || '').replace(/(["'`]).*?\1/g, '"…"').replace(/\d+/g, '#').slice(0, 60);

export class Track {
  constructor(o = {}) {
    this.q = []; this.ctx = o.ctx || (() => ({})); this.send = o.send || null;
    this.last = ''; this.off = !!o.off;
    this.returning = getFlag('sf_seen') === '1';
    if (!this.returning) setFlag('sf_seen', '1');
    if (!this.off && typeof window !== 'undefined') {
      this.timer = setInterval(() => this.flush(), EVERY);
      addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') this.flush(true); });
      addEventListener('pagehide', () => this.flush(true));
    }
  }
  // One event: a name, up to three short values (ids we made, never what someone typed),
  // and a number. A run of the same event in a row counts once.
  ev(n, a, b, c, v) {
    if (this.off) return;
    const k = [n, a, b, c].join('|');
    if (n === 'view' && k === this.last) return;
    this.last = k;
    const e = { n }; if (a != null) e.a = String(a); if (b != null) e.b = String(b); if (c != null) e.c = String(c); if (v != null) e.v = v;
    this.q.push(e);
    if (this.q.length >= MAX_QUEUE) this.flush();   // a busy minute sends early rather than dropping the first events
  }
  batch() {
    if (!this.q.length) return null;
    const body = { c: Object.assign({ r: this.returning ? 'yes' : 'no' }, this.ctx()), e: this.q.splice(0) };
    return JSON.stringify(body);
  }
  flush(leaving) {
    const body = this.batch(); if (!body) return;
    if (this.send) { this.send(body); return; }
    // fetch with keepalive, not sendBeacon: it is sent on a hidden page too, carries no
    // cookie and always carries the Origin header the Worker checks
    try {
      fetch(URL_E, { method: 'POST', body, keepalive: true, credentials: 'omit', headers: { 'content-type': 'text/plain' } }).catch(() => {});
    } catch { /* counting must never break the board */ }
  }
}
