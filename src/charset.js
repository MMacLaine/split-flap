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
// Half flaps (0.9): only the top or the bottom half coloured, green, red or the theme's
// glyph colour, so a line chart has two heights per row. They are private-use characters,
// one UTF-16 unit each like every other flap, that no keyboard types, and they sit after
// the chips so the drum's order for everything before them is unchanged.
export const HALF = { gTop: '\uE000', gBottom: '\uE001', rTop: '\uE002', rBottom: '\uE003', fTop: '\uE004', fBottom: '\uE005' };
export const HALVES = { '\uE000': ['g', 'top'], '\uE001': ['g', 'bottom'], '\uE002': ['r', 'top'], '\uE003': ['r', 'bottom'], '\uE004': ['f', 'top'], '\uE005': ['f', 'bottom'] };
export const isHalf = ch => Object.prototype.hasOwnProperty.call(HALVES, ch);
export const DRUM = ' ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖÆØÜÉ0123456789.,:;!?\'"-+/&%#@()=$°♥' + CHIP_KEYS.join('') + Object.keys(HALVES).join('');
export const DRUM_IDX = Object.fromEntries([...DRUM].map((c, i) => [c, i]));

// Characters that are not on the drum but have an honest stand-in.
const FOLD_MAP = {
  'È': 'E', 'Ê': 'E', 'Ë': 'E', 'Á': 'A', 'À': 'A', 'Â': 'A', 'Í': 'I', 'Ì': 'I', 'Ó': 'O', 'Ò': 'O',
  'Ô': 'O', 'Ú': 'U', 'Ù': 'U', 'Ñ': 'N', 'Ç': 'C', 'ß': 'SS',
  '\u2764': '♥', '\u2661': '♥',   // ❤ and ♡: a phone keyboard's hearts
  '\u2019': "'", '\u2018': "'", '\u201C': '"', '\u201D': '"', '\u2013': '-', '\u2014': '-', '\u00B4': "'", '`': "'",
  // Latin letters that Unicode does not split into a letter and a mark (0.8). Hungarian's
  // long umlauts read as the umlauts the drum has.
  'Ł': 'L', 'Đ': 'D', 'Ħ': 'H', 'Œ': 'OE', 'Þ': 'TH', 'Ð': 'D', 'Ŀ': 'L', 'Ŧ': 'T', 'Ŋ': 'NG', 'Ə': 'E', 'Ő': 'Ö', 'Ű': 'Ü'
};

// Greek and Cyrillic, letter by letter, the way departure boards in Athens and Kyiv
// print them for visitors. Hard and soft signs print nothing.
const TRANSLIT = {
  'Α': 'A', 'Β': 'V', 'Γ': 'G', 'Δ': 'D', 'Ε': 'E', 'Ζ': 'Z', 'Η': 'I', 'Θ': 'TH', 'Ι': 'I', 'Κ': 'K', 'Λ': 'L', 'Μ': 'M',
  'Ν': 'N', 'Ξ': 'X', 'Ο': 'O', 'Π': 'P', 'Ρ': 'R', 'Σ': 'S', 'Τ': 'T', 'Υ': 'Y', 'Φ': 'F', 'Χ': 'CH', 'Ψ': 'PS', 'Ω': 'O',
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'E', 'Ж': 'ZH', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K',
  'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'KH', 'Ц': 'TS',
  'Ч': 'CH', 'Ш': 'SH', 'Щ': 'SHCH', 'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'YU', 'Я': 'YA',
  'І': 'I', 'Ї': 'YI', 'Є': 'YE', 'Ґ': 'G', 'Ў': 'U', 'Ђ': 'DJ', 'Ј': 'J', 'Љ': 'LJ', 'Њ': 'NJ', 'Ћ': 'C', 'Џ': 'DZ', 'Ѓ': 'GJ', 'Ќ': 'KJ', 'Ѕ': 'DZ'
};

// A colour flap, whole or half: never typed, never read aloud, blank in a ticker row.
export const isChip = ch => ch === 'f' || Object.prototype.hasOwnProperty.call(CHIPS, ch) || isHalf(ch);

// One character to what the flaps print for it: itself, a stand-in of one or more
// letters, '' for a letter that prints nothing, or null when there is no stand-in.
// Accents the drum has no flap for are dropped (Ł is a table entry, ș splits into s and
// a mark), and Å Ä Ö Ü É keep their own flaps because they are looked up first.
function fold(ch) {
  if (isHalf(ch)) return null;   // drawn by the chart only, never from text
  const u = String(ch).toUpperCase();
  if (u.length === 1 && DRUM_IDX[u] !== undefined) return u;
  const f = FOLD_MAP[u] ?? FOLD_MAP[ch] ?? TRANSLIT[u];
  if (f != null) return f;
  const bare = u.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (bare && bare !== u) { const parts = [...bare].map(fold); return parts.includes(null) ? null : parts.join(''); }
  return null;
}
// Greek writes the sound u as two letters, and letter by letter it would print OY.
const preFold = s => String(s || '').replace(/[οΟ][υύΥΎ]/g, 'OU');

// One typed character to one flap. valid:false means it had no stand-in and became blank.
export function cleanChar(ch) {
  if (ch == null || ch === '' || ch === '\n' || ch === '\t') return { ch: ' ', valid: true };
  const f = fold(ch);
  if (f != null && f.length === 1) return { ch: f, valid: true };
  return { ch: ' ', valid: false };
}

// A stored cell to a drum entry. Chips pass through; everything else is cleaned.
// '~' + a character is the same flap drawn faint (the letter clock's unlit letters and
// dots). A faint blank is just a blank.
export function cellChar(ch) {
  if (typeof ch === 'string' && ch.length > 1 && ch[0] === '~') { const b = cellChar(ch.slice(1)); return b === ' ' ? ' ' : '~' + b; }
  if (isChip(ch)) return ch;
  return cleanChar(ch).ch;
}
export const isDim = ch => typeof ch === 'string' && ch.length > 1 && ch[0] === '~';
export const baseChar = ch => isDim(ch) ? ch.slice(1) : ch;

// Free text to flaps, expanding multi-letter stand-ins (ß to SS, Ж to ZH). Chips are not
// reachable from free text on purpose: lowercase letters must print as capitals.
export function textToCells(s) {
  const out = [];
  for (const ch of preFold(s)) {
    if (ch === '\uFE0F') continue;   // emoji presentation selector, sent after ❤ by phones
    if (ch === '\n' || ch === '\t') { out.push(' '); continue; }
    const f = fold(ch);
    out.push(...(f == null ? ' ' : f));
  }
  return out;
}
// The same, as a string: what a name from a data source prints, so lines are measured
// and cut at the length they will have on the board.
export const boardText = s => textToCells(s).join('');

// How much of a name the flaps can print, from 0 to 1: letters and digits that survive
// folding, over the letters and digits there were.
function printableShare(s) {
  let all = 0, ok = 0;
  for (const ch of preFold(s)) {
    if (!/[\p{L}\p{N}]/u.test(ch)) continue;
    all++; const f = fold(ch); if (f != null && /[A-Z0-9ÅÄÖÆØÜÉ]/.test(f)) ok++;
  }
  return all ? ok / all : 0;
}
// The first of several names for the same thing (the local name, the English one, a stop
// code) that the board can mostly print, as board text. Never a row of blanks: a name in
// a script the drum does not carry falls through to the next one, and '' if none fit.
export function printable(...names) {
  const hit = names.find(n => n != null && String(n).trim() && printableShare(n) >= 0.6);
  return hit == null ? '' : boardText(hit).replace(/\s{2,}/g, ' ').trim();
}

// What the composer's hidden input receives, to flaps. The coloured squares on a phone
// keyboard place the matching chip; this is for the composer only, so in free text
// elsewhere (quotes, big text, menus) an emoji never turns into a chip. Returns the
// flaps and the characters that had no flap, for the "shows as blank" note.
const EMOJI_CHIPS = { '🟥': 'r', '🟧': 'o', '🟨': 'y', '🟩': 'g', '🟦': 'b', '🟪': 'v', '⬜': 'w', '⬛': 'k', '◻': 'w', '◼': 'k' };
export function composerInput(s) {
  const out = [], invalid = [];
  for (const ch of String(s || '')) {
    if (ch === '\uFE0F') continue;
    if (EMOJI_CHIPS[ch]) { out.push(EMOJI_CHIPS[ch]); continue; }
    if (ch === '\n' || ch === '\t') { out.push(' '); continue; }
    const f = fold(ch); if (f == null) { invalid.push(ch); out.push(' '); } else out.push(...f);
  }
  return { cells: out, invalid };
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
// A Vestaboard has no half flaps: each is sent as the whole chip of its colour.
for (const [c, [k]] of Object.entries(HALVES)) VB_FROM_CHAR[c] = VB_FROM_CHAR[k];

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
