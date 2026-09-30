/* Split-Flap 0.10: places, templates, library seeds, composing, strings. Schedule rules come from nav-07.js (SF07). */
(function () {
  'use strict';
  const C = () => window.SFChannels;
  let n = 0; const uid = p => p + (++n).toString(36) + Math.random().toString(36).slice(2, 5);
  const PLACES = {
    Stockholm: { city: 'Stockholm', stops: ['Odenplan'], currency: 'SEK', hol: { en: 'Swedish holidays', sv: 'svenska helgdagar' }, cd: ['MIDSOMMAR', '2027-06-25'], t: 12, c: { en: 'CLEAR', sv: 'KLART' }, rain: '19:00',
      deps: [['4', 'RADIOHUSET', 3], ['17', 'SKARPNÄCK', 4], ['2', 'SOFIA', 6], ['19', 'HÄSSELBY STRAND', 8], ['40', 'UPPSALA C', 11], ['4', 'GULLMARSPLAN', 13], ['515', 'ODENPLAN', 15], ['18', 'FARSTA STRAND', 17], ['53', 'KAROLINSKA', 19], ['17', 'ÅKESHOV', 21]] },
    London: { city: 'London', stops: ['Trafalgar Square', 'Charing Cross'], currency: 'GBP', hol: { en: 'English holidays', sv: 'engelska helgdagar' }, cd: ['CHRISTMAS', '2026-12-25'], t: 14, c: { en: 'RAIN', sv: 'REGN' }, rain: '16:00',
      deps: [['87', 'WANDSWORTH', 3], ['24', 'PIMLICO', 5], ['9', 'ALDWYCH', 6], ['453', 'DEPTFORD', 8], ['NR', 'DARTFORD', 9], ['139', 'WEST HAMPSTEAD', 11], ['88', 'CLAPHAM COMMON', 12], ['NR', 'HASTINGS', 14], ['12', 'DULWICH', 16], ['176', 'PENGE', 18]] },
    Manchester: { city: 'Manchester', stops: ['Piccadilly Gardens'], currency: 'GBP', hol: { en: 'English holidays', sv: 'engelska helgdagar' }, cd: ['CHRISTMAS', '2026-12-25'], t: 11, c: { en: 'CLOUD', sv: 'MOLN' }, rain: '18:00',
      deps: [['TRAM', 'ALTRINCHAM', 2], ['TRAM', 'BURY', 4], ['86', 'CHORLTON', 5], ['TRAM', 'ECCLES', 7], ['216', 'ASHTON', 9], ['TRAM', 'AIRPORT', 10], ['50', 'SALFORD QUAYS', 12], ['TRAM', 'ROCHDALE', 14], ['42', 'STOCKPORT', 16], ['TRAM', 'EAST DIDSBURY', 18]] },
    'Göteborg': { city: 'Göteborg', stops: ['Brunnsparken'], currency: 'SEK', hol: { en: 'Swedish holidays', sv: 'svenska helgdagar' }, cd: ['MIDSOMMAR', '2027-06-25'], t: 11, c: { en: 'RAIN', sv: 'REGN' }, rain: '15:00',
      deps: [['6', 'KORTEDALA', 2], ['11', 'SALTHOLMEN', 4], ['1', 'TYNNERED', 5], ['16', 'EKETRÄGATAN', 7], ['5', 'LÄNGMANSGATAN', 9], ['2', 'MÖLNDAL', 11], ['3', 'MARKLANDSGATAN', 12], ['9', 'KUNGSSTEN', 14], ['7', 'BERGSJÖN', 16], ['10', 'GULDHEDEN', 18]] }
  };
  const pad = (a, b, w) => { a = String(a); b = String(b); const s = Math.max(1, w - a.length - b.length); return (a + ' '.repeat(s) + b).slice(0, w); };
  function wxLines(o, P, h, w, lang) { const city = String(o.city || P.city).toUpperCase(), p = PLACES[o.city] || P; const L = [`${city} ${p.t}°`, p.c[lang] || p.c.en]; if (h >= 5) L.push(lang === 'sv' ? `REGN KL ${p.rain}` : `RAIN AT ${p.rain}`); return C().fit(L.slice(0, h), h, w); }
  function depLines(o, P, h, w) {
    const stop = (o.stop || P.stops[0]).toUpperCase(), p = Object.values(PLACES).find(x => x.stops.map(s => s.toUpperCase()).includes(stop)) || P, W = w - 2;
    const L = [pad('DEPARTURES', stop.slice(0, Math.max(0, W - 11)), W)];
    p.deps.slice(0, Math.max(1, h - 1)).forEach(d => L.push(pad(`${d[0].padEnd(4)} ${d[1]}`.slice(0, W - 4), d[2] + ' M', W)));
    return C().fit(L.slice(0, h), h, w, 'left');
  }
  function compose(b, env, P) {
    const Cc = C(), zd = Cc.zonesFor(b.layout, b.rows, b.cols);
    const zones = b.zones.map((z, i) => { if (!z || !zd[i]) return z; const d = zd[i];
      if (z.ch === 'wx') return { ch: 'message', o: { cells: wxLines(z.o, P, d.h, d.w, env.lang) } };
      if (z.ch === 'dep') return { ch: 'message', o: { cells: depLines(z.o, P, d.h, d.w) } };
      if (z.ch === 'countdown' && z.o.home) return { ch: 'countdown', o: Object.assign({}, z.o, { label: P.cd[0], date: P.cd[1] }) };
      return z; });
    return Cc.compose({ layout: b.layout, zones }, b.rows, b.cols, env);
  }
  const Z = (ch, o) => ({ ch, o: Object.assign(ch === 'wx' || ch === 'dep' ? {} : C().clone(C().byId[ch].def), o || {}) });
  const B = (name, rows, cols, theme, layout, zones, x) => Object.assign({ id: uid('b'), name, rows, cols, theme, layout, zones }, x || {});
  function demo(P, lang) {
    const sv = lang === 'sv', here = P.city === 'Stockholm' ? (sv ? 'HALLEN' : 'THE HALLWAY') : P.city.toUpperCase();
    return [
      B(sv ? 'Välkommen' : 'Welcome', 6, 22, 'black', 'full', [Z('message', { lines: ['', sv ? 'HEJ FRÅN' : 'HELLO FROM', here, '', 'roygbv', ''] })], { tid: 'welcome' }),
      B(sv ? 'Väder' : 'Weather', 6, 22, 'black', 'full', [Z('wx', { city: P.city })], { tid: 'weather' }),
      B(sv ? 'Avgångar' : 'Departures', 6, 22, 'black', 'full', [Z('dep', { stop: P.stops[0] })], { tid: 'deps' }),
      B(sv ? 'Stor klocka' : 'Big clock', 6, 22, 'black', 'full', [Z('bigclock')], { tid: 'clock' }),
      B(sv ? 'Nedräkning' : 'Countdown', 6, 22, 'black', 'full', [Z('countdown', { home: true })], { tid: 'cd' }),
      B(sv ? 'Citat' : 'Quote', 6, 22, 'black', 'full', [Z('quotes')], { tid: 'quote' })];
  }
  const SECTIONS = [['everyday', { en: 'Everyday', sv: 'Vardag' }], ['travel', { en: 'Travel', sv: 'Resor' }], ['work', { en: 'Home and work', sv: 'Hemma och jobb' }]];
  function templates(P, lang) {
    const sv = lang === 'sv', T = (id, sec, name, desc, boards) => ({ id, sec, name, desc, boards });
    return [
      T('demo', 'everyday', 'Demo', sv ? `Lite av allt, byggd för ${P.city}.` : `A little of everything, built for ${P.city}.`, demo(P, lang)),
      T('weather', 'everyday', sv ? 'Väder' : 'Weather', sv ? `Vädret nu och när regnet kommer. Byggd för ${P.city}.` : `The weather now, and when the rain comes. Built for ${P.city}.`, [B(sv ? 'Väder' : 'Weather', 6, 22, 'black', 'stacked', [Z('wx', { city: P.city }), Z('message', { lines: [sv ? `REGN KL ${P.rain}` : `RAIN AT ${P.rain}`] })])]),
      T('welcome', 'everyday', sv ? 'Välkommen' : 'Welcome', sv ? 'Ett meddelande att skriva om.' : 'A message to write over.', [B(sv ? 'Välkommen' : 'Welcome', 6, 22, 'black', 'full', [Z('message', { lines: ['', 'HELLO', '', 'roygbv'] })])]),
      T('bigclock', 'everyday', sv ? 'Stor klocka' : 'Big clock', sv ? 'Tiden över hela tavlan.' : 'The time across the whole board.', [B(sv ? 'Stor klocka' : 'Big clock', 6, 22, 'black', 'full', [Z('bigclock')])]),
      T('departures', 'travel', sv ? 'Avgångar' : 'Departures', sv ? `Nästa bussar och tåg från dina hållplatser. Byggd för ${P.city}.` : `The next buses and trains from your stops. Built for ${P.city}.`, [B(sv ? 'Avgångar' : 'Departures', 12, 40, 'solari', 'full', [Z('dep', { stop: P.stops[0] })])]),
      T('commute', 'travel', sv ? 'Morgonpendling' : 'Morning commute', sv ? 'Avgångar och väder som turas om.' : 'Departures and the weather, taking turns.', [B(sv ? 'Pendling' : 'Commute', 6, 22, 'black', 'header', [Z('clock', { date: false }), Z('dep', { stop: P.stops[0] })]), B(sv ? 'Väder' : 'Weather', 6, 22, 'black', 'full', [Z('wx', { city: P.city })])]),
      T('cafe', 'work', sv ? 'Kafé' : 'Café', sv ? 'Dagens meny och fikadags.' : 'Today\u2019s menu, and fika time.', [B(sv ? 'Meny' : 'Menu', 3, 15, 'white', 'full', [Z('menu', { title: '', items: ['COFFEE 3', 'BUN 4', 'SOUP 8'] })]), B('Fika', 3, 15, 'white', 'full', [Z('bigtext', { text: 'FIKA', color: 'o' })])]),
      T('lobby', 'work', sv ? 'Kontorsentré' : 'Office lobby', sv ? 'Välkommen och tiden, i entrén.' : 'Welcome and the time, in reception.', [B(sv ? 'Välkommen' : 'Welcome', 6, 22, 'black', 'full', [Z('message', { lines: ['', 'WELCOME TO', 'THE STUDIO', '', 'WIFI: STUDIO'] })]), B(sv ? 'Klocka' : 'Clock', 6, 22, 'black', 'full', [Z('clock')])])
    ];
  }
  const E = (board, x) => Object.assign({ key: uid('e'), board, dur: 12, wins: [], alone: false }, x || {});
  function regular(P, lang) {
    const sv = lang === 'sv';
    const wx = B(sv ? 'Väder' : 'Weather', 6, 22, 'black', 'stacked', [Z('wx', { city: P.city }), Z('message', { lines: [sv ? `REGN KL ${P.rain}` : `RAIN AT ${P.rain}`] })], { hue: 250 });
    const dep = B(sv ? 'Avgångar' : 'Departures', 12, 40, 'solari', 'full', [Z('dep', { stop: P.stops[0] })], { hue: 35 });
    const wel = B(sv ? 'Välkommen' : 'Welcome', 6, 22, 'black', 'full', [Z('message', { lines: ['', 'HELLO', '', 'roygbv'] })], { hue: 145 });
    const clk = B(sv ? 'Stor klocka' : 'Big clock', 6, 22, 'black', 'full', [Z('bigclock')], { hue: 300 });
    const party = B(sv ? 'Fest' : 'Party', 6, 22, 'black', 'full', [Z('bigtext', { text: 'PARTY', color: 'v' })], { hue: 0 });
    const boards = [wx, dep, wel, clk, party];
    const morning = { id: 'morning', name: sv ? 'Morgon' : 'Morning', entries: [E(wx.id), E(dep.id, { dur: 20, wins: [{ from: '06:00', to: '09:00', days: [1, 2, 3, 4, 5] }] }), E(wel.id)] };
    const office = { id: 'office', name: sv ? 'Kontoret' : 'Office', entries: [E(wx.id), E(clk.id)] };
    return { boards, playlists: [morning, office], showing: { kind: 'playlist', id: 'morning' } };
  }
  function many(P, lang) {
    const r = regular(P, lang), names = ['Menu', 'Specials', 'Opening hours', 'Quiz night', 'Happy hour', 'Wifi', 'Football', 'Birthday', 'Anniversary', 'Countdown', 'Big clock 2', 'Weather days', 'Weather hours', 'Tram times', 'Bus times', 'Welcome back', 'Closed', 'Back soon', 'Kitchen', 'Bar', 'Terrace', 'Upstairs', 'Downstairs', 'Lobby', 'Studio', 'Office', 'Gym', 'Pool', 'Garden', 'Garage', 'Hallway', 'Kitchen 2', 'Study', 'Music', 'Guests'];
    const shapes = [[6, 22], [3, 15], [6, 22], [12, 40], [8, 32]], themes = ['black', 'white', 'black', 'solari'];
    names.forEach((nm, i) => { const [a, b] = shapes[i % 5]; r.boards.push(B(nm, a, b, themes[i % 4], 'full', [Z('message', { lines: [nm.toUpperCase()] })], { hue: SF07Hue(i) })); });
    ['Weekend', 'Pub', 'Café', 'Party'].forEach((nm, i) => r.playlists.push({ id: uid('pl'), name: nm, entries: r.boards.slice(6 + i * 4, 9 + i * 4).map(b => E(b.id)) }));
    return r;
  }
  function SF07Hue(i) { return [250, 190, 145, 35, 300, 0, 85, 110][i % 8]; }
  function asPages(pl, lib) { return pl.entries.map((e, i) => { const b = lib.find(x => x.id === e.board); return { id: e.key, name: b ? b.name : '', hue: b ? b.hue : 250, wins: e.wins, alone: e.alone, board: e.board, idx: i }; }); }
  function qr(cv, text) {
    const N = 29, ctx = cv.getContext('2d'), s = Math.floor(Math.min(cv.width, cv.height) / (N + 8)); if (s < 1) return;
    const off = Math.floor((cv.width - s * N) / 2); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.fillStyle = '#000';
    let h = 2166136261; for (const ch of text) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000; };
    const fin = (x, y) => (x >= 0 && x < 7 && y >= 0 && y < 7) ? ((x === 0 || x === 6 || y === 0 || y === 6) || (x >= 2 && x <= 4 && y >= 2 && y <= 4)) : null;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let v = fin(x, y); if (v === null) v = fin(x - (N - 7), y); if (v === null) v = fin(x, y - (N - 7));
      const inF = (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8);
      if (v === null) v = inF ? false : (x === 6 || y === 6) ? (x + y) % 2 === 0 : rnd() > 0.52;
      if (v) ctx.fillRect(off + x * s, off + y * s, s, s);
    }
  }
  const EN = {
    tabs: ['Showing', 'Boards', 'Explore', 'Account'], done: 'Done', more: 'More', cancel: 'Cancel', back: 'Back',
    cueDemo: 'This is a demo. Press Edit to make it yours.', edit: 'Edit', fullscreen: 'Fullscreen', sound: 'Sound', on: 'On', off: 'Off', signIn: 'Sign in',
    showOn: 'Show on this screen', useThis: 'Use this', previewing: 'Previewing', notShowing: 'Not on the screen yet',
    whereTitle: 'Where is this screen?', whereBody: 'The demo is rebuilt for your city: its weather, stops and holidays.', wherePh: 'Type a city', notNow: 'Not now',
    built: (P, l) => `Built for ${P.city}, with ${P.stops[0]}, ${P.city} weather and ${P.hol.en}.`,
    typeOwn: 'Type your own message', typeOwnSub: 'Opens the Welcome board with the keyboard', browse: 'Browse templates', browseSub: 'Boards that are ready to use',
    demo: 'Demo', boardsInTurn: n => `${n} boards in turn`, oneBoard: 'Board', editOnNow: 'Edit the board on now', editIt: 'Edit it', change: 'Change', openPl: 'Open the playlist', holdNote: 'Edit holds the playlist on that board',
    another: 'Show another board in turn', anotherSub: 'They take turns on the screen', thisScreen: 'This screen', putOn: 'Put this on another screen', settings: 'Settings',
    fill: 'Fill screen', usesHome: c => `${c}, from Home`, ownPlace: 'Its own place',
    lastTitle: s => `Last time you showed ${s}`, lastBody: 'On another screen with this account. Show it here too?', showHere: 'Show it here',
    secPl: 'Playlists', secBoards: 'Boards', newBoard: 'New board', onNow: 'On now', sizeOf: (r, c) => `${r} × ${c}`, guestNote: 'Kept in this browser only. Sign in to keep them on every device.',
    emptyTitle: 'Nothing here yet', emptyBody: 'Everything you make or use is kept here, each board at its own size. Start with a template, or type a message.', typeMsg: 'Type a message',
    board: 'Board', playlist: 'Playlist', template: 'Template', inPl: list => `In ${list}`, notInPl: 'Not in a playlist',
    name: 'Name', layout: 'Layout', size: 'Size', changeTile: 'Change tile', type: 'Type', zonesHint: 'What each part of the board shows', done2: 'Close',
    mAdd: 'Add to a playlist', mDup: 'Duplicate', mShare: 'Share', mDel: 'Delete',
    order: 'In turn', seconds: 's', addBoard: 'Add a board', when: 'When', advanced: 'Advanced', whenBody: 'Give a board a time of day and days. Boards with no time take turns whenever no time is on.',
    anyTime: 'Any time', addTime: 'Add a time', alone: 'Show alone while this is on', today: 'Today\u2019s playlist', weekNote: 'The week view from 0.7 sits here unchanged.', clock: 'Clock, since no board may show', remove: 'Take out',
    pickFrom: ['Your boards', 'Templates'], pickHint: 'Tap one to see it on the screen.', addTo: s => `Add to ${s}`, makePl: 'Show both in turn', pickerTitle: 'Show another board in turn',
    exIntro: 'Boards that are ready. Open one and it is on the screen at once.', tplOf: (r, c) => `Template · ${r} × ${c}`, itsBoards: n => n === 1 ? 'Its board' : `Its ${n} boards`, or: 'Or', addToPl: 'Add to a playlist', copyNote: 'Using a template keeps a copy in your boards. Changing yours never changes the template.',
    you: 'You', guest: 'Guest', guestBody: 'Your boards are kept in this browser only.', synced: 'synced', home: 'Home', city: 'City', stops: 'Stops', currency: 'Currency', homeNote: 'New tiles and templates use these. Boards you already have stay as they are.',
    sources: 'Your sources', alpha: 'Alpha Vantage key', app: 'The app', language: 'Language', help: 'Help', log: 'Version log', leave: 'Leave', signOut: 'Sign out', delAcc: 'Delete account',
    wallTitle: 'Put this on another screen', wallLink: 'Wall link', copy: 'Copy', wallBody: 'Open it on the TV or wall screen. It shows what this screen shows, with no control bar and no sign-in prompt.', scan: 'Or scan it with the phone on that screen', signedWay: 'Signed in on that screen? Open the site, then Boards, pick what to show, and Show on this screen.',
    // status
    sNow: x => `Now showing ${x}`, sNowTurn: n => `Now showing ${n} boards in turn`, sBack: x => `Back to ${x}`, sSaved: 'Saved', sSavedAt: t => `Saved ${t}`, sHold: x => `Holding on ${x} while you edit`,
    sSavedBack: x => `Saved. Back to ${x}`, showItNow: 'Show it now', sSavedShowing: x => `Saved. Showing ${x}`, sAdded: x => `Added to ${x}`, sKept: 'It\u2019s in your boards.', sDeleted: (x, pl) => `Deleted ${x}.` + (pl ? ` Also taken out of ${pl}.` : ''), undo: 'Undo',
    sFail: 'Couldn\u2019t save. Try again', tryAgain: 'Try again', sCopied: 'Wall link copied', sTimeout: x => `Your preview of ${x} ended after 3 minutes untouched. Back to`, showAgain: 'Show it now', sDemoMine: 'Saved. The demo is now your playlist.', sHome: 'Saved. New tiles and templates use',
    sDup: x => `Made a copy of ${x}`, sOut: x => `Taken out of ${x}`, sOne: 'Showing 1 board',
    and: 'and', days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], to: 'to', everyDay: 'every day', weekdays: 'on weekdays',
    helpItems: [['Showing', 'What this screen shows, how to change it, and how to show more than one board in turn.'], ['Boards', 'Everything you make or use, each at its own size. A playlist points at your boards, so a change shows everywhere you use the board.'], ['Explore', 'Templates. Open one and it is on the screen. Use this keeps a copy in your boards.'], ['The gold bar', 'It means you are looking at something that is not on the screen yet. Its button makes it real. Leave, and the screen goes back.']]
  };
  const SV = Object.assign({}, EN, {
    tabs: ['Visas', 'Tavlor', 'Utforska', 'Konto'], done: 'Klar', more: 'Mer', cancel: 'Avbryt', back: 'Tillbaka',
    cueDemo: 'Det här är en demo. Tryck på Redigera för att göra den till din.', edit: 'Redigera', fullscreen: 'Helskärm', sound: 'Ljud', on: 'På', off: 'Av', signIn: 'Logga in',
    showOn: 'Visa på den här skärmen', useThis: 'Använd den här', previewing: 'Förhandsvisar', notShowing: 'Inte på skärmen än',
    whereTitle: 'Var står den här skärmen?', whereBody: 'Demon byggs om för din stad: dess väder, hållplatser och helgdagar.', wherePh: 'Skriv en stad', notNow: 'Inte nu',
    built: (P) => `Byggd för ${P.city}, med ${P.stops[0]}, vädret i ${P.city} och ${P.hol.sv}.`,
    typeOwn: 'Skriv ditt eget meddelande', typeOwnSub: 'Öppnar tavlan Välkommen med tangentbordet', browse: 'Bläddra bland mallar', browseSub: 'Tavlor som är klara att använda',
    demo: 'Demo', boardsInTurn: n => `${n} tavlor som turas om`, oneBoard: 'Tavla', editOnNow: 'Redigera tavlan som visas', editIt: 'Redigera', change: 'Byt', openPl: 'Öppna spellistan', holdNote: 'Redigering håller kvar spellistan på den tavlan',
    another: 'Visa en till tavla i tur', anotherSub: 'De turas om på skärmen', thisScreen: 'Den här skärmen', putOn: 'Visa på en annan skärm', settings: 'Inställningar',
    fill: 'Fyll skärmen', usesHome: c => `${c}, från Hem`, ownPlace: 'Egen plats',
    lastTitle: s => `Förra gången visade du ${s}`, lastBody: 'På en annan skärm med det här kontot. Visa den här också?', showHere: 'Visa den här',
    secPl: 'Spellistor', secBoards: 'Tavlor', newBoard: 'Ny tavla', onNow: 'Visas nu', guestNote: 'Sparas bara i den här webbläsaren. Logga in för att ha dem på alla enheter.',
    emptyTitle: 'Inget här än', emptyBody: 'Allt du gör eller använder sparas här, varje tavla i sin egen storlek. Börja med en mall, eller skriv ett meddelande.', typeMsg: 'Skriv ett meddelande',
    board: 'Tavla', playlist: 'Spellista', template: 'Mall', inPl: list => `I ${list}`, notInPl: 'Inte i någon spellista',
    name: 'Namn', layout: 'Layout', size: 'Storlek', changeTile: 'Byt ruta', type: 'Skriv', zonesHint: 'Vad varje del av tavlan visar', done2: 'Stäng',
    mAdd: 'Lägg till i en spellista', mDup: 'Duplicera', mShare: 'Dela', mDel: 'Ta bort',
    order: 'I tur', addBoard: 'Lägg till en tavla', when: 'När', advanced: 'Avancerat', whenBody: 'Ge en tavla en tid på dagen och dagar. Tavlor utan tid turas om när ingen tid gäller.',
    anyTime: 'När som helst', addTime: 'Lägg till en tid', alone: 'Visa ensam medan den här gäller', today: 'Dagens spellista', weekNote: 'Veckovyn från 0.7 ligger här oförändrad.', clock: 'Klocka, eftersom ingen tavla får visas', remove: 'Ta ut',
    pickFrom: ['Dina tavlor', 'Mallar'], pickHint: 'Tryck på en för att se den på skärmen.', addTo: s => `Lägg till i ${s}`, makePl: 'Visa båda i tur', pickerTitle: 'Visa en till tavla i tur',
    exIntro: 'Tavlor som är klara. Öppna en så är den på skärmen direkt.', tplOf: (r, c) => `Mall · ${r} × ${c}`, itsBoards: n => n === 1 ? 'Dess tavla' : `Dess ${n} tavlor`, or: 'Eller', addToPl: 'Lägg till i en spellista', copyNote: 'När du använder en mall sparas en kopia bland dina tavlor. Ändrar du din ändras aldrig mallen.',
    you: 'Du', guest: 'Gäst', guestBody: 'Dina tavlor sparas bara i den här webbläsaren.', synced: 'synkad', home: 'Hem', city: 'Stad', stops: 'Hållplatser', currency: 'Valuta', homeNote: 'Nya rutor och mallar använder de här. Tavlor du redan har förblir som de är.',
    sources: 'Dina källor', alpha: 'Alpha Vantage-nyckel', app: 'Appen', language: 'Språk', help: 'Hjälp', log: 'Versionslogg', leave: 'Lämna', signOut: 'Logga ut', delAcc: 'Ta bort konto',
    wallTitle: 'Visa på en annan skärm', wallLink: 'Väggländ', copy: 'Kopiera', wallBody: 'Öppna den på tv:n eller väggskärmen. Den visar det den här skärmen visar, utan kontrollrad och utan inloggning.', scan: 'Eller skanna den med telefonen vid den skärmen', signedWay: 'Inloggad på den skärmen? Öppna sidan, sedan Tavlor, välj vad som ska visas och Visa på den här skärmen.',
    sNow: x => `Visar nu ${x}`, sNowTurn: n => `Visar nu ${n} tavlor i tur`, sBack: x => `Tillbaka till ${x}`, sSaved: 'Sparad', sSavedAt: t => `Sparad ${t}`, sHold: x => `Håller kvar ${x} medan du redigerar`,
    sSavedBack: x => `Sparad. Tillbaka till ${x}`, showItNow: 'Visa den nu', sSavedShowing: x => `Sparad. Visar ${x}`, sAdded: x => `Tillagd i ${x}`, sKept: 'Den finns bland dina tavlor.', sDeleted: (x, pl) => `Tog bort ${x}.` + (pl ? ` Togs också ut ur ${pl}.` : ''), undo: 'Ångra',
    sFail: 'Kunde inte spara. Försök igen', tryAgain: 'Försök igen', sCopied: 'Väggländen kopierad', sTimeout: x => `Förhandsvisningen av ${x} slutade efter 3 minuter utan att någon rörde den. Tillbaka till`, showAgain: 'Visa den nu', sDemoMine: 'Sparad. Demon är nu din spellista.', sHome: 'Sparad. Nya rutor och mallar använder',
    sDup: x => `Gjorde en kopia av ${x}`, sOut: x => `Togs ut ur ${x}`, sOne: 'Visar 1 tavla',
    and: 'och', days: ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'], to: 'till', everyDay: 'varje dag', weekdays: 'på vardagar',
    helpItems: [['Visas', 'Vad den här skärmen visar, hur du byter och hur du visar flera tavlor i tur.'], ['Tavlor', 'Allt du gör eller använder, var och en i sin egen storlek. En spellista pekar på dina tavlor, så en ändring syns överallt där tavlan används.'], ['Utforska', 'Mallar. Öppna en så är den på skärmen. Använd den här sparar en kopia bland dina tavlor.'], ['Den gyllene raden', 'Den betyder att du tittar på något som inte är på skärmen än. Dess knapp gör det på riktigt. Går du därifrån går skärmen tillbaka.']]
  });
  SV.wallLink = 'Vägglänk'; SV.sCopied = 'Vägglänken kopierad';
  EN.built = P => `Built for ${P.city}, with ${P.stops[0]}, ${P.city} weather and ${P.hol.en}.`;
  function fmtWin(w, t) { const d = (w.days || []).slice().sort().join(); const days = !d || d === '0,1,2,3,4,5,6' ? t.everyDay : d === '1,2,3,4,5' ? t.weekdays : (w.days || []).map(x => t.days[x]).join(', '); return `${w.from} ${t.to} ${w.to} ${days}`; }
  window.SF10 = { uid, PLACES, SECTIONS, templates, demo, regular, many, compose, Z, B, E, asPages, qr, fmtWin, STR: { en: EN, sv: SV } };
})();
