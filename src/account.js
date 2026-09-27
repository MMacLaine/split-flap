// The account, in the browser (from 0.5). Talks to the Worker at /split-flap/api and
// keeps this browser's boards in step with the account, using the rules in sync.js.
// Local first: the app never waits on any of this. A guest, a kiosk, or a copy served
// without the Worker (python3 -m http.server) never gets past init(), and the app shows
// no account controls at all.

import { merge, adopt, markDirty, markDeleted, pushed, offerable, signOut, switchUser, emptyState } from './sync.js';
import { newId } from './content.js';
import { getFlag, setFlag } from './store.js';

const API = '/split-flap/api';
const KEY = 'sf_sync';

function loadState() {
  try { const s = JSON.parse(getFlag(KEY)); if (s && typeof s === 'object' && s.boards) return Object.assign({ declined: [] }, s); } catch { /* bad or missing */ }
  return Object.assign(emptyState(), { declined: [] });
}

export class Account {
  constructor(app) {
    this.app = app;
    this.available = false;   // the API answered, so the account controls show
    this.user = null;         // { id, name, email } when signed in
    this.status = 'idle';     // idle | syncing | waiting | failed
    this.offer = [];          // guest boards to offer up on the first sign-in
    this.state = loadState();
    this.seen = new Map();    // board id to its JSON when last known in step
    this.timer = 0;
  }
  saveState() { setFlag(KEY, JSON.stringify(this.state)); }

  async api(method, path, body) {
    const r = await fetch(API + path, { method, credentials: 'same-origin', cache: 'no-store',
      headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    let data = null; try { data = await r.json(); } catch { data = null; }
    return { status: r.status, data };
  }

  // Is there an API, and who is signed in? Anything but a JSON 200 or 401 means no API.
  async init() {
    let res;
    try { res = await this.api('GET', '/me'); } catch { return; }
    if (res.status === 401 && res.data && res.data.error) { this.available = true; this.app.render(); return; }
    if (res.status !== 200 || !res.data || !res.data.id) return;
    this.available = true; this.user = res.data;
    const b = this.app.boards;
    if (this.state.user && this.state.user !== this.user.id) {
      // another account's boards are here (its session ran out, say): never uploaded to this one
      const sw = switchUser(b, this.state, this.user.id);
      this.app.replaceBoards(sw.boards); this.state = Object.assign(sw.state, { declined: [] });
    }
    if (!this.state.user) {
      this.state.user = this.user.id;
      this.offer = offerable(this.app.boards, this.state).map(x => x.id).filter(id => !this.state.declined.includes(id));
    }
    this.saveState();
    addEventListener('online', () => this.sync());
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.sync(); });
    await this.sync();
  }

  signedIn() { return !!this.user; }

  // Pull, merge, push. Safe to call at any time; one run at a time.
  async sync() {
    if (!this.user || this.running) return;
    this.running = true; this.status = 'syncing'; this.paint();
    try {
      const res = await this.api('GET', '/boards');
      if (res.status === 401) { this.user = null; this.status = 'idle'; this.app.render(); return; }
      if (res.status !== 200) throw new Error(res.status);
      const m = merge(this.app.boards, res.data.boards, this.state, this.user.id, { suffix: this.app.t.otherDevice, newId: () => newId('b') });
      this.state = Object.assign(m.state, { declined: this.state.declined || [] });
      this.app.replaceBoards(m.boards);
      this.remember();
      await this.push(m.push);
      this.status = Object.values(this.state.boards).some(e => e.dirty && e.owner === this.user.id) ? 'waiting' : 'idle';
    } catch {
      this.status = 'failed';
    } finally {
      this.running = false; this.saveState(); this.paint();
    }
  }

  async push(ids) {
    for (const id of ids) {
      const e = this.state.boards[id]; if (!e || e.owner !== this.user.id) continue;
      const board = this.app.boards.find(x => x.id === id);
      const res = e.deleted || !board
        ? await this.api('DELETE', '/boards/' + encodeURIComponent(id), { baseRev: e.rev })
        : await this.api('PUT', '/boards/' + encodeURIComponent(id), { board, baseRev: e.rev });
      if (res.status === 200) { this.state = Object.assign(pushed(this.state, id, res.data.rev), { declined: this.state.declined }); continue; }
      if (res.status === 409) { this.again = true; continue; }   // changed elsewhere: the next pull sorts it out
      throw new Error(res.status);
    }
    if (this.again) { this.again = false; this.running = false; setTimeout(() => this.sync(), 50); }
  }

  // What each board looked like when last in step, so changed() can tell what moved.
  remember() { this.seen = new Map(this.app.boards.map(b => [b.id, JSON.stringify(b)])); }

  // After every save in the app. New boards made while signed in belong to the account
  // (guest boards from before are only offered); changed ones are marked; removed ones
  // are marked deleted. The push waits two seconds, so typing is one save, not many.
  changed() {
    if (!this.user || this.replacing) return;
    let st = this.state;
    const ids = new Set(this.app.boards.map(b => b.id));
    for (const b of this.app.boards) {
      const known = st.boards[b.id];
      if (!known) {
        if (this.offer.includes(b.id) || (st.declined || []).includes(b.id)) continue;
        st = adopt(st, [b.id], this.user.id);
      } else if (this.seen.get(b.id) !== JSON.stringify(b)) st = markDirty(st, b.id);
    }
    for (const id of Object.keys(st.boards)) if (!ids.has(id) && st.boards[id].owner === this.user.id && !st.boards[id].deleted) st = markDeleted(st, id);
    this.state = Object.assign(st, { declined: this.state.declined || [] });
    this.remember(); this.saveState();
    this.status = 'waiting'; this.paint();
    clearTimeout(this.timer); this.timer = setTimeout(() => this.sync(), 2000);
  }

  // The first sign-in offer: take the guest boards into the account, or leave them here.
  answerOffer(keep) {
    if (keep) this.state = Object.assign(adopt(this.state, this.offer, this.user.id), { declined: this.state.declined || [] });
    else this.state.declined = [...new Set((this.state.declined || []).concat(this.offer))];
    this.offer = []; this.saveState(); this.app.render();
    if (keep) this.sync();
  }

  // Sign in with Google: to Google and back to the page this started from.
  async signIn() {
    const res = await this.api('POST', '/auth/sign-in/social', { provider: 'google', callbackURL: location.pathname + location.search });
    if (res.data && res.data.url) location.href = res.data.url;
    else this.app.flash(this.app.t.signInFailed);
  }

  // Signing out takes the account's boards out of this browser, after a last push.
  async signOut() {
    clearTimeout(this.timer);
    try { await this.sync(); } catch { /* offline: what is not pushed stays on the server as it was */ }
    await this.api('POST', '/auth/sign-out', {}).catch(() => null);
    this.forget();
  }
  forget() {
    const r = signOut(this.app.boards, this.state);
    this.app.replaceBoards(r.boards.length ? r.boards : null);
    this.state = Object.assign(r.state, { declined: [] }); this.saveState();
    this.user = null; this.offer = []; this.status = 'idle'; this.app.render();
  }

  async deleteAccount() {
    const res = await this.api('DELETE', '/account');
    if (res.status === 200) { this.forget(); this.app.flash(this.app.t.accountDeleted); return true; }
    this.app.flash(res.data && res.data.error === 'sign_in_again' ? this.app.t.signInAgainToDelete : this.app.t.deleteFailed);
    return false;
  }

  exportAll() { location.href = API + '/export'; }

  paint() { this.app.paintAccount && this.app.paintAccount(); }
}
