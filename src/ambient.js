// Light and sky (0.11.1), from the look handover (_local/plans/0.11/handoff, "The sky" and
// the ring in looks.js RING): what sits round and behind the board, never on it.
//
// - The ring: a sharp conic gradient turned with transform, seen through a soft ring-shaped
//   mask painted once per layout and size stop. Its effects change one opacity, with CSS and
//   the Web Animations API, so nothing runs per frame and nothing runs at all when it is off.
// - The sky: skyAt from the board's place, its sun times and the weather the app fetches for
//   it, worked out once a minute or when the weather changes, never per frame. The wall, the
//   ring and the letters can each follow it. Weather on the wall is a layer that slides.
// - The quality ladder: the renderer's frame budget steps it down one rung at a time.
// Inside the quiet-hours wrapper, so quiet hours dim it all. Nothing in OBS.

import { h } from './dom.js';
import { RING, SKY, QUALITY, skyAt, ringFor, boardChip, wxKind } from './looks.js';
export { wxKind };
import { sunTimes } from './almanac.js';
import { wxKey } from './content.js';
import { getFlag, setFlag } from './store.js';

const PROBE_MS = 2000, PROBE_EVERY = 5 * 60e3;
const STALE = 3 * 3600e3;   // weather up to three hours old holds
// The sky's inputs for a place at a moment: { minute, rise, set, wx, stale, none }. Pure, for tests.
// The sky's day is worked out in epoch ms from the place's own sunrise and sunset, so a board
// for Tokyo shown in Stockholm is in Tokyo's night (0.11.1 review 2.2): sunrise sits at 06:30
// on the sky's own clock and the rest follows, past midnight on that clock if the day is long.
// Polar day is day all day, polar night night.
export function skyInputs(place, now, wx) {
  if (!place || place.lat == null) { const d = new Date(now); return { minute: d.getHours() * 60 + d.getMinutes(), rise: 390, set: 1110, wx: 'clear', none: true }; }
  const day = 864e5, sun = t => sunTimes(new Date(t), place.lat, place.lon);
  // the last sunrise before now, at this place; the sky's minute counts on from it, past
  // 1440 on a long day, until the next one
  let s = sun(now);
  if (!s.polar && s.up > now) s = sun(now - day);
  else if (!s.polar) { const n = sun(now + day); if (!n.polar && n.up <= now) s = n; }
  const out = s.polar ? { minute: s.polar === 'day' ? 720 : 0, rise: 390, set: 1110 }
    : { minute: 390 + (now - s.up) / 60e3, rise: 390, set: 390 + (s.down - s.up) / 60e3 };
  const old = !wx || wx.t == null ? null : now - (wx.at || 0);
  const stale = old == null || old > STALE;
  return Object.assign(out, { wx: stale ? 'clear' : wxKind(wx.code), stale: old != null && old > STALE, hours: old != null ? Math.floor(old / 3600e3) : null });
}

const RAIN = (deg, a, w, gap) => `repeating-linear-gradient(${deg}deg, transparent 0 ${gap}px, rgba(200,220,255,${a}) ${gap}px ${gap + w}px, transparent ${gap + w}px ${gap * 2.7}px)`;
const FLAKES = (s, a) => `radial-gradient(circle at 20% 30%, rgba(255,255,255,${a}) 0 ${s}px, transparent ${s + 0.8}px), radial-gradient(circle at 70% 60%, rgba(255,255,255,${a * 0.8}) 0 ${s * 0.75}px, transparent ${s * 0.75 + 0.8}px), radial-gradient(circle at 45% 85%, rgba(255,255,255,${a * 0.9}) 0 ${s * 0.9}px, transparent ${s * 0.9 + 0.8}px)`;
const SHOW = { rainFar: /rain|storm/, rainNear: /rain|storm/, snowFar: /snow/, snowNear: /snow/, fog: /fog/, cloud: /cloud|storm|rain/ };

export class Ambient {
  constructor(app) {
    this.app = app;
    const lay = (cls, style) => { const e = h('div', { class: cls }); if (style) Object.assign(e.style, style); return e; };
    this.ring = lay('sf-ring'); this.tex = lay('sf-ring-tex'); this.ring.append(this.tex);
    this.wx = lay('sf-wx');
    this.L = {
      rainFar: lay('sf-wx-l', { backgroundImage: RAIN(100, 0.10, 1, 14), animation: 'sf11-fall 1.1s linear infinite' }),
      rainNear: lay('sf-wx-l', { backgroundImage: RAIN(104, 0.22, 1, 22), animation: 'sf11-fall 0.6s linear infinite' }),
      snowFar: lay('sf-wx-l', { backgroundImage: FLAKES(1, 0.4), backgroundSize: '60px 120px, 90px 120px, 50px 120px', animation: 'sf11-fall 12s linear infinite' }),
      snowNear: lay('sf-wx-l', { backgroundImage: FLAKES(1.8, 0.65), backgroundSize: '90px 120px, 130px 120px, 70px 120px', animation: 'sf11-fall 7s linear infinite' }),
      fog: lay('sf-wx-band', { background: 'linear-gradient(180deg, transparent 10%, rgba(220,226,232,0.20) 38%, transparent 55%, rgba(220,226,232,0.14) 78%, transparent 95%)', animation: 'sf11-drift 60s linear infinite alternate' }),
      cloud: lay('sf-wx-band', { top: '-10%', height: '80%', background: 'radial-gradient(ellipse 30% 50% at 25% 40%, rgba(200,206,214,0.16), transparent 70%), radial-gradient(ellipse 26% 40% at 72% 30%, rgba(200,206,214,0.12), transparent 70%)', animation: 'sf11-drift 90s linear infinite alternate' })
    };
    for (const k in this.L) this.wx.append(this.L[k]);
    this.boltEl = lay('sf-bolt');
    this.app.wallEl.append(this.wx, this.boltEl);
    this.app.canvas.after(this.ring);   // over the canvas, so it shows on a painted room too, cut out of the board
    // the automatic step is kept: a slow screen is slow tomorrow as well (0.11.1 review 4.3)
    this.auto = Math.min(QUALITY.length - 1, Math.max(0, QUALITY.findIndex(q => q.id === getFlag('sf_quality_auto')))); this.notedRung = 0;
    if (QUALITY[this.auto].id === 'lowres' && this.app.board) this.app.board.o.maxDpr = 1;
  }

  // ---------- the sky ----------
  // the playlist's own place, read from the playlist, not from live.data.loc, which want()
  // sets only after the sky has asked (0.11.1 build review 1.3); else sf_place, else Home
  place() { const b = this.app.cur && this.app.cur(), l = b && b.loc; if (l && l.lat != null) return l; const p = this.app.newPlace(); return p && p.lat != null ? p : null; }
  // The sky now for a look that follows it, else null. Worked out once a minute.
  skyFor(l) {
    const p = l.parts; if (!p || !p.sky || !p.sky.on) return null;
    const pl = this.place(), wx = pl ? this.app.live.data.wx[wxKey(pl)] : null, now = Date.now();
    const key = [pl ? wxKey(pl) : '-', Math.floor(now / 60000), wx ? wx.code + ':' + wx.at : '-'].join('|');
    if (key !== this.skyKey) { this.skyKey = key; this.inputs = skyInputs(pl, now, wx); this.sk = skyAt(this.inputs); }
    return this.sk;
  }
  // What the board's page says about the sky, or null.
  skyNote(l) {
    const p = l.parts; if (!p || !p.sky || !p.sky.on) return null;
    this.skyFor(l); const t = this.app.t.lk, i = this.inputs || {};
    if (i.none) return t.stSkyNone;
    if (i.stale) return t.stSkyStale(i.hours);
    return null;
  }

  // ---------- the quality ladder ----------
  rung() {
    const m = getFlag('sf_quality'), i = QUALITY.findIndex(q => q.id === m);
    const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    return Math.max(i >= 0 ? i : this.auto, reduced ? 1 : 0);
  }
  setQuality(id) {
    setFlag('sf_quality', id === 'auto' ? '' : id);
    if (id === 'auto') { this.auto = 0; setFlag('sf_quality_auto', ''); this.probeAt = 0; }   // Automatic starts again from the top
    this.key = null; this.app.refresh();
  }
  // The renderer kept missing its frame budget: one rung down, said once.
  // A rung whose feature isn't on the screen is passed over, so Classic goes straight to lower
  // sharpness as 0.10 did, and the line always names something you can see go (0.11.1 build
  // review 1.4). A 1x screen has no sharpness to drop, so it is never told anything.
  has(id) {
    const b = this.app.board, dpr = Math.min(window.devicePixelRatio || 1, b ? b.o.maxDpr || 2 : 2);
    if (id === 'still') return !!(this.wallMoves || this.layerOn || (this.on && /chase|breathe/.test(this.rg.fx)));
    if (id === 'noweather') return !!this.layerOn;
    if (id === 'noring') return !!this.on;
    if (id === 'lowres') return dpr > 1;
    return false;
  }
  slow() {
    if (getFlag('sf_quality')) return;
    let next = this.auto + 1; while (next < QUALITY.length && !this.has(QUALITY[next].id)) next++;
    if (next >= QUALITY.length) return;
    this.auto = next; this.key = null; setFlag('sf_quality_auto', QUALITY[this.auto].id);
    if (QUALITY[this.auto].id === 'lowres') { this.app.board.o.maxDpr = 1; this.app.board._sizeKey = null; this.app.board.resize(); }
    this.app.say(this.app.t.lk.stQuality(this.app.t.lk.quality[QUALITY[this.auto].id]));
    this.paint(true);
  }

  // A wall or a ring costs compositing on every frame, not flip work, so the renderer's own budget
  // never sees it on a board that rarely turns. Two seconds of frames counted when such a look
  // goes on, and every five minutes while it stays on; a screen that cannot keep up is one rung down.
  probe() {
    if (this.probing || getFlag('sf_quality')) return;
    if (document.hidden) { this.probeAt = Date.now(); return; }   // a hidden tab waits its five minutes too
    this.probing = true; this.probeAt = Date.now();
    let last = 0, n = 0, slow = 0; const end = performance.now() + PROBE_MS;
    const step = t => {
      if (last) { n++; const dt = t - last; if (dt > 34 && dt < 250) slow++; }
      last = t;
      if (t < end && !document.hidden) return requestAnimationFrame(step);
      this.probing = false;
      // a third of the frames over 34 ms, or under 30 a second on the whole (a 30 Hz screen is fine)
      if (n >= 10 && (slow * 3 >= n || PROBE_MS / n > 34)) this.slow();
    };
    requestAnimationFrame(step);
  }

  // One of Listen's ticks: the Music light rises on a beat and falls away after it.
  music() {
    if (!this.on || !this.hears || !this.rg || this.rg.fx !== 'music') return;
    const M = RING.effects.music;
    this.ring.style.opacity = Math.min(1, (M.rest + M.gain * this.app.listen.beat()) * this.rg.bright).toFixed(3);
  }

  // ---------- the ring ----------
  placeRing(r) { this.rect = r; this.maskKey = ''; this.mask(); }
  mask() {
    const r = this.rect, rg = this.rg; if (!r || !rg || rg.fx === 'off') return;
    const k = rg.size, spread = Math.round(r.h * RING.spread * k), key = [r.x, r.y, r.w, r.h, k].join(',');
    if (key === this.maskKey) return; this.maskKey = key;
    const W = Math.round(r.w + spread * 2), H = Math.round(r.h + spread * 2), ring = this.ring;
    Object.assign(ring.style, { left: (r.x - spread) + 'px', top: (r.y - spread) + 'px', width: W + 'px', height: H + 'px' });
    const d = Math.ceil(Math.hypot(W, H)); Object.assign(this.tex.style, { width: d + 'px', height: d + 'px' });
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(W / 2)); c.height = Math.max(1, Math.ceil(H / 2));
    const x = c.getContext('2d'); x.scale(0.5, 0.5); x.strokeStyle = '#fff';
    const band = (o, lw) => { x.lineWidth = lw; x.beginPath(); if (x.roundRect) x.roundRect(spread - o, spread - o, r.w + o * 2, r.h + o * 2, r.r + o); else x.rect(spread - o, spread - o, r.w + o * 2, r.h + o * 2); x.stroke(); };
    const b = Math.max(4, spread * RING.maskBlur);
    if ('filter' in x) { x.filter = `blur(${b}px)`; band(spread * 0.08, spread * 0.36); x.filter = `blur(${b * 0.25}px)`; x.globalAlpha = 0.8; band(spread * 0.02, spread * 0.08); x.filter = 'none'; }
    else for (let i = 6; i >= 1; i--) { x.globalAlpha = 0.12; band(spread * 0.08, spread * 0.06 * i); }
    x.globalAlpha = 1; band(1, Math.max(1.5, spread * 0.02));
    // never over the board itself: the ring is light round the frame, so the frame's own area is cut out
    x.globalCompositeOperation = 'destination-out'; x.beginPath();
    if (x.roundRect) x.roundRect(spread, spread, r.w, r.h, r.r); else x.rect(spread, spread, r.w, r.h); x.fill(); x.globalCompositeOperation = 'source-over';
    const url = `url(${c.toDataURL()})`; ring.style.maskImage = url; ring.style.webkitMaskImage = url;
    // the mask is drawn at half size, so its edge is soft; a clip at full size keeps every pixel
    // of the board's rectangle exactly Classic's, the corners' half-covered pixels too
    const q = spread, X = q + r.w, Y = q + r.h;
    ring.style.clipPath = `path(evenodd, 'M0 0H${W}V${H}H0Z M${q} ${q}H${X}V${Y}H${q}Z')`;
  }
  // The grid on the screen changed: From the board recounts its chip, and Flash on change rises.
  gridChanged(grid) {
    this.grid = grid;
    const rg = this.rg; if (!rg || rg.fx === 'off' || !this.on) return;
    if (this.palBoard) { const k = boardChip(grid); if (k !== this.chip) { this.chip = k; this.key = null; this.paint(); } }
    if (rg.fx === 'flash' && !this.still) {
      const E = RING.effects.flash, tot = E.rise + E.fall;
      this.ring.animate([{ opacity: E.rest * rg.bright }, { opacity: E.peak * rg.bright, offset: E.rise / tot }, { opacity: E.rest * rg.bright }], { duration: tot, easing: 'ease-out' });
      this.flashes = (this.flashes || 0) + 1;
    }
  }
  bolt() {
    const R = RING.storm, wait = R.every[0] + Math.random() * (R.every[1] - R.every[0]);
    this.boltT = setTimeout(() => {
      this.boltEl.animate([{ opacity: 0 }, { opacity: 0.12 }, { opacity: 0 }], { duration: R.flash * 2 });
      this.ring.animate([{ opacity: 1 }, { opacity: this.ring.style.opacity || 0 }], { duration: R.flash * 3 });
      this.bolt();
    }, wait);
  }

  // Apply the look's ring and the sky's weather to the layers. Called from the app's tick;
  // nothing happens unless something it reads has changed.
  paint(force) {
    const app = this.app, l = app.lookNow(), p = l.parts, sk = this.skyFor(l), d = app.drawOf(l, sk), rung = this.rung();
    const obs = app.transparent, quiet = !!app.quietMode();
    const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.still = quiet || reduced || rung >= 1;
    const rg = ringFor(p, sk, this.grid, null), on = rg.fx !== 'off' && !obs && rung < 3;
    this.palBoard = p.ring && p.ring.pal === 'board';
    const layer = obs || rung >= 2 || !d.wall ? null : d.wall.layer;
    const hears = rg.fx === 'music' && !!(app.listen && app.listen.active()) && !this.still;
    const key = [hears, rg.fx, rg.colours.join(), rg.bright, rg.size, rg.speed, on, this.still, layer, d.wall && d.wall.layerOpacity, sk && sk.storm, rung].join('|');
    this.rg = rg; this.on = on; this.layerOn = !!layer; this.wallMoves = !!(d.wall && d.wall.kind === 'fields' && !obs);
    const heavy = on || !!layer || !!(d.wall && d.wall.kind !== 'room' && !obs);
    if (heavy && (!this.heavy || Date.now() - (this.probeAt || 0) > PROBE_EVERY)) this.probe();
    this.heavy = heavy;
    if (!force && key === this.key) return; this.key = key;
    // the ring
    this.ring.classList.toggle('on', on);
    if (this.anim) { this.anim.cancel(); this.anim = null; }
    if (on) {
      this.mask();
      const c = rg.colours; this.tex.style.background = `conic-gradient(${c[0]}, ${c[1]}, ${c[2]}, ${c[3]}, ${c[0]})`;
      this.tex.style.animation = rg.fx === 'chase' && !this.still ? `sf11-turn ${RING.effects.chase.turn[rg.speed] / 1000}s linear infinite` : 'none';
      const E = RING.effects;
      let op = rg.bright;
      if (rg.fx === 'flash') op = E.flash.rest * rg.bright;
      if (rg.fx === 'breathe') {
        op = (E.breathe.min + E.breathe.max) / 2 * rg.bright;
        if (!this.still) this.anim = this.ring.animate([{ opacity: E.breathe.min * rg.bright }, { opacity: E.breathe.max * rg.bright }], { duration: E.breathe.period[rg.speed] / 2, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
      }
      // Music (0.11.2): with Listen on it follows the beat, set on each of Listen's ticks;
      // without, it rests as a slow breathe
      this.ring.style.transition = hears ? 'opacity 90ms linear' : '';
      if (rg.fx === 'music') {
        const M = E.music, B = E.breathe; op = M.rest * rg.bright;
        if (!hears && !this.still) this.anim = this.ring.animate([{ opacity: M.rest * 0.6 * rg.bright }, { opacity: M.rest * rg.bright }], { duration: B.period.slow / 2, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
      }
      this.hears = hears;
      this.ring.style.opacity = String(op);
    } else this.ring.style.opacity = '0';
    // the weather on the wall
    for (const k in this.L) { const e = this.L[k]; e.style.display = layer && SHOW[k].test(layer) ? 'block' : 'none'; e.style.animationPlayState = this.still ? 'paused' : 'running'; }
    this.L.rainNear.style.animationDuration = layer === 'storm' ? '0.42s' : '0.6s';
    this.wx.style.opacity = layer ? String(d.wall.layerOpacity) : '0';
    // a storm: lightning on the ring and a breath of it on the wall, now and then
    const storm = !obs && !!(sk && sk.storm) && !this.still;
    if (storm && !this.boltT) this.bolt(); else if (!storm && this.boltT) { clearTimeout(this.boltT); this.boltT = null; }
  }
}
