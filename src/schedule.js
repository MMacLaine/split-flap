// When pages show. Pure functions of (settings, time) so they can be tested without a
// browser. All times are the viewer's local clock, which for a wall display is the
// clock of the room it hangs in.

export function toMin(s) {
  const p = String(s || '0:0').split(':');
  return (+p[0] || 0) * 60 + (+p[1] || 0);
}

// win = { from: 'HH:MM', to: 'HH:MM', days?: [0..6] } with 0 = Sunday, like Date.getDay().
// A window that crosses midnight (22:00 to 02:00) belongs to the day it starts on, so
// "Friday 22:00 to 02:00" is still showing at 01:00 on Saturday. The 0.2 shape carried
// on: false for a window that was switched off, which counts as always open.
export function inWindow(win, now) {
  if (!win || win.on === false) return true;
  const d = new Date(now), m = d.getHours() * 60 + d.getMinutes();
  const a = toMin(win.from), b = toMin(win.to);
  const days = Array.isArray(win.days) && win.days.length ? win.days : null;
  const dayOk = day => !days || days.includes(day);
  if (a === b) return dayOk(d.getDay());                 // from equals to: the whole day
  if (a < b) return m >= a && m < b && dayOk(d.getDay());
  if (m >= a) return dayOk(d.getDay());
  if (m < b) return dayOk((d.getDay() + 6) % 7);         // after midnight: yesterday's window
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
export function nextPage(pages, idx, start, now) {
  const n = pages.length;
  if (!n) return { idx: -1, start: now };
  const cur = idx >= 0 && idx < n ? pages[idx] : null;
  const ok = p => inWindows(pageWins(p), now);
  const expired = !cur || now - start >= Math.max(3, +cur.dur || 10) * 1000 || !ok(cur);
  if (!expired) return { idx, start };
  for (let i = 1; i <= n; i++) {
    const j = ((idx < 0 ? -1 : idx) + i) % n;
    if (ok(pages[j])) return { idx: j, start: now };
  }
  return { idx: -1, start: now };
}
