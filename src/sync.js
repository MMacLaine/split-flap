// Sync between this browser and the account (from 0.5). Local first: localStorage is the
// working copy, the server is sync and backup. Everything here is a pure function of
// the boards, the sync state and what the server sent, so it runs in Node tests.
//
// The sync state (localStorage 'sf_sync'):
//   { user: id of the signed-in account or null,
//     boards: { [boardId]: { rev, dirty, owner } } }
// rev is the server revision this browser last agreed with, dirty means changed here
// since, owner is the account the board was synced to. A board with no entry has never
// been synced: a guest board.
//
// A board the server sends is { id, rev, deleted, board }.

export const emptyState = () => ({ user: null, boards: {} });

// A copy of a board with a new id and a name that says where it came from.
function copyOf(board, suffix, newId) {
  return Object.assign(JSON.parse(JSON.stringify(board)), { id: newId(), name: (board.name || '') + suffix });
}

// Server and browser boards to one list. Per board id:
// - a guest board (no entry): left alone and never pushed, unless the server has a board
//   with the same id, which then keeps the id while the guest board becomes a copy
// - only on the server: taken (a tombstone is ignored)
// - only here: pushed as new
// - server unchanged since we agreed: pushed if changed here
// - server changed, not here: the server's version is taken, or removed if deleted
// - changed in both: the server's version keeps the id, and this browser's edit becomes
//   a copy with a new id, pushed as new. No clock decides; nothing is lost.
// Returns { boards, state, push } where push is the ids to send, with the rev to send
// them against in state.
export function merge(local, remote, state, user, { suffix = ' (other device)', newId } = {}) {
  const st = { user, boards: Object.assign({}, state.boards) };
  const byId = new Map(remote.map(r => [r.id, r]));
  const out = [], push = [];
  for (const b of local) {
    const r = byId.get(b.id), e = st.boards[b.id];
    if (e && e.owner !== user) { out.push(b); continue; }  // another account's board: left alone
    if (!e) {                                               // a guest board
      if (r && !r.deleted) { byId.delete(b.id); out.push(r.board, copyOf(b, suffix, newId)); st.boards[b.id] = { rev: r.rev, dirty: false, owner: user }; }
      else out.push(b);
      continue;
    }
    if (!r) {                                               // not on the server (new, or never reached it)
      st.boards[b.id] = { rev: 0, dirty: true, owner: user }; out.push(b); push.push(b.id); continue;
    }
    byId.delete(b.id);
    const agreed = e.rev, dirty = e.dirty;
    if (agreed === r.rev) {                                 // server unchanged since we last agreed
      out.push(b); st.boards[b.id] = { rev: r.rev, dirty, owner: user }; if (dirty) push.push(b.id);
      continue;
    }
    if (!dirty) {                                           // server changed, this browser did not
      if (!r.deleted) out.push(r.board);
      if (r.deleted) delete st.boards[b.id]; else st.boards[b.id] = { rev: r.rev, dirty: false, owner: user };
      continue;
    }
    // changed in both places
    if (!r.deleted) { out.push(r.board); st.boards[b.id] = { rev: r.rev, dirty: false, owner: user }; }
    else delete st.boards[b.id];
    const c = copyOf(b, suffix, newId);
    out.push(c); st.boards[c.id] = { rev: 0, dirty: true, owner: user }; push.push(c.id);
  }
  for (const r of byId.values()) {                          // only on the server
    const e = st.boards[r.id];
    if (e && e.deleted && e.owner === user) {               // deleted here
      if (r.deleted) delete st.boards[r.id];                // and there: done
      else if (r.rev === e.rev) push.push(r.id);            // send the delete
      else { out.push(r.board); st.boards[r.id] = { rev: r.rev, dirty: false, owner: user }; }   // edited elsewhere since: the edit wins
      continue;
    }
    if (r.deleted) continue;
    out.push(r.board); st.boards[r.id] = { rev: r.rev, dirty: false, owner: user };
  }
  return { boards: out, state: st, push };
}

// The account takes these boards (the first sign-in offer, accepted, or a board made
// while signed in): they are pushed on the next sync.
export function adopt(state, ids, user) {
  const boards = Object.assign({}, state.boards);
  for (const id of ids) if (!boards[id]) boards[id] = { rev: 0, dirty: true, owner: user };
  return { user: state.user, boards };
}

// A save or delete here marks the board changed. A board with no entry stays a guest
// board until the account takes it.
export function markDirty(state, id) {
  const e = state.boards[id];
  if (!e) return state;
  return { user: state.user, boards: Object.assign({}, state.boards, { [id]: Object.assign({}, e, { dirty: true }) }) };
}

// A board deleted here: its entry stays, marked, until the server has the delete.
export function markDeleted(state, id) {
  const e = state.boards[id];
  if (!e) return state;
  return { user: state.user, boards: Object.assign({}, state.boards, { [id]: Object.assign({}, e, { dirty: true, deleted: true }) }) };
}

// The server agreed to a push: this is the new revision. A pushed delete is forgotten.
export function pushed(state, id, rev) {
  const e = state.boards[id] || { owner: state.user };
  const boards = Object.assign({}, state.boards);
  if (e.deleted) delete boards[id]; else boards[id] = { rev, dirty: false, owner: e.owner };
  return { user: state.user, boards };
}

// Boards that may be offered up to an account on its first sign-in: only boards with no
// owner recorded, so one account's boards never go into another's.
export function offerable(boards, state) {
  return boards.filter(b => !state.boards[b.id]);
}

// Signing out (or deleting the account): the account's boards leave this browser, so
// the next person on a shared computer does not see them. Boards that were never synced
// stay. Call it after pending pushes are flushed.
export function signOut(boards, state) {
  const user = state.user;
  return { boards: boards.filter(b => { const e = state.boards[b.id]; return !e || e.owner !== user; }), state: emptyState() };
}

// Another account signs in while this browser still holds the last one's boards (its
// session ran out, say). Those boards are never uploaded to the new account. The ones
// already safe on the server leave this browser; any with changes not yet pushed stay,
// still marked as the other account's, and sync when that account signs in again.
export function switchUser(boards, state, user) {
  const keep = [], entries = {};
  for (const b of boards) {
    const e = state.boards[b.id];
    if (!e || e.owner === user) { keep.push(b); if (e) entries[b.id] = e; continue; }
    if (e.dirty) { keep.push(b); entries[b.id] = e; }
  }
  return { boards: keep, state: { user, boards: entries } };
}
