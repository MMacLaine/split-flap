// Photo to chips: an image drawn at the zone's size, each flap set to the nearest of the
// eight chip colours (and optionally blank), with Floyd Steinberg error diffusion to
// suggest the colours in between. Runs in the browser; nothing is uploaded. From the
// editor handoff (design/editor/editor-channels.js).

import { CHIPS } from './charset.js';
import { THEMES, GEOM } from './renderer.js';

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const blank = (h, w) => Array.from({ length: h }, () => Array(w).fill(' '));

// o: { theme, zoom (1 to 3), px and py (0 to 1, where the crop sits), dither, blank }
export function mapImage(src, h, w, o) {
  const T = THEMES[o.theme] || THEMES.black;
  const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
  // crop to the zone's real shape, gaps included
  const target = (w * (GEOM.tileW + GEOM.gapX)) / (h * (1 + GEOM.gapY));
  let cw, ch; if (sw / sh > target) { ch = sh; cw = sh * target; } else { cw = sw; ch = sw / target; }
  const z = o.zoom || 1; cw /= z; ch /= z;
  const sx = (sw - cw) * (o.px == null ? 0.5 : o.px), sy = (sh - ch) * (o.py == null ? 0.5 : o.py);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingQuality = 'high';
  x.drawImage(src, sx, sy, cw, ch, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data, buf = new Float32Array(w * h * 3);
  for (let i = 0; i < w * h; i++) { buf[i * 3] = d[i * 4]; buf[i * 3 + 1] = d[i * 4 + 1]; buf[i * 3 + 2] = d[i * 4 + 2]; }
  const pal = ['r', 'o', 'y', 'g', 'b', 'v', 'w', 'k'].map(k => [k, hex(CHIPS[k])]);
  if (o.blank) pal.push([' ', hex(T.face)]);
  const out = blank(h, w);
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const i = (yy * w + xx) * 3, R = buf[i], G = buf[i + 1], B = buf[i + 2];
    let best = pal[0], bd = Infinity;
    for (const p of pal) { const dr = R - p[1][0], dg = G - p[1][1], db = B - p[1][2], dd = 0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db; if (dd < bd) { bd = dd; best = p; } }
    out[yy][xx] = best[0];
    if (o.dither) {
      const er = [R - best[1][0], G - best[1][1], B - best[1][2]];
      for (const [dx, dy, f] of [[1, 0, 7], [-1, 1, 3], [0, 1, 5], [1, 1, 1]]) {
        const nx = xx + dx, ny = yy + dy; if (nx < 0 || nx >= w || ny >= h) continue;
        const j = (ny * w + nx) * 3; for (let k = 0; k < 3; k++) buf[j + k] += er[k] * f / 16;
      }
    }
  }
  return out;
}

// A sunset drawn on a canvas, shown until a photo of your own is chosen.
let sample = null;
export function sampleImage() {
  if (sample) return sample;
  const c = document.createElement('canvas'); c.width = 480; c.height = 300; const x = c.getContext('2d');
  let g = x.createLinearGradient(0, 0, 0, 190); g.addColorStop(0, '#26407E'); g.addColorStop(0.55, '#C8453A'); g.addColorStop(1, '#F09A38');
  x.fillStyle = g; x.fillRect(0, 0, 480, 190);
  x.fillStyle = '#F6C640'; x.beginPath(); x.arc(310, 178, 46, 0, Math.PI * 2); x.fill();
  g = x.createLinearGradient(0, 186, 0, 300); g.addColorStop(0, '#1E3568'); g.addColorStop(1, '#0C1530'); x.fillStyle = g; x.fillRect(0, 186, 480, 114);
  x.fillStyle = '#F2B83A'; [[196, 60], [210, 44], [226, 30], [244, 18]].forEach(([y, w]) => x.fillRect(310 - w / 2, y, w, 5));
  x.fillStyle = '#121418'; x.beginPath(); x.moveTo(0, 196); x.lineTo(0, 120); x.lineTo(60, 132); x.lineTo(120, 160); x.lineTo(170, 190); x.lineTo(180, 196); x.closePath(); x.fill();
  sample = c; return c;
}

// A heart for an empty Draw zone, so the tile and a fresh zone show what painting does.
export const HEART = ['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'];
export function stamp(h, w, bmp) {
  const g = blank(h, w), bh = Math.min(bmp.length, h), bw = bmp[0].length;
  const top = Math.floor((h - bh) / 2), left = Math.floor((w - bw) / 2);
  bmp.slice(0, bh).forEach((row, y) => [...row].forEach((p, x) => { if (p !== '.' && left + x >= 0 && left + x < w) g[top + y][left + x] = p; }));
  return g;
}
