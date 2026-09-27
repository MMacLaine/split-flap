/* Split-Flap editor: channel catalogue, previews at any zone shape, layouts, templates,
   photo mapping, drafts seed and UI strings. Live data is mocked; swap MOCK tables for fetchers. */
(function () {
  'use strict';
  const t2 = (en, sv) => ({ en, sv });
  const blank = (h, w) => Array.from({ length: h }, () => Array(w).fill(' '));
  const clone = o => JSON.parse(JSON.stringify(o));
  const pad2 = n => String(n).padStart(2, '0');
  function put(g, r, c0, w, s, align) {
    if (r < 0 || r >= g.length) return;
    const a = [...String(s)].slice(0, w), off = align === 'left' ? 0 : align === 'right' ? w - a.length : Math.floor((w - a.length) / 2);
    a.forEach((ch, i) => { const c = c0 + off + i; if (c >= 0 && c < g[r].length) g[r][c] = ch; });
  }
  function wrap(s, w) {
    const out = []; let cur = '';
    String(s || '').toUpperCase().split(/\s+/).filter(Boolean).forEach(word => {
      while (word.length > w) { if (cur) { out.push(cur); cur = ''; } out.push(word.slice(0, w)); word = word.slice(w); }
      if (!word) return;
      if (!cur) cur = word; else if (cur.length + 1 + word.length <= w) cur += ' ' + word; else { out.push(cur); cur = word; }
    });
    if (cur) out.push(cur); return out;
  }
  const inner = w => (w > 10 ? w - 2 : w);
  function lr(l, r, W) { l = String(l); r = String(r); if (l.length + 1 + r.length > W) l = l.slice(0, Math.max(0, W - r.length - 1)); return l.padEnd(Math.max(0, W - r.length)) + r; }
  function fit(lines, h, w, align) {
    const g = blank(h, w), L = lines.slice(0, h), top = Math.floor((h - L.length) / 2), ins = w > 10 ? 1 : 0;
    L.forEach((l, i) => put(g, top + i, ins, w - ins * 2, l, align || 'center')); return g;
  }
  function sized(cells, h, w) { const g = blank(h, w); for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) g[r][c] = (cells && cells[r] && cells[r][c]) || ' '; return g; }
  function stamp(g, bmp) {
    const bh = bmp.length, bw = bmp[0].length, top = Math.floor((g.length - bh) / 2), left = Math.floor((g[0].length - bw) / 2);
    bmp.forEach((row, y) => [...row].forEach((p, x) => { if (p !== '.' && g[top + y] && top + y >= 0 && left + x >= 0 && left + x < g[0].length) g[top + y][left + x] = p; }));
    return g;
  }

  // 3 x 5 flap font for Big text and Big clock
  const F = { '0': '### #.# #.# #.# ###', '1': '.#. ##. .#. .#. ###', '2': '### ..# ### #.. ###', '3': '### ..# .## ..# ###', '4': '#.# #.# ### ..# ..#',
    '5': '### #.. ### ..# ###', '6': '### #.. ### #.# ###', '7': '### ..# ..# .#. .#.', '8': '### #.# ### #.# ###', '9': '### #.# ### ..# ###', ':': '. # . # .', ' ': '.. .. .. .. ..', '!': '# # # . #',
    A: '.#. #.# ### #.# #.#', B: '##. #.# ##. #.# ##.', C: '.## #.. #.. #.. .##', D: '##. #.# #.# #.# ##.', E: '### #.. ##. #.. ###', F: '### #.. ##. #.. #..', G: '.## #.. #.# #.# .##',
    H: '#.# #.# ### #.# #.#', I: '### .#. .#. .#. ###', J: '..# ..# ..# #.# .#.', K: '#.# #.# ##. #.# #.#', L: '#.. #.. #.. #.. ###', M: '#.# ### ### #.# #.#', N: '##. #.# #.# #.# #.#',
    O: '.#. #.# #.# #.# .#.', P: '##. #.# ##. #.. #..', Q: '.#. #.# #.# ##. .##', R: '##. #.# ##. #.# #.#', S: '.## #.. .#. ..# ##.', T: '### .#. .#. .#. .#.', U: '#.# #.# #.# #.# ###',
    V: '#.# #.# #.# #.# .#.', W: '#.# #.# ### ### #.#', X: '#.# #.# .#. #.# #.#', Y: '#.# #.# .#. .#. .#.', Z: '### ..# .#. #.. ###' };
  const FONT = {}; Object.keys(F).forEach(k => { FONT[k] = F[k].split(' '); });
  const BIGFOLD = { 'Å': 'A', 'Ä': 'A', 'Ö': 'O', 'É': 'E' };
  function bigText(text, h, w, color) {
    if (h < 5) return null;
    const chars = [...String(text || '').toUpperCase()].map(c => BIGFOLD[c] || c).filter(c => FONT[c]);
    const gw = c => FONT[c][0].length, tot = k => chars.slice(0, k).reduce((s, c) => s + gw(c), 0) + Math.max(0, k - 1);
    let n = chars.length; while (n > 0 && tot(n) > w) n--; if (!n) return null;
    const g = blank(h, w), top = Math.floor((h - 5) / 2); let x = Math.floor((w - tot(n)) / 2);
    for (let i = 0; i < n; i++) { FONT[chars[i]].forEach((row, ry) => [...row].forEach((p, rx) => { if (p === '#') g[top + ry][x + rx] = color || 'f'; })); x += gw(chars[i]) + 1; }
    return g;
  }

  const DAYS = { en: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'], sv: ['SÖNDAG', 'MÅNDAG', 'TISDAG', 'ONSDAG', 'TORSDAG', 'FREDAG', 'LÖRDAG'] };
  const MON = { en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'], sv: ['JAN', 'FEB', 'MAR', 'APR', 'MAJ', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEC'] };
  function isoWeek(d) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y0) / 864e5 + 1) / 7); }
  function timeStr(d, fmt, short) { const hh = d.getHours(), mm = pad2(d.getMinutes()); return fmt === '12' ? `${(hh % 12) || 12}:${mm}${short ? '' : (hh < 12 ? ' AM' : ' PM')}` : `${pad2(hh)}:${mm}`; }
  const L = (env, en, sv) => (env.lang === 'sv' ? sv : en);

  const MOCK_SL = {
    'Odenplan': [['17', 'ÅKESHOV', 2, 'metro'], ['4', 'RADIOHUSET', 3, 'bus'], ['18', 'ALVIK', 6, 'metro'], ['40', 'UPPSALA C', 7, 'train'], ['19', 'HÄSSELBY STRAND', 9, 'metro'], ['2', 'SOFIA', 10, 'bus'], ['41', 'SÖDERTÄLJE C', 12, 'train']],
    'T-Centralen': [['10', 'KUNGSTRÄDGÅRDEN', 1, 'metro'], ['13', 'NORSBORG', 3, 'metro'], ['11', 'AKALLA', 5, 'metro'], ['14', 'MÖRBY CENTRUM', 8, 'metro'], ['43', 'NYNÄSHAMN', 9, 'train']],
    'Slussen': [['13', 'ROPSTEN', 2, 'metro'], ['53', 'HENRIKSDALSHAMNEN', 4, 'bus'], ['14', 'FRUÄNGEN', 5, 'metro'], ['80', 'NACKA STRAND', 8, 'boat'], ['17', 'SKARPNÄCK', 9, 'metro']],
    'Gullmarsplan': [['30', 'SICKLA', 2, 'tram'], ['17', 'ÅKESHOV', 3, 'metro'], ['18', 'FARSTA STRAND', 5, 'metro'], ['30', 'SOLNA STATION', 7, 'tram'], ['19', 'HAGSÄTRA', 8, 'metro']],
    'Fridhemsplan': [['10', 'HJULSTA', 2, 'metro'], ['4', 'GULLMARSPLAN', 4, 'bus'], ['11', 'KUNGSTRÄDGÅRDEN', 6, 'metro'], ['18', 'ALVIK', 9, 'metro']],
    'Tekniska högskolan': [['14', 'MÖRBY CENTRUM', 3, 'metro'], ['27', 'KÅRSTA', 5, 'train'], ['14', 'FRUÄNGEN', 6, 'metro']],
    'Liljeholmen': [['13', 'NORSBORG', 2, 'metro'], ['30', 'SICKLA', 4, 'tram'], ['14', 'FRUÄNGEN', 6, 'metro']],
    'Sundbyberg': [['10', 'HJULSTA', 3, 'metro'], ['40', 'UPPSALA C', 5, 'train'], ['30', 'SOLNA STATION', 7, 'tram']]
  };
  const NOTICES = { 'Odenplan': t2('GREEN LINE EVERY 10 MIN AFTER 21', 'GRÖNA LINJEN VAR 10:E MIN EFTER 21') };
  const MOCK_WX = {
    'Stockholm': { t: 12, c: t2('CLEAR', 'KLART'), wind: 4, h: [[15, 11], [18, 10], [21, 8], [0, 7]], d: [[4, 14, t2('SUN', 'SOL')], [5, 11, t2('RAIN', 'REGN')], [6, 9, t2('CLOUD', 'MOLN')]] },
    'Göteborg': { t: 11, c: t2('RAIN', 'REGN'), wind: 8, h: [[15, 11], [18, 11], [21, 10], [0, 9]], d: [[4, 12, t2('RAIN', 'REGN')], [5, 12, t2('CLOUD', 'MOLN')], [6, 10, t2('SUN', 'SOL')]] },
    'Malmö': { t: 13, c: t2('WINDY', 'BLÅSIGT'), wind: 11, h: [[15, 13], [18, 12], [21, 11], [0, 10]], d: [[4, 14, t2('WIND', 'VIND')], [5, 13, t2('SUN', 'SOL')], [6, 12, t2('RAIN', 'REGN')]] },
    'Uppsala': { t: 10, c: t2('CLOUDY', 'MOLNIGT'), wind: 3, h: [[15, 10], [18, 9], [21, 7], [0, 6]], d: [[4, 11, t2('CLOUD', 'MOLN')], [5, 9, t2('RAIN', 'REGN')], [6, 8, t2('SUN', 'SOL')]] },
    'Kiruna': { t: 3, c: t2('SNOW', 'SNÖ'), wind: 5, h: [[15, 3], [18, 1], [21, 0], [0, -2]], d: [[4, 2, t2('SNOW', 'SNÖ')], [5, 1, t2('SNOW', 'SNÖ')], [6, 0, t2('CLOUD', 'MOLN')]] }
  };
  const PRICES = [42, 38, 35, 33, 34, 40, 62, 88, 96, 84, 70, 61, 55, 52, 50, 56, 72, 110, 124, 98, 80, 66, 54, 46];
  const AREAS = { SE1: 'LULEÅ', SE2: 'SUNDSVALL', SE3: 'STOCKHOLM', SE4: 'MALMÖ' };
  const AREA_F = { SE1: 0.55, SE2: 0.6, SE3: 1, SE4: 1.3 };
  const RATES = { EUR: 11.02, USD: 9.41, GBP: 12.63, NOK: 0.89, DKK: 1.48, SEK: 1 };
  const FACTS = {
    science: t2(['1822', 'CHAMPOLLION ANNOUNCES HE CAN READ HIEROGLYPHS'], ['1822', 'CHAMPOLLION MEDDELAR ATT HAN KAN LÄSA HIEROGLYFER']),
    transport: t2(['1825', 'THE STOCKTON AND DARLINGTON RAILWAY OPENS'], ['1825', 'JÄRNVÄGEN MELLAN STOCKTON OCH DARLINGTON ÖPPNAR'])
  };
  const FEED = [{ line: '4', dest: 'RADIOHUSET', min: 3, stop: 'ODENPLAN' }, { line: '2', dest: 'SOFIA', min: 5, stop: 'ODENPLAN' }, { line: '4', dest: 'GULLMARSPLAN', min: 9, stop: 'ODENPLAN' }, { line: '94', dest: 'MARIEBERG', min: 12, stop: 'ODENPLAN' }];
  const QUOTES = {
    proverbs: t2(['WELL BEGUN IS HALF DONE', 'THE EARLY BIRD CATCHES THE WORM', 'NO NEWS IS GOOD NEWS'], ['BORTA BRA MEN HEMMA BÄST', 'ÄRLIGHET VARAR LÄNGST', 'LITEN TUVA STJÄLPER OFTA STORT LASS']),
    work: t2(['MEASURE TWICE CUT ONCE', 'SLOW IS SMOOTH AND SMOOTH IS FAST', 'MANY HANDS MAKE LIGHT WORK'], ['ÖVNING GÖR MÄSTARE', 'SKYNDA LÅNGSAMT', 'MÅNGA BÄCKAR SMÅ GÖR EN STOR Å'])
  };
  const HEART = ['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'];
  function applyTpl(tpl, row) { return String(tpl || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (row[k] != null ? String(row[k]) : '')).toUpperCase().replace(/\s+/g, ' ').trim(); }
  function unknownTokens(tpl) { const out = []; String(tpl || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => { if (!(k in FEED[0]) && !out.includes(k)) out.push(k); return m; }); return out; }

  let sample = null, sampleCache = {};
  function sampleImage() {
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
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  function mapImage(src, h, w, o) {
    const SF = window.SplitFlap, T = SF.THEMES[o.theme || 'black'];
    const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height, target = (w * 0.79) / (h * 1.17);
    let cw, ch; if (sw / sh > target) { ch = sh; cw = sh * target; } else { cw = sw; ch = sw / target; }
    const z = o.zoom || 1; cw /= z; ch /= z;
    const sx = (sw - cw) * (o.px == null ? 0.5 : o.px), sy = (sh - ch) * (o.py == null ? 0.5 : o.py);
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
    x.drawImage(src, sx, sy, cw, ch, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data, buf = new Float32Array(w * h * 3);
    for (let i = 0; i < w * h; i++) { buf[i * 3] = d[i * 4]; buf[i * 3 + 1] = d[i * 4 + 1]; buf[i * 3 + 2] = d[i * 4 + 2]; }
    const pal = ['r', 'o', 'y', 'g', 'b', 'v', 'w', 'k'].map(k => [k, hex(SF.CHIPS[k])]);
    if (o.blank) pal.push([' ', hex(T.face)]);
    const out = blank(h, w);
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const i = (yy * w + xx) * 3, R = buf[i], G = buf[i + 1], B = buf[i + 2];
      let best = pal[0], bd = 1e12;
      pal.forEach(p => { const dr = R - p[1][0], dg = G - p[1][1], db = B - p[1][2]; const dd = 0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db; if (dd < bd) { bd = dd; best = p; } });
      out[yy][xx] = best[0];
      if (o.dither) {
        const er = [R - best[1][0], G - best[1][1], B - best[1][2]];
        [[1, 0, 7], [-1, 1, 3], [0, 1, 5], [1, 1, 1]].forEach(([dx, dy, f]) => {
          const nx = xx + dx, ny = yy + dy; if (nx < 0 || nx >= w || ny >= h) return;
          const j = (ny * w + nx) * 3; for (let k = 0; k < 3; k++) buf[j + k] += er[k] * f / 16;
        });
      }
    }
    return out;
  }
  function samplePhoto(h, w, theme) { const k = h + 'x' + w + theme; if (!sampleCache[k]) sampleCache[k] = mapImage(sampleImage(), h, w, { theme, dither: true, blank: false }); return sampleCache[k]; }

  const R = {};
  R.message = (o, h, w, env) => (o.cells ? sized(o.cells, h, w) : fit(o.lines || wrap(o.text != null ? o.text : L(env, 'TYPE YOUR MESSAGE', 'SKRIV DITT MEDDELANDE'), inner(w)), h, w));
  R.draw = (o, h, w) => (o.cells ? sized(o.cells, h, w) : h >= 6 && w >= 7 ? stamp(blank(h, w), HEART) : stamp(blank(h, w), ['rr.rr', '.rrr.'].slice(0, Math.min(2, h))));
  R.photo = (o, h, w, env) => (o.cells ? sized(o.cells, h, w) : samplePhoto(h, w, env.theme));
  R.rotating = (o, h, w, env) => { const m = (o.messages || []).filter(Boolean); if (!m.length) return blank(h, w); const i = Math.floor(env.now / 1000 / (o.interval || 8)) % m.length; return fit(wrap(m[i], inner(w)), h, w); };
  R.bigtext = (o, h, w) => bigText(o.text, h, w, o.color) || fit(wrap(o.text, inner(w)), h, w);
  R.quotes = (o, h, w, env) => { const q = (QUOTES[o.set] || QUOTES.proverbs)[env.lang]; return fit(wrap(q[Math.floor(env.now / 60000) % q.length], inner(w)), h, w); };
  R.menu = (o, h, w) => {
    const W = inner(w), sfx = o.suffix || '';
    const rows = (o.items || []).filter(Boolean).map(s => { const m = String(s).toUpperCase().match(/^(.*?)\s+(\d+)$/); return m ? lr(m[1], m[2] + sfx, W) : String(s).toUpperCase(); });
    const lines = (o.title && h > rows.length ? [String(o.title).toUpperCase()] : []).concat(rows);
    return fit(lines, h, w, 'left');
  };
  R.clock = (o, h, w, env) => {
    const d = new Date(env.now), time = timeStr(d, o.fmt), day = DAYS[env.lang][d.getDay()], date = `${d.getDate()} ${MON[env.lang][d.getMonth()]}`, wk = `${L(env, 'WEEK', 'VECKA')} ${isoWeek(d)}`;
    if (h === 1) return fit([lr(o.date === false ? day : `${day.slice(0, 3)} ${date}`, time, inner(w))], h, w, 'left');
    if (h < 4) return fit([o.date === false ? day : `${day} ${date}`, time], h, w);
    const L2 = [day]; if (o.date !== false) L2.push(date); if (o.week) L2.push(wk); L2.push('', time); return fit(L2, h, w);
  };
  R.bigclock = (o, h, w, env) => { const tm = timeStr(new Date(env.now), o.fmt, true); return bigText(tm, h, w, o.color) || fit([tm], h, w); };
  R.wordclock = (o, h, w, env) => {
    const d = new Date(env.now); let m = Math.round(d.getMinutes() / 5) * 5, hr = d.getHours(); if (m === 60) { m = 0; hr++; }
    const EN = ['TWELVE', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN'], SV = ['TOLV', 'ETT', 'TVÅ', 'TRE', 'FYRA', 'FEM', 'SEX', 'SJU', 'ÅTTA', 'NIO', 'TIO', 'ELVA'];
    const H = k => (env.lang === 'sv' ? SV : EN)[(hr + k) % 12];
    let s;
    if (env.lang === 'sv') s = 'KLOCKAN ÄR ' + ({ 0: H(0), 5: 'FEM ÖVER ' + H(0), 10: 'TIO ÖVER ' + H(0), 15: 'KVART ÖVER ' + H(0), 20: 'TJUGO ÖVER ' + H(0), 25: 'FEM I HALV ' + H(1), 30: 'HALV ' + H(1), 35: 'FEM ÖVER HALV ' + H(1), 40: 'TJUGO I ' + H(1), 45: 'KVART I ' + H(1), 50: 'TIO I ' + H(1), 55: 'FEM I ' + H(1) })[m];
    else s = 'IT IS ' + ({ 0: H(0) + " O'CLOCK", 5: 'FIVE PAST ' + H(0), 10: 'TEN PAST ' + H(0), 15: 'QUARTER PAST ' + H(0), 20: 'TWENTY PAST ' + H(0), 25: 'TWENTY FIVE PAST ' + H(0), 30: 'HALF PAST ' + H(0), 35: 'TWENTY FIVE TO ' + H(1), 40: 'TWENTY TO ' + H(1), 45: 'QUARTER TO ' + H(1), 50: 'TEN TO ' + H(1), 55: 'FIVE TO ' + H(1) })[m];
    return fit(wrap(s, inner(w)), h, w);
  };
  R.countdown = (o, h, w, env) => {
    const diff = new Date((o.date || '2027-06-25') + 'T00:00:00').getTime() - env.now, days = Math.ceil(diff / 864e5), hrs = Math.max(0, Math.ceil(diff / 36e5));
    const val = diff <= 0 ? L(env, 'TODAY', 'IDAG') : (days > 1 || o.unit === 'days') ? `${days} ${L(env, 'DAYS', 'DAGAR')}` : `${hrs} ${L(env, 'HOURS', 'TIMMAR')}`;
    const label = String(o.label || '').toUpperCase();
    if (h === 1) return fit([lr(label, val, inner(w))], h, w, 'left');
    return fit(h >= 4 ? [label, '', val, diff > 0 ? L(env, 'TO GO', 'KVAR') : ''] : [label, val], h, w);
  };
  R.today = (o, h, w, env) => {
    const d = new Date(env.now), start = new Date(d.getFullYear(), 0, 0), doy = Math.floor((d - start) / 864e5);
    const lines = [DAYS[env.lang][d.getDay()], `${d.getDate()} ${MON[env.lang][d.getMonth()]} ${d.getFullYear()}`];
    if (o.week !== false) lines.push(`${L(env, 'WEEK', 'VECKA')} ${isoWeek(d)}`);
    if (o.doy) lines.push(`${L(env, 'DAY', 'DAG')} ${doy}`);
    if (o.sun !== false) lines.push(inner(w) >= 16 ? `${L(env, 'SUN', 'SOL')} 07:04 TO 18:52`.replace(' TO ', env.lang === 'sv' ? ' TILL ' : ' TO ') : '07:04 18:52');
    if (h === 1) return fit([lr(lines[0].slice(0, 3) + ' ' + lines[1].split(' ').slice(0, 2).join(' '), lines[2] || '', inner(w))], h, w, 'left');
    return fit(lines, h, w);
  };
  R.sl = (o, h, w, env) => {
    const W = inner(w), stations = (o.stations && o.stations.length ? o.stations : ['Odenplan']), modes = o.modes || ['metro', 'bus', 'train', 'tram', 'boat'];
    const el = Math.floor(env.now / 60000), lines = [];
    stations.forEach(st => {
      const deps = (MOCK_SL[st] || []).filter(x => modes.includes(x[3])).map(([n, dest, base]) => ({ n, dest, m: ((base - el) % 14 + 14) % 14 })).filter(x => x.m >= (o.walk || 0)).sort((a, b) => a.m - b.m).slice(0, o.rows || 3);
      if (h > 1) lines.push(st.toUpperCase());
      deps.forEach(x => {
        const right = o.time === 'clock' ? timeStr(new Date(env.now + x.m * 60000), '24') : x.m === 0 ? L(env, 'NOW', 'NU') : (W < 14 ? `${x.m}M` : `${x.m} MIN`);
        let left = x.n.padEnd(3) + x.dest; lines.push(lr(left, right, W));
      });
      if (o.notices !== false && NOTICES[st] && h > 4) wrap(NOTICES[st][env.lang], W).slice(0, 1).forEach(l => lines.push(l));
    });
    if (h === 1) { const d = lines[0] || ''; return fit([d], h, w, 'left'); }
    const g = blank(h, w); lines.slice(0, h).forEach((l, i) => put(g, i, w > 10 ? 1 : 0, W, l, 'left')); return g;
  };
  R.weather = (o, h, w, env) => {
    const wx = MOCK_WX[o.city] || MOCK_WX.Stockholm, W = inner(w), u = v => (o.units === 'f' ? Math.round(v * 9 / 5 + 32) : v) + '°';
    const city = String(o.city || 'Stockholm').toUpperCase();
    if (o.view === 'hours') {
      if (h <= 2) return fit([city, wx.h.map(x => `${pad2(x[0])} ${u(x[1])}`).join(' ')].slice(-h), h, w, 'left');
      return fit([city].concat(wx.h.slice(0, h - 1).map(x => lr(`${pad2(x[0])}:00`, u(x[1]), W))), h, w, 'left');
    }
    if (o.view === 'days') {
      const dn = x => DAYS[env.lang][x[0]].slice(0, 3);
      if (h <= 2) return fit([city, wx.d.map(x => `${dn(x)} ${u(x[1])}`).join(' ')].slice(-h), h, w, 'left');
      return fit([city].concat(wx.d.slice(0, h - 1).map(x => lr(W >= 16 ? `${dn(x)} ${x[2][env.lang]}` : dn(x), u(x[1]), W))), h, w, 'left');
    }
    const now = `${u(wx.t)} ${wx.c[env.lang]}`;
    if (h === 1) return fit([lr(city, now, W)], h, w, 'left');
    const lines = [city, now]; if (o.wind) lines.push(`${L(env, 'WIND', 'VIND')} ${wx.wind} M/S`);
    return fit(lines, h, w);
  };
  R.electricity = (o, h, w, env) => {
    const area = o.area || 'SE3', f = AREA_F[area] * (o.vat === false ? 0.8 : 1), P = PRICES.map(p => Math.round(p * f)), hr = new Date(env.now).getHours(), now = P[hr];
    const lvl = p => (p < 50 * f ? 'g' : p < 90 * f ? 'y' : 'r'), W = inner(w);
    if (h === 1) return fit([lr(`EL ${area}`, `${now} ÖRE`, W)], h, w, 'left');
    const g = blank(h, w);
    if (o.view === 'chart' && h >= 3) {
      put(g, 0, w > 10 ? 1 : 0, W, lr(`${area} ${L(env, 'TODAY', 'IDAG')}`, `${now} ÖRE`, W), 'left');
      const max = Math.max.apply(null, P), bh = h - 1;
      for (let c = 0; c < w; c++) { const i = Math.min(23, Math.floor(c * 24 / w)), n = Math.max(1, Math.round(P[i] / max * bh)); for (let k = 0; k < n; k++) g[h - 1 - k][c] = i === hr ? 'w' : lvl(P[i]); }
      return g;
    }
    const top = fit([`EL ${area} ${AREAS[area]}`, `${L(env, 'NOW', 'NU')} ${now} ÖRE/KWH`], h - 1, w);
    for (let r = 0; r < h - 1; r++) g[r] = top[r];
    for (let c = 0; c < w; c++) g[h - 1][c] = lvl(P[(hr + c) % 24]);
    return g;
  };
  R.currency = (o, h, w, env) => {
    const base = o.base || 'SEK', W = inner(w), dec = o.dec == null ? 2 : o.dec, pairs = (o.pairs || ['EUR', 'USD', 'GBP']).filter(p => p !== base);
    const rate = p => (RATES[p] / RATES[base]).toFixed(dec);
    if (h === 1) return fit([pairs.map(p => `${p} ${rate(p)}`).join('  ')], h, w, 'left');
    return fit(pairs.map(p => lr(W >= 14 ? `1 ${p}` : p, W >= 14 ? `${rate(p)} ${base}` : rate(p), W)), h, w, 'left');
  };
  R.onthisday = (o, h, w, env) => {
    const k = o.topic === 'all' || !o.topic ? (Math.floor(env.now / 60000) % 2 ? 'transport' : 'science') : o.topic, f = FACTS[k][env.lang];
    const body = wrap(f[1], inner(w)); if (h === 1) return fit([f[0] + ' ' + f[1]], h, w, 'left');
    return fit([f[0]].concat(body).slice(0, h), h, w);
  };
  R.url = (o, h, w) => {
    const rows = FEED.slice(0, o.max || 4).map(r => applyTpl(o.tpl, r)), lines = (o.header ? [String(o.header).toUpperCase()] : []).concat(rows);
    if (h === 1) return fit([lines.join('  ')], h, w, 'left');
    const g = blank(h, w), W = inner(w); lines.slice(0, h).forEach((l, i) => put(g, i, w > 10 ? 1 : 0, W, l, 'left')); return g;
  };
  R.pattern = (o, h, w) => {
    const pal = (o.palette && o.palette.length ? o.palette : ['r', 'o', 'y', 'g', 'b', 'v']), n = pal.length, g = blank(h, w);
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      const st = o.style || 'rainbow';
      g[r][c] = st === 'stripes' ? pal[r % n] : st === 'checks' ? pal[(r + c) % Math.min(2, n)] : st === 'scatter' ? pal[(((r + 3) * 73856093) ^ ((c + 7) * 19349663)) >>> 0 % n] : pal[Math.floor((c + r * 2) / 2) % n];
    }
    if (o.style === 'scatter') for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) g[r][c] = pal[((((r + 3) * 73856093) ^ ((c + 7) * 19349663)) >>> 0) % n];
    return g;
  };
  R.later = (o, h, w) => blank(h, w);

  const SEG = (k, label, opts, adv) => ({ k, t: 'seg', label, opts, adv });
  const TOG = (k, label, adv) => ({ k, t: 'toggle', label, adv });
  const CH = [
    { id: 'message', g: 'words', name: t2('Message', 'Meddelande'), desc: t2('Type anything, letter by letter', 'Skriv vad du vill, bokstav för bokstav'), composer: 'type', def: { text: 'HELLO' }, fields: [] },
    { id: 'rotating', g: 'words', name: t2('Rotating messages', 'Växlande meddelanden'), desc: t2('A few messages that take turns', 'Några meddelanden som turas om'),
      def: { messages: ['GOOD MORNING', 'COFFEE IS ON', 'LUNCH AT 12'], interval: 8, order: 'seq' },
      fields: [{ k: 'messages', t: 'textlist', label: t2('Messages', 'Meddelanden'), add: t2('Add a message', 'Lägg till meddelande') },
        { k: 'interval', t: 'stepper', label: t2('Each message for', 'Varje meddelande i'), min: 3, max: 120, step: 1, unit: 's', adv: 1 },
        SEG('order', t2('Order', 'Ordning'), [['seq', t2('In order', 'I ordning')], ['shuffle', t2('Shuffled', 'Blandat')]], 1)] },
    { id: 'bigtext', g: 'words', name: t2('Big text', 'Stor text'), desc: t2('A short word built from flaps', 'Ett kort ord byggt av flappar'), def: { text: 'HEJ', color: 'f' },
      fields: [{ k: 'text', t: 'text', label: t2('Text', 'Text'), upper: 1, hint: t2('Five letters fit across a board 22 flaps wide.', 'Fem bokstäver ryms på en tavla som är 22 flappar bred.') }, { k: 'color', t: 'colour', label: t2('Colour', 'Färg') }] },
    { id: 'quotes', g: 'words', name: t2('Quotes', 'Citat'), desc: t2('A saying that changes every minute', 'Ett ordspråk som byts varje minut'), def: { set: 'proverbs' },
      fields: [SEG('set', t2('Collection', 'Samling'), [['proverbs', t2('Proverbs', 'Ordspråk')], ['work', t2('About work', 'Om arbete')]])] },
    { id: 'menu', g: 'words', name: t2('Menu', 'Meny'), desc: t2('Items and prices, lined up', 'Rätter och priser på rad'), def: { title: 'TODAY', items: ['KAFFE 30', 'KANELBULLE 35', 'SMÖRGÅS 65', 'SOPPA 95'], suffix: '' },
      fields: [{ k: 'title', t: 'text', label: t2('Heading', 'Rubrik'), upper: 1 }, { k: 'items', t: 'textlist', label: t2('Items', 'Rätter'), add: t2('Add an item', 'Lägg till rätt'), hint: t2('End each line with the price and it lines up on the right.', 'Avsluta varje rad med priset så hamnar det till höger.') },
        SEG('suffix', t2('After the price', 'Efter priset'), [['', t2('Nothing', 'Inget')], [' KR', 'KR'], [':-', ':-']], 1)] },
    { id: 'clock', g: 'time', name: t2('Clock and date', 'Klocka och datum'), desc: t2('The time with the day and date', 'Tiden med dag och datum'), def: { fmt: '24', date: true, week: false },
      fields: [SEG('fmt', t2('Format', 'Format'), [['24', '24 h'], ['12', '12 h']]), TOG('date', t2('Show the date', 'Visa datum'), 1), TOG('week', t2('Show the week number', 'Visa veckonummer'), 1)] },
    { id: 'bigclock', g: 'time', name: t2('Big clock', 'Stor klocka'), desc: t2('The time across the whole zone', 'Tiden över hela zonen'), def: { fmt: '24', color: 'f' },
      fields: [SEG('fmt', t2('Format', 'Format'), [['24', '24 h'], ['12', '12 h']]), { k: 'color', t: 'colour', label: t2('Colour', 'Färg') }] },
    { id: 'wordclock', g: 'time', name: t2('Word clock', 'Ordklocka'), desc: t2('The time in words, to five minutes', 'Tiden i ord, på fem minuter när'), def: {},
      fields: [{ t: 'note', label: t2('Follows the board language. Change it under Board settings.', 'Följer tavlans språk. Byt det under Tavlans inställningar.') }] },
    { id: 'countdown', g: 'time', name: t2('Countdown', 'Nedräkning'), desc: t2('Days left until a date', 'Dagar kvar till ett datum'), def: { label: 'MIDSOMMAR', date: '2027-06-25', unit: 'auto' },
      fields: [{ k: 'label', t: 'text', label: t2('What you are counting to', 'Vad du räknar ner till'), upper: 1 }, { k: 'date', t: 'date', label: t2('Date', 'Datum') },
        SEG('unit', t2('Count in', 'Räkna i'), [['auto', t2('Days, then hours', 'Dagar, sedan timmar')], ['days', t2('Days only', 'Bara dagar')]], 1)] },
    { id: 'today', g: 'time', name: t2('Today', 'Idag'), desc: t2('Day, week number and sun times', 'Dag, veckonummer och soltider'), def: { week: true, sun: true, doy: false },
      fields: [TOG('week', t2('Week number', 'Veckonummer')), TOG('sun', t2('Sunrise and sunset', 'Soluppgång och solnedgång')), TOG('doy', t2('Day of the year', 'Dag på året'), 1)] },
    { id: 'sl', g: 'live', name: t2('SL departures', 'SL avgångar'), desc: t2('Next departures from Storstockholms Lokaltrafik (SL)', 'Nästa avgångar från Storstockholms Lokaltrafik (SL)'),
      def: { stations: ['Odenplan'], modes: ['metro', 'bus', 'train', 'tram', 'boat'], time: 'min', rows: 3, walk: 0, notices: true },
      fields: [{ k: 'stations', t: 'multisearch', pool: 'stations', max: 6, label: t2('Stations', 'Stationer') },
        { k: 'modes', t: 'chips', label: t2('Show', 'Visa'), opts: [['metro', t2('Metro', 'Tunnelbana')], ['bus', t2('Bus', 'Buss')], ['train', t2('Commuter train', 'Pendeltåg')], ['tram', t2('Tram', 'Spårväg')], ['boat', t2('Boat', 'Båt')]] },
        SEG('time', t2('Departure time as', 'Avgångstid som'), [['min', t2('Minutes to go', 'Minuter kvar')], ['clock', t2('Clock time', 'Klockslag')]]),
        { k: 'rows', t: 'stepper', label: t2('Departures per station', 'Avgångar per station'), min: 1, max: 6, step: 1, unit: '', adv: 1 },
        { k: 'walk', t: 'stepper', label: t2('Hide departures sooner than', 'Dölj avgångar tidigare än'), min: 0, max: 20, step: 1, unit: 'min', adv: 1, hint: t2('Set it to your walk to the stop.', 'Ställ in hur lång tid det tar att gå till hållplatsen.') },
        TOG('notices', t2('Show service notices', 'Visa trafikmeddelanden'), 1)] },
    { id: 'weather', g: 'live', name: t2('Weather', 'Väder'), desc: t2('Now, the next hours or the next days', 'Nu, kommande timmar eller dagar'), def: { city: 'Stockholm', view: 'now', units: 'c', wind: false },
      fields: [{ k: 'city', t: 'search', pool: 'cities', label: t2('City', 'Stad') },
        SEG('view', t2('Show', 'Visa'), [['now', t2('Now', 'Nu')], ['hours', t2('Hours', 'Timmar')], ['days', t2('Days', 'Dagar')]]),
        SEG('units', t2('Units', 'Enhet'), [['c', '°C'], ['f', '°F']], 1), TOG('wind', t2('Show wind', 'Visa vind'), 1)] },
    { id: 'electricity', g: 'live', name: t2('Electricity price', 'Elpris'), desc: t2('Hourly spot price for your price area', 'Timpris för ditt elområde'), def: { area: 'SE3', view: 'chart', vat: true },
      fields: [SEG('area', t2('Price area', 'Elområde'), [['SE1', 'SE1 Luleå'], ['SE2', 'SE2 Sundsvall'], ['SE3', 'SE3 Stockholm'], ['SE4', 'SE4 Malmö']]),
        SEG('view', t2('Show', 'Visa'), [['now', t2('Price now', 'Pris nu')], ['chart', t2('Today as bars', 'Idag som staplar')]]), TOG('vat', t2('Include value added tax (moms)', 'Inklusive moms'), 1)] },
    { id: 'currency', g: 'live', name: t2('Currency', 'Valuta'), desc: t2('Exchange rates against the krona', 'Växelkurser mot kronan'), def: { base: 'SEK', pairs: ['EUR', 'USD', 'GBP'], dec: 2 },
      fields: [SEG('base', t2('Priced in', 'Räknat i'), [['SEK', 'SEK'], ['EUR', 'EUR']]), { k: 'pairs', t: 'chips', label: t2('Currencies', 'Valutor'), opts: ['EUR', 'USD', 'GBP', 'NOK', 'DKK'].map(c => [c, c]) },
        { k: 'dec', t: 'stepper', label: t2('Decimals', 'Decimaler'), min: 0, max: 4, step: 1, unit: '', adv: 1 }] },
    { id: 'onthisday', g: 'live', name: t2('On this day', 'Den här dagen'), desc: t2('Something that happened on this date', 'Något som hände på dagens datum'), def: { topic: 'all' },
      fields: [SEG('topic', t2('Topic', 'Ämne'), [['all', t2('Anything', 'Allt')], ['science', t2('Science', 'Vetenskap')], ['transport', t2('Transport', 'Transport')]])] },
    { id: 'url', g: 'live', name: t2('Follow a URL', 'Följ en URL'), desc: t2('Lines from any web address (URL) you choose', 'Rader från valfri webbadress (URL)'),
      def: { url: 'https://example.com/stop/4521.json', every: '5', tpl: '{{line}} {{dest}} {{min}} MIN', path: 'departures', max: 4, header: '' },
      fields: [{ k: 'url', t: 'text', label: t2('Web address (URL)', 'Webbadress (URL)'), hint: t2('It must return JSON (JavaScript Object Notation) with a list in it.', 'Den måste svara med JSON (JavaScript Object Notation) som innehåller en lista.') },
        SEG('every', t2('Check every', 'Hämta var'), [['1', '1 min'], ['5', '5 min'], ['15', '15 min'], ['60', '60 min']]),
        { k: 'tpl', t: 'template', label: t2('Line template', 'Radmall') },
        { k: 'path', t: 'text', label: t2('Where the list is in the feed', 'Var listan finns i flödet'), adv: 1, hint: t2('A dotted path such as data.departures. Leave it empty if the feed is the list.', 'En sökväg med punkter, till exempel data.departures. Lämna tomt om flödet är listan.') },
        { k: 'max', t: 'stepper', label: t2('Lines at most', 'Högst antal rader'), min: 1, max: 12, step: 1, unit: '', adv: 1 },
        { k: 'header', t: 'text', label: t2('Heading line', 'Rubrikrad'), upper: 1, adv: 1 }] },
    { id: 'draw', g: 'pictures', name: t2('Draw', 'Rita'), desc: t2('Paint with the colour flaps', 'Måla med färgflapparna'), composer: 'paint', def: {}, fields: [] },
    { id: 'photo', g: 'pictures', name: t2('Photo', 'Foto'), desc: t2('A picture turned into colour flaps', 'En bild omgjord till färgflappar'), composer: 'photo', def: {}, fields: [] },
    { id: 'pattern', g: 'pictures', name: t2('Colour pattern', 'Färgmönster'), desc: t2('Stripes, checks or a rainbow', 'Ränder, rutor eller regnbåge'), def: { style: 'rainbow', palette: ['r', 'o', 'y', 'g', 'b', 'v'] },
      fields: [SEG('style', t2('Pattern', 'Mönster'), [['rainbow', t2('Rainbow', 'Regnbåge')], ['stripes', t2('Stripes', 'Ränder')], ['checks', t2('Checks', 'Rutor')], ['scatter', t2('Scatter', 'Strö')]]),
        { k: 'palette', t: 'palette', label: t2('Colours', 'Färger'), adv: 1 }] },
    { id: 'scoreboard', g: 'later', later: 1, name: t2('Scoreboard', 'Resultattavla'), desc: t2('', ''), def: {}, fields: [] },
    { id: 'timer', g: 'later', later: 1, name: t2('Timer', 'Timer'), desc: t2('', ''), def: {}, fields: [] },
    { id: 'list', g: 'later', later: 1, name: t2('List', 'Lista'), desc: t2('', ''), def: {}, fields: [] }
  ];
  const byId = {}; CH.forEach(c => { byId[c.id] = c; });
  const GROUPS = [['words', t2('Words', 'Ord')], ['time', t2('Time', 'Tid')], ['live', t2('Live', 'Live')], ['pictures', t2('Pictures', 'Bilder')], ['later', t2('Later', 'Senare')]];
  function render(id, o, h, w, env) { if (!id) return blank(h, w); try { return (R[byId[id] && byId[id].later ? 'later' : id] || R.later)(o || {}, h, w, env); } catch (e) { return blank(h, w); } }

  const LAYOUTS = [
    { id: 'full', name: t2('Full', 'Hel'), zones: [t2('Board', 'Tavla')] },
    { id: 'header', name: t2('Header and body', 'Rubrik och text'), zones: [t2('Header row', 'Rubrikrad'), t2('Body', 'Text')] },
    { id: 'split', name: t2('Split', 'Delad'), zones: [t2('Left', 'Vänster'), t2('Right', 'Höger')] },
    { id: 'ticker', name: t2('Ticker row', 'Löprad'), zones: [t2('Body', 'Text'), t2('Ticker row', 'Löprad')] },
    { id: 'stacked', name: t2('Stacked', 'Staplad'), zones: [t2('Top half', 'Övre halvan'), t2('Bottom half', 'Nedre halvan')] }
  ];
  function zonesFor(l, R0, C) {
    if (l === 'header' && R0 > 1) return [{ r: 0, c: 0, h: 1, w: C }, { r: 1, c: 0, h: R0 - 1, w: C }];
    if (l === 'split' && C > 3) { const a = Math.floor((C - 1) / 2); return [{ r: 0, c: 0, h: R0, w: a }, { r: 0, c: a + 1, h: R0, w: C - a - 1 }]; }
    if (l === 'ticker' && R0 > 1) return [{ r: 0, c: 0, h: R0 - 1, w: C }, { r: R0 - 1, c: 0, h: 1, w: C }];
    if (l === 'stacked' && R0 > 1) { const a = Math.floor(R0 / 2); return [{ r: 0, c: 0, h: a, w: C }, { r: a, c: 0, h: R0 - a, w: C }]; }
    return [{ r: 0, c: 0, h: R0, w: C }];
  }
  function compose(page, R0, C, env) {
    const g = blank(R0, C); if (!page) return g;
    zonesFor(page.layout, R0, C).forEach((z, i) => {
      const zd = page.zones[i]; if (!zd || !zd.ch) return;
      const cells = render(zd.ch, zd.o, z.h, z.w, env);
      for (let r = 0; r < z.h; r++) for (let c = 0; c < z.w; c++) g[z.r + r][z.c + c] = cells[r][c];
    });
    return g;
  }
  function geom(rows, cols, pad) {
    const p = pad == null ? 0.35 : pad, uw = cols * 0.68 + (cols - 1) * 0.11 + 2 * p, uh = rows + (rows - 1) * 0.17 + 2 * p;
    return { uw, uh, aspect: (uw / uh).toFixed(4),
      box: z => ({ left: ((p + z.c * 0.79 - 0.055) / uw * 100).toFixed(3) + '%', top: ((p + z.r * 1.17 - 0.085) / uh * 100).toFixed(3) + '%',
        width: ((z.w * 0.68 + (z.w - 1) * 0.11 + 0.11) / uw * 100).toFixed(3) + '%', height: ((z.h + (z.h - 1) * 0.17 + 0.17) / uh * 100).toFixed(3) + '%' }) };
  }

  let pid = 0;
  const P = (name, layout, dur, zones, win) => ({ id: 'p' + (++pid).toString(36) + Math.random().toString(36).slice(2, 5), name, layout, dur, win: Object.assign({ on: false, from: '07:00', to: '09:00', days: [1, 2, 3, 4, 5] }, win || {}), zones });
  const Z = (ch, o) => ({ ch, o: Object.assign(clone(byId[ch].def), o || {}) });
  const TEMPLATES = [
    { id: 'demo', name: t2('Demo', 'Demo'), desc: t2('A little of everything', 'Lite av allt'), theme: 'black', pages: lang => [
      P(lang === 'sv' ? 'Välkommen' : 'Welcome', 'full', 12, [Z('message', { lines: ['', lang === 'sv' ? 'HEJ FRÅN' : 'HELLO FROM', lang === 'sv' ? 'HALLEN' : 'THE HALLWAY', '', 'roygbv', ''] })]),
      P(lang === 'sv' ? 'Morgonpendling' : 'Morning commute', 'header', 14, [Z('clock'), Z('sl')], { on: true, from: '06:00', to: '10:00' }),
      P(lang === 'sv' ? 'Väder och nedräkning' : 'Weather and countdown', 'split', 12, [Z('weather'), Z('countdown')]),
      P(lang === 'sv' ? 'Elpris' : 'Power prices', 'ticker', 14, [Z('electricity'), Z('url')]),
      P(lang === 'sv' ? 'Klocka' : 'Clock', 'full', 10, [Z('bigclock')])] },
    { id: 'home', name: t2('Home dashboard', 'Hemmaskärm'), desc: t2('Clock, weather and the nearest station', 'Klocka, väder och närmaste station'), theme: 'black', pages: lang => [
      P(lang === 'sv' ? 'Avgångar' : 'Departures', 'header', 15, [Z('clock'), Z('sl', { stations: ['Gullmarsplan'] })]),
      P(lang === 'sv' ? 'Väder' : 'Weather', 'split', 12, [Z('weather', { view: 'days' }), Z('today')])] },
    { id: 'station', name: t2('Station board', 'Stationstavla'), desc: t2('Two stations in the amber hall style', 'Två stationer i gul hallstil'), theme: 'solari', pages: lang => [
      P('Odenplan', 'full', 20, [Z('sl', { stations: ['Odenplan'], rows: 5 })]), P('Slussen', 'header', 20, [Z('clock'), Z('sl', { stations: ['Slussen'], rows: 4 })])] },
    { id: 'weather', name: t2('Weather station', 'Väderstation'), desc: t2('Now, the day and the week ahead', 'Nu, dagen och veckan'), theme: 'white', pages: lang => [
      P(lang === 'sv' ? 'Nu' : 'Now', 'split', 12, [Z('weather'), Z('weather', { view: 'days' })]), P(lang === 'sv' ? 'Timmar' : 'Hours', 'full', 12, [Z('weather', { view: 'hours' })])] },
    { id: 'mosaic', name: t2('Colour mosaic', 'Färgmosaik'), desc: t2('No words, only colour', 'Inga ord, bara färg'), theme: 'black', pages: lang => [
      P(lang === 'sv' ? 'Regnbåge' : 'Rainbow', 'full', 10, [Z('pattern')]), P(lang === 'sv' ? 'Hjärta' : 'Heart', 'full', 10, [Z('draw')]), P(lang === 'sv' ? 'Rutor' : 'Checks', 'full', 10, [Z('pattern', { style: 'checks', palette: ['y', 'k'] })])] },
    { id: 'everything', name: t2('Everything at once', 'Allt på en gång'), desc: t2('Every zone busy on one page', 'Alla zoner fulla på en sida'), theme: 'black', pages: lang => [
      P(lang === 'sv' ? 'Allt' : 'Everything', 'stacked', 15, [Z('clock'), Z('sl', { rows: 2 })]), P(lang === 'sv' ? 'Mer' : 'More', 'ticker', 15, [Z('currency'), Z('quotes')])] },
    { id: 'cafe', name: t2('Café', 'Kafé'), desc: t2('Today\u2019s menu with prices', 'Dagens meny med priser'), theme: 'white', pages: lang => [
      P(lang === 'sv' ? 'Meny' : 'Menu', 'full', 20, [Z('menu', { title: lang === 'sv' ? 'IDAG' : 'TODAY', suffix: ' KR' })]), P('Fika', 'full', 8, [Z('bigtext', { text: 'FIKA', color: 'o' })])] },
    { id: 'lobby', name: t2('Office lobby', 'Kontorsentré'), desc: t2('Welcome, the time and room prices', 'Välkommen, tiden och rumspriser'), theme: 'black', pages: lang => [
      P(lang === 'sv' ? 'Välkommen' : 'Welcome', 'header', 15, [Z('clock', { date: false }), Z('rotating', { messages: lang === 'sv' ? ['VÄLKOMMEN TILL ATELJÉN', 'GÄSTNÄT: ATELJE', 'MÖTEN PÅ PLAN 3'] : ['WELCOME TO THE STUDIO', 'GUEST WIFI: STUDIO', 'MEETINGS ON FLOOR 3'] })]),
      P(lang === 'sv' ? 'Rum' : 'Rooms', 'full', 15, [Z('menu', { title: lang === 'sv' ? 'RUM PER TIMME' : 'ROOMS PER HOUR', items: ['STORA SALEN 900', 'BIBLIOTEKET 450', 'TELEFONRUM 150'], suffix: ' KR' })])] },
    { id: 'blank', name: t2('Blank', 'Tom'), desc: t2('One empty page', 'En tom sida'), theme: 'black', pages: lang => [P(lang === 'sv' ? 'Sida 1' : 'Page 1', 'full', 10, [{ ch: null, o: {} }])] }
  ];
  function boardFrom(id, lang) {
    const tp = TEMPLATES.find(x => x.id === id) || TEMPLATES[0];
    return { id: 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: tp.name[lang], tpl: tp.id, rows: 6, cols: 22, size: '6x22', theme: tp.theme, transition: 'classic', speed: 'fast', sound: false,
      quiet: { on: false, from: '23:00', to: '07:00', mode: 'dim' }, pages: tp.pages(lang) };
  }
  function seedDrafts() {
    const now = Date.now();
    return [{ id: 'd1', t: now - 2 * 36e5, h: 6, w: 22, cells: fit(['', 'HAPPY BIRTHDAY', 'ANNA', '', 'yyyyyyyy'], 6, 22) },
      { id: 'd2', t: now - 26 * 36e5, h: 6, w: 22, cells: fit(['BACK AT 14:00', '', 'KEYS ARE IN', 'THE BLUE BOWL'], 6, 22) },
      { id: 'd3', t: now - 5 * 864e5, h: 6, w: 22, cells: stamp(blank(6, 22), HEART) }];
  }

  const UI = {
    en: { edit: 'Edit', done: 'Done', back: 'Back', fullscreen: 'Fullscreen', exitFs: 'Exit fullscreen', playlist: 'Playlist', addPage: 'Add page', boardSettings: 'Board settings', boardsTemplates: 'Boards and templates',
      page: 'Page', pageName: 'Page name', layout: 'Layout', zones: 'Zones', tapZone: 'Tap a zone to choose what it shows.', choose: 'Choose content', timing: 'Timing', showFor: 'Show for', window: 'Only on some days and times',
      from: 'From', to: 'to', days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], weekdays: 'Weekdays', everyDay: 'Every day', duplicatePage: 'Duplicate page', deletePage: 'Delete page',
      searchPh: 'Search content', searchLabel: 'Search content', noResults: 'Nothing matches. Try a shorter word.', shapeNote: 'Previews are drawn at the shape of this zone', change: 'Change', more: 'More options', fewer: 'Fewer options', later: 'Arrives with the relay',
      type: 'Type', paint: 'Paint', photo: 'Photo', undo: 'Undo', redo: 'Redo', drafts: 'Earlier messages', use: 'Use', draftsNote: 'Kept in this browser. A message is saved here when you leave the composer.',
      brush: 'Brush', fill: 'Fill', mirror: 'Mirror', blankChip: 'Blank', filledChip: 'Filled', choosePhoto: 'Choose photo', takePhoto: 'Take photo', sample: 'Sample image', sampleNote: 'Showing the sample image. Choose a photo of your own above.',
      zoom: 'Zoom', posX: 'Horizontal position', posY: 'Vertical position', dither: 'Dithering', ditherHint: 'Mixes flaps to suggest colours in between', blankColour: 'Count blank flaps as a colour',
      clear: 'Clear', center: 'Centre rows', full: 'The zone is full. Delete something to make room.', blankNote: 'is not on the flaps, so it shows as blank.', used: 'flaps used',
      prints: 'The board will print', firstItem: 'First item in the feed', unknownToken: 'is not in the feed, so it prints nothing.', insert: 'Insert', addStation: 'Add a station', maxStations: 'Up to six stations.', remove: 'Remove',
      startTitle: 'Start from a template', startBody: 'Pick one to begin. Everything can be changed afterwards.', skip: 'Keep the current board', yourBoards: 'Your boards', newBoard: 'New board', open: 'Open', duplicate: 'Duplicate',
      exportB: 'Export', importB: 'Import a board', del: 'Delete', jsonNote: 'Export saves a board as JSON (JavaScript Object Notation), a plain text file you can keep or move to another browser.',
      size: 'Grid size', custom: 'Custom', rows: 'Rows', cols: 'Columns', theme: 'Theme', transition: 'Transition', speed: 'Speed', gentle: 'Gentle', fast: 'Fast', quiet: 'Quiet hours', quietBlank: 'Blank', quietDim: 'Dim',
      sound: 'Sound', language: 'Language', empty: 'Empty', pagesWord: 'pages', reorder: 'Reorder', reorderHint: 'Drag to reorder, or focus the handle and use the arrow keys', editHint: 'Press E to edit', newPageName: 'Page',
      today: 'Today', yesterday: 'Yesterday', flapsWide: 'flaps', editing: 'Editing', current: 'Current' },
    sv: { edit: 'Redigera', done: 'Klar', back: 'Tillbaka', fullscreen: 'Helskärm', exitFs: 'Lämna helskärm', playlist: 'Spellista', addPage: 'Lägg till sida', boardSettings: 'Tavlans inställningar', boardsTemplates: 'Tavlor och mallar',
      page: 'Sida', pageName: 'Sidans namn', layout: 'Layout', zones: 'Zoner', tapZone: 'Tryck på en zon för att välja vad den visar.', choose: 'Välj innehåll', timing: 'Tid', showFor: 'Visa i', window: 'Bara vissa dagar och tider',
      from: 'Från', to: 'till', days: ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'], weekdays: 'Vardagar', everyDay: 'Varje dag', duplicatePage: 'Duplicera sida', deletePage: 'Ta bort sida',
      searchPh: 'Sök innehåll', searchLabel: 'Sök innehåll', noResults: 'Inget matchar. Prova ett kortare ord.', shapeNote: 'Förhandsvisningarna ritas i zonens form', change: 'Byt', more: 'Fler alternativ', fewer: 'Färre alternativ', later: 'Kommer med reläet',
      type: 'Skriv', paint: 'Måla', photo: 'Foto', undo: 'Ångra', redo: 'Gör om', drafts: 'Tidigare meddelanden', use: 'Använd', draftsNote: 'Sparas i den här webbläsaren. Ett meddelande sparas här när du lämnar redigeraren.',
      brush: 'Pensel', fill: 'Fyll', mirror: 'Spegla', blankChip: 'Tom', filledChip: 'Fylld', choosePhoto: 'Välj foto', takePhoto: 'Ta foto', sample: 'Exempelbild', sampleNote: 'Visar exempelbilden. Välj ett eget foto ovan.',
      zoom: 'Zoom', posX: 'Vågrät position', posY: 'Lodrät position', dither: 'Rastrering', ditherHint: 'Blandar flappar för att antyda mellanfärger', blankColour: 'Räkna tomma flappar som en färg',
      clear: 'Rensa', center: 'Centrera rader', full: 'Zonen är full. Ta bort något för att få plats.', blankNote: 'finns inte på flapparna och visas som tomt.', used: 'flappar använda',
      prints: 'Tavlan skriver', firstItem: 'Första posten i flödet', unknownToken: 'finns inte i flödet och skrivs inte ut.', insert: 'Infoga', addStation: 'Lägg till station', maxStations: 'Högst sex stationer.', remove: 'Ta bort',
      startTitle: 'Börja från en mall', startBody: 'Välj en att börja med. Allt går att ändra efteråt.', skip: 'Behåll nuvarande tavla', yourBoards: 'Dina tavlor', newBoard: 'Ny tavla', open: 'Öppna', duplicate: 'Duplicera',
      exportB: 'Exportera', importB: 'Importera en tavla', del: 'Ta bort', jsonNote: 'Export sparar tavlan som JSON (JavaScript Object Notation), en textfil du kan spara eller flytta till en annan webbläsare.',
      size: 'Rutnät', custom: 'Eget', rows: 'Rader', cols: 'Kolumner', theme: 'Tema', transition: 'Övergång', speed: 'Hastighet', gentle: 'Lugn', fast: 'Snabb', quiet: 'Tysta timmar', quietBlank: 'Tom', quietDim: 'Dämpad',
      sound: 'Ljud', language: 'Språk', empty: 'Tom', pagesWord: 'sidor', reorder: 'Ändra ordning', reorderHint: 'Dra för att ändra ordning, eller markera handtaget och använd piltangenterna', editHint: 'Tryck E för att redigera', newPageName: 'Sida',
      today: 'Idag', yesterday: 'Igår', flapsWide: 'flappar', editing: 'Redigerar', current: 'Nuvarande' }
  };

  window.SFChannels = { t2, CH, byId, GROUPS, LAYOUTS, TEMPLATES, UI, FEED, STATIONS: Object.keys(MOCK_SL), CITIES: Object.keys(MOCK_WX),
    render, compose, zonesFor, geom, blank, sized, clone, wrap, fit, applyTpl, unknownTokens, sampleImage, mapImage, boardFrom, seedDrafts };
})();
