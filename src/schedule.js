// When pages show. Pure functions of (settings, time) so they can be tested without a
// browser. All times are the viewer's local clock, which for a wall display is the
// clock of the room it hangs in.

const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function toMin(s) {
  const p = String(s || '0:0').split(':');
  return (+p[0] || 0) * 60 + (+p[1] || 0);
}

// win = { from: 'HH:MM', to: 'HH:MM', days?: [0..6] } with 0 = Sunday, like Date.getDay(),
// or with date: 'YYYY-MM-DD' in place of days, and yearly: true to match the month and
// day in any year (29 February then only matches in leap years).
// A window that crosses midnight (22:00 to 02:00) belongs to the day it starts on, so
// "Friday 22:00 to 02:00" is still showing at 01:00 on Saturday. The 0.2 shape carried
// on: false for a window that was switched off, which counts as always open.
// Does a window start on this day? Days of the week, or a date (every year, or once).
export function winDay(win, day) {
  if (win.date) { const k = ymd(day); return win.yearly ? k.slice(5) === win.date.slice(5) : k === win.date; }
  const days = Array.isArray(win.days) && win.days.length ? win.days : null;
  return !days || days.includes(day.getDay());
}
export function inWindow(win, now) {
  if (!win || win.on === false) return true;
  const d = new Date(now), m = d.getHours() * 60 + d.getMinutes();
  const a = toMin(win.from), b = toMin(win.to);
  const dayOk = day => winDay(win, day);                 // day: the Date the window starts on
  const yesterday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  if (a === b) return dayOk(d);                          // from equals to: the whole day
  if (a < b) return m >= a && m < b && dayOk(d);
  if (m >= a) return dayOk(d);
  if (m < b) return dayOk(yesterday);                    // after midnight: yesterday's window
  return false;
}

// A page's windows. 0.3 stores a list in wins; a page from 0.2 has one win.
export function pageWins(p) {
  if (!p) return [];
  if (Array.isArray(p.wins)) return p.wins;
  return p.win && p.win.on ? [p.win] : [];
}
// True when the list is empty (the page can show at any time) or any window is open.
export function inWindows(wins, now) {
  return !wins || !wins.length || wins.some(w => inWindow(w, now));
}

export function inQuiet(quiet, now) {
  return !!(quiet && quiet.on) && inWindow({ on: true, from: quiet.from, to: quiet.to }, now);
}

// Playlist step. Returns the page index to show (or -1 when no page is allowed right
// now, and the caller falls back to the clock) and when that page started.
// Show alone: while a page marked alone is in one of its windows, only pages with a
// window open right now can show; pages without windows wait until it closes.
export function nextPage(pages, idx, start, now) {
  const n = pages.length;
  if (!n) return { idx: -1, start: now };
  const cur = idx >= 0 && idx < n ? pages[idx] : null;
  const may = allowedAt(pages, now).may, ok = p => may.has(p);
  const expired = !cur || now - start >= Math.max(3, +cur.dur || 10) * 1000 || !ok(cur);
  if (!expired) return { idx, start };
  for (let i = 1; i <= n; i++) {
    const j = ((idx < 0 ? -1 : idx) + i) % n;
    if (ok(pages[j])) return { idx: j, start: now };
  }
  return { idx: -1, start: now };
}

// ---------- the week (0.7) ----------
// What may play at a moment, the one rule behind nextPage, the week view and Today's
// playlist. Show alone: while a board marked alone is in one of its times, only boards
// with a time open right now may play; boards with no time wait until it closes.
export function allowedAt(pages, now) {
  const open = p => { const w = pageWins(p); return w.length > 0 && inWindows(w, now); };
  const alone = pages.some(p => p.alone && open(p));
  const may = new Set(pages.filter(p => alone ? open(p) : inWindows(pageWins(p), now)));
  return { may, alone };
}

const dayStart = day => new Date(day.getFullYear(), day.getMonth(), day.getDate());
const addDays = (day, k) => new Date(day.getFullYear(), day.getMonth(), day.getDate() + k);

// Today's playlist: the day as a list of stretches, each with the boards that may play
// in it (indices into pages) and whether a board holds it alone. Worked out minute by
// minute with allowedAt, so it can never disagree with what the wall shows.
export function dayPlaylist(pages, day) {
  const out = [], start = dayStart(day), end = addDays(start, 1);
  let prev = null;
  for (let t = start.getTime(); t < end.getTime(); t += 60000) {
    const { may, alone } = allowedAt(pages, t);
    const list = pages.map((p, i) => may.has(p) ? i : -1).filter(i => i >= 0), key = list.join(',') + (alone ? '!' : '');
    if (prev && prev.key === key) prev.to = t + 60000;
    else { prev = { key, from: t, to: t + 60000, list, alone }; out.push(prev); }
  }
  return out.map(({ key, ...seg }) => seg);
}

// The blocks a day shows in the week grid: one per time that applies, in minutes from
// midnight. A time past midnight belongs to the day it starts: drawn to 24:00 there
// (cont: 'next') and from 00:00 on the next day (cont: 'prev'). Overlaps get lanes.
export function blocksFor(pages, day) {
  const d = dayStart(day), out = [];
  pages.forEach((p, i) => pageWins(p).forEach((w, wi) => {
    const f = toMin(w.from), t = toMin(w.to);
    if (f === t) { if (winDay(w, d)) out.push({ page: i, win: wi, s: 0, e: 1440 }); return; }
    if (f < t) { if (winDay(w, d)) out.push({ page: i, win: wi, s: f, e: t }); return; }
    if (winDay(w, d)) out.push({ page: i, win: wi, s: f, e: 1440, cont: 'next' });
    if (winDay(w, addDays(d, -1))) out.push({ page: i, win: wi, s: 0, e: t, cont: 'prev' });
  }));
  out.sort((a, b) => a.s - b.s || b.e - a.e);
  const ends = [];
  for (const b of out) { let l = ends.findIndex(e => e <= b.s); if (l < 0) { l = ends.length; ends.push(0); } ends[l] = b.e; b.lane = l; }
  for (const b of out) b.lanes = 1 + Math.max(...out.filter(o => o.s < b.e && o.e > b.s).map(o => o.lane));
  return out;
}

// Dates still to come, once or every year, soonest first.
export function comingDates(pages, now) {
  const today = dayStart(new Date(now)), res = [];
  pages.forEach((p, i) => pageWins(p).forEach((w, wi) => {
    if (!w.date) return;
    const [y, mo, da] = w.date.split('-').map(Number);
    let d = new Date(y, mo - 1, da);
    if (w.yearly) { d = new Date(today.getFullYear(), mo - 1, da); if (d < today) d = new Date(today.getFullYear() + 1, mo - 1, da); }
    if (d >= today) res.push({ page: i, win: wi, day: d });
  }));
  return res.sort((a, b) => a.day - b.day);
}

// A time dragged in the week or a board's own strip (0.11.4): moved by dm minutes, or its
// start or end changed by dm, and dd days sideways. A start never passes the end and the
// end never comes before the start, by at least snap minutes. A time that moves past
// midnight belongs to the day it now starts on. A copy.
const hmOf = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
export function movedWin(win, mode, dm, dd = 0, snap = 15) {
  const w = Object.assign({}, win); let f = toMin(w.from), to = toMin(w.to);
  if (mode === 'move') { f += dm; to += dm; }
  else if (mode === 'start') f = Math.min(f + dm, (to <= f ? to + 1440 : to) - snap);
  else to = Math.max(to + dm, f + snap);
  const k = dd + Math.floor(f / 1440);
  w.from = hmOf(f); w.to = hmOf(to);
  return shiftWin(w, k);
}
// A new time from a drag on day (a Date) from minute s to e: that weekday, or that date
// for a strip showing dates. An end at 24:00 is stored as 00:00, the whole rest of the day.
export function newWin(day, s, e) { return { from: hmOf(s), to: hmOf(e >= 1440 ? 0 : e), days: [day.getDay()] }; }

// A time moved k days sideways in the week: its days shift, or its date does. A copy.
export function shiftWin(win, k) {
  const w = Object.assign({}, win);
  if (!k) return w;
  if (w.date) { const [y, mo, da] = w.date.split('-').map(Number); w.date = ymd(new Date(y, mo - 1, da + k)); }
  else if (Array.isArray(w.days) && w.days.length) w.days = w.days.map(x => (((x + k) % 7) + 7) % 7).sort((a, b) => a - b);
  return w;
}
