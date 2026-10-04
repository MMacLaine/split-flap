// Flap sound, synthesised (nothing to license or download). A real split-flap makes
// two noises: a light plastic tick each time a flap passes the stop, and a heavier
// "ka-chunk" when the last flap lands and the drum stops. Each profile below builds
// those from three parts:
//   click: a few ms of noise through a band-pass filter (the plastic edge)
//   thump: a sine that drops in pitch over ~70ms (the drum and housing)
//   rebound: a second, quieter click as the landed flap settles against the stop
// Everything goes through one compressor, so a full-board flip rattles instead of
// clipping. Browsers only allow audio after a tap or key press, so sound starts off
// and the Sound button is that first gesture.

export const PROFILES = {
  // Solari-style: bright tick, solid chunk. The default.
  clack: {
    step:  [{ click: [2700, 1.8, 0.018, 0.20] }, { click: [950, 1.2, 0.012, 0.07] }],
    final: [{ click: [2300, 1.5, 0.024, 0.28] }, { thump: [190, 95, 0.075, 0.34] }, { click: [3100, 2, 0.010, 0.07], at: 0.016 }]
  },
  // Big station board: deeper housing, slower rebound.
  heavy: {
    step:  [{ click: [1900, 1.4, 0.022, 0.20] }, { thump: [320, 220, 0.025, 0.08] }],
    final: [{ click: [1700, 1.2, 0.030, 0.26] }, { thump: [135, 60, 0.110, 0.45] }, { click: [2400, 1.6, 0.014, 0.09], at: 0.028 }]
  },
  // Vestaboard-like: muffled, the flaps sit behind a front panel.
  soft: {
    step:  [{ click: [1400, 0.9, 0.016, 0.12] }],
    final: [{ click: [1150, 0.9, 0.022, 0.15] }, { thump: [150, 90, 0.060, 0.22] }]
  },
  // Desk clock: thin and quiet.
  tick: {
    step:  [{ click: [4300, 3, 0.006, 0.09] }],
    final: [{ click: [3600, 3, 0.010, 0.15] }]
  }
};
export const PROFILE_IDS = Object.keys(PROFILES);
// A look's material has a sound of its own (0.11.3), not offered in the picker. Not designed
// yet, so small and parametric: glass a short high tick, smoke the same lower, paper a soft
// muted tap. Flap and Solari keep the clack. Used only while the playlist's sound is the
// default Clack, so a sound someone chose always wins.
const MATERIAL_SOUNDS = {
  glass: {
    step:  [{ click: [5200, 3.2, 0.007, 0.10] }],
    final: [{ click: [4600, 3, 0.011, 0.17] }, { click: [6400, 4, 0.005, 0.05], at: 0.012 }]
  },
  smoke: {
    step:  [{ click: [3400, 2.6, 0.008, 0.10] }],
    final: [{ click: [3000, 2.4, 0.012, 0.17] }, { thump: [240, 160, 0.030, 0.10] }]
  },
  paper: {
    step:  [{ click: [900, 0.7, 0.014, 0.08] }],
    final: [{ click: [760, 0.7, 0.020, 0.11] }, { thump: [120, 80, 0.045, 0.12] }]
  }
};
Object.assign(PROFILES, MATERIAL_SOUNDS);
export function soundFor(style, material) { return (!style || style === 'clack') && MATERIAL_SOUNDS[material] ? material : style || 'clack'; }

let ac = null, bus = null, noise = null, lastStep = 0, lastFinal = 0, volume = 70;

// 0 to 100. Squared so the slider feels linear to the ear: 50 sounds about half as
// loud, not nearly as loud as 100. Full scale is a little over the old fixed level.
export const DEFAULT_VOLUME = 70;
const gainFor = v => Math.pow(Math.max(0, Math.min(100, v)) / 100, 2) * 1.3;
export function setVolume(v) {
  volume = Math.max(0, Math.min(100, +v || 0));
  if (bus && ac) bus.gain.setTargetAtTime(gainFor(volume), ac.currentTime, 0.02);
}

function ensure() {
  if (ac) return ac;
  ac = new (window.AudioContext || window.webkitAudioContext)();
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = 0.002; comp.release.value = 0.12;
  bus = ac.createGain(); bus.gain.value = gainFor(volume);
  bus.connect(comp); comp.connect(ac.destination);
  // Stereo: five fixed panner buses, each click goes to the nearest. One panner per click
  // would cost a node per flap; five is plenty for a modest spread left to right.
  pans = PAN_AT.map(x => {
    if (!ac.createStereoPanner) return bus;
    const p = ac.createStereoPanner(); p.pan.value = x; p.connect(bus); return p;
  });
  const len = Math.floor(ac.sampleRate * 0.06);
  noise = ac.createBuffer(1, len, ac.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return ac;
}

export function unlock() {
  try { ensure(); if (ac.state === 'suspended') ac.resume(); } catch { ac = null; }
}

const PAN_AT = [-0.5, -0.25, 0, 0.25, 0.5];
let pans = null;
// pan -1..1 (the column across the board) to the nearest bus.
const outFor = pan => pans ? pans[Math.max(0, Math.min(4, Math.round(((+pan || 0) + 1) * 2)))] : bus;

function click(t, freq, q, dur, gain, out) {
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noise; s.playbackRate.value = 0.9 + Math.random() * 0.2;
  f.type = 'bandpass'; f.frequency.value = freq * (0.88 + Math.random() * 0.24); f.Q.value = q;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.0006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(out || bus);
  s.start(t, Math.random() * 0.03, dur + 0.01);
}

function thump(t, f0, f1, dur, gain, out) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(f0 * (0.95 + Math.random() * 0.1), t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(out || bus);
  o.start(t); o.stop(t + dur + 0.02);
}

// One flap. final = the last flap of a character, which gets the chunk. pan is where the
// flap is across the board, -1 at the left edge to 1 at the right.
// Steps are thinned to one per 12ms and finals to one per 18ms: past that the ear
// hears a rattle either way and the audio thread would only do extra work.
export function play(final, profile, pan) {
  if (!ac || ac.state !== 'running' || volume <= 0) return;
  const now = performance.now();
  if (final) { if (now - lastFinal < 18) return; lastFinal = now; }
  else { if (now - lastStep < 12) return; lastStep = now; }
  const p = PROFILES[profile] || PROFILES.clack, t = ac.currentTime + 0.005;
  const level = 0.85 + Math.random() * 0.3, out = outFor(pan);
  try {
    for (const part of final ? p.final : p.step) {
      const at = t + (part.at || 0);
      if (part.click) { const [f, q, d, g] = part.click; click(at, f, q, d, g * level, out); }
      if (part.thump) { const [a, b, d, g] = part.thump; thump(at, a, b, d, g * level, out); }
    }
  } catch { /* audio is decoration; never let it break the board */ }
}

// A short sample for the settings panel: a few steps, then the landing.
export function preview(profile) {
  unlock();
  if (!ac) return;
  const go = () => { for (let i = 0; i < 5; i++) setTimeout(() => play(i === 4, profile), i * 70); };
  if (ac.state === 'running') go(); else ac.resume().then(go);
}
