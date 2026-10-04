// One kind of thing (0.10.1). Every board lives once, in your Boards (the library), with its
// own size and theme. A playlist is boards in turn: it points at boards by id, and keeps
// only how long each shows and when. Anything from outside (a template, a board link, a
// file) is copied in. Pure functions, so the app, the Worker and the tests share them.
//
// Shapes:
//   a board     { id, name, size?, rows, cols, theme, from?, page: { layout, zones, dur, tr?, hue? } }
//               (the 0.7.1 blueprint, with its size; stored in sf_library and /blueprints)
//   a playlist  { id, name, solo?, transition, speed, sound, soundStyle, volume, quiet, loc?, roll?,
//                 from?, items: [{ id, dur, wins, alone?, hue? }] }
//               (stored in sf_playlists and /playlists). solo: made to show one board, so the
//               app shows it as that board, not as a playlist, until a second board joins.
//
// The app runs on a resolved playlist, which has the shape storyboards had before: the
// playlist's settings, and pages that are its boards with their times. A resolved page
// carries its board's size and theme. decompose() takes an edited resolved playlist apart
// again into the playlist and the boards that changed.

import { sanitizeBlueprint, sanitizePlaylist, sizeOf, dimsOfSize } from './store.js';
import { newId } from './content.js';

const clone = x => JSON.parse(JSON.stringify(x));

// A short id from a string, the same in every browser and on the server: the migration
// must name the same board the same way wherever it runs (FNV-1a, twice).
export function hid(prefix, s) {
  let a = 0x811c9dc5, b = 0x01000193 ^ s.length;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 16777619) >>> 0; b = Math.imul(b ^ c, 2246822519) >>> 0; }
  return prefix + a.toString(36) + b.toString(36);
}

// What makes two boards the same board: what they show, how, at what size and in what theme.
// Not the id, the times, the hue or where they came from.
export function contentKey(lb) {
  const p = lb.page || {};
  return JSON.stringify([lb.name || '', p.layout, p.zones, p.tr || '', sizeOf(lb), lb.rows, lb.cols, lb.theme]);
}

// A board of the library from a resolved page (or a storyboard's page, before 0.10.1),
// at the page's own size, else the storyboard's. With the board it was (old), what belongs
// to the board and not to this playlist stays as it was: its default time, its hue, where it
// came from, and a size by name it never had.
export function boardFromPage(p, sb, id, old) {
  const own = p.size ? p : sb, d = dimsOfSize(own), size = own.size || 'custom';
  const page = { id, name: p.name || '', layout: p.layout, dur: old ? old.page.dur : p.dur, zones: clone(p.zones || []) };
  if (p.tr) page.tr = p.tr;
  const hue = old ? old.page.hue : p.hue; if (Number.isInteger(hue)) page.hue = hue;
  const from = old ? old.from : p.from || (sb && typeof sb.from === 'string' ? { kind: 'template', id: sb.from } : undefined);
  const lb = sanitizeBlueprint({ id, name: p.name || (old && old.name) || (sb && sb.name) || 'Board', size, rows: d.rows, cols: d.cols,
    theme: p.theme || (sb && sb.theme) || 'black', from, page });
  if (lb && old && !old.size && sizeOf(old) === lb.size) delete lb.size;
  return lb;
}

// A playlist's settings from a resolved one (or a storyboard), and its items from its pages.
const SETTINGS = ['transition', 'speed', 'sound', 'soundStyle', 'volume', 'quiet', 'loc', 'roll', 'from'];
export function settingsOf(sb) { const o = {}; for (const k of SETTINGS) if (sb[k] !== undefined) o[k] = clone(sb[k]); return o; }
const itemOf = (p, id) => Object.assign({ id, dur: p.dur, wins: clone(p.wins || []) }, p.alone ? { alone: true } : {}, Number.isInteger(p.hue) ? { hue: p.hue } : {});

// A playlist with its boards in place, in the shape the renderer, the week and the editor
// work on. A board not here yet (still on its way from the account) is a blank page that
// keeps its place, and is never written back.
export function resolve(pl, lib) {
  const pages = pl.items.map(it => {
    const lb = lib.get(it.id);
    if (!lb) return Object.assign({ id: it.id, name: '', layout: 'full', dur: it.dur, wins: clone(it.wins || []), zones: [{ ch: 'message', o: {} }], missing: true, size: '6x22', rows: 6, cols: 22, theme: 'black' }, it.alone ? { alone: true } : {});
    const p = clone(lb.page), d = dimsOfSize(lb);
    delete p.wins; delete p.win; delete p.alone;
    return Object.assign(p, { id: lb.id, name: lb.page.name || lb.name, dur: it.dur, wins: clone(it.wins || []) }, it.alone ? { alone: true } : {},
      Number.isInteger(it.hue) ? { hue: it.hue } : {}, { size: sizeOf(lb), rows: d.rows, cols: d.cols, theme: lb.theme }, lb.from ? { from: clone(lb.from) } : {});
  });
  if (!pages.length) pages.push({ id: '_none', name: '', layout: 'full', dur: 10, wins: [], zones: [{ ch: 'message', o: {} }], missing: true, size: '6x22', rows: 6, cols: 22, theme: 'black' });
  const first = pages.find(p => !p.missing) || pages[0];
  return Object.assign({ id: pl.id, name: pl.name }, pl.solo ? { solo: true } : {}, settingsOf(pl),
    { size: first.size, rows: first.rows, cols: first.cols, theme: first.theme, pages });
}

// An edited resolved playlist, taken apart: the playlist, and the boards that are new or
// changed. A page with an id the library does not have is a new board (a template's page,
// a duplicate, a board typed from scratch).
export function decompose(sb, lib) {
  const items = [], boards = [], seen = new Set();
  for (const p of sb.pages) {
    if (p.id === '_none') continue;
    let id = p.id || newId('p');
    if (seen.has(id)) id = newId('p');   // one board shows once in a playlist
    seen.add(id);
    items.push(itemOf(p, id));
    if (p.missing) continue;
    const old = lib.get(id), lb = boardFromPage(p, sb, id, old);
    if (lb && (!old || JSON.stringify(old) !== JSON.stringify(lb))) boards.push(lb);
  }
  const pl = sanitizePlaylist(Object.assign({ id: sb.id, name: sb.name }, sb.solo && items.length === 1 ? { solo: true } : {}, settingsOf(sb), { items }));
  return { playlist: pl, boards };
}

// The playlists a board is in, by name, apart from the one-board playlists made to show it.
export const usedIn = (id, playlists) => playlists.filter(pl => !pl.solo && pl.items.some(it => it.id === id));
// The playlist made to show this board on its own, if there is one.
export const soloOf = (id, playlists) => playlists.find(pl => pl.solo && pl.items.length === 1 && pl.items[0].id === id) || null;

// ---------- the migration (0.10.1) ----------
// Storyboards and My boards from before, to one library and playlists by reference. The
// same function runs in the Worker for an account (once, in one batch) and in the browser
// for a guest, and gives the same ids for the same input wherever it runs:
// - every blueprint stays a board, with its id
// - every page of every storyboard becomes a board, unless an identical board is there
//   already, which it then points at (not twice in one playlist)
// - a page keeps its id as the board's id, unless another board has it, when it gets one
//   made from its storyboard's id and its own
// - every storyboard becomes a playlist with its id; one of one board, named as its board
//   or made from a template, is a one-board playlist and shows as that board
// taken: ids that may not be used (deleted rows on the server). Nothing is dropped.
export function migrateData(storyboards, blueprints, taken = []) {
  // by id, so the browser (its list order) and the server (its row order) name every board
  // the same: who keeps a shared page id, and which of two identical boards stays (0.10.1 review)
  const byId = (a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  storyboards = [...storyboards].sort(byId); blueprints = [...blueprints].sort(byId);
  const library = [], byKey = new Map(), used = new Set(taken), added = [], from = {};
  for (const bp of blueprints) { if (used.has(bp.id)) continue; library.push(bp); used.add(bp.id); if (!byKey.has(contentKey(bp))) byKey.set(contentKey(bp), bp.id); }
  const playlists = [];
  for (const sb of storyboards) {
    const items = [], here = new Set();
    for (const p of sb.pages) {
      const probe = boardFromPage(p, sb, 'x');
      if (!probe) continue;
      const key = contentKey(probe);
      let id = byKey.get(key);
      if (id && here.has(id)) id = null;
      if (!id) {
        id = p.id && !used.has(p.id) ? p.id : hid('p', sb.id + '/' + p.id);
        for (let n = 2; used.has(id); n++) id = hid('p', sb.id + '/' + p.id + '/' + n);
        const lb = boardFromPage(p, sb, id);
        library.push(lb); used.add(id); added.push(id); from[id] = sb.id;
        if (!byKey.has(key)) byKey.set(key, id);
      }
      here.add(id);
      items.push(itemOf(p, id));
    }
    if (!items.length) continue;
    const one = items.length === 1, named = one && ((sb.pages[0].name || '') === sb.name || typeof sb.from === 'string');
    const pl = sanitizePlaylist(Object.assign({ id: sb.id, name: sb.name }, one && named ? { solo: true } : {}, settingsOf(sb), { items }));
    if (pl) playlists.push(pl);
  }
  return { library, playlists, added, from };
}

// The sync states that go with a migration in a browser that already syncs with an
// account. The server made the same rows at revision 1, so a board or playlist the
// account had is in step at 1; one that never reached it is new; one with changes the
// server did not get yet is still changed, and goes up over revision 1.
export function seedStates(m, oldSb, oldMy) {
  const blank = s => ({ user: s && s.user || null, boards: {}, declined: [], offer: [], confirming: [] });
  const entry = e => e && !e.deleted ? { rev: e.rev > 0 ? 1 : 0, dirty: e.rev > 0 ? !!e.dirty : true, owner: e.owner } : null;
  const pl = blank(oldSb), lib = Object.assign(blank(oldMy && oldMy.user ? oldMy : oldSb), oldMy && oldMy.boards ? clone({ boards: oldMy.boards, declined: oldMy.declined || [], offer: oldMy.offer || [], confirming: oldMy.confirming || [] }) : {});
  if (!lib.user && pl.user) lib.user = pl.user;
  const sbs = (oldSb && oldSb.boards) || {}, offer = new Set((oldSb && oldSb.offer) || []), declined = new Set((oldSb && oldSb.declined) || []);
  for (const p of m.playlists) { const e = entry(sbs[p.id]); if (e) pl.boards[p.id] = e; }
  pl.offer = m.playlists.filter(p => offer.has(p.id)).map(p => p.id);
  pl.declined = m.playlists.filter(p => declined.has(p.id)).map(p => p.id);
  for (const id of m.added) {
    const sb = m.from[id], e = entry(sbs[sb]);
    if (e) lib.boards[id] = e;
    if (offer.has(sb)) lib.offer.push(id);
    if (declined.has(sb)) lib.declined.push(id);
  }
  return { pl, lib };
}

// ---------- this browser ----------
// The library and the playlists, migrated once from the storyboards and My boards of
// before 0.10.1. The old keys are read and never written, so they stay as the way back.
// Two tabs migrating at once write the same thing, since the migration names everything
// the same way from the same input.
export function loadModel({ loadBoards, loadBlueprints, loadLibrary, loadPlaylists, saveLibrary, savePlaylists, loadShown, saveShown, getFlag, setFlag }) {
  let library = loadLibrary(), playlists = loadPlaylists(), migrated = false;
  if (!playlists) {
    const old = loadBoards(), m = migrateData(old.boards, loadBlueprints());
    library = m.library; playlists = m.playlists; migrated = old.boards.length > 0 || m.library.length > 0;
    const json = k => { try { return JSON.parse(getFlag(k)); } catch { return null; } };
    const seeds = seedStates(m, json('sf_sync'), json('sf_sync_my'));
    if (migrated) { setFlag('sf_sync_pl', JSON.stringify(seeds.pl)); setFlag('sf_sync_lib', JSON.stringify(seeds.lib)); }
    saveLibrary(library); if (playlists.length) savePlaylists(playlists);
    if (old.boards[old.active] && !loadShown()) saveShown(old.boards[old.active].id);
  }
  return { library: library || [], playlists, migrated };
}
