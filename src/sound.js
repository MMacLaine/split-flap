// Flap clicks, synthesised: a 12ms burst of decaying noise through a high-pass filter,
// no recordings to license or download. Browsers only allow audio after a tap or key
// press, so sound starts off and the Sound button is that first gesture.
//
// When a whole row flips at once, clicks are thinned to one per 16ms (one per frame)
// with a little random level, so a full board sounds like a rattle, not a roar.

let ac = null, noise = null, last = 0;

export function unlock() {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
  } catch { ac = null; }
}

export function click(final) {
  if (!ac || ac.state !== 'running') return;
  const t = performance.now(); if (t - last < 16) return; last = t;
  try {
    if (!noise) {
      const len = Math.floor(ac.sampleRate * 0.012);
      noise = ac.createBuffer(1, len, ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 1600 + Math.random() * 500;
    g.gain.value = (final ? 0.09 : 0.035) * (0.8 + Math.random() * 0.4);
    s.buffer = noise; s.connect(f); f.connect(g); g.connect(ac.destination); s.start();
  } catch { /* audio is decoration; never let it break the board */ }
}
