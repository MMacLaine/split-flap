// What the flaps carry, in drum order. A flap only ever moves forward through this
// string, wrapping at the end, so the order IS the animation: Z to B goes the long way.
//
// Uppercase only, like the hardware. Nordic letters sit on the drum (not folded into
// lookalikes: Ø is not Ö to a Norwegian reader). The last nine entries are colour
// chips, stored as lowercase keys so they can never collide with a printed letter.

export const CHIPS = {
  r: '#D5352B', o: '#EE7D22', y: '#F2BE2E', g: '#2C9A5A',
  b: '#2B6FC4', v: '#7A4DB2', w: '#EFECE5', k: '#141415'
};
// f = "filled": a chip in the theme's glyph colour
export const CHIP_KEYS = ['r', 'o', 'y', 'g', 'b', 'v', 'w', 'k', 'f'];
export const CHIP_NAMES = {
  en: { r: 'red', o: 'orange', y: 'yellow', g: 'green', b: 'blue', v: 'violet', w: 'white', k: 'black', f: 'filled' },
  sv: { r: 'röd', o: 'orange', y: 'gul', g: 'grön', b: 'blå', v: 'lila', w: 'vit', k: 'svart', f: 'fylld' }
};

// The heart came in 0.3 (the Vestaboard Note has one), after the punctuation so the
// chips stay last. Links store characters, not positions, so older boards are unchanged.
export const DRUM = ' ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖÆØÜÉ0123456789.,:;!?\'"-+/&%#@()=$°♥' + CHIP_KEYS.join('');
export const DRUM_IDX = Object.fromEntries([...DRUM].map((c, i) => [c, i]));

// Characters that are not on the drum but have an honest stand-in.
const FOLD_MAP = {
  'È': 'E', 'Ê': 'E', 'Ë': 'E', 'Á': 'A', 'À': 'A', 'Â': 'A', 'Í': 'I', 'Ì': 'I', 'Ó': 'O', 'Ò': 'O',
  'Ô': 'O', 'Ú': 'U', 'Ù': 'U', 'Ñ': 'N', 'Ç': 'C', 'ß': 'SS',
  '\u2764': '♥', '\u2661': '♥',   // ❤ and ♡: a phone keyboard's hearts
  '\u2019': "'", '\u2018': "'", '\u201C': '"', '\u201D': '"', '\u2013': '-', '\u2014': '-', '\u00B4': "'", '`': "'"
};

export const isChip = ch => ch === 'f' || Object.prototype.hasOwnProperty.call(CHIPS, ch);

// One typed character to one flap. valid:false means it had no stand-in and became blank.
export function cleanChar(ch) {
  if (ch == null || ch === '' || ch === '\n' || ch === '\t') return { ch: ' ', valid: true };
  const u = String(ch).toUpperCase();
  if (u.length === 1 && DRUM_IDX[u] !== undefined) return { ch: u, valid: true };
  const f = FOLD_MAP[u] || FOLD_MAP[ch];
  if (f && f.length === 1) return { ch: f, valid: true };
  return { ch: ' ', valid: false };
}

// A stored cell to a drum entry. Chips pass through; everything else is cleaned.
export function cellChar(ch) {
  if (isChip(ch)) return ch;
  return cleanChar(ch).ch;
}

// Free text to flaps, expanding multi-letter stand-ins (ß to SS). Chips are not
// reachable from free text on purpose: lowercase letters must print as capitals.
export function textToCells(s) {
  const out = [];
  for (const ch of String(s || '')) {
    if (ch === '\uFE0F') continue;   // emoji presentation selector, sent after ❤ by phones
    const u = ch.toUpperCase();
    const f = FOLD_MAP[u] || FOLD_MAP[ch];
    if (f && f.length > 1) { out.push(...f); continue; }
    out.push(cleanChar(ch).ch);
  }
  return out;
}

// The forward path a flap takes from one entry to another, ending on the target.
// max caps the visible steps (the flap starts nearer the target); Infinity is the
// full authentic rotation.
export function drumPath(from, to, max = Infinity) {
  const n = DRUM.length;
  const fi = DRUM_IDX[from] ?? 0, ti = DRUM_IDX[to];
  if (ti === undefined) return [];
  const steps = ((ti - fi) % n + n) % n || n;
  const k = Math.min(steps, max);
  const out = [];
  for (let i = k - 1; i >= 0; i--) out.push(DRUM[((ti - i) % n + n) % n]);
  return out;
}

// Vestaboard character codes (docs.vestaboard.com/docs/charactercodes), for importing
// messages written for a real board. Codes 43, 45, 51, 57, 58 and 61 are unused there.
export const VB_CODES = {
  0: ' ', 37: '!', 38: '@', 39: '#', 40: '$', 41: '(', 42: ')', 44: '-', 46: '+', 47: '&',
  48: '=', 49: ';', 50: ':', 52: "'", 53: '"', 54: '%', 55: ',', 56: '.', 59: '/', 60: '?',
  62: '°', 63: 'r', 64: 'o', 65: 'y', 66: 'g', 67: 'b', 68: 'v', 69: 'w', 70: 'k', 71: 'f'
};
for (let i = 1; i <= 26; i++) VB_CODES[i] = String.fromCharCode(64 + i);
for (let i = 27; i <= 35; i++) VB_CODES[i] = String(i - 26);
VB_CODES[36] = '0';
export const VB_FROM_CHAR = Object.fromEntries(Object.entries(VB_CODES).map(([k, v]) => [v, +k]));

export function fromVestaboardCodes(rows) {
  return rows.map(r => r.map(code => VB_CODES[code] ?? ' '));
}

// Text in Vestaboard's own shorthand, where {63} is a red chip, to cells.
export function fromVestaboardText(s) {
  const out = [];
  String(s || '').replace(/\{(\d{1,2})\}|([\s\S])/g, (m, code, ch) => {
    if (code != null) out.push(VB_CODES[+code] ?? ' ');
    else out.push(...textToCells(ch));
    return '';
  });
  return out;
}
