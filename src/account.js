// The account, in the browser (from 0.5). Talks to the Worker at /split-flap/api and
// keeps this browser's boards in step with the account, using the rules in sync.js.
// Local first: the app never waits on any of this. A guest, a kiosk, or a copy served
// without the Worker (npm run serve) never gets past init(), and the app shows
// no account controls at all.

import { merge, adopt, markDirty, markDeleted, pushed, refused, unrefuse, unsynced, strays, settled, offerable, signOut, switchUser, signOutAll, switchUserAll, healBroken, emptyState } from './sync.js';
import { newId } from './content.js';
import { getFlag, setFlag } from './store.js';

// 0.10.1: the playlists (sf_sync_pl) and your Boards (sf_sync_lib) have new sync states,
// seeded by the migration, so a tab still on 0.10.0 keeps its own (sf_sync, sf_sync_my).
const MY_KEY = 'sf_sync_lib';   // your Boards' sync state
const CN_KEY = 'sf_sync_conn';  // connections' sync state (0.9.2)
const ST_KEY = 'sf_sync_st';    // settings: Home and what was last shown (0.10.1)

const BACKUP = 'sf_guest_backup';   // the guest boards as they were at the first sign-in, until the server has them

const API = '/split-flap/api';
const KEY = 'sf_sync_pl';

export function loadState() {
  try { const s = JSON.parse(getFlag(KEY)); if (s && typeof s === 'object' && s.boards) return Object.assign({ declined: [], offer: [], confirming: [] }, s); } catch { /* bad or missing */ }
  return Object.assign(emptyState(), { declined: [], offer: [], confirming: [] });
}

export function loadMyState(key = MY_KEY) {
  try { const s = JSON.parse(getFlag(key)); if (s && typeof s === 'object' && s.boards) return Object.assign({ declined: [], offer: [], confirming: [] }, s); } catch { /* bad or missing */ }
  return Object.assign(emptyState(), { declined: [], offer: [], confirming: [] });
}

// My boards (0.7.1): blueprints sync by the same rules as storyboards (sync.js), with their
// own state and their own place on the server. Kept apart so the storyboards' well-tested
// path is untouched; the account drives both.
// Connections (0.9.2) sync the same way, through the same class, with their own list,
// state, path and prefix.
const COLLECTIONS = {
  my: { key: MY_KEY, path: '/blueprints', field: 'blueprints', list: app => app.blueprints, replace: (app, l) => app.replaceBlueprints(l), prefix: 'm', full: 'too_many_blueprints' },
  cn: { key: CN_KEY, path: '/connections', field: 'connections', list: app => app.connections, replace: (app, l) => app.replaceConnections(l), prefix: 'c', full: 'too_many_connections' },
  // one row each, so a change in two places is never two copies: the account's wins
  st: { key: ST_KEY, path: '/settings', field: 'settings', list: app => app.settings, replace: (app, l) => app.replaceSettings(l), prefix: 's', full: 'too_many_settings', noCopies: true }
};
class MySync {
  constructor(acc, kind = 'my') { this.acc = acc; this.c = COLLECTIONS[kind]; this.state = loadMyState(this.c.key); this.seen = new Map(); }
  get app() { return this.acc.app; }
  get items() { return this.c.list(this.app) || []; }
  save() { setFlag(this.c.key, JSON.stringify(this.state)); }
  carry(st) { return Object.assign(st, { declined: this.state.declined || [], offer: this.state.offer || [], confirming: this.state.confirming || [] }); }
  remember() { this.seen = new Map(this.items.map(b => [b.id, JSON.stringify(b)])); }
  // Returns 'lost' if the session ran out, 'retry' after a 429, else nothing.
  async sync(user) {
    const stray = strays(this.items, this.state, (this.state.offer || []).concat(this.state.declined || []));
    if (stray.length) this.state = adopt(this.state, stray, user);
    const res = await this.acc.api('GET', this.c.path);
    if (res.status === 401) return 'lost';
    if (res.status === 503 && this.c.path === '/connections') { this.notConfigured = true; return; }   // no key on the server yet: stay in this browser
    if (res.status !== 200) throw new Error(res.status);
    this.notConfigured = false;
    const m = merge(this.items, res.data[this.c.field], this.state, user, { suffix: this.app.t.otherDevice, newId: () => newId(this.c.prefix), noCopies: !!this.c.noCopies });
    this.state = this.carry(m.state);
    this.state.offer = [...new Set((this.state.offer || []).concat(m.guests))];
    if (JSON.stringify(m.boards) !== JSON.stringify(this.items)) this.c.replace(this.app, m.boards);
    // a value the server could not open is sent again from here, and sealed afresh
    if (this.c.path === '/connections') for (const id of healBroken(res.data.connections, this.items, this.state)) { this.state = markDirty(this.state, id); if (!m.push.includes(id)) m.push.push(id); }
    this.remember();
    return this.push(m.push, user);
  }
  async push(ids, user) {
    for (const id of ids) {
      const e = this.state.boards[id]; if (!e || e.owner !== user) continue;
      const bp = this.items.find(x => x.id === id);
      const res = e.deleted || !bp
        ? await this.acc.api('DELETE', this.c.path + '/' + encodeURIComponent(id), { baseRev: e.rev })
        : await this.acc.api('PUT', this.c.path + '/' + encodeURIComponent(id), { board: bp, baseRev: e.rev });
      if (res.status === 200) {
        this.state = pushed(this.state, id, res.data.rev);
        if (e.deleted && Object.values(this.state.boards).some(x => x.error === this.c.full)) { this.state = unrefuse(this.state, this.c.full); this.acc.again = true; }
        continue;
      }
      if (res.status === 409) { this.acc.again = true; continue; }
      if (res.status === 413 || res.status === 400) { this.state = refused(this.state, id, (res.data && res.data.error) || 'bad_board'); continue; }
      if (res.status === 401) return 'lost';
      if (res.status === 429) return 'retry';
      if (res.status === 503 && this.c.path === '/connections') return;
      throw new Error(res.status);
    }
  }
  changed(owner, signedIn) {
    if (!owner || this.replacing) return false;
    let st = this.state;
    for (const b of this.items) {
      const known = st.boards[b.id];
      if (!known) {
        if (!signedIn || (st.offer || []).includes(b.id) || (st.declined || []).includes(b.id)) continue;
        st = adopt(st, [b.id], owner);
      } else if (known.owner === owner && this.seen.get(b.id) !== JSON.stringify(b)) st = markDirty(st, b.id);
    }
    this.state = st; this.remember(); this.save();
    return true;
  }
  deleted(id, owner) {
    const e = this.state.boards[id];
    if (!owner || !e || e.owner !== owner || e.deleted) return;
    this.state = markDeleted(this.state, id); this.save();
  }
  dirty(user) { return Object.values(this.state.boards).some(e => e.dirty && !e.error && e.owner === user); }
}

export class Account {
  constructor(app) {
    this.app = app;
    this.available = false;   // the API answered, so the account controls show
    this.user = null;         // { id, name, email } when signed in
    this.status = 'idle';     // idle | syncing | waiting | failed | signedout (the session ran out)
    this.unticked = new Set(); // boards in the offer the person has unticked
    this.state = loadState();
    this.seen = new Map();    // board id to its JSON when last known in step
    this.timer = 0;
    this.my = new MySync(this);         // your Boards (0.10.1; My boards before)
    this.cn = new MySync(this, 'cn');   // your own sources (0.9.2)
    this.st = new MySync(this, 'st');   // Home and what was last shown (0.10.1)
  }
  saveState() { setFlag(KEY, JSON.stringify(this.state)); }
  // The first sign-in offer is kept in sf_sync (0.6.3), so closing the tab while it shows
  // brings it back on the next open, and nothing is taken into the account unasked.
  get offer() { return this.state.offer || []; }
  set offer(ids) { this.state.offer = ids; }
  // What a merge must not drop: the offer, the answers to it, and the boards being confirmed.
  carry(st) { return Object.assign(st, { declined: this.state.declined || [], offer: this.state.offer || [], confirming: this.state.confirming || [] }); }

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
    const b = this.app.playlists;
    if (this.state.user && this.state.user !== this.user.id) {
      // another account's boards are here (its session ran out, say): never uploaded to this one
      const sw = switchUser(b, this.state, this.user.id);
      this.app.replacePlaylists(sw.boards); this.state = Object.assign(sw.state, { declined: [] });
    }
    if (this.my.state.user && this.my.state.user !== this.user.id) {
      // the boards the other account's kept playlists show stay too, still its, never sent to this one
      const need = new Set(this.app.playlists.flatMap(p => p.items.map(i => i.id))), old = this.my.state;
      const sw = switchUser(this.app.blueprints, old, this.user.id), kept = new Set(sw.boards);
      for (const b of this.app.blueprints) if (!kept.has(b) && need.has(b.id) && old.boards[b.id]) sw.state.boards[b.id] = old.boards[b.id];
      this.app.replaceBlueprints(this.app.blueprints.filter(b => kept.has(b) || need.has(b.id))); this.my.state = Object.assign(sw.state, { declined: [], offer: [], confirming: [] });
    }
    if (!this.my.state.user) {
      this.my.state.user = this.user.id;
      this.my.state.offer = offerable(this.app.blueprints, this.my.state).map(x => x.id).filter(id => !(this.my.state.declined || []).includes(id));
    }
    this.my.save();
    // connections: another account's leave at once, whatever their state, and a guest's are offered
    if (this.cn.state.user && this.cn.state.user !== this.user.id) {
      const sw = switchUserAll(this.app.connections, this.cn.state, this.user.id);
      this.app.replaceConnections(sw.boards); this.cn.state = Object.assign(sw.state, { declined: [], offer: [], confirming: [] });
    }
    if (!this.cn.state.user) {
      this.cn.state.user = this.user.id;
      this.cn.state.offer = offerable(this.app.connections, this.cn.state).map(x => x.id).filter(id => !(this.cn.state.declined || []).includes(id));
    }
    this.cn.save();
    // settings: another account's leave; a guest's Home is offered with the rest, as one row
    if (this.st.state.user && this.st.state.user !== this.user.id) {
      const sw = switchUserAll(this.app.settings, this.st.state, this.user.id);
      this.app.replaceSettings(sw.boards); this.st.state = Object.assign(sw.state, { declined: [], offer: [], confirming: [] });
    }
    if (!this.st.state.user) { this.st.state.user = this.user.id; this.st.state.offer = []; this.st.state = adopt(this.st.state, this.app.settings.map(x => x.id), this.user.id); }
    this.st.save();
    if (!this.state.user) {
      this.state.user = this.user.id;
      // the demo made for a first visit, never touched, is not the person's work: it is not
      // offered, and the first pull drops it if the account already has storyboards
      this.dropFresh = this.app.freshId || null;
      this.offer = offerable(this.app.playlists, this.state).map(x => x.id).filter(id => !this.state.declined.includes(id) && id !== this.dropFresh);
      // the boards of the untouched demo are not the person's work either
      const fresh = this.dropFresh && this.app.playlists.find(x => x.id === this.dropFresh);
      if (fresh) { const ids = new Set(fresh.items.map(it => it.id)); this.my.state.offer = (this.my.state.offer || []).filter(id => !ids.has(id)); this.dropBoards = [...ids]; this.my.save(); }
      // a safety copy of the guest boards before anything is merged or sent
      if (this.offer.length || (this.my.state.offer || []).length) setFlag(BACKUP, JSON.stringify({ at: Date.now(), playlists: this.app.playlists.filter(b => this.offer.includes(b.id)),
        boards: this.app.blueprints.filter(b => (this.my.state.offer || []).includes(b.id)) }));
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
      const stray = strays(this.app.playlists, this.state, this.offer.concat(this.state.declined || [], this.dropFresh ? [this.dropFresh] : []));
      if (stray.length) this.state = Object.assign(adopt(this.state, stray, this.user.id), { declined: this.state.declined || [] });
      // 0.10.1: the first request for the playlists moves the account's storyboards over, on the server
      const res = await this.api('GET', '/playlists');
      if (res.status === 401) { this.lostSession(); return; }
      if (res.status !== 200) throw new Error(res.status);
      const m = merge(this.app.playlists, res.data.playlists, this.state, this.user.id, { suffix: this.app.t.otherDevice, newId: () => newId('b') });
      this.state = this.carry(m.state);
      this.offer = [...new Set(this.offer.concat(m.guests))];   // guest boards that had to become copies: offered, not taken
      for (const r of res.data.playlists) if (this.state.boards[r.id] && r.updated) this.state.boards[r.id].updated = r.updated;   // for the board menu
      if (this.dropFresh) {                                     // the untouched first-visit demo, once, on the first pull
        const others = m.boards.filter(x => x.id !== this.dropFresh);
        if (others.length) { m.boards = others; this.dropDemoBoards = this.dropBoards || []; }
        else { this.state = adopt(this.state, [this.dropFresh], this.user.id); m.push.push(this.dropFresh); this.my.state = adopt(this.my.state, this.dropBoards || [], this.user.id); }
        this.dropFresh = null; this.app.freshId = null; this.dropBoards = null;
      }
      if (JSON.stringify(m.boards) !== JSON.stringify(this.app.playlists)) this.app.replacePlaylists(m.boards);   // no redraw when nothing moved
      this.remember();
      await this.push(m.push);
      if (!this.user) return;                                  // signed out part way
      // the demo's boards leave with the demo, before they are ever offered or sent
      if (this.dropDemoBoards && this.dropDemoBoards.length) { const ids = new Set(this.dropDemoBoards); this.dropDemoBoards = null; this.app.replaceBlueprints(this.app.blueprints.filter(b => !ids.has(b.id) || this.app.playlists.some(pl => pl.items.some(it => it.id === b.id)))); }
      const my = await this.my.sync(this.user.id);
      if (my === 'lost') { this.lostSession(); return; }
      if (my === 'retry') { clearTimeout(this.retry); this.retry = setTimeout(() => this.sync(), 60000); }
      const cn = await this.cn.sync(this.user.id);
      if (cn === 'lost') { this.lostSession(); return; }
      const st = await this.st.sync(this.user.id);
      if (st === 'lost') { this.lostSession(); return; }
      if (this.again) { this.again = false; setTimeout(() => this.sync(), 50); }
      this.confirmAdopted();
      this.status = Object.values(this.state.boards).some(e => e.dirty && !e.error && e.owner === this.user.id) || this.my.dirty(this.user.id) || this.cn.dirty(this.user.id) || this.st.dirty(this.user.id) ? 'waiting' : 'idle';
    } catch {
      if (this.user) this.status = 'failed';
    } finally {
      this.running = false; this.saveState(); this.my.save(); this.cn.save(); this.st.save(); this.paint();
    }
  }

  // Each board on its own, so one refused board never holds up the rest.
  async push(ids) {
    for (const id of ids) {
      if (!this.user) return;
      const e = this.state.boards[id]; if (!e || e.owner !== this.user.id) continue;
      const board = this.app.playlists.find(x => x.id === id);
      const res = e.deleted || !board
        ? await this.api('DELETE', '/playlists/' + encodeURIComponent(id), { baseRev: e.rev })
        : await this.api('PUT', '/playlists/' + encodeURIComponent(id), { board, baseRev: e.rev });
      if (res.status === 200) {
        this.state = pushed(this.state, id, res.data.rev);
        if (this.state.boards[id] && res.data.updated) this.state.boards[id].updated = res.data.updated;
        if (e.deleted && Object.values(this.state.boards).some(x => x.error === 'too_many_playlists')) { this.state = unrefuse(this.state, 'too_many_playlists'); this.again = true; }   // room for a playlist the limit held back
        continue;
      }
      if (res.status === 409) { this.again = true; continue; }   // changed elsewhere: the next pull sorts it out
      if (res.status === 413 || res.status === 400) { this.state = refused(this.state, id, (res.data && res.data.error) || 'bad_board'); continue; }   // kept here, not retried until it changes
      if (res.status === 401) { this.lostSession(); return; }
      if (res.status === 429) { clearTimeout(this.retry); this.retry = setTimeout(() => this.sync(), 60000); return; }   // too many writes: try again in a minute
      throw new Error(res.status);
    }
  }

  // What each board looked like when last in step, so changed() can tell what moved.
  remember() { this.seen = new Map(this.app.playlists.map(b => [b.id, JSON.stringify(b)])); }

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
    for (const b of this.app.playlists) {
      const known = st.boards[b.id];
      if (!known) {
        if (!this.user || this.offer.includes(b.id) || (st.declined || []).includes(b.id)) continue;
        st = adopt(st, [b.id], owner);
      } else if (known.owner === owner && this.seen.get(b.id) !== JSON.stringify(b)) st = markDirty(st, b.id);
    }
    // Deletes are never worked out from a board being missing here: a list can be short for
    // other reasons (another tab wrote an older list, a board did not load), and reading
    // that as deletes once removed a whole account's boards. deleted() below is the only way.
    this.state = Object.assign(st, { declined: this.state.declined || [] });
    this.remember(); this.saveState();
    if (!this.user) { this.paint(); return; }
    this.status = 'waiting'; this.paint();
    clearTimeout(this.timer); this.timer = setTimeout(() => this.sync(), 2000);
  }
  // After every change to My boards: the same rules as changed(), for blueprints.
  changedMy() {
    const owner = this.user ? this.user.id : this.state.user;
    if (!this.my.changed(owner, !!this.user) || !this.user) { this.paint(); return; }
    this.status = 'waiting'; this.paint();
    clearTimeout(this.timer); this.timer = setTimeout(() => this.sync(), 2000);
  }
  deletedMy(id) { this.my.deleted(id, this.user ? this.user.id : this.state.user); }
  // Connections (0.9.2): saved to the account as soon as they are added, so signing out,
  // which removes them all from this browser, rarely loses one.
  changedConn() {
    const owner = this.user ? this.user.id : this.state.user;
    if (!this.cn.changed(owner, !!this.user) || !this.user) { this.paint(); return; }
    this.status = 'waiting'; this.paint();
    clearTimeout(this.timer); this.timer = setTimeout(() => this.sync(), 300);
  }
  deletedConn(id) { this.cn.deleted(id, this.user ? this.user.id : this.state.user); }
  // Settings (0.10.1): pushed soon, like connections, since they are small.
  changedSt() {
    const owner = this.user ? this.user.id : this.state.user;
    if (!this.st.changed(owner, !!this.user) || !this.user) return;
    clearTimeout(this.timer); this.timer = setTimeout(() => this.sync(), 1500);
  }
  // A person deleted this board, in this page. The one way a delete reaches the account.
  deleted(id) {
    const owner = this.user ? this.user.id : this.state.user, e = this.state.boards[id];
    if (!owner || !e || e.owner !== owner || e.deleted) return;
    this.state = Object.assign(markDeleted(this.state, id), { declined: this.state.declined || [] });
    this.saveState();
  }
  // Boards the server refused, with why, for the account panel.
  refusedBoards() {
    return Object.entries(this.state.boards).filter(([, e]) => e.error && e.owner === this.state.user)
      .map(([id, e]) => ({ id, error: e.error, name: (this.app.playlists.find(b => b.id === id) || {}).name || id }))
      .concat(Object.entries(this.my.state.boards).filter(([, e]) => e.error && e.owner === this.state.user).map(([id, e]) => ({ id, error: e.error, name: (this.app.blueprints.find(b => b.id === id) || {}).name || id })));
  }
  unsyncedCount() { return this.state.user ? unsynced(this.state).length : 0; }

  // The first sign-in offer, board by board: every board ticked to start with. Keep takes
  // the ticked ones into the account and leaves the rest here; Leave here leaves them all.
  toggleOffer(id) { if (this.unticked.has(id)) this.unticked.delete(id); else this.unticked.add(id); this.app.render(); }
  offerMy() { return this.my.state.offer || []; }
  offerConn() { return this.cn.state.offer || []; }
  offerCount() { return this.offer.length + this.offerMy().length + this.offerConn().length; }
  answerOffer(keep) {
    const one = (st, list) => {
      const take = keep ? list.filter(id => !this.unticked.has(id)) : [], leave = list.filter(id => !take.includes(id));
      if (take.length) st = adopt(st, take, this.user.id);
      st.declined = [...new Set((st.declined || []).concat(leave))];
      st.confirming = [...new Set((st.confirming || []).concat(take))];
      st.offer = [];
      return [st, take.length];
    };
    const [a, na] = one(this.state, this.offer), [b, nb] = one(this.my.state, this.offerMy()), [c, nc] = one(this.cn.state, this.offerConn());
    this.state = a; this.my.state = b; this.cn.state = c;
    this.unticked = new Set(); this.saveState(); this.my.save(); this.cn.save(); this.app.render();
    if (na + nb + nc) this.sync(); else this.confirmAdopted();
  }
  // Once the server has every board taken from the offer: say how many, from the server's
  // own answers, and drop the safety copy. A refused board keeps the copy in place.
  confirmAdopted() {
    if (this.offerCount()) return;
    const a = settled(this.state, this.state.confirming || []), b = settled(this.my.state, this.my.state.confirming || []), c = settled(this.cn.state, this.cn.state.confirming || []);
    if (a.open.length || b.open.length || c.open.length) return;
    this.state.confirming = []; this.my.state.confirming = []; this.cn.state.confirming = []; this.saveState(); this.my.save(); this.cn.save();
    try { localStorage.removeItem(BACKUP); } catch { /* storage blocked */ }
    if (a.done.length || b.done.length) this.app.flash(this.app.t.offerDone(a.done.filter(id => !(this.app.playlists.find(p => p.id === id) || {}).solo).length, b.done.length));
  }

  // Sign in with Google: to Google and back to the page this started from.
  async signIn() {
    const res = await this.api('POST', '/auth/sign-in/social', { provider: 'google', callbackURL: location.pathname + location.search, errorCallbackURL: location.pathname + location.search });
    if (res.data && res.data.url) location.href = res.data.url;
    else this.app.flash(this.app.t.signInFailed);
  }

  // Signing out takes the account's boards out of this browser, after a last push.
  // Boards whose changes still have not reached the account stay here as guest boards
  // (the rule is in sync.js), and the panel said so before the second press.
  async signOut() {
    clearTimeout(this.timer);
    await this.sync();
    // a connection not yet with the account gets two seconds more to get there, then goes anyway
    const waiting = Object.entries(this.cn.state.boards).filter(([, e]) => e.dirty && !e.error && e.owner === (this.user && this.user.id)).map(([id]) => id);
    if (waiting.length && this.user) await Promise.race([this.cn.push(waiting, this.user.id).catch(() => null), new Promise(r => setTimeout(r, 2000))]);
    const kept = this.unsyncedCount();
    await this.api('POST', '/auth/sign-out', {}).catch(() => null);
    this.forget();
    if (kept) this.app.flash(this.app.t.keptAsGuest(kept));
  }
  forget() {
    // the boards first, so the playlists left behind are resolved with what stays. A playlist
    // kept here (its changes had not reached the account) keeps the boards it shows, as a guest's.
    const r = signOut(this.app.playlists, this.state), need = new Set(r.boards.flatMap(p => p.items.map(i => i.id)));
    const rm = signOut(this.app.blueprints, this.my.state), kept = new Set(rm.boards);
    this.app.replaceBlueprints(this.app.blueprints.filter(b => kept.has(b) || need.has(b.id))); this.my.state = Object.assign(rm.state, { declined: [], offer: [], confirming: [] }); this.my.save();
    this.app.replacePlaylists(r.boards.length ? r.boards : null);
    this.state = Object.assign(r.state, { declined: [] }); this.saveState();
    const rs = signOutAll(this.app.settings, this.st.state);
    this.app.replaceSettings(rs.boards); this.st.state = Object.assign(rs.state, { declined: [], offer: [], confirming: [] }); this.st.save();
    // every connection the account owns leaves this browser, pushed or not (0.9.2)
    const rc = signOutAll(this.app.connections, this.cn.state);
    this.app.replaceConnections(rc.boards); this.cn.state = Object.assign(rc.state, { declined: [], offer: [], confirming: [] }); this.cn.save();
    // the last answers kept for a restart (0.9.4) may come from the account's own sources
    try { localStorage.removeItem('sf_live'); } catch { /* storage blocked */ }
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
