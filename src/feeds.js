// Feeds (0.9.3): RSS, Atom and JSON Feed, for the Headlines tile. Most feeds do not let
// browsers read them, so the Worker fetches them, but only ones some account has added
// as a connection (worker/src/feeds.js), and it always hands the body back as plain text,
// never as a page. The rules below are shared by the app and the Worker, and run in the
// Node tests too: which addresses may be fetched at all, whether a body is a feed, and
// the items in it.

// ---------- addresses ----------
// https, the usual port, a real host name. Never an IP address, localhost, maclaine.se
// itself or a workers.dev address, so the Worker can never be pointed at itself or at a
// machine on a private network. Checked when a feed is saved and again on every redirect.
export function feedUrl(raw) {
  let u;
  try { u = new URL(String(raw || '').trim()); } catch { return null; }
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) return null;
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  if (!host.includes('.') || /^[\d.]+$/.test(host) || host.includes(':') || host.startsWith('[')) return null;   // IPv4 and IPv6 literals
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return null;
  if (host === 'maclaine.se' || host.endsWith('.maclaine.se') || host.endsWith('.workers.dev')) return null;
  u.hash = ''; u.hostname = host;
  const out = u.toString();
  return out.length <= 500 ? out : null;
}

// Whether a body is a feed at all, from its first bytes: XML, RSS, Atom, or JSON.
export function looksLikeFeed(text) {
  const head = String(text || '').replace(/^﻿/, '').trimStart().slice(0, 200).toLowerCase();
  return head.startsWith('<?xml') || head.startsWith('<rss') || head.startsWith('<feed') || head.startsWith('<rdf:rdf') || head.startsWith('{');
}

// ---------- items ----------
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = s => String(s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]+>/g, ' ')                                  // markup inside a title
  .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m)
  .replace(/\s+/g, ' ').trim();
const tag = (xml, names) => { for (const n of names) { const m = new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)</${n}>`, 'i').exec(xml); if (m) return m[1]; } return ''; };
const when = s => { const t = Date.parse(decode(s)); return Number.isFinite(t) ? new Date(t).toISOString() : null; };

// A feed's title and its items, newest first, at most 30: { title, items: [{ title, date, link }] }.
// A small reader of its own, so the Worker and the tests need no XML parser.
export function parseFeed(text) {
  const body = String(text || '').replace(/^﻿/, '').trimStart();
  if (body.startsWith('{')) {   // JSON Feed (jsonfeed.org)
    let j; try { j = JSON.parse(body); } catch { return { title: '', items: [] }; }
    const items = (Array.isArray(j.items) ? j.items : []).map(x => ({ title: decode(x && (x.title || x.summary || '')), date: x && (x.date_published || x.date_modified) ? when(x.date_published || x.date_modified) : null, link: x && typeof x.url === 'string' ? x.url : '' }));
    return tidy(decode(j.title), items);
  }
  const channel = tag(body, ['channel']) || body;
  const blocks = [...body.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)].map(m => m[2]);
  const items = blocks.map(b => {
    const link = (/<link[^>]*href="([^"]+)"/i.exec(b) || [])[1] || decode(tag(b, ['link']));
    return { title: decode(tag(b, ['title'])), date: when(tag(b, ['pubDate', 'published', 'updated', 'dc:date'])), link };
  });
  const title = decode(tag(channel.replace(/<(item|entry)[\s\S]*$/i, ''), ['title']));
  return tidy(title, items);
}
function tidy(title, items) {
  const seen = new Set(), out = [];
  for (const x of items) {
    if (!x.title || seen.has(x.title)) continue;
    seen.add(x.title); out.push({ title: x.title.slice(0, 300), date: x.date, link: String(x.link || '').slice(0, 500) });
  }
  out.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return { title: title.slice(0, 80), items: out.slice(0, 30) };
}
