// Anonymous usage counts (0.11.5). The app sends small batches of events: a name, up to
// three short values and a number. Nothing in them says who sent them: no user id, no
// cookie is read, no IP address is kept. They go to Workers Analytics Engine, which
// counts them; Matthew reads them with _dev/stats.mjs.
//
// One data point per event:
//   index1  the event name
//   blob1   name    blob2-4  a, b, c (the event's values)
//   blob5   device (phone, tablet, desktop, wall)   blob6 lang   blob7 app version
//   blob8   returning (yes/no)   blob9 kiosk (yes/no)   blob10 account (yes/no)
//   blob11  country, from Cloudflare's own header (two letters)
//   double1 the event's number (1 when it has none)

const NAME = /^[a-z][a-z0-9_]{1,31}$/;
const MAX_EVENTS = 40, MAX_BODY = 16000, MAX_STR = 60;
const DEVICES = ['phone', 'tablet', 'desktop', 'wall'];

// A short value, with anything that looks like it could carry a person stripped out:
// addresses, numbers longer than four digits, and anything past 60 characters.
export function clean(v) {
  if (v == null) return '';
  let s = String(v).replace(/[\u0000-\u001f]/g, ' ');
  s = s.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '@').replace(/https?:\/\/\S+/g, 'url').replace(/\d{5,}/g, '#');
  return s.trim().slice(0, MAX_STR);
}
const yes = v => v === true || v === 'yes' || v === 1 ? 'yes' : 'no';

// The body the app sends, checked. Returns { ctx, events } or null.
export function parseBatch(body) {
  if (!body || typeof body !== 'object' || !Array.isArray(body.e)) return null;
  const c = body.c && typeof body.c === 'object' ? body.c : {};
  const ctx = {
    device: DEVICES.includes(c.d) ? c.d : 'desktop',
    lang: /^[a-z]{2}$/.test(c.l || '') ? c.l : '',
    version: /^\d+\.\d+\.\d+$/.test(c.v || '') ? c.v : '',
    returning: yes(c.r), kiosk: yes(c.k), account: yes(c.a)
  };
  const events = [];
  for (const e of body.e.slice(0, MAX_EVENTS)) {
    if (!e || typeof e !== 'object' || !NAME.test(e.n || '')) continue;
    const n = Number(e.v);
    events.push({ name: e.n, a: clean(e.a), b: clean(e.b), c: clean(e.c), v: Number.isFinite(n) ? Math.max(-1e6, Math.min(1e6, n)) : 1 });
  }
  return { ctx, events };
}

export async function events(req, env) {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  const len = +(req.headers.get('content-length') || 0);
  if (len > MAX_BODY) return new Response(null, { status: 413 });
  // the same per-minute limit as the live data routes, by the connecting address; the
  // address is used for the limit only and never stored
  if (env.DATA) { const { success } = await env.DATA.limit({ key: 'e:' + (req.headers.get('cf-connecting-ip') || '') }); if (!success) return new Response(null, { status: 429 }); }
  let body = null;
  try { const text = await req.text(); if (text.length <= MAX_BODY) body = JSON.parse(text); } catch { body = null; }
  const b = parseBatch(body);
  if (!b) return new Response(null, { status: 400 });
  const country = /^[A-Z]{2}$/.test(req.headers.get('cf-ipcountry') || '') ? req.headers.get('cf-ipcountry') : '';
  if (env.EVENTS) for (const e of b.events) {
    env.EVENTS.writeDataPoint({
      indexes: [e.name],
      blobs: [e.name, e.a, e.b, e.c, b.ctx.device, b.ctx.lang, b.ctx.version, b.ctx.returning, b.ctx.kiosk, b.ctx.account, country],
      doubles: [e.v]
    });
  }
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
}
