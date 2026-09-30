/* Split-Flap 0.7: seed data, schedule rules, copy and size helpers, strings.
   Schedule rules mirror nextPage in src/schedule.js as described in BRIEF-week.md. */
(function () {
  'use strict';
  const C = () => window.SFChannels;
  let n = 0; const uid = p => p + (++n).toString(36) + Math.random().toString(36).slice(2, 6);
  const Z = (ch, o) => ({ ch, o: Object.assign(C().clone(C().byId[ch].def), o || {}) });
  const W = (from, to, days, extra) => Object.assign({ from, to, days: days || [] }, extra || {});
  const P = (name, layout, zones, x) => Object.assign({ id: uid('p'), name, layout, dur: 12, wins: [], alone: false, tr: '', hue: 250, zones }, x || {});

  function seed(lang) {
    const sv = lang === 'sv', fit = (l, h, w) => C().fit(l, h, w);
    const home = { id: 'home', name: sv ? 'Hemma' : 'Home', rows: 6, cols: 22, size: '6x22', theme: 'black', transition: 'classic', speed: 'fast', sound: false, location: 'Stockholm', quiet: { on: true, from: '23:30', to: '06:00', mode: 'dim' }, pages: [
      P(sv ? 'Avgångar' : 'Departures', 'header', [Z('clock', { date: false }), Z('sl', { rows: 4 })], { hue: 250, dur: 20, alone: true, wins: [W('06:30', '07:15', [1, 2, 3, 4, 5])] }),
      P(sv ? 'Väder' : 'Weather', 'split', [Z('weather', { view: 'days' }), Z('countdown')], { hue: 190 }),
      P(sv ? 'Citat' : 'Quote', 'full', [Z('quotes')], { hue: 145, dur: 10 }),
      P(sv ? 'Välkommen hem' : 'Welcome home', 'full', [Z('message', { cells: fit(['', sv ? 'VÄLKOMMEN HEM' : 'WELCOME HOME', '', 'roygbv'], 6, 22) })], { hue: 35, wins: [W('17:00', '17:30', [])] }),
      P(sv ? 'Filmkväll' : 'Movie night', 'full', [Z('bigtext', { text: 'FILM', color: 'r' })], { hue: 0, wins: [W('19:00', '23:00', [], { date: '2026-10-02' })] }),
      P(sv ? 'Stor klocka' : 'Big clock', 'full', [Z('bigclock')], { hue: 300, wins: [W('22:00', '01:00', [5, 6])] }),
      P(sv ? 'Annas födelsedag' : 'Anna\u2019s birthday', 'full', [Z('message', { cells: fit(['', 'HAPPY BIRTHDAY', 'ANNA', '', 'yyyyyyyy'], 6, 22) })], { hue: 85, wins: [W('00:00', '00:00', [], { date: '2026-11-14', yearly: true })] })
    ] };
    const cafe = { id: 'cafe', name: sv ? 'Kaféet' : 'Caf\u00e9', rows: 3, cols: 15, size: '3x15', theme: 'white', transition: 'wave', speed: 'gentle', sound: false, location: 'Stockholm', quiet: { on: false, from: '23:00', to: '07:00', mode: 'blank' }, pages: [
      P(sv ? 'Meny' : 'Menu', 'full', [Z('menu', { title: '', items: ['KAFFE 30', 'BULLE 35', 'SOPPA 95'] })], { hue: 35, wins: [W('08:00', '15:00', [1, 2, 3, 4, 5])] }),
      P('Fika', 'full', [Z('message', { cells: fit(['FIKA 15:00', 'ooooooo'], 3, 15) })], { hue: 85, wins: [W('14:45', '15:30', [1, 2, 3, 4, 5])] }),
      P(sv ? 'Öppettider' : 'Opening hours', 'full', [Z('message', { cells: fit([sv ? 'ÖPPET 8 TILL 17' : 'OPEN 8 TO 5', sv ? 'LÖR 10 TILL 15' : 'SAT 10 TO 3'], 3, 15) })], { hue: 250 })
    ] };
    const bps = [
      { id: uid('bp'), name: sv ? 'Välkomstskylt' : 'Welcome sign', rows: 6, cols: 22, theme: 'black', page: { layout: 'full', zones: [Z('message', { cells: fit(['', 'WELCOME TO', 'THE STUDIO', '', 'GUEST WIFI: STUDIO'], 6, 22) })] } },
      { id: uid('bp'), name: sv ? 'Hjärta' : 'Heart', rows: 6, cols: 22, theme: 'black', page: { layout: 'full', zones: [Z('draw', { cells: C().render('draw', {}, 6, 22, { now: Date.now(), lang, theme: 'black' }) })] } },
      { id: uid('bp'), name: sv ? 'Stor klocka' : 'Big clock', rows: 6, cols: 22, theme: 'black', page: { layout: 'full', zones: [Z('bigclock')] } },
      { id: uid('bp'), name: sv ? 'Odenplan och väder' : 'Odenplan and weather', rows: 6, cols: 22, theme: 'solari', page: { layout: 'split', zones: [Z('sl'), Z('weather')] } },
      { id: uid('bp'), name: sv ? 'Dagens meny' : 'Today\u2019s menu', rows: 3, cols: 15, theme: 'white', page: { layout: 'full', zones: [Z('menu', { title: '', items: ['KAFFE 30', 'BULLE 35', 'SOPPA 95'] })] } }
    ];
    return { sbs: [home, cafe], bps };
  }
  function fromTemplate(tplId, lang) {
    const b = C().boardFrom(tplId, lang), hues = [250, 190, 35, 145, 300, 0, 85];
    return { id: uid('sb'), name: b.name, rows: b.rows, cols: b.cols, size: b.size, theme: b.theme, transition: b.transition, speed: b.speed, sound: false, location: 'Stockholm', quiet: { on: false, from: '23:00', to: '07:00', mode: 'dim' },
      pages: b.pages.map((p, i) => ({ id: uid('p'), name: p.name, layout: p.layout, dur: p.dur, tr: '', hue: hues[i % hues.length], alone: false, wins: p.win && p.win.on ? [W(p.win.from, p.win.to, p.win.days || [])] : [], zones: p.zones.map(z => ({ ch: z.ch, o: C().clone(z.o || {}) })) })) };
  }

  const tm = s => { const [h, m] = String(s || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
  const hm = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  const addDays = (d, k) => { const x = new Date(d); x.setDate(x.getDate() + k); return x; };
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function applies(w, d) {
    if (w.date) { const [y, mo, da] = w.date.split('-').map(Number); return d.getMonth() + 1 === mo && d.getDate() === da && (w.yearly || d.getFullYear() === y); }
    return !w.days || !w.days.length || w.days.includes(d.getDay());
  }
  function open(w, d, m) {
    const f = tm(w.from), t = tm(w.to);
    if (f === t) return applies(w, d);
    if (f < t) return applies(w, d) && m >= f && m < t;
    return (applies(w, d) && m >= f) || (applies(w, addDays(d, -1)) && m < t);
  }
  function allowed(pages, d, m) {
    const on = pages.filter(p => p.wins && p.wins.length && p.wins.some(w => open(w, d, m)));
    if (on.some(p => p.alone)) return { list: on, alone: true };
    return { list: pages.filter(p => !p.wins || !p.wins.length || on.includes(p)), alone: false };
  }
  function playlist(pages, d) {
    const segs = []; let prev = null;
    for (let m = 0; m < 1440; m++) {
      const a = allowed(pages, d, m), key = a.list.map(p => p.id).join(',') + (a.alone ? '!' : '');
      if (prev && prev.key === key) prev.to = m + 1; else { prev = { key, from: m, to: m + 1, list: a.list, alone: a.alone }; segs.push(prev); }
    }
    return segs;
  }
  function weekStart(now, off) { const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + off * 7); return d; }
  function blocksFor(pages, d) {
    const out = [];
    pages.forEach(p => (p.wins || []).forEach((w, wi) => {
      const f = tm(w.from), t = tm(w.to);
      if (f === t) { if (applies(w, d)) out.push({ p, w, wi, s: 0, e: 1440 }); return; }
      if (f < t) { if (applies(w, d)) out.push({ p, w, wi, s: f, e: t }); return; }
      if (applies(w, d)) out.push({ p, w, wi, s: f, e: 1440, cont: 'next' });
      if (applies(w, addDays(d, -1))) out.push({ p, w, wi, s: 0, e: t, cont: 'prev' });
    }));
    out.sort((a, b) => a.s - b.s || b.e - a.e);
    const lanesEnd = []; out.forEach(b => { let l = lanesEnd.findIndex(e => e <= b.s); if (l < 0) { l = lanesEnd.length; lanesEnd.push(0); } lanesEnd[l] = b.e; b.lane = l; });
    out.forEach(b => { b.lanes = 1 + Math.max.apply(null, out.filter(o => o.s < b.e && o.e > b.s).map(o => o.lane)); });
    return out;
  }
  function comingDates(pages, now) {
    const res = [], today = new Date(now); today.setHours(0, 0, 0, 0);
    pages.forEach(p => (p.wins || []).forEach(w => {
      if (!w.date) return;
      const [y, mo, da] = w.date.split('-').map(Number);
      let d = new Date(y, mo - 1, da);
      if (w.yearly) { d = new Date(today.getFullYear(), mo - 1, da); if (d < today) d.setFullYear(d.getFullYear() + 1); }
      if (d >= today) res.push({ p, w, d });
    }));
    return res.sort((a, b) => a.d - b.d);
  }
  function shiftWin(w, k) {
    if (!k) return w;
    if (w.date) { const [y, mo, da] = w.date.split('-').map(Number); w.date = iso(addDays(new Date(y, mo - 1, da), k)); }
    else if (w.days && w.days.length) w.days = w.days.map(x => (((x + k) % 7) + 7) % 7);
    return w;
  }

  function fixedCut(page, fr, fc, tr, tc) {
    let lost = 0; const Cc = C(), fz = Cc.zonesFor(page.layout, fr, fc), tz = Cc.zonesFor(page.layout, tr, tc);
    const zones = page.zones.map((z, i) => {
      if (!z || !z.o || !z.o.cells || !['message', 'draw', 'photo'].includes(z.ch) || !fz[i] || !tz[i]) return Cc.clone(z);
      const a = fz[i], b = tz[i], src = Cc.sized(z.o.cells, a.h, a.w), out = Cc.blank(b.h, b.w);
      const oy = Math.floor((a.h - b.h) / 2), ox = Math.floor((a.w - b.w) / 2);
      for (let r = 0; r < a.h; r++) for (let c = 0; c < a.w; c++) {
        const ch = src[r][c], rr = r - oy, cc = c - ox;
        if (rr >= 0 && rr < b.h && cc >= 0 && cc < b.w) out[rr][cc] = ch; else if (ch !== ' ') lost++;
      }
      return { ch: z.ch, o: Object.assign({}, z.o, { cells: out }) };
    });
    return { lost, zones };
  }
  function vestaboard(text, rows, cols) { return C().fit(String(text || '').toUpperCase().split(/\n/).map(l => l.trim()).slice(0, rows), rows, cols); }

  const HUES = [250, 190, 145, 35, 300, 0, 85, 110];
  function hueCss(h, light) {
    return light ? { bg: `oklch(0.9 0.06 ${h})`, solid: `oklch(0.8 0.1 ${h})`, line: `oklch(0.55 0.12 ${h})`, ink: '#1B1D22', dot: `oklch(0.6 0.13 ${h})` }
      : { bg: `oklch(0.34 0.07 ${h})`, solid: `oklch(0.46 0.11 ${h})`, line: `oklch(0.72 0.12 ${h})`, ink: '#EDE6D6', dot: `oklch(0.72 0.12 ${h})` };
  }

  const EN = {
    done: 'Done', search: 'Search', searchLater: 'Search across storyboards, boards, channels and settings arrives in a later version',
    secSb: 'Storyboards', secMy: 'My boards', secEx: 'Explore', secAcc: 'Account',
    sbIntro: 'A storyboard is what a screen plays: its boards in order, and when each one shows.', newSb: 'New storyboard', playingHere: 'Playing on this screen',
    sbEmptyTitle: 'No storyboards yet', sbEmptyBody: 'A storyboard is the plan a screen runs. Start from a template in Explore, or from one empty board.', fromTemplate: 'Start from a template', startEmpty: 'Start empty',
    chTitle: 'Some words have moved', chBody: 'Nothing you made has changed, only what things are called.', chRows: [['What was a board', 'is now a storyboard'], ['What was a page', 'is now a board'], ['The playlist', 'is now worked out for you, as Today\u2019s playlist']], gotIt: 'Got it',
    vWeek: 'Week', vBoards: 'Boards', vDisplay: 'Display', addTime: 'Add a time', anyTime: 'Any time', anyTimeHint: 'take turns whenever no time is on',
    comingDates: 'Coming dates', noDates: 'No board has a date.', thisWeek: 'this week', everyYear: 'every year', allDay: 'all day',
    weekEmpty: 'No board has a time yet, so they all take turns all day. Drag down a day to give a board its hours.',
    newTime: 'New time', whichBoard: 'Which board shows then?', newBoard: 'New board', cancel: 'Cancel', alone: 'Alone', turns: 'takes turns', now: 'Now',
    todaysPlaylist: 'Today\u2019s playlist', playlistFor: 'Playlist for', playlistNote: 'Worked out from when each board shows. Change the week to change it.', clock: 'Clock, since no board may show',
    legendAlone: 'Shows alone', legendWait: 'Others wait', legendTurns: 'Side by side take turns', contPrev: 'from the day before', contNext: 'past midnight',
    blockHelp: 'Arrow keys move it, Shift and arrow keys change the end, Enter opens the board, Delete removes the time.',
    addBoard: 'Add a board', times: 'times', oneTime: '1 time',
    theme: 'Theme', size: 'Grid size', custom: 'Custom', transition: 'Transition', speed: 'Speed', gentle: 'Gentle', fast: 'Fast', quiet: 'Quiet hours', quietBlank: 'Blank', quietDim: 'Dim', sound: 'Sound', location: 'Location', locationHint: 'For sun times, and weather with no city of its own.',
    displayNote: 'These describe the display. When screens arrive, a screen can override size, theme and quiet hours.', name: 'Name',
    saveMy: 'Save to my boards', seeWeek: 'See it in the week', layout: 'Layout', zones: 'Zones', tapZone: 'Choose a zone to set what it shows.', choose: 'Choose content', change: 'Change',
    whenShows: 'When it shows', showFor: 'Show for', aDate: 'A date', daysOfWeek: 'Days', showAlone: 'Show alone while one of its times is on', aloneHint: 'Boards without a time wait until it ends.', trans: 'Transition to this board', trDefault: 'Storyboard default',
    noTimes: 'Any time. It takes turns with the other boards that have no time.', maxTimes: 'Up to eight times per board.', remove: 'Remove',
    myIntro: 'Boards to start from. Adding one to a storyboard makes a copy that belongs to that storyboard.', allSizes: 'All sizes', importB: 'Import', searchMy: 'Search my boards',
    myEmptyTitle: 'Nothing saved yet', myEmptyBody: 'Keep a board here with Save to my boards, from any storyboard or from Explore. Then add it to as many storyboards as you like.', goEx: 'Browse Explore', v071: 'From 0.7.1',
    addTo: 'Add to', pickSb: 'Which storyboard gets the copy?', madeAt: 'Made at', fits: 'Laid out again at the new size. Nothing is cut.', same: 'Same size. It arrives exactly as it is.',
    cutWarn: 'typed or painted flaps do not fit and will be cut from the edges. You can change the copy after adding.', copyNote: 'The copy belongs to this storyboard. Changing it leaves the original as it is.',
    srcMy: 'My boards', srcEx: 'Explore', srcNew: 'New board', firstSize: 'first', showAll: 'Show all sizes', otherSizes: 'Other sizes', newBoardBody: 'An empty board at this storyboard\u2019s size. You choose its layout and content next.', createBoard: 'Make an empty board',
    impTitle: 'Import to My boards', impFile: 'A file', impVb: 'A Vestaboard message', impFileBody: 'A board or storyboard saved as JSON (JavaScript Object Notation) from Split-Flap. Each board in it arrives in My boards.', chooseFile: 'Choose a file',
    impVbBody: 'Paste the text of a Vestaboard message. Each line becomes a row, centred.', impAdd: 'Add to My boards', preview: 'Preview',
    exIntro: 'Templates to start from. Use a whole one as a new storyboard, or take single boards from it.', useNew: 'Use as a new storyboard', others: 'From other people', othersBody: 'Boards that other people share will appear here.', later: 'Later', boardsWord: 'boards', addToSb: 'Add to a storyboard',
    guestTitle: 'You are using Split-Flap as a guest', guestBody: 'Your storyboards and My boards are kept in this browser only. Clearing its data, or changing phone or computer, loses them. Sign in and they are kept with your account, on every device.',
    signIn: 'Sign in with Google', synced: 'Synced', signOut: 'Sign out', language: 'Language', langHint: 'For the editor, and for what boards print, like days and months.', yourData: 'Your data', exportAll: 'Export everything', delAcc: 'Delete account',
    help: 'Help', helpSub: 'How Split-Flap works', log: 'Version log', connections: 'Connections', connSub: 'Calendars and music services, kept with you rather than a storyboard', subs: 'Your submissions', subsSub: 'Boards you share in Explore', whatStores: 'What an account stores',
    offerTitle: 'From before you signed in', offerBody: 'These are in this browser. Everything ticked goes to your account. The rest stays here.', keep: 'Keep with my account', leave: 'Leave them all here', inSb: 'Storyboards', inMy: 'My boards',
    promptBody: 'Your storyboards live only in this browser. Sign in to keep them safe and on your other devices.', notNow: 'Not now',
    edit: 'Edit', fullscreen: 'Fullscreen', soundLbl: 'Sound', on: 'On', off: 'Off', share: 'Share', allSb: 'All storyboards',
    mOpen: 'Open', mRename: 'Rename', mDup: 'Duplicate', mSave: 'Save to my boards', mCopy: 'Copy to', mShare: 'Share', mShareImg: 'Share as image', mExport: 'Export', mDelete: 'Delete', more: 'More',
    nowShowing: 'Now showing', until: 'until', then: 'then', savedMy: 'Saved to My boards', copied: 'Link copied', added: 'Added to', exported: 'Exported',
    days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], everyDay: 'Every day', weekdays: 'Mon to Fri', weekend: 'Sat and Sun', to: 'to', and: 'and',
    helpBody: [['Storyboards', 'A storyboard is what a screen plays. It holds boards in order, when each one shows, and the display settings: size, theme, transition, quiet hours.'], ['Boards', 'A board is one designed screen: a layout split into zones, each showing a channel such as a message, the clock or departures.'], ['The week', 'Give a board times and days in the week view by dragging, or in the board under When it shows. Boards with no time take turns whenever no time is on. A board set to show alone holds the others back during its time.'], ['Today\u2019s playlist', 'What plays today, worked out from the week. It cannot be edited on its own, so it always matches the plan.'], ['My boards', 'Boards you keep to reuse. Adding one to a storyboard makes a copy, so changing the copy never changes the original.']],
    logItems: ['Four sections: Storyboards, My boards, Explore and Account, the same on phone and desktop.', 'A board is now called a storyboard, and a page a board.', 'The week view shows every board\u2019s times, with Today\u2019s playlist beside it.', 'Every level has its own address, so the back button and reload land where you were.', 'One more menu on every storyboard and board, with the same actions in the same order.']
  };
  const SV = Object.assign({}, EN, {
    done: 'Klar', search: 'Sök', searchLater: 'Sökning bland storyboards, tavlor, kanaler och inställningar kommer i en senare version',
    secSb: 'Storyboards', secMy: 'Mina tavlor', secEx: 'Utforska', secAcc: 'Konto',
    sbIntro: 'En storyboard är det en skärm spelar: dess tavlor i ordning, och när var och en visas.', newSb: 'Ny storyboard', playingHere: 'Spelas på den här skärmen',
    sbEmptyTitle: 'Inga storyboards än', sbEmptyBody: 'En storyboard är planen en skärm följer. Börja från en mall i Utforska, eller från en tom tavla.', fromTemplate: 'Börja från en mall', startEmpty: 'Börja tomt',
    chTitle: 'Några ord har flyttat', chBody: 'Inget du gjort har ändrats, bara vad saker heter.', chRows: [['Det som var en tavla', 'är nu en storyboard'], ['Det som var en sida', 'är nu en tavla'], ['Spellistan', 'räknas nu ut åt dig, som Dagens spellista']], gotIt: 'Uppfattat',
    vWeek: 'Vecka', vBoards: 'Tavlor', vDisplay: 'Skärm', addTime: 'Lägg till en tid', anyTime: 'När som helst', anyTimeHint: 'turas om när ingen tid gäller',
    comingDates: 'Kommande datum', noDates: 'Ingen tavla har ett datum.', thisWeek: 'den här veckan', everyYear: 'varje år', allDay: 'hela dagen',
    weekEmpty: 'Ingen tavla har en tid än, så alla turas om hela dagen. Dra nedåt i en dag för att ge en tavla sina timmar.',
    newTime: 'Ny tid', whichBoard: 'Vilken tavla visas då?', newBoard: 'Ny tavla', cancel: 'Avbryt', alone: 'Ensam', turns: 'turas om', now: 'Nu',
    todaysPlaylist: 'Dagens spellista', playlistFor: 'Spellista för', playlistNote: 'Räknas ut från när varje tavla visas. Ändra veckan för att ändra den.', clock: 'Klocka, eftersom ingen tavla får visas',
    legendAlone: 'Visas ensam', legendWait: 'Andra väntar', legendTurns: 'Sida vid sida turas om', contPrev: 'från dagen innan', contNext: 'efter midnatt',
    blockHelp: 'Piltangenterna flyttar, Skift och piltangenterna ändrar slutet, Retur öppnar tavlan, Delete tar bort tiden.',
    addBoard: 'Lägg till en tavla', times: 'tider', oneTime: '1 tid',
    theme: 'Tema', size: 'Rutnät', custom: 'Eget', transition: 'Övergång', speed: 'Hastighet', gentle: 'Lugn', fast: 'Snabb', quiet: 'Tysta timmar', quietBlank: 'Tom', quietDim: 'Dämpad', sound: 'Ljud', location: 'Plats', locationHint: 'För soltider, och väder utan egen stad.',
    displayNote: 'Detta beskriver skärmen. När skärmar kommer kan en skärm ha egen storlek, eget tema och egna tysta timmar.', name: 'Namn',
    saveMy: 'Spara i mina tavlor', seeWeek: 'Se den i veckan', layout: 'Layout', zones: 'Zoner', tapZone: 'Välj en zon för att bestämma vad den visar.', choose: 'Välj innehåll', change: 'Byt',
    whenShows: 'När den visas', showFor: 'Visa i', aDate: 'Ett datum', daysOfWeek: 'Dagar', showAlone: 'Visa ensam medan en av dess tider gäller', aloneHint: 'Tavlor utan tid väntar tills den är slut.', trans: 'Övergång till tavlan', trDefault: 'Storyboardens val',
    noTimes: 'När som helst. Den turas om med de andra tavlorna utan tid.', maxTimes: 'Högst åtta tider per tavla.', remove: 'Ta bort',
    myIntro: 'Tavlor att börja från. När du lägger till en i en storyboard blir det en kopia som hör till den storyboarden.', allSizes: 'Alla storlekar', importB: 'Importera', searchMy: 'Sök i mina tavlor',
    myEmptyTitle: 'Inget sparat än', myEmptyBody: 'Spara en tavla här med Spara i mina tavlor, från en storyboard eller från Utforska. Lägg sedan till den i så många storyboards du vill.', goEx: 'Bläddra i Utforska', v071: 'Från 0.7.1',
    addTo: 'Lägg till i', pickSb: 'Vilken storyboard får kopian?', madeAt: 'Gjord i', fits: 'Läggs ut på nytt i den nya storleken. Inget klipps bort.', same: 'Samma storlek. Den kommer precis som den är.',
    cutWarn: 'skrivna eller målade flappar får inte plats och klipps bort från kanterna. Du kan ändra kopian efteråt.', copyNote: 'Kopian hör till den här storyboarden. Ändrar du den förblir originalet som det är.',
    srcMy: 'Mina tavlor', srcEx: 'Utforska', srcNew: 'Ny tavla', firstSize: 'först', showAll: 'Visa alla storlekar', otherSizes: 'Andra storlekar', newBoardBody: 'En tom tavla i storyboardens storlek. Du väljer layout och innehåll sedan.', createBoard: 'Gör en tom tavla',
    impTitle: 'Importera till Mina tavlor', impFile: 'En fil', impVb: 'Ett Vestaboard-meddelande', impFileBody: 'En tavla eller storyboard sparad som JSON (JavaScript Object Notation) från Split-Flap. Varje tavla i den hamnar i Mina tavlor.', chooseFile: 'Välj en fil',
    impVbBody: 'Klistra in texten i ett Vestaboard-meddelande. Varje rad blir en rad på tavlan, centrerad.', impAdd: 'Lägg till i Mina tavlor', preview: 'Förhandsvisning',
    exIntro: 'Mallar att börja från. Använd en hel som ny storyboard, eller ta enstaka tavlor från den.', useNew: 'Använd som ny storyboard', others: 'Från andra', othersBody: 'Tavlor som andra delar visas här.', later: 'Senare', boardsWord: 'tavlor', addToSb: 'Lägg till i en storyboard',
    guestTitle: 'Du använder Split-Flap som gäst', guestBody: 'Dina storyboards och Mina tavlor finns bara i den här webbläsaren. Rensar du dess data, eller byter telefon eller dator, försvinner de. Logga in så sparas de med ditt konto, på alla enheter.',
    signIn: 'Logga in med Google', synced: 'Synkad', signOut: 'Logga ut', language: 'Språk', langHint: 'För redigeraren, och för det tavlor skriver, som dagar och månader.', yourData: 'Dina data', exportAll: 'Exportera allt', delAcc: 'Ta bort konto',
    help: 'Hjälp', helpSub: 'Så fungerar Split-Flap', log: 'Versionslogg', connections: 'Kopplingar', connSub: 'Kalendrar och musiktjänster, som hör till dig och inte till en storyboard', subs: 'Dina bidrag', subsSub: 'Tavlor du delar i Utforska', whatStores: 'Vad ett konto sparar',
    offerTitle: 'Från innan du loggade in', offerBody: 'De här finns i webbläsaren. Allt som är ikryssat går till ditt konto. Resten stannar här.', keep: 'Behåll med mitt konto', leave: 'Lämna alla här', inSb: 'Storyboards', inMy: 'Mina tavlor',
    promptBody: 'Dina storyboards finns bara i den här webbläsaren. Logga in så är de säkra och finns på dina andra enheter.', notNow: 'Inte nu',
    edit: 'Redigera', fullscreen: 'Helskärm', soundLbl: 'Ljud', on: 'På', off: 'Av', share: 'Dela', allSb: 'Alla storyboards',
    mOpen: 'Öppna', mRename: 'Byt namn', mDup: 'Duplicera', mSave: 'Spara i mina tavlor', mCopy: 'Kopiera till', mShare: 'Dela', mShareImg: 'Dela som bild', mExport: 'Exportera', mDelete: 'Ta bort', more: 'Mer',
    nowShowing: 'Visas nu', until: 'till', then: 'sedan', savedMy: 'Sparad i Mina tavlor', copied: 'Länken kopierad', added: 'Tillagd i', exported: 'Exporterad',
    days: ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'], months: ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'], everyDay: 'Varje dag', weekdays: 'Mån till fre', weekend: 'Lör och sön', to: 'till', and: 'och',
    helpBody: [['Storyboards', 'En storyboard är det en skärm spelar. Den har tavlor i ordning, när var och en visas, och skärmens inställningar: storlek, tema, övergång, tysta timmar.'], ['Tavlor', 'En tavla är en utformad skärmbild: en layout delad i zoner, där varje zon visar en kanal som ett meddelande, klockan eller avgångar.'], ['Veckan', 'Ge en tavla tider och dagar i veckovyn genom att dra, eller i tavlan under När den visas. Tavlor utan tid turas om när ingen tid gäller. En tavla som visas ensam håller tillbaka de andra under sin tid.'], ['Dagens spellista', 'Det som spelas idag, uträknat från veckan. Den kan inte ändras för sig, så den stämmer alltid med planen.'], ['Mina tavlor', 'Tavlor du sparar för att använda igen. Att lägga till en i en storyboard gör en kopia, så att ändra kopian ändrar aldrig originalet.']],
    logItems: ['Fyra delar: Storyboards, Mina tavlor, Utforska och Konto, samma på telefon och dator.', 'Det som var en tavla heter nu storyboard, och en sida heter tavla.', 'Veckovyn visar alla tavlors tider, med Dagens spellista bredvid.', 'Varje nivå har en egen adress, så bakåtknappen och omladdning hamnar där du var.', 'En Mer-meny på varje storyboard och tavla, med samma val i samma ordning.']
  });
  function fmtDays(w, t) {
    if (w.date) { const [y, mo, da] = w.date.split('-').map(Number), d = new Date(y, mo - 1, da); return w.yearly ? `${da} ${t.months[mo - 1]}, ${t.everyYear}` : `${t.days[d.getDay()]} ${da} ${t.months[mo - 1]}`; }
    const ds = (w.days || []).slice().sort(); if (!ds.length || ds.length === 7) return t.everyDay;
    if (ds.join() === '1,2,3,4,5') return t.weekdays; if (ds.join() === '0,6') return t.weekend;
    const order = [1, 2, 3, 4, 5, 6, 0].filter(x => ds.includes(x)).map(x => t.days[x]);
    return order.length > 1 ? order.slice(0, -1).join(', ') + ` ${t.and} ` + order[order.length - 1] : order[0];
  }
  function fmtWin(w, t) { const f = tm(w.from), e = tm(w.to); return f === e ? `${fmtDays(w, t)}, ${t.allDay}` : `${fmtDays(w, t)}, ${w.from} ${t.to} ${w.to}`; }

  window.SF07 = { seed, fromTemplate, uid, tm, hm, addDays, iso, applies, open, allowed, playlist, weekStart, blocksFor, comingDates, shiftWin, fixedCut, vestaboard, HUES, hueCss, STR: { en: EN, sv: SV }, fmtDays, fmtWin };
})();
