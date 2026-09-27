/* Split-Flap content model: layouts, channels, demo playlist, chrome strings.
   Live data (SL, Open-Meteo) is mocked here; engineering swaps the MOCK_* tables for fetchers. */
(function () {
  'use strict';
  const DAYS = { en: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'], sv: ['SÖNDAG', 'MÅNDAG', 'TISDAG', 'ONSDAG', 'TORSDAG', 'FREDAG', 'LÖRDAG'] };
  const MONTHS = { en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'], sv: ['JAN', 'FEB', 'MAR', 'APR', 'MAJ', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEC'] };
  const MOCK_SL = {
    'Odenplan': [['17', 'ÅKESHOV', 2], ['18', 'ALVIK', 6], ['19', 'HÄSSELBY STRAND', 9], ['17', 'SKARPNÄCK', 4], ['19', 'HAGSÄTRA', 11]],
    'T-Centralen': [['10', 'KUNGSTRÄDGÅRDEN', 1], ['11', 'AKALLA', 5], ['13', 'NORSBORG', 3], ['14', 'MÖRBY CENTRUM', 8]],
    'Slussen': [['13', 'ROPSTEN', 2], ['14', 'FRUÄNGEN', 4], ['17', 'SKARPNÄCK', 7], ['19', 'HAGSÄTRA', 10]],
    'Gullmarsplan': [['17', 'ÅKESHOV', 3], ['18', 'FARSTA STRAND', 5], ['19', 'HAGSÄTRA', 8]],
    'Fridhemsplan': [['10', 'HJULSTA', 2], ['11', 'KUNGSTRÄDGÅRDEN', 6], ['18', 'ALVIK', 9]],
    'Tekniska högskolan': [['14', 'MÖRBY CENTRUM', 3], ['14', 'FRUÄNGEN', 6]]
  };
  const MOCK_WX = {
    'Stockholm': { t: 12, c: ['CLEAR', 'KLART'], f: [['THU', 'TOR', 14], ['FRI', 'FRE', 11], ['SAT', 'LÖR', 9]] },
    'Göteborg': { t: 11, c: ['RAIN', 'REGN'], f: [['THU', 'TOR', 12], ['FRI', 'FRE', 12], ['SAT', 'LÖR', 10]] },
    'Malmö': { t: 13, c: ['WINDY', 'BLÅSIGT'], f: [['THU', 'TOR', 14], ['FRI', 'FRE', 13], ['SAT', 'LÖR', 12]] },
    'Uppsala': { t: 10, c: ['CLOUDY', 'MOLNIGT'], f: [['THU', 'TOR', 11], ['FRI', 'FRE', 9], ['SAT', 'LÖR', 8]] },
    'Kiruna': { t: 3, c: ['SNOW', 'SNÖ'], f: [['THU', 'TOR', 2], ['FRI', 'FRE', 1], ['SAT', 'LÖR', 0]] }
  };
  const QUOTES = ['WELL BEGUN IS HALF DONE', 'SLOW IS SMOOTH AND SMOOTH IS FAST', 'THE BEST TIME TO PLANT A TREE WAS TWENTY YEARS AGO. THE SECOND BEST TIME IS NOW.', 'MEASURE TWICE CUT ONCE'];
  const CHANNELS = [
    { id: 'message', en: 'Message', sv: 'Meddelande' }, { id: 'clock', en: 'Clock and date', sv: 'Klocka och datum' },
    { id: 'countdown', en: 'Countdown', sv: 'Nedräkning' }, { id: 'sl', en: 'SL departures', sv: 'SL avgångar' },
    { id: 'weather', en: 'Weather', sv: 'Väder' }, { id: 'quote', en: 'Quotes', sv: 'Citat' }
  ];
  const LAYOUTS = [
    { id: 'full', en: 'Full', sv: 'Hel', zones: { en: ['Board'], sv: ['Tavla'] } },
    { id: 'header', en: 'Header and body', sv: 'Rubrik och text', zones: { en: ['Header row', 'Body'], sv: ['Rubrikrad', 'Text'] } },
    { id: 'split', en: 'Split', sv: 'Delad', zones: { en: ['Left', 'Right'], sv: ['Vänster', 'Höger'] } },
    { id: 'ticker', en: 'Ticker row', sv: 'Löprad', zones: { en: ['Body', 'Ticker row'], sv: ['Text', 'Löprad'] } }
  ];

  function zonesFor(l, R, C) {
    if (l === 'header' && R > 1) return [{ r: 0, c: 0, h: 1, w: C }, { r: 1, c: 0, h: R - 1, w: C }];
    if (l === 'split' && C > 3) { const a = Math.floor((C - 1) / 2); return [{ r: 0, c: 0, h: R, w: a }, { r: 0, c: a + 1, h: R, w: C - a - 1 }]; }
    if (l === 'ticker' && R > 1) return [{ r: 0, c: 0, h: R - 1, w: C }, { r: R - 1, c: 0, h: 1, w: C }];
    return [{ r: 0, c: 0, h: R, w: C }];
  }
  const blank = (R, C) => Array.from({ length: R }, () => Array(C).fill(' '));
  function put(g, r, c0, w, s, align) {
    const a = [...s].slice(0, w), off = align === 'left' ? 0 : align === 'right' ? w - a.length : Math.floor((w - a.length) / 2);
    a.forEach((ch, i) => { if (g[r] && c0 + off + i < g[r].length) g[r][c0 + off + i] = ch; });
  }
  function wrap(s, w) {
    const out = []; let cur = '';
    String(s || '').split(/\s+/).filter(Boolean).forEach(word => {
      word = word.slice(0, w);
      if (!cur) cur = word; else if ((cur + ' ' + word).length <= w) cur += ' ' + word; else { out.push(cur); cur = word; }
    });
    if (cur) out.push(cur); return out;
  }
  function block(g, z, lines, align) {
    const L = lines.slice(0, z.h), top = z.r + Math.floor((z.h - L.length) / 2), inset = align === 'left' && z.w > 8 ? 1 : 0;
    L.forEach((l, i) => put(g, top + i, z.c + inset, z.w - inset * 2, l, align));
  }
  function toCells(o, h, w) {
    const out = blank(h, w);
    if (o.cells) { for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) out[r][c] = (o.cells[r] && o.cells[r][c]) || ' '; }
    else if (o.lines) {
      const L = o.lines.slice(0, h), top = Math.floor((h - L.length) / 2);
      L.forEach((l, i) => { const a = [...l].slice(0, w), off = Math.floor((w - a.length) / 2); a.forEach((ch, j) => { out[top + i][off + j] = ch; }); });
    } else if (o.text) { const z = { r: 0, c: 0, h, w }; block(out, z, wrap(o.text.toUpperCase(), w), 'center'); }
    return out;
  }
  function row(num, dest, right, W) {
    let left = num.padEnd(3) + dest;
    if (left.length + 1 + right.length > W) left = left.slice(0, Math.max(0, W - right.length - 1));
    return left.padEnd(W - right.length) + right;
  }
  function channelLines(ch, o, z, now, lang) {
    const d = new Date(now), W = z.w > 8 ? z.w - 2 : z.w;
    if (ch === 'clock') {
      const hh = d.getHours(), mm = String(d.getMinutes()).padStart(2, '0');
      const time = o.fmt === '12' ? `${(hh % 12) || 12}:${mm} ${hh < 12 ? 'AM' : 'PM'}` : `${String(hh).padStart(2, '0')}:${mm}`;
      const day = DAYS[lang][d.getDay()], mon = MONTHS[lang][d.getMonth()];
      if (z.h === 1) return { exact: row('', `${day.slice(0, 3)} ${d.getDate()} ${mon}`.trim(), time, W).trimStart().padEnd(W - time.length).slice(0, W - time.length) + time };
      if (z.h < 4) return { lines: [day, time], align: 'center' };
      return { lines: [day, `${d.getDate()} ${mon}`, '', time], align: 'center' };
    }
    if (ch === 'countdown') {
      const target = new Date((o.date || '2027-06-25') + 'T00:00:00').getTime(), diff = target - now;
      const days = Math.ceil(diff / 864e5), hrs = Math.max(0, Math.ceil(diff / 36e5));
      const val = diff <= 0 ? (lang === 'sv' ? 'IDAG' : 'TODAY') : days > 1 ? `${days} ${lang === 'sv' ? 'DAGAR' : 'DAYS'}` : `${hrs} ${lang === 'sv' ? 'TIMMAR' : 'HOURS'}`;
      return { lines: [(o.label || '').toUpperCase(), '', val, diff > 0 ? (lang === 'sv' ? 'KVAR' : 'TO GO') : ''], align: 'center' };
    }
    if (ch === 'sl') {
      const st = o.station || 'Odenplan', list = MOCK_SL[st] || [], el = Math.floor(now / 60000);
      const deps = list.map(([n, dest, b]) => ({ n, dest, m: ((b - el) % 12 + 12) % 12 })).sort((a, b) => a.m - b.m);
      const L = [st.toUpperCase()].concat(deps.map(x => row(x.n, x.dest, x.m === 0 ? (lang === 'sv' ? 'NU' : 'NOW') : `${x.m} MIN`, W)));
      return { lines: L, align: 'left' };
    }
    if (ch === 'weather') {
      const city = o.city || 'Stockholm', wx = MOCK_WX[city] || MOCK_WX.Stockholm, li = lang === 'sv' ? 1 : 0;
      const now1 = `${wx.t}° ${wx.c[li]}`;
      if (W < 16) return { lines: [city.toUpperCase(), now1, ''].concat(wx.f.map(f => `${f[li]} ${f[2]}°`)), align: 'center' };
      return { lines: [city.toUpperCase(), now1, '', wx.f.map(f => `${f[li]} ${f[2]}°`).join('  ')], align: 'center' };
    }
    if (ch === 'quote') { const q = QUOTES[Math.floor(now / 60000) % QUOTES.length]; return { lines: wrap(q, W), align: 'center' }; }
    return { lines: wrap(String(o.text || '').toUpperCase(), W), align: 'center' };
  }
  function compose(page, R, C, now, lang) {
    const g = blank(R, C); if (!page) return g;
    zonesFor(page.layout, R, C).forEach((z, i) => {
      const zd = page.zones[i] || { ch: 'message', o: {} }, o = zd.o || {}, ticker = page.layout === 'ticker' && i === 1;
      if (zd.ch === 'message' && !ticker) {
        const cells = toCells(o, z.h, z.w);
        for (let r = 0; r < z.h; r++) for (let c = 0; c < z.w; c++) g[z.r + r][z.c + c] = cells[r][c];
        return;
      }
      const res = channelLines(zd.ch, o, z, now, lang);
      if (res.exact != null) { put(g, z.r, z.c + (z.w > 8 ? 1 : 0), W0(z), res.exact, 'left'); return; }
      if (z.h === 1) {  // ticker rows page through word-wrapped segments; flaps cannot scroll smoothly
        const segs = wrap(res.lines.filter(Boolean).join('   '), z.w);
        put(g, z.r, z.c, z.w, segs[Math.floor(now / 3500) % Math.max(1, segs.length)] || '', 'center'); return;
      }
      block(g, z, res.lines, res.align);
    });
    return g;
  }
  const W0 = z => (z.w > 8 ? z.w - 2 : z.w);
  function toMin(s) { const p = String(s || '0:0').split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
  function inWindow(win, now) {
    if (!win || !win.on) return true;
    const d = new Date(now), m = d.getHours() * 60 + d.getMinutes(), a = toMin(win.from), b = toMin(win.to);
    return a <= b ? (m >= a && m < b) : (m >= a || m < b);
  }
  function demoPages() {
    return [
      { id: 'p1', name: 'Welcome', layout: 'full', dur: 12, win: null, zones: [{ ch: 'message', o: { lines: ['', 'HELLO FROM', 'A SPARE MONITOR', '', 'roygbv', ''] } }] },
      { id: 'p2', name: 'Morning commute', layout: 'header', dur: 14, win: { on: true, from: '06:00', to: '10:00' }, zones: [{ ch: 'clock', o: { fmt: '24' } }, { ch: 'sl', o: { station: 'Odenplan' } }] },
      { id: 'p3', name: 'Weather and countdown', layout: 'split', dur: 12, win: null, zones: [{ ch: 'weather', o: { city: 'Stockholm' } }, { ch: 'countdown', o: { label: 'MIDSOMMAR', date: '2027-06-25' } }] },
      { id: 'p4', name: 'Quote of the hour', layout: 'ticker', dur: 14, win: null, zones: [{ ch: 'quote', o: {} }, { ch: 'message', o: { text: 'OPEN METEO SAYS 12° AND CLEAR TONIGHT. NEXT 17 TO ÅKESHOV IN 4 MIN.' } }] },
      { id: 'p5', name: 'Clock', layout: 'full', dur: 10, win: null, zones: [{ ch: 'clock', o: { fmt: '24' } }] }
    ];
  }
  function defaultBoard(name) {
    return { id: 'b' + Date.now().toString(36), name: name || 'Demo board', size: '6x22', rows: 6, cols: 22, theme: 'black', transition: 'classic', speed: 'fast', sound: false,
      quiet: { on: false, from: '23:00', to: '07:00', mode: 'dim' }, pages: demoPages() };
  }
  const STR = {
    en: { edit: 'Edit', fullscreen: 'Fullscreen', exitFs: 'Exit fullscreen', sound: 'Sound', on: 'On', off: 'Off', share: 'Share', done: 'Done',
      pages: 'Pages', board: 'Board', boards: 'Boards', cue: 'This board is yours. Press Edit to make it say anything.', gotIt: 'Got it',
      shareTitle: 'Open this board on another screen', shareBody: 'The link carries the whole board. Nothing is stored on a server.', copy: 'Copy link', copied: 'Copied',
      newBoard: 'New board', addPage: 'Add page', seconds: 's', layout: 'Layout', channel: 'Channel', window: 'Only show between', always: 'Always',
      size: 'Grid size', custom: 'Custom', fill: 'Fill screen', rows: 'Rows', cols: 'Columns', theme: 'Theme', transition: 'Transition', speed: 'Speed',
      quiet: 'Quiet hours', quietBlank: 'Blank', quietDim: 'Dim', from: 'From', to: 'To', saved: 'Saved automatically in this browser.',
      duplicate: 'Duplicate', exportJ: 'Export JSON', importJ: 'Import JSON', del: 'Delete', name: 'Name', offline: 'Live data 14 min old',
      clear: 'Clear', center: 'Centre rows', flaps: 'flaps used', full: 'The board is full. Delete something to make room.', blankNote: 'is not on the flaps, so it shows as blank.',
      station: 'Station', city: 'City', label: 'Label', date: 'Date', format: 'Format', text: 'Scrolling text', quoteNote: 'Rotates through a short set of proverbs every minute.', editing: 'Editing', live: 'Live', playlist: 'Playlist' },
    sv: { edit: 'Redigera', fullscreen: 'Helskärm', exitFs: 'Lämna helskärm', sound: 'Ljud', on: 'På', off: 'Av', share: 'Dela', done: 'Klar',
      pages: 'Sidor', board: 'Tavla', boards: 'Tavlor', cue: 'Tavlan är din. Tryck Redigera och låt den säga vad du vill.', gotIt: 'Uppfattat',
      shareTitle: 'Öppna tavlan på en annan skärm', shareBody: 'Länken bär hela tavlan. Inget sparas på någon server.', copy: 'Kopiera länk', copied: 'Kopierad',
      newBoard: 'Ny tavla', addPage: 'Lägg till sida', seconds: 's', layout: 'Layout', channel: 'Kanal', window: 'Visa bara mellan', always: 'Alltid',
      size: 'Rutnät', custom: 'Egen', fill: 'Fyll skärmen', rows: 'Rader', cols: 'Kolumner', theme: 'Tema', transition: 'Övergång', speed: 'Hastighet',
      quiet: 'Tysta timmar', quietBlank: 'Tom', quietDim: 'Dämpad', from: 'Från', to: 'Till', saved: 'Sparas automatiskt i den här webbläsaren.',
      duplicate: 'Duplicera', exportJ: 'Exportera JSON', importJ: 'Importera JSON', del: 'Ta bort', name: 'Namn', offline: 'Livedata 14 min gammal',
      clear: 'Rensa', center: 'Centrera rader', flaps: 'flappar använda', full: 'Tavlan är full. Ta bort något för att få plats.', blankNote: 'finns inte på flapparna och visas som tomt.',
      station: 'Station', city: 'Stad', label: 'Etikett', date: 'Datum', format: 'Format', text: 'Löptext', quoteNote: 'Byter bland några ordspråk varje minut.', editing: 'Redigerar', live: 'Live', playlist: 'Spellista' }
  };
  window.SFContent = { CHANNELS, LAYOUTS, STR, STATIONS: Object.keys(MOCK_SL), CITIES: Object.keys(MOCK_WX), zonesFor, toCells, compose, inWindow, demoPages, defaultBoard, blank };
})();
