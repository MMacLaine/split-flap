// The account, in the browser (from 0.5). Talks to the Worker at /split-flap/api and
// keeps this browser's boards in step with the account, using the rules in sync.js.
// Local first: the app never waits on any of this. A guest, a kiosk, or a copy served
// without the Worker (npm run serve) never gets past init(), and the app shows
// no account controls at all.

import { merge, adopt, markDirty, markDeleted, pushed, refused, unrefuse, unsynced, strays, offerable, signOut, switchUser, emptyState } from './sync.js';
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
    this.status = 'idle';     // idle | syncing | waiting | failed | signedout (the session ran out)
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
    try { res = await this.api('GET', '/me'); } catch { this.retryInit(); return; }   // offline, or the Worker mid-deploy
    if (res.status === 401 && res.data && res.data.error) {
      this.available = true;
      if (this.state.user) this.status = 'signedout';   // this browser holds an account's boards: changes keep being marked
      this.app.render(); return;
    }
    if (res.status !== 200 || !res.data || !res.data.id) { if (res.status >= 500) this.retryInit(); return; }
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

  // The API did not answer: ask again when back online, or in half a minute. A copy served
  // without the Worker answers 404, which is not retried.
  retryInit() {
    if (this.retrying) return; this.retrying = true;
    const again = () => { removeEventListener('online', again); clearTimeout(t); this.retrying = false; this.init(); };
    addEventListener('online', again); const t = setTimeout(again, 30000);
  }

  signedIn() { return !!this.user; }

  // Pull, merge, push. Safe to call at any time; one run at a time.
  async sync() {
    if (!this.user || this.running) return;
    this.running = true; this.status = 'syncing'; this.paint();
    try {
      const stray = strays(this.app.boards, this.state, this.offer.concat(this.state.declined || []));
      if (stray.length) this.state = Object.assign(adopt(this.state, stray, this.user.id), { declined: this.state.declined || [] });
      const res = await this.api('GET', '/boards');
      if (res.status === 401) { this.lostSession(); return; }
      if (res.status !== 200) throw new Error(res.status);
      const m = merge(this.app.boards, res.data.boards, this.state, this.user.id, { suffix: this.app.t.otherDevice, newId: () => newId('b') });
      this.state = Object.assign(m.state, { declined: this.state.declined || [] });
      this.offer = [...new Set(this.offer.concat(m.guests))];   // guest boards that had to become copies: offered, not taken
      for (const r of res.data.boards) if (this.state.boards[r.id] && r.updated) this.state.boards[r.id].updated = r.updated;   // for the board menu
      this.app.replaceBoards(m.boards);
      this.remember();
      await this.push(m.push);
      if (!this.user) return;                                  // signed out part way
      this.status = Object.values(this.state.boards).some(e => e.dirty && !e.error && e.owner === this.user.id) ? 'waiting' : 'idle';
    } catch {
      if (this.user) this.status = 'failed';
    } finally {
      this.running = false; this.saveState(); this.paint();
    }
  }

  // Each board on its own, so one refused board never holds up the rest.
  async push(ids) {
    for (const id of ids) {
      if (!this.user) return;
      const e = this.state.boards[id]; if (!e || e.owner !== this.user.id) continue;
      const board = this.app.boards.find(x => x.id === id);
      const res = e.deleted || !board
        ? await this.api('DELETE', '/boards/' + encodeURIComponent(id), { baseRev: e.rev })
        : await this.api('PUT', '/boards/' + encodeURIComponent(id), { board, baseRev: e.rev });
      if (res.status === 200) {
        this.state = pushed(this.state, id, res.data.rev);
        if (this.state.boards[id] && res.data.updated) this.state.boards[id].updated = res.data.updated;
        if (e.deleted && Object.values(this.state.boards).some(x => x.error === 'too_many_boards')) { this.state = unrefuse(this.state, 'too_many_boards'); this.again = true; }   // room for a board the limit held back
        continue;
      }
      if (res.status === 409) { this.again = true; continue; }   // changed elsewhere: the next pull sorts it out
      if (res.status === 413 || res.status === 400) { this.state = refused(this.state, id, (res.data && res.data.error) || 'bad_board'); continue; }   // kept here, not retried until it changes
      if (res.status === 401) { this.lostSession(); return; }
      if (res.status === 429) { clearTimeout(this.retry); this.retry = setTimeout(() => this.sync(), 60000); return; }   // too many writes: try again in a minute
      throw new Error(res.status);
    }
    if (this.again) { this.again = false; this.running = false; setTimeout(() => this.sync(), 50); }
  }

  // What each board looked like when last in step, so changed() can tell what moved.
  remember() { this.seen = new Map(this.app.boards.map(b => [b.id, JSON.stringify(b)])); }

  // The session ran out or was revoked. This browser still holds the account's boards,
  // so changes to them keep being marked, and sync when the same account signs in again.
  lostSession() { this.user = null; this.status = 'signedout'; this.app.render(); }

  // After every save in the app. Boards of the account this browser syncs with are marked
  // changed or deleted, signed in or not (a session can run out mid-edit). New boards are
  // only taken into the account while signed in; guest boards from before are offered.
  // The push waits two seconds, so typing is one save, not many.
  changed() {
    const owner = this.user ? this.user.id : this.state.user;
    if (!owner || this.replacing) return;
    let st = this.state;
    const ids = new Set(this.app.boards.map(b => b.id));
    for (const b of this.app.boards) {
      const known = st.boards[b.id];
      if (!known) {
        if (!this.user || this.offer.includes(b.id) || (st.declined || []).includes(b.id)) continue;
        st = adopt(st, [b.id], owner);
      } else if (known.owner === owner && this.seen.get(b.id) !== JSON.stringify(b)) st = markDirty(st, b.id);
    }
    for (const id of Object.keys(st.boards)) if (!ids.has(id) && st.boards[id].owner === owner && !st.boards[id].deleted) st = markDeleted(st, id);
    this.state = Object.assign(st, { declined: this.state.declined || [] });
    this.remember(); this.saveState();
    if (!this.user) { this.paint(); return; }
    this.status = 'waiting'; this.paint();
    clearTimeout(this.timer); this.timer = setTimeout(() => this.sync(), 2000);
  }
  // Boards the server refused, with why, for the account panel.
  refusedBoards() {
    return Object.entries(this.state.boards).filter(([, e]) => e.error && e.owner === this.state.user)
      .map(([id, e]) => ({ id, error: e.error, name: (this.app.boards.find(b => b.id === id) || {}).name || id }));
  }
  unsyncedCount() { return this.state.user ? unsynced(this.state).length : 0; }

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
  // Boards whose changes still have not reached the account stay here as guest boards
  // (the rule is in sync.js), and the panel said so before the second press.
  async signOut() {
    clearTimeout(this.timer);
    await this.sync();
    const kept = this.unsyncedCount();
    await this.api('POST', '/auth/sign-out', {}).catch(() => null);
    this.forget();
    if (kept) this.app.flash(this.app.t.keptAsGuest(kept));
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
