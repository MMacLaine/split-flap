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

let ac = null, bus = null, noise = null, lastStep = 0, lastFinal = 0;

function ensure() {
  if (ac) return ac;
  ac = new (window.AudioContext || window.webkitAudioContext)();
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = 0.002; comp.release.value = 0.12;
  bus = ac.createGain(); bus.gain.value = 0.9;
  bus.connect(comp); comp.connect(ac.destination);
  const len = Math.floor(ac.sampleRate * 0.06);
  noise = ac.createBuffer(1, len, ac.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return ac;
}

export function unlock() {
  try { ensure(); if (ac.state === 'suspended') ac.resume(); } catch { ac = null; }
}

function click(t, freq, q, dur, gain) {
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noise; s.playbackRate.value = 0.9 + Math.random() * 0.2;
  f.type = 'bandpass'; f.frequency.value = freq * (0.88 + Math.random() * 0.24); f.Q.value = q;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.0006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus);
  s.start(t, Math.random() * 0.03, dur + 0.01);
}

function thump(t, f0, f1, dur, gain) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(f0 * (0.95 + Math.random() * 0.1), t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus);
  o.start(t); o.stop(t + dur + 0.02);
}

// One flap. final = the last flap of a character, which gets the chunk.
// Steps are thinned to one per 12ms and finals to one per 18ms: past that the ear
// hears a rattle either way and the audio thread would only do extra work.
export function play(final, profile) {
  if (!ac || ac.state !== 'running') return;
  const now = performance.now();
  if (final) { if (now - lastFinal < 18) return; lastFinal = now; }
  else { if (now - lastStep < 12) return; lastStep = now; }
  const p = PROFILES[profile] || PROFILES.clack, t = ac.currentTime + 0.005;
  const level = 0.85 + Math.random() * 0.3;
  try {
    for (const part of final ? p.final : p.step) {
      const at = t + (part.at || 0);
      if (part.click) { const [f, q, d, g] = part.click; click(at, f, q, d, g * level); }
      if (part.thump) { const [a, b, d, g] = part.thump; thump(at, a, b, d, g * level); }
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
