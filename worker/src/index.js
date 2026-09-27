// Split-Flap accounts API, a Cloudflare Worker on maclaine.se/split-flap/api/*.
// Sign-in is Better Auth (Google only). Boards are stored as the app sent them, after a
// check that the app's own sanitizer accepts them: the app and this Worker deploy
// separately, so a server that stored its own sanitized copy would strip every field it
// does not know yet. The app sanitizes everything it loads.
//
// Routes (all under /split-flap/api):
//   /auth/*              Better Auth (sign in with Google, callback, sign out, session)
//   GET    /me           the signed-in account: id, first name, email
//   GET    /boards       every board of the account, tombstones included
//   PUT    /boards/:id   { board, baseRev }: saved if baseRev matches, else 409 with ours
//   DELETE /boards/:id   { baseRev }: a tombstone, so other devices remove it too
//   GET    /export       the account and its boards as one JSON file
//   DELETE /account      the account, its sessions and its boards

import { betterAuth } from 'better-auth';
import { makeSignature } from 'better-auth/crypto';
import { authOptions } from './auth.js';
import { sanitizeBoard } from '../../src/store.js';

const API = '/split-flap/api';
const MAX_BOARDS = 50, MAX_BYTES = 262144;

let cached = null;   // one Better Auth instance per Worker instance, not per request
const authFor = env => cached || (cached = betterAuth(authOptions(env, env.DB)));

const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {
  status, headers: Object.assign({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, extra)
});
const fail = (status, error) => json({ error }, status);

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    // Development: wrangler dev serves the app too, from the usual local server, so the
    // app and the API share one origin as they do in production.
    if (!url.pathname.startsWith(API)) {
      if (env.DEV_APP) return fetch(env.DEV_APP + url.pathname + url.search, req);
      return fail(404, 'not_found');
    }
    let res;
    try {
      res = await route(req, env, url);
    } catch (err) {
      console.error(err && err.stack || err);
      res = fail(500, 'server_error');
    }
    await logFailure(req, url, res);
    return res;
  }
};

// One line per failed request, for Workers Logs: route, status and error code. Never the
// user, the email, the address or the board. Workers Logs adds the CPU time itself.
// A guest's 401 from /me is how the app learns it is signed out, so it is not a failure.
export async function logFailure(req, url, res) {
  const path = url.pathname.slice(API.length) || '/';
  const auth = path.startsWith('/auth/'), loc = res.headers.get('location') || '';
  const failed = res.status >= 400 || (auth && /[?&]error=/.test(loc));
  if (!failed || (res.status === 401 && path === '/me')) return null;
  let error = null;
  if (res.status >= 400) { try { error = (await res.clone().json()).error || null; } catch { error = null; } }
  else error = new URL(loc, url).searchParams.get('error');
  const line = { failed: routeName(path), method: req.method, status: res.status, error };
  console.warn(JSON.stringify(line));
  return line;
}
export const routeName = path => path.startsWith('/auth/') ? '/auth/' + path.split('/')[2] : path.replace(/^\/boards\/.+$/, '/boards/:id');

async function route(req, env, url) {
  const path = url.pathname.slice(API.length) || '/', auth = authFor(env);
  if (path.startsWith('/auth/')) return withNoStore(await auth.handler(req));
  if (path === '/dev/session' && req.method === 'POST' && devTest(env)) return devSession(req, env, auth);

  // Writes must come from the app's own page, on top of the SameSite cookie.
  if (req.method !== 'GET' && req.headers.get('origin') !== new URL(env.BASE_URL).origin) return fail(403, 'bad_origin');

  const session = await auth.api.getSession({ headers: req.headers });
  const user = session && session.user;
  if (!user) return fail(401, 'signed_out');

  if (path === '/me' && req.method === 'GET') return json({ id: user.id, name: String(user.name || '').split(/\s+/)[0], email: user.email });
  if (path === '/boards' && req.method === 'GET') return json({ boards: await listBoards(env, user.id) });
  if (path === '/export' && req.method === 'GET') {
    const boards = (await listBoards(env, user.id)).filter(b => !b.deleted).map(b => b.board);
    return json({ app: 'split-flap', exported: new Date().toISOString(), account: { email: user.email, name: user.name, created: user.createdAt }, boards }, 200,
      { 'content-disposition': 'attachment; filename="split-flap-export.json"' });
  }
  if (path === '/account' && req.method === 'DELETE') {
    try {
      await auth.api.deleteUser({ headers: req.headers, body: {} });   // afterDelete removes the boards
    } catch (err) {
      // Better Auth wants a sign-in from the last day before deleting: the app asks for one.
      // Anything else is a real failure and says so.
      if (err && err.body && err.body.code === 'SESSION_EXPIRED') return fail(403, 'sign_in_again');
      console.error(err && err.stack || err);
      return fail(500, 'server_error');
    }
    return json({ deleted: true });
  }
  const m = /^\/boards\/([A-Za-z0-9_-]{1,40})$/.exec(path);
  if (m && (req.method === 'PUT' || req.method === 'DELETE')) {
    if (env.WRITES) { const { success } = await env.WRITES.limit({ key: user.id }); if (!success) return fail(429, 'too_many_writes'); }
    return req.method === 'PUT' ? putBoard(req, env, user.id, m[1]) : deleteBoard(req, env, user.id, m[1]);
  }
  return fail(404, 'not_found');
}

// Tests only: on localhost with DEV_TEST=1, make an account and a session without
// Google, so the boards API can be walked end to end (worker/test/). Never on in
// production: it needs both the flag and a localhost BASE_URL.
export const devTest = env => env.DEV_TEST === '1' && /^http:\/\/localhost(:\d+)?$/.test(env.BASE_URL || '');
async function devSession(req, env, auth) {
  const { email = 'test@example.com', name = 'Test Person' } = await req.json().catch(() => ({}));
  const ctx = await auth.$context;
  const found = await ctx.internalAdapter.findUserByEmail(email);
  const user = found ? found.user : await ctx.internalAdapter.createUser({ email, name, emailVerified: true });
  const session = await ctx.internalAdapter.createSession(user.id);
  const value = encodeURIComponent(`${session.token}.${await makeSignature(session.token, ctx.secret)}`);
  return json({ id: user.id }, 200, { 'set-cookie': `sf.session_token=${value}; Path=/split-flap/api; HttpOnly; SameSite=Lax` });
}

// Better Auth sets its own headers; the API's answers are never cached anywhere.
function withNoStore(res) {
  const r = new Response(res.body, res);
  r.headers.set('cache-control', 'no-store');
  return r;
}

async function listBoards(env, userId) {
  const { results } = await env.DB.prepare('SELECT id, rev, updated, deleted, json FROM board WHERE user_id = ?').bind(userId).all();
  return results.map(r => ({ id: r.id, rev: r.rev, updated: r.updated, deleted: !!r.deleted, board: r.deleted ? null : JSON.parse(r.json) }));
}
async function current(env, userId, id) {
  const r = await env.DB.prepare('SELECT id, rev, updated, deleted, json FROM board WHERE user_id = ? AND id = ?').bind(userId, id).first();
  return r ? { id: r.id, rev: r.rev, updated: r.updated, deleted: !!r.deleted, board: r.deleted ? null : JSON.parse(r.json) } : null;
}
const conflict = row => json({ error: 'conflict', current: row }, 409);

async function putBoard(req, env, userId, id) {
  const text = await req.text();
  if (text.length > MAX_BYTES + 1024) return fail(413, 'too_big');
  let body; try { body = JSON.parse(text); } catch { return fail(400, 'bad_json'); }
  const board = body && body.board, baseRev = Number.isInteger(body && body.baseRev) ? body.baseRev : -1;
  if (!board || typeof board !== 'object' || board.id !== id) return fail(400, 'bad_board');
  if (!sanitizeBoard(board)) return fail(400, 'bad_board');           // validated, then stored as sent
  const stored = JSON.stringify(board);
  if (stored.length > MAX_BYTES) return fail(413, 'too_big');
  const now = Date.now(), row = await current(env, userId, id);
  if (!row || row.deleted) {
    if ((row ? row.rev : 0) !== baseRev) return conflict(row);
    const { live } = await env.DB.prepare('SELECT COUNT(*) AS live FROM board WHERE user_id = ? AND deleted = 0').bind(userId).first();
    if (live >= MAX_BOARDS) return fail(413, 'too_many_boards');
    const rev = baseRev + 1;
    const res = row
      ? await env.DB.prepare('UPDATE board SET rev = ?, updated = ?, deleted = 0, json = ? WHERE user_id = ? AND id = ? AND rev = ?').bind(rev, now, stored, userId, id, baseRev).run()
      : await env.DB.prepare('INSERT OR IGNORE INTO board (user_id, id, rev, updated, deleted, json) VALUES (?, ?, ?, ?, 0, ?)').bind(userId, id, rev, now, stored).run();
    if (!res.meta.changes) return conflict(await current(env, userId, id));
    return json({ id, rev, updated: now });
  }
  if (row.rev !== baseRev) return conflict(row);
  const res = await env.DB.prepare('UPDATE board SET rev = rev + 1, updated = ?, json = ? WHERE user_id = ? AND id = ? AND rev = ?').bind(now, stored, userId, id, baseRev).run();
  if (!res.meta.changes) return conflict(await current(env, userId, id));
  return json({ id, rev: baseRev + 1, updated: now });
}

async function deleteBoard(req, env, userId, id) {
  let body = {}; try { body = await req.json(); } catch { body = {}; }
  const baseRev = Number.isInteger(body.baseRev) ? body.baseRev : -1, now = Date.now();
  const row = await current(env, userId, id);
  if (!row) return json({ id, rev: 0, deleted: true });                // nothing to delete
  if (row.deleted) return json({ id, rev: row.rev, deleted: true });
  if (row.rev !== baseRev) return conflict(row);
  const res = await env.DB.prepare('UPDATE board SET rev = rev + 1, updated = ?, deleted = 1, json = NULL WHERE user_id = ? AND id = ? AND rev = ?').bind(now, userId, id, baseRev).run();
  if (!res.meta.changes) return conflict(await current(env, userId, id));
  return json({ id, rev: baseRev + 1, deleted: true });
}
