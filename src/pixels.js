// Pictures made of flaps: a 3x5 pixel font for big text and the big clock, and
// animated colour patterns. Each cell is a colour chip key (or ' '), so these draw
// with the chips on the drum and every frame change is a real flip.
// Pure functions of (settings, grid size, time), like the rest of content.

const FONT = {
  '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'], '3': ['###', '..#', '.##', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'], '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'], '9': ['###', '#.#', '###', '..#', '###'],
  A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'], J: ['..#', '..#', '..#', '#.#', '.#.'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'], N: ['##.', '#.#', '#.#', '#.#', '#.#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'], P: ['##.', '#.#', '##.', '#..', '#..'],
  Q: ['.#.', '#.#', '#.#', '##.', '.##'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  W: ['#.#', '#.#', '###', '###', '#.#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'],
  ':': ['.', '#', '.', '#', '.'], '.': ['.', '.', '.', '.', '#'], '!': ['#', '#', '#', '.', '#'],
  '?': ['###', '..#', '.#.', '...', '.#.'], '-': ['...', '...', '###', '...', '...'],
  "'": ['#', '#', '.', '.', '.'], ' ': ['..', '..', '..', '..', '..'],
  '*': ['.#.#.', '#####', '#####', '.###.', '..#..'],   // a heart, from before the heart flap
  '♥': ['.#.#.', '#####', '#####', '.###.', '..#..']
};
const LOOKALIKE = { 'Å': 'A', 'Ä': 'A', 'Æ': 'A', 'Ö': 'O', 'Ø': 'O', 'Ü': 'U', 'É': 'E' };
export const RAINBOW = ['r', 'o', 'y', 'g', 'b', 'v'];

const glyph = ch => FONT[ch] || FONT[LOOKALIKE[ch]] || null;

// Width in cells of a string in the pixel font, with one blank column between glyphs.
export function pixelWidth(s) {
  let w = 0, n = 0;
  for (const ch of s.toUpperCase()) { const g = glyph(ch); if (g) { w += g[0].length; n++; } }
  return w + Math.max(0, n - 1);
}

// Draw pixel text into a zone of the grid g, centred. color: a chip key, 'f' for the
// theme's glyph colour, or 'rainbow' (colour by column, shifting with time).
// k: each pixel as k x k flaps (0.10.2: a 12 x 40 board draws its big clock at 2).
export function drawPixels(g, z, s, color, now, k = 1) {
  const text = [...s.toUpperCase()].filter(ch => glyph(ch)).join('');
  const w = pixelWidth(text) * k;
  const top = z.r + Math.max(0, Math.floor((z.h - 5 * k) / 2));
  let x = z.c + Math.floor((z.w - w) / 2);
  const shift = Math.floor(now / 2000);
  for (const ch of text) {
    const gl = glyph(ch);
    for (let r = 0; r < 5 * k && r < z.h; r++) for (let c = 0; c < gl[0].length * k; c++) {
      const cx = x + c, cy = top + r;
      if (gl[Math.floor(r / k)][Math.floor(c / k)] !== '#' || cx < z.c || cx >= z.c + z.w || !g[cy]) continue;
      g[cy][cx] = color === 'rainbow' ? RAINBOW[((cx - z.c) + shift) % 6] : color;
    }
    x += (gl[0].length + 1) * k;
  }
}

// Split text into pieces that fit a zone's width in the pixel font, word by word.
export function pixelPages(s, w) {
  const out = []; let cur = '';
  for (const word of String(s || '').toUpperCase().split(/\s+/).filter(Boolean)) {
    const next = cur ? cur + ' ' + word : word;
    if (pixelWidth(next) <= w) cur = next;
    else { if (cur) out.push(cur); cur = word; }
  }
  if (cur) out.push(cur);
  return out.length ? out : [''];
}

// Deterministic "random" in [0, 1) from integers, so a pattern frame is the same on
// every screen at the same moment and tests can pin it.
function hash(a, b, c) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Nordic flags: [field, cross, border] where border is the outline of the cross.
const FLAGS = [
  ['b', 'y', null],   // Sweden
  ['r', 'b', 'w'],    // Norway
  ['r', 'w', null],   // Denmark
  ['w', 'b', null],   // Finland
  ['b', 'r', 'w']     // Iceland
];

export const PATTERNS = ['rainbow', 'nordic', 'rain', 'confetti', 'wave', 'checker'];

// One frame of an animated pattern over a zone. step: seconds per frame. palette, when
// given, replaces the rainbow in the rainbow, confetti and wave patterns, and its first
// two colours make the checker.
export function drawPattern(g, z, name, now, step, palette) {
  const PAL = Array.isArray(palette) && palette.length ? palette : RAINBOW, n = PAL.length;
  const frame = Math.floor(now / (Math.max(2, step || 4) * 1000));
  const H = z.h, W = z.w;
  const set = (r, c, v) => { if (g[z.r + r] && c >= 0 && c < W) g[z.r + r][z.c + c] = v; };
  if (name === 'nordic') {
    const [field, cross, border] = FLAGS[frame % FLAGS.length];
    // cross proportions from the Swedish flag (5:2:9 across, 4:2:4 down), scaled to the zone
    const bw = Math.max(1, Math.round(H * 0.2)), vx = Math.round(W * 5 / 16), hy = Math.floor((H - bw) / 2);
    const vw = Math.max(1, Math.round(W * 2 / 16));
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      const inH = r >= hy && r < hy + bw, inV = c >= vx && c < vx + vw;
      const nearH = r >= hy - 1 && r < hy + bw + 1, nearV = c >= vx - 1 && c < vx + vw + 1;
      set(r, c, inH || inV ? cross : border && (nearH || nearV) && H >= 5 ? border : field);
    }
    return;
  }
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    let v = ' ';
    if (name === 'rainbow') v = PAL[((c + r + frame) % n + n) % n];
    else if (name === 'checker') v = ((r + c + frame) % 2) ? (PAL === RAINBOW ? 'b' : PAL[0]) : (PAL === RAINBOW ? 'y' : PAL[1 % n]);
    else if (name === 'confetti') v = hash(r, c, frame) < 0.4 ? PAL[Math.floor(hash(c, r, frame + 7) * n)] : ' ';
    else if (name === 'rain') {
      const cycle = H + 3, head = Math.floor(hash(c, 1, 3) * cycle + frame) % cycle;
      v = r === head ? 'w' : r === head - 1 || r === head - 2 ? 'b' : ' ';
    } else if (name === 'wave') {
      const y = Math.round((H - 1) / 2 * (1 + Math.sin(c / 2.2 + frame * 0.9)));
      v = r === y ? PAL[Math.floor(c / 2) % n] : ' ';
    }
    set(r, c, v);
  }
}
