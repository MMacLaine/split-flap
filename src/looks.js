// Split-Flap 0.11: the look file, from Claude Design's handover (_local/plans/0.11/handoff/
// looks.js), as an ES module. Data and pure functions only: materials in the shape of THEMES
// in renderer.js, type metrics, letter colours, the ring's palettes, the looks, the Make your
// own matrix, and the functions that turn a look into a theme, a wall and a swatch.
// The sky's thirty states, the meter and the quality ladder come with 0.11.1 and 0.11.2.
// The strings are in strings.js.

// ---- Colour helpers ------------------------------------------------------------
const parse = c => {
  if (c[0] === '#') { const n = parseInt(c.slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255, 1]; }
  const m = c.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], m[3] == null ? 1 : m[3]];
};
const hex = a => '#' + a.slice(0, 3).map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const mix = (a, b, t) => { const x = parse(a), y = parse(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
const rgba = (h, a) => { const [r, g, b] = parse(h); return `rgba(${r},${g},${b},${a})`; };
const lerpRgba = (a, b, t) => { const x = parse(a), y = parse(b), o = x.map((v, i) => v + (y[i] - v) * t); return `rgba(${Math.round(o[0])},${Math.round(o[1])},${Math.round(o[2])},${o[3].toFixed(3)})`; };
// a colour with alpha laid over an opaque one
const over = (fg, bg) => { const f = parse(fg), b = parse(bg); return hex([0, 1, 2].map(i => f[i] * f[3] + b[i] * (1 - f[3]))); };
const lum = c => { const v = parse(c).slice(0, 3).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

// ---- Materials ------------------------------------------------------------------
// theme: the renderer's THEMES fields. New fields in 0.11, all baked into the atlas:
//   body     the opaque colour of a translucent flap while it moves (Fable 3.1)
//   sheen    top-left highlight strength; rim: the fine edge line (glass, ceramic)
//   brush    brushed-metal line strength
//   dots     LED dot-matrix face: { pitch (H), r (of pitch), off (unlit dot colour) }
//   smoked   the faces a translucent material takes on a bright wall (the contrast rule)
const MATERIALS = {
  flap: {
    label: 'Flap', hint: 'Today’s board', release: '0.11.0', light: false, translucent: false, lit: true,
    types: ['mono', 'grotesk', 'round', 'serif'], glowA: 0.85, glowR: 0.20,
    inks: [['warm', 'Warm white', '#EDE6D6'], ['white', 'White', '#FFFFFF'], ['amber', 'Amber', '#F2B01E'], ['ice', 'Ice', '#BFE3FF']],
    theme: {
      face: '#1C1C1E', faceHi: '#232326', faceB: '#1A1A1C', faceLo: '#121213',
      housing: '#070708', crease: '#020202', lip: 'rgba(255,255,255,0.06)', stack: '#2B2B2E', pin: '#3A3A3D',
      frame: '#0F0F10', frameEdge: '#26262A', frameShade: '#050505', framePad: 0.5, frameRadius: 0.12,
      backdrop: ['#141518', '#0A0A0C'], shadow: 0.6,
      occl: 0.28, cast: 0.35, fallDark: 0.55, riseLight: 0.10, edge: '#4A4A4F', dim: 0.16
    }
  },
  solari: {
    label: 'Solari', hint: 'Station rails and screws', release: '0.11.0', light: false, translucent: false, lit: true,
    types: ['grotesk', 'mono'], glowA: 0.8, glowR: 0.20,
    inks: [['amber', 'Amber', '#F2B01E'], ['warm', 'Warm white', '#EDE6D6'], ['white', 'White', '#FFFFFF']],
    theme: {
      face: '#2A2B2D', faceHi: '#313235', faceB: '#28292B', faceLo: '#1E1F21',
      housing: '#0C0D0E', crease: '#050506', lip: 'rgba(255,255,255,0.08)', stack: '#3B3C40', pin: '#55575C',
      frame: '#1C1D1F', frameEdge: '#3A3C40', frameShade: '#0A0A0B', framePad: 0.9, frameRadius: 0.06,
      rail: '#161719', screws: true, screw: '#6A6D72',
      backdrop: ['#303236', '#1B1C1F'], shadow: 0.5,
      occl: 0.30, cast: 0.35, fallDark: 0.50, riseLight: 0.10, edge: '#5A5C61', dim: 0.16
    }
  },
  paper: {
    label: 'Paper', hint: 'Light, matte', release: '0.11.0', light: true, translucent: false, lit: false,
    types: ['mono', 'grotesk', 'serif'],
    inks: [['ink', 'Ink', '#18181B'], ['navy', 'Navy', '#1E3355'], ['oxblood', 'Oxblood', '#7A2230']],
    theme: {
      face: '#F0EDE6', faceHi: '#F7F5F0', faceB: '#ECE9E2', faceLo: '#DEDAD2',
      housing: '#B9B4AB', crease: '#7F7A72', lip: 'rgba(255,255,255,0.7)', stack: '#D3CEC5', pin: '#9C978F',
      frame: '#E7E3DB', frameEdge: '#FAF8F4', frameShade: '#BDB8AF', framePad: 0.5, frameRadius: 0.12,
      backdrop: ['#D5D1C9', '#C3BEB5'], shadow: 0.28,
      occl: 0.16, cast: 0.22, fallDark: 0.30, riseLight: 0.18, edge: '#FFFFFF', dim: 0.13
    }
  },
  glass: {
    label: 'Glass', hint: 'Clear, over the wall', release: '0.11.0', light: false, translucent: true, lit: true,
    types: ['mono', 'grotesk', 'round', 'serif'], glowA: 0.85, glowR: 0.22,
    inks: [['white', 'White', '#FFFFFF'], ['warm', 'Warm white', '#F6EDDC'], ['ice', 'Ice', '#D2EEFF'], ['rose', 'Rose', '#FFC9DA']],
    theme: {
      face: 'rgba(255,255,255,0.10)', faceHi: 'rgba(255,255,255,0.17)', faceB: 'rgba(255,255,255,0.075)', faceLo: 'rgba(255,255,255,0.045)',
      housing: 'rgba(0,0,0,0.14)', crease: 'rgba(0,0,0,0.30)', lip: 'rgba(255,255,255,0.22)', stack: 'rgba(255,255,255,0.10)', pin: 'rgba(255,255,255,0.14)',
      frame: 'rgba(255,255,255,0.05)', frameEdge: 'rgba(255,255,255,0.40)', frameShade: 'rgba(0,0,0,0.12)', framePad: 0.45, frameRadius: 0.22,
      backdrop: null, shadow: 0, sheen: 0.16, rim: 'rgba(255,255,255,0.20)',
      body: 'rgba(40,50,68,0.90)',
      occl: 0.14, cast: 0.18, fallDark: 0.22, riseLight: 0.10, edge: 'rgba(255,255,255,0.7)', dim: 0.18
    },
    smoked: { face: 'rgba(10,14,22,0.50)', faceHi: 'rgba(24,30,42,0.54)', faceB: 'rgba(8,12,20,0.52)', faceLo: 'rgba(4,6,12,0.58)', body: 'rgba(14,18,28,0.94)', housing: 'rgba(0,0,0,0.30)' }
  },
  smoke: {
    label: 'Smoke', hint: 'Dark glass', release: '0.11.0', light: false, translucent: true, lit: true,
    types: ['mono', 'grotesk', 'round', 'serif'], glowA: 0.9, glowR: 0.24,
    inks: [['white', 'White', '#FFFFFF'], ['rose', 'Rose', '#FF8DB4'], ['lime', 'Lime', '#CBFF6E'], ['ice', 'Ice', '#A8ECFF'], ['amber', 'Amber', '#FFB547']],
    theme: {
      face: 'rgba(14,14,20,0.62)', faceHi: 'rgba(30,30,40,0.66)', faceB: 'rgba(10,10,14,0.64)', faceLo: 'rgba(4,4,8,0.70)',
      housing: 'rgba(0,0,0,0.30)', crease: 'rgba(0,0,0,0.6)', lip: 'rgba(255,255,255,0.10)', stack: 'rgba(255,255,255,0.06)', pin: 'rgba(255,255,255,0.10)',
      frame: 'rgba(8,8,12,0.35)', frameEdge: 'rgba(255,255,255,0.08)', frameShade: 'rgba(0,0,0,0.3)', framePad: 0.45, frameRadius: 0.22,
      backdrop: null, shadow: 0, sheen: 0.07, rim: 'rgba(255,255,255,0.10)',
      body: 'rgba(10,10,14,0.94)',
      occl: 0.28, cast: 0.35, fallDark: 0.5, riseLight: 0.08, edge: 'rgba(255,255,255,0.5)', dim: 0.16
    },
    smoked: { face: 'rgba(6,6,10,0.80)', faceHi: 'rgba(16,16,22,0.82)', faceB: 'rgba(4,4,8,0.82)', faceLo: 'rgba(2,2,4,0.86)', body: 'rgba(6,6,10,0.97)', housing: 'rgba(0,0,0,0.45)' }
  },
  // Proposals: designed and drawn, not in 0.11.0 (plan section 6, "Later").
  metal: {
    label: 'Metal', hint: 'Brushed, engraved', release: 'later', light: true, translucent: false, lit: false,
    types: ['mono', 'grotesk'],
    inks: [['graphite', 'Graphite', '#1C1E22'], ['navy', 'Navy', '#1E3355']],
    theme: {
      face: '#A7ABB1', faceHi: '#B9BDC3', faceB: '#9DA1A7', faceLo: '#888C92',
      housing: '#2B2D31', crease: '#4A4D52', lip: 'rgba(255,255,255,0.45)', stack: '#5C6066', pin: '#C9CDD2',
      frame: '#3A3D42', frameEdge: '#8A8E94', frameShade: '#1A1B1E', framePad: 0.5, frameRadius: 0.08,
      backdrop: ['#24262A', '#121315'], shadow: 0.6, brush: 0.06,
      occl: 0.22, cast: 0.30, fallDark: 0.45, riseLight: 0.22, edge: '#E6E9EC', dim: 0.14
    }
  },
  ceramic: {
    label: 'Ceramic', hint: 'Glazed tile', release: 'later', light: true, translucent: false, lit: false,
    types: ['serif', 'grotesk', 'mono'],
    inks: [['cobalt', 'Cobalt', '#1F3A8A'], ['ink', 'Ink', '#18181B']],
    theme: {
      face: '#F4F1EA', faceHi: '#FBF9F5', faceB: '#EFEBE3', faceLo: '#E2DDD3',
      housing: '#CFC9BE', crease: '#9C968C', lip: 'rgba(255,255,255,0.85)', stack: '#E0DBD1', pin: '#B5AFA5',
      frame: '#F2EEE7', frameEdge: '#FFFFFF', frameShade: '#C9C3B8', framePad: 0.55, frameRadius: 0.2,
      backdrop: ['#3A4A5A', '#1E2730'], shadow: 0.45, sheen: 0.38, rim: 'rgba(255,255,255,0.7)',
      occl: 0.14, cast: 0.20, fallDark: 0.28, riseLight: 0.25, edge: '#FFFFFF', dim: 0.12
    }
  },
  eink: {
    label: 'E-ink', hint: 'Matte, no light', release: 'later', light: true, translucent: false, lit: false,
    types: ['mono', 'grotesk', 'serif'],
    inks: [['ink', 'Ink', '#232323']],
    theme: {
      face: '#D6D4CC', faceHi: '#DAD8D0', faceB: '#D3D1C9', faceLo: '#CBC9C1',
      housing: '#A9A7A0', crease: '#8E8C86', lip: 'rgba(255,255,255,0.3)', stack: '#BDBBB4', pin: '#8E8C86',
      frame: '#2C2D2F', frameEdge: '#45464A', frameShade: '#151517', framePad: 0.6, frameRadius: 0.05,
      backdrop: ['#3A3B3E', '#222325'], shadow: 0.5,
      occl: 0.08, cast: 0.15, fallDark: 0.20, riseLight: 0.05, edge: '#E8E6DF', dim: 0.12
    }
  },
  dots: {
    label: 'Dot matrix', hint: 'Letters in LED dots', release: 'later', light: false, translucent: false, lit: true, alwaysLit: true,
    types: ['mono'], glowA: 0.9, glowR: 0.10,
    inks: [['amber', 'Amber', '#FFB000'], ['white', 'White', '#F4F4F0'], ['green', 'Green', '#6CFF7A'], ['red', 'Red', '#FF5242']],
    theme: {
      face: '#0B0B0C', faceHi: '#0E0E10', faceB: '#0B0B0C', faceLo: '#08080A',
      housing: '#030303', crease: '#000000', lip: 'rgba(255,255,255,0.03)', stack: '#1A1A1C', pin: '#222224',
      frame: '#0A0A0B', frameEdge: '#1E1E21', frameShade: '#000000', framePad: 0.5, frameRadius: 0.10,
      backdrop: ['#121214', '#070708'], shadow: 0.6,
      dots: { pitch: 0.054, r: 0.36, off: 'rgba(255,255,255,0.05)' },
      occl: 0.20, cast: 0.30, fallDark: 0.50, riseLight: 0.06, edge: '#333336', dim: 0.16
    }
  }
};

// ---- Type ------------------------------------------------------------------------
// Cap-height ratios measured from the woff2 files (Fable 3.5). All SIL OFL 1.1.
// No new face in 0.11: the tile is 0.68 H wide at every grid, so a condensed face would
// not fit more letters on 12 × 40, only thinner ones. The grid sets capacity, not the face.
const TYPES = {
  mono:    { label: 'Mono',    font: '"DM Mono"',             weight: 500, capRatio: 0.700, file: 'dm-mono-500.woff2',             licence: 'SIL OFL 1.1' },
  grotesk: { label: 'Grotesk', font: '"Schibsted Grotesk"',   weight: 700, capRatio: 0.703, file: 'schibsted-grotesk.woff2',       licence: 'SIL OFL 1.1' },
  round:   { label: 'Round',   font: '"Plus Jakarta Sans"',   weight: 600, capRatio: 0.745, file: 'plus-jakarta-sans.woff2',       licence: 'SIL OFL 1.1' },
  serif:   { label: 'Serif',   font: '"Cormorant Garamond"',  weight: 500, capRatio: 0.625, file: 'cormorant-garamond-normal.woff2', licence: 'SIL OFL 1.1' }
};

// ---- Motion ----------------------------------------------------------------------
// speed: a FOLD key; transition: a STAGGER key. Ripple and Shimmer are new and digital.
const MOTION = {
  classic: { label: 'Classic', speed: 'fast',   transition: 'classic' },
  gentle:  { label: 'Gentle',  speed: 'gentle', transition: 'drift' },
  wave:    { label: 'Wave',    speed: 'fast',   transition: 'wave' },
  curtain: { label: 'Curtain', speed: 'gentle', transition: 'curtain' },
  ripple:  { label: 'Ripple',  speed: 'fast',   transition: 'ripple',  isNew: true },
  shimmer: { label: 'Shimmer', speed: 'fast',   transition: 'shimmer', isNew: true }
};

// ---- The ring ----------------------------------------------------------------------
// A sharp conic gradient turned with transform, seen through a soft ring-shaped mask
// painted once per layout. Effects only change opacity. level = ring opacity, 0 to 1.
const RING = {
  effects: {
    off:     { label: 'Off' },
    glow:    { label: 'Glow', level: 1 },
    breathe: { label: 'Breathe', min: 0.40, max: 1, period: { slow: 9000, medium: 6000, quick: 3500 }, ease: 'sine' },
    chase:   { label: 'Chase', level: 1, turn: { slow: 40000, medium: 20000, quick: 9000 } },
    flash:   { label: 'Flash on change', rest: 0.25, peak: 1, rise: 300, fall: 1200, ease: 'exp' },
    music:   { label: 'Music', rest: 0.30, gain: 0.9, decay: 170 }
  },
  // one hue family each; the rainbow only by name
  palettes: {
    warm:    { label: 'Warm white', c: ['#FFE7C2', '#FFD39A', '#FFF3DE', '#FFC98A'] },
    amber:   { label: 'Amber',      c: ['#F2B01E', '#FFCF66', '#C98A10', '#FFE0A0'] },
    ember:   { label: 'Ember',      c: ['#FF7A1A', '#C2381E', '#FFB347', '#8A2A12'] },
    rose:    { label: 'Rose',       c: ['#FF5E9A', '#C74BFF', '#FF8DB4', '#8F2C7B'] },
    ocean:   { label: 'Ocean',      c: ['#19D3FF', '#2B6FC4', '#3DE0FF', '#5A7CFF'] },
    mint:    { label: 'Mint',       c: ['#5CFFB0', '#1FC48A', '#B6FFD9', '#0E8F6A'] },
    rainbow: { label: 'Rainbow',    c: ['#FF3D7F', '#7B5CFF', '#19D3FF', '#FFC53D'] },
    board:   { label: 'From the board', live: true },   // the chip colour most on the board, else amber
    sky:     { label: 'From the sky', live: true }
  },
  stops: {
    speed:  { slow: 'Slow', medium: 'Medium', quick: 'Quick' },
    bright: { low: 0.45, medium: 0.75, high: 1.0 },
    size:   { close: 0.6, medium: 1.0, wide: 1.5 }
  },
  spread: 0.16,      // the ring's reach beyond the frame, × board height × size
  maskBlur: 0.11,    // the soft band's blur, × spread (painted once, never per frame)
  storm: { every: [6000, 20000], flash: 120 }   // lightning on the ring in a storm, ms
};

// ---- The sky ----------------------------------------------------------------------
// The thirty sky states, the timeline and the weather layers ship with 0.11.1. 0.11.0
// needs only the strengths and the contrast target, which wallFor, themeFor and
// smokeFor read.
const SKY = {
  strength: { hint: { label: 'A hint', k: 0.35 }, room: { label: 'The room', k: 0.70 }, weather: { label: 'The weather', k: 1.0 } },
  // The contrast rule: translucent glass smokes as far as it must for its letters to reach
  // the target over the brightest colour on the wall. smoke is one of 0, 0.5, 1, so the
  // atlas holds at most three faces per look. Letters never change colour for it.
  contrastTarget: 4.5
};

// ---- The looks -------------------------------------------------------------------
// wall: room = today's radial wall and contact shadow, painted on the canvas (Classic
// stays pixel for pixel); still = one flat colour, CSS; fields = three slow colour
// fields, CSS, transform only. sky: the sky option, which any look can take.
// chrome: what the drawer, zone highlight and offline dot take over this look. The gold
// bar itself is the same gold on every look: it means "previewing" and nothing else.
const ring = (fx, pal, o) => Object.assign({ fx, pal, speed: 'medium', bright: 'medium', size: 'medium' }, o || {});
const noSky = { on: false, wall: true, ring: true, ink: true, strength: 'room' };
const LOOKS = {
  classic: {
    label: 'Classic', hint: 'Today’s board',
    digital: 'Nothing. It is the hardware, and it must stay exactly that.',
    parts: { material: 'flap', type: 'mono', ink: 'warm', lit: false, motion: 'classic', ring: ring('off', 'warm'), wall: { kind: 'room' }, sky: noSky },
    chrome: { mode: 'dark', accent: '#C8974A' }, legacy: 'black'
  },
  backlit: {
    label: 'Backlit', hint: 'Light when it changes',
    digital: 'Light from behind the frame that rises each time the board changes, so you notice from across the room.',
    parts: { material: 'flap', type: 'mono', ink: 'warm', lit: false, motion: 'classic', ring: ring('flash', 'warm'), wall: { kind: 'still', base: '#060608' }, sky: noSky },
    chrome: { mode: 'dark', accent: '#E8C48A' }, legacy: 'black'
  },
  signal: {
    label: 'Signal', hint: 'The light reads the board',
    digital: 'The ring takes the colour of the board’s own chips: red when a train is cancelled, green when all is well.',
    parts: { material: 'solari', type: 'grotesk', ink: 'amber', lit: true, motion: 'classic', ring: ring('flash', 'board', { size: 'close' }), wall: { kind: 'room' }, sky: noSky },
    chrome: { mode: 'dark', accent: '#F2B01E' }, legacy: 'solari'
  },
  calm: {
    label: 'Calm', hint: 'Glass over slow light',
    digital: 'Clear flaps over colour that moves too slowly to notice, with letters that glow.',
    parts: { material: 'glass', type: 'serif', ink: 'white', lit: true, motion: 'gentle', ring: ring('off', 'ocean'), wall: { kind: 'fields', base: '#060A12', c: ['#1D3B6B', '#2C2457', '#0E4A4E'] }, sky: noSky },
    chrome: { mode: 'dark', accent: '#9FD3FF' }, legacy: 'black'
  },
  outside: {
    label: 'Outside', hint: 'Your sky, live',
    digital: 'The wall, the ring and the letters follow the sun and the weather where you are.',
    parts: { material: 'glass', type: 'grotesk', ink: 'white', lit: true, motion: 'gentle', ring: ring('glow', 'sky', { bright: 'low' }), wall: { kind: 'fields', base: '#07080B', c: ['#1B2A4A', '#3B2357', '#0F3B3F'] }, sky: { on: true, wall: true, ring: true, ink: true, strength: 'weather' } },
    chrome: { mode: 'dark', accent: '#FFFFFF' }, legacy: 'black'
  },
  sunday: {
    label: 'Sunday', hint: 'Paper in daylight',
    digital: 'Paper whose wall warms at golden hour and goes dusky at night, as daylight moves round a room.',
    parts: { material: 'paper', type: 'serif', ink: 'ink', lit: false, motion: 'curtain', ring: ring('off', 'warm'), wall: { kind: 'still', base: '#D5D1C9' }, sky: { on: true, wall: true, ring: false, ink: false, strength: 'hint' } },
    chrome: { mode: 'light', accent: '#8C6222' }, legacy: 'white'
  },
  party: {
    label: 'Party', hint: 'Lights to the music',
    digital: 'Smoked glass, neon letters and a ring that moves with the room’s music.',
    parts: { material: 'smoke', type: 'round', ink: 'rose', lit: true, motion: 'wave', ring: ring('music', 'rose', { speed: 'quick', size: 'wide', bright: 'high' }), wall: { kind: 'fields', base: '#05040A', c: ['#3A0F4F', '#0B2D5C', '#4D0F2E'] }, sky: noSky },
    chrome: { mode: 'dark', accent: '#FF8DB4' }, legacy: 'black'
  }
};
// 0.11.0: Paper and Solari, named so a 0.10 white or solari board keeps its name. Not in
// ORDER: the sheet shows one only for a board that has it (Fable, plan review 3.7).
LOOKS.paper = {
  label: 'Paper', hint: 'Light, matte, as 0.10 drew it',
  parts: { material: 'paper', type: 'mono', ink: 'ink', lit: false, motion: 'playlist', ring: ring('off', 'warm'), wall: { kind: 'room' }, sky: noSky },
  chrome: { mode: 'light', accent: '#8C6222' }, legacy: 'white', named: true
};
LOOKS.solari = {
  label: 'Solari', hint: 'Amber on a station board, as 0.10 drew it',
  parts: { material: 'solari', type: 'grotesk', ink: 'amber', lit: false, motion: 'playlist', ring: ring('off', 'amber'), wall: { kind: 'room' }, sky: noSky },
  chrome: { mode: 'dark', accent: '#F2B01E' }, legacy: 'solari', named: true
};
// Classic, Paper and Solari leave motion to the playlist (0.11.0), so a 0.10 board turns
// as it did; a look with its own motion wins over the playlist, and a page's own wins over both.
LOOKS.classic.parts.motion = 'playlist';
const ORDER = ['classic', 'backlit', 'signal', 'calm', 'outside', 'sunday', 'party'];
// What 0.11.0 offers: the looks whose parts have shipped. Backlit and Signal need the
// ring, Outside and Sunday the sky (0.11.1), Party Listen (0.11.2).
const SHIPPED = ['classic', 'calm'];

// The look each template comes in (Fable 6.7), keyed to the app's template ids (0.10.3).
// Used only once the look has shipped; until then a template comes in on its 0.10 theme.
const TEMPLATE_LOOKS = { station: 'signal', weather: 'outside', letters: 'calm', stocks: 'backlit', indices: 'backlit', crypto: 'backlit', rates: 'backlit', cafe: 'sunday' };

// ---- The Make your own matrix --------------------------------------------------------
// What each material allows. Anything not listed is not offered.
const MATRIX = {
  types: Object.fromEntries(Object.entries(MATERIALS).map(([k, m]) => [k, m.types])),
  inks: Object.fromEntries(Object.entries(MATERIALS).map(([k, m]) => [k, m.inks.map(i => i[0])])),
  lit: Object.fromEntries(Object.entries(MATERIALS).map(([k, m]) => [k, m.lit])),
  walls: { flap: ['room', 'still', 'fields'], solari: ['room', 'still'], paper: ['still'], glass: ['fields'], smoke: ['fields'], metal: ['room'], ceramic: ['room'], eink: ['room'], dots: ['room', 'still'] },
  sky: { paper: { strength: ['hint'], ink: false } },
  notes: [
    'Lit letters only on dark materials. Paper, Metal, Ceramic and E-ink never glow.',
    'No serif or round face on Solari: its rails and screws are a station board’s.',
    'Glass and Smoke always have a moving wall behind them, or the glass has nothing to show.',
    'Paper takes the sky on its wall only, and only as A hint.',
    'The rainbow is a named palette, never a default.'
  ]
};

// ---- Resolving a look ----------------------------------------------------------------
const clone = o => JSON.parse(JSON.stringify(o));
function partsOf(id, custom) { return id === 'custom' && custom ? clone(custom) : clone((LOOKS[id] || LOOKS.classic).parts); }
function inkHex(mat, ink) { const m = MATERIALS[mat]; const f = m.inks.find(i => i[0] === ink) || m.inks[0]; return f[2]; }

const wallLum = w => (lum(w.a) + lum(w.b) + lum(w.c) + lum(w.base)) / 4;
const brightest = w => [w.a, w.b, w.c, w.base].sort((x, y) => lum(y) - lum(x))[0];
const avgColour = w => mix(mix(w.a, w.b, 0.5), mix(w.c, w.base, 0.5), 0.5);

// The wall for a look, with the sky folded in at its strength.
function wallFor(p, sk) {
  const m = MATERIALS[p.material], own = p.wall || { kind: 'room' };
  let w;
  if (own.kind === 'room') { const bd = m.theme.backdrop || MATERIALS.flap.theme.backdrop; w = { kind: 'room', base: bd[1], a: bd[0], b: bd[0], c: bd[1] }; }
  else if (own.kind === 'still') w = { kind: 'still', base: own.base, a: own.base, b: own.base, c: own.base };
  else w = { kind: 'fields', base: own.base, a: own.c[0], b: own.c[1], c: own.c[2] };
  w.layer = null; w.layerOpacity = 0;
  if (sk && p.sky && p.sky.on && p.sky.wall) {
    const st = m.light ? 'hint' : p.sky.strength, k = SKY.strength[st].k;
    for (const key of ['a', 'b', 'c', 'base']) w[key] = mix(w[key], sk[key], k);
    if (w.kind === 'room') w.kind = 'fields';     // a room wall that follows the sky is drawn in CSS
    w.layer = sk.layer; w.layerOpacity = (sk.layerOpacity || 0) * (0.4 + 0.6 * k);
  }
  w.lum = wallLum(w); w.avg = avgColour(w); w.bright = brightest(w);
  return w;
}
// The first smoke step at which the letters reach the target over the wall's brightest colour.
function smokeFor(p, wall, ink) {
  const m = MATERIALS[p.material]; if (!m.translucent || !m.smoked) return 0;
  ink = ink || inkHex(p.material, p.ink);
  for (const s of [0, 0.5, 1]) { const face = over(s ? lerpRgba(m.theme.face, m.smoked.face, s) : m.theme.face, wall.bright); if (contrast(ink, face) >= SKY.contrastTarget) return s; }
  return 1;
}
// A THEMES entry for the renderer. The id names every input, so it is a full atlas key.
function themeFor(p, sk, wall) {
  const m = MATERIALS[p.material], ty = TYPES[p.type] || TYPES.mono;
  wall = wall || wallFor(p, sk);
  let ink = inkHex(p.material, p.ink);
  const canTint = sk && p.sky && p.sky.on && p.sky.ink && !m.light;
  if (canTint) ink = mix(ink, sk.ink, SKY.strength[p.sky.strength].k * 0.8);
  const lit = !!m.alwaysLit || (!!p.lit && m.lit);
  const smoke = smokeFor(p, wall, ink);
  const id = ['L11', p.material, p.type, ink, lit ? 'lit' : 'flat', 'sm' + smoke, wall.kind === 'room' ? 'room' : 'css'].join('-');
  const T = Object.assign({}, m.theme, { id, label: m.label, font: ty.font, weight: ty.weight, capRatio: ty.capRatio, glyph: ink, filled: ink,
    glow: lit ? rgba(ink, m.glowA || 0.85) : null, glowR: m.glowR || 0.2 });
  if (wall.kind !== 'room') T.backdrop = null;   // the wall is CSS; the canvas is the board alone
  if (smoke && m.smoked) for (const k in m.smoked) T[k] = lerpRgba(m.theme[k], m.smoked[k], smoke);
  return T;
}
// The chip colour that covers most of a grid, for the From the board palette.
const CHIP = { r: '#D5352B', o: '#EE7D22', y: '#F2BE2E', g: '#2C9A5A', b: '#2B6FC4', v: '#7A4DB2' };
const HALF_KEY = { '\uE000': 'g', '\uE001': 'g', '\uE002': 'r', '\uE003': 'r', '\uE006': 'y', '\uE007': 'y' };
function boardChip(grid) {
  const n = {}; (grid || []).forEach(row => [...(Array.isArray(row) ? row : String(row))].forEach(ch => { const k = CHIP[ch] ? ch : HALF_KEY[ch]; if (k) n[k] = (n[k] || 0) + 1; }));
  // a red chip wins over any number of green ones: the ring is there to warn
  if (n.r) return 'r';
  const best = Object.keys(n).sort((a, b) => n[b] - n[a])[0];
  return best || null;
}
function ringFor(p, sk, grid, own) {
  const r = p.ring || { fx: 'off' }, fx = RING.effects[r.fx] || RING.effects.off;
  let c;
  if (r.pal === 'sky' || (sk && p.sky && p.sky.on && p.sky.ring)) c = sk ? sk.ring.slice() : RING.palettes.ocean.c.slice();
  else if (r.pal === 'board') { const k = boardChip(grid); c = k ? [CHIP[k], mix(CHIP[k], '#FFFFFF', 0.35), mix(CHIP[k], '#000000', 0.25), mix(CHIP[k], '#FFFFFF', 0.15)] : RING.palettes.amber.c.slice(); }
  else if (r.pal === 'own' && own) c = [own, mix(own, '#FFFFFF', 0.35), mix(own, '#000000', 0.3), own];
  else c = (RING.palettes[r.pal] || RING.palettes.warm).c.slice();
  return { fx: r.fx, def: fx, colours: c, bright: RING.stops.bright[r.bright] || 0.75, size: RING.stops.size[r.size] || 1, speed: r.speed || 'medium' };
}
// Letters on their face, as they sit on the wall: the number we publish per look.
function letterContrast(p, sk) {
  const w = wallFor(p, sk), T = themeFor(p, sk, w), m = MATERIALS[p.material];
  const under = m.translucent ? w.bright : (T.housing[0] === '#' ? T.housing : w.base);
  const face = over(T.face, under), clear = over(m.theme.face, under);
  return { ratio: contrast(T.glyph, face), before: contrast(T.glyph, clear), face, glyph: T.glyph, smoke: T.id.match(/-sm([\d.]+)-/) ? +T.id.match(/-sm([\d.]+)-/)[1] : 0 };
}
// What the swatch on a playlist row and a card draws.
function swatch(p, sk) {
  const w = wallFor(p, sk), T = themeFor(p, sk, w), m = MATERIALS[p.material], rg = ringFor(p, sk, null);
  const face = m.translucent ? over(T.face, w.avg) : T.face;
  return { wall: w.kind === 'fields' ? `linear-gradient(135deg, ${w.a}, ${w.b} 55%, ${w.c})` : w.base, wallBase: w.base, face, frame: m.translucent ? over(T.frame, w.avg) : T.frame, ink: T.glyph, font: T.font, weight: T.weight, ring: p.ring && p.ring.fx !== 'off' ? rg.colours[0] : null, lit: !!T.glow };
}


// ---- 0.11.0: the app's side ---------------------------------------------------------
// The materials 0.11.0 offers in Make your own; the rest are drawn but wait.
export const RELEASED = Object.keys(MATERIALS).filter(k => MATERIALS[k].release === '0.11.0');
// Wall presets for Make your own, so the build has one source (Fable, plan review 1.4).
export function wallPreset(kind, material) {
  if (kind === 'room') return { kind: 'room' };
  if (kind === 'still') return { kind: 'still', base: MATERIALS[material] && MATERIALS[material].light ? '#D5D1C9' : '#060608' };
  return { kind: 'fields', base: '#060A12', c: ['#1D3B6B', '#2C2457', '#0E4A4E'] };
}
const HEXC = /^#[0-9A-Fa-f]{6}$/;
const MOTIONS = ['playlist', ...Object.keys(MOTION)];
// A custom look's parts, checked against MATRIX: anything not allowed for its material is
// put right, never stored as sent. null for something that is not a look at all.
export function sanitizeParts(p) {
  if (!p || typeof p !== 'object' || !RELEASED.includes(p.material)) return null;
  const m = MATERIALS[p.material], types = MATRIX.types[p.material], inks = MATRIX.inks[p.material], walls = MATRIX.walls[p.material];
  const w = p.wall && typeof p.wall === 'object' ? p.wall : {}, kind = walls.includes(w.kind) ? w.kind : walls[0];
  let wall = wallPreset(kind, p.material);
  if (kind === 'still' && HEXC.test(w.base || '')) wall.base = w.base;
  if (kind === 'fields' && HEXC.test(w.base || '') && Array.isArray(w.c) && w.c.length === 3 && w.c.every(c => HEXC.test(c || ''))) wall = { kind, base: w.base, c: w.c.slice() };
  return { material: p.material, type: types.includes(p.type) ? p.type : types[0], ink: inks.includes(p.ink) ? p.ink : inks[0],
    lit: !!p.lit && !!m.lit, motion: MOTIONS.includes(p.motion) ? p.motion : 'playlist', ring: ring('off', 'warm'), wall, sky: clone(noSky) };
}
// What a look is called, and whether the sheet offers it.
export const isLookId = id => id === 'default' || id === 'custom' || Object.prototype.hasOwnProperty.call(LOOKS, id);
export const offered = id => SHIPPED.includes(id) || (LOOKS[id] && LOOKS[id].named);
// A board's own look as stored: { look, lookParts? }, read by the fixed rule for a board from
// before 0.11 (plan section 0, 1): black is Default, white is Paper, solari is Solari. Never
// relative to the account's default, so a board never changes look on its own.
export function legacyLook(theme) { return theme === 'white' ? 'paper' : theme === 'solari' ? 'solari' : 'default'; }
export function lookOf(b) {
  if (!b) return { look: 'default' };
  if (b.look === 'custom' && b.lookParts) return { look: 'custom', lookParts: b.lookParts };
  if (b.look && b.look !== 'custom' && isLookId(b.look)) return { look: b.look };
  return { look: legacyLook(b.theme) };
}
// The theme a 0.10 reader is given: a board's own look's, else black (plan review 3.2: a
// Default board keeps black, so changing the default in Account rewrites nothing).
export function legacyOf(look, parts) {
  if (look === 'custom') { const m = parts && parts.material; return m === 'paper' ? 'white' : m === 'solari' ? 'solari' : 'black'; }
  return LOOKS[look] && look !== 'default' ? LOOKS[look].legacy : 'black';
}
// The account's default look, as { id, parts? }, from its settings row (or none: Classic).
export function defaultOf(setting) {
  if (setting && setting.look === 'custom' && setting.parts) return { id: 'custom', parts: setting.parts };
  return { id: setting && LOOKS[setting.look] ? setting.look : 'classic' };
}
// What shows on a screen, first match wins (plan section 3): a preview under the gold bar,
// then this screen's pin, then the board's own look, then the account's default, then Classic.
// 'default' on a board is no look of its own. Returns { id, parts }, with id never 'default'.
export function lookFor(page, pin, setting, preview) {
  const pick = x => x && x.id && x.id !== 'default' && x.id !== 'follow' ? x : null;
  const own = page ? lookOf(page) : { look: 'default' };
  const ownL = own.look === 'default' ? null : { id: own.look, parts: own.lookParts };
  const r = pick(preview) || pick(pin) || ownL || defaultOf(setting);
  return { id: r.id, parts: r.id === 'custom' ? r.parts : partsOf(r.id) };
}
// The renderer's theme for a look. Classic, Paper and Solari are drawn with the 0.10 themes
// themselves, so every board from before 0.11 is exact; any other look is composed.
const LEGACY_DRAW = { classic: 'black', paper: 'white', solari: 'solari' };
export function drawFor(l) {
  if (LEGACY_DRAW[l.id]) return { id: LEGACY_DRAW[l.id], legacy: true };
  const p = l.parts || partsOf(l.id), wall = wallFor(p, null), T = themeFor(p, null, wall);
  T.wallBg = wall.kind === 'room' ? null : { a: wall.a, b: wall.b, c: wall.c, base: wall.base, kind: wall.kind };
  T.lookLight = !!MATERIALS[p.material].light;
  return { id: T.id, theme: T, wall };
}
// A look's chrome accent: the zone highlight, the offline note and the pinned chip.
export function accentOf(l) {
  if (l.id !== 'custom' && LOOKS[l.id]) return LOOKS[l.id].chrome.accent;
  return MATERIALS[(l.parts || {}).material] && MATERIALS[l.parts.material].light ? '#8C6222' : '#C8974A';
}
export const isLight = l => !!MATERIALS[(l.parts || partsOf(l.id)).material].light;
// The motion a look asks for, or null to leave it to the playlist.
export function motionOf(l) { const m = (l.parts || partsOf(l.id)).motion; return MOTION[m] || null; }
// A template's look: its own from TEMPLATE_LOOKS once that look has shipped, else none.
export function templateLook(id) { const l = TEMPLATE_LOOKS[id]; return l && SHIPPED.includes(l) ? l : null; }

export { MATERIALS, TYPES, MOTION, RING, SKY, LOOKS, ORDER, SHIPPED, TEMPLATE_LOOKS, MATRIX,
  partsOf, inkHex, wallFor, themeFor, ringFor, smokeFor, letterContrast, swatch, boardChip };
export const color = { parse, hex, mix, rgba, over, lum, contrast };
