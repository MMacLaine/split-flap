// Ready-made boards. Each template is a function of the language, the SL home station
// (if the visitor starred one on the maclaine.se SL map) and, since 0.8, the Place: the
// city the screen is in, with its country and time zone. A template built for a place
// shows that place's weather, its nearest departures, its holidays, its currency and its
// clock format. Without a place it is the Stockholm board it always was.
//
// Each template also says where it works and what it needs, so Explore can group them,
// and hide the ones that cannot work here or whose source is switched off:
//   group   Explore's section
//   works   'anywhere', or a list of country codes
//   needs   the tiles it uses that depend on an outside source

import { newId } from './content.js';
import { formatsFor, priceMark } from './place.js';

const page = (name, layout, dur, zones, win = null) => ({ id: newId('p'), name, layout, dur, wins: win ? [win] : [], zones });
const z = (ch, o = {}) => ({ ch, o });
const base = (name, extra) => Object.assign({
  id: newId('b'), name, size: '6x22', rows: 6, cols: 22, theme: 'black', transition: 'classic', speed: 'fast',
  sound: false, soundStyle: 'clack', volume: 70, quiet: { on: false, from: '23:00', to: '07:00', mode: 'dim' }, pages: []
}, extra);

const STHLM = { city: 'Stockholm', lat: 59.33, lon: 18.07 };
// Greater Stockholm, where SL's own departures (with deviations and the SL map's home
// station) are better than the general source.
const inStockholm = p => p.cc === 'SE' && p.lat > 58.9 && p.lat < 60.3 && p.lon > 17.2 && p.lon < 19.4;

// What every template reads from the place, worked out once.
function ctx({ sv, home, place }) {
  const P = place && place.lat != null ? place : null, f = formatsFor(P), sl = !P || inStockholm(P);
  return {
    sv, P, fmt: f.fmt,
    loc: P ? { loc: Object.assign({ city: P.city, lat: P.lat, lon: P.lon }, P.cc ? { cc: P.cc } : {}, P.tz ? { tz: P.tz } : {}) } : {},
    // weather follows the board's place when there is one
    wx: view => z('weather', P ? { view, ...(f.units === 'f' ? { units: 'f' } : {}) } : { ...STHLM, view }),
    // departures: SL in Stockholm (or with no place), the nearest stop anywhere else
    deps: (site, name, extra = {}) => sl
      ? (home ? z('sl', { home: true, eta: 'min', ...extra }) : z('sl', { sites: [site], name, eta: 'min', ...extra }))
      : z('departures', { near: extra.view === 'board' ? 'rail' : true, eta: extra.eta || 'min', fmt: f.fmt, ...(extra.view ? { view: extra.view, modes: ['TRAIN'] } : {}), ...(extra.modes ? { modes: extra.modes } : {}) }),
    clock: extra => z('clock', { fmt: f.fmt, ...extra }),
    // midsummer in Sweden, the next public holiday anywhere else
    countdown: () => !P || P.cc === 'SE' ? z('countdown', { label: 'MIDSOMMAR', date: '2027-06-25' }) : z('countdown', { to: 'holiday' }),
    cur: f.currency, city: P ? P.city : 'Stockholm', tz: P && P.tz
  };
}
// Three cities for a lobby's world clock, the place's own first.
function cities(c) {
  const list = [{ city: 'London', tz: 'Europe/London' }, { city: 'New York', tz: 'America/New_York' }, { city: 'Tokyo', tz: 'Asia/Tokyo' }, { city: 'Stockholm', tz: 'Europe/Stockholm' }];
  const own = c.P && c.tz ? [{ city: c.city, tz: c.tz }] : [{ city: 'Stockholm', tz: 'Europe/Stockholm' }];
  return own.concat(list.filter(x => x.tz !== own[0].tz)).slice(0, 3);
}
// A menu priced in the place's currency: kronor as before, anywhere else round numbers
// in the local style, marked the way the flaps can print it.
function menu(c, sv, kind) {
  const m = priceMark(c.cur || 'SEK'), krona = !c.cur || c.cur === 'SEK' || c.cur === 'NOK' || c.cur === 'DKK';
  if (kind === 'cafe') {
    const items = krona ? ['KAFFE 30', 'KANELBULLE 35', 'SMÖRGÅS 65', 'SOPPA 95', sv ? 'DAGENS KAKA 45' : 'CAKE 45']
      : ['COFFEE 3.50', 'CROISSANT 2.80', 'SANDWICH 6.50', 'SOUP 7', 'CAKE 4.50'];
    return { title: sv ? 'IDAG' : 'TODAY', items, suffix: krona ? ' KR' : m.suffix, ...(m.prefix ? { prefix: m.prefix } : {}) };
  }
  const items = krona ? [sv ? 'STORA SALEN 900' : 'THE HALL 900', sv ? 'BIBLIOTEKET 450' : 'THE LIBRARY 450', sv ? 'TELEFONRUM 150' : 'PHONE ROOM 150'] : ['THE HALL 90', 'THE LIBRARY 45', 'PHONE ROOM 15'];
  return { title: sv ? 'RUM PER TIMME' : 'ROOMS PER HOUR', items, suffix: krona ? ' KR' : m.suffix, ...(m.prefix ? { prefix: m.prefix } : {}) };
}

export const GROUPS = [
  ['start', { en: 'To start with', sv: 'Att börja med' }], ['home', { en: 'Home', sv: 'Hemma' }], ['commute', { en: 'Commute', sv: 'Pendling' }],
  ['office', { en: 'Office and lobby', sv: 'Kontor och entré' }], ['shop', { en: 'Café and shop', sv: 'Kafé och butik' }],
  ['money', { en: 'Money', sv: 'Pengar' }], ['fun', { en: 'Maker and fun', sv: 'Skapa och leka' }]
];

export const TEMPLATES = [
  {
    id: 'demo', group: 'start', works: 'anywhere', needs: ['departures', 'weather'],
    name: { en: 'Demo', sv: 'Demo' },
    desc: { en: 'A tour of everything: messages, big clock, departures, weather and colour.', sv: 'En rundtur: meddelanden, stor klocka, avgångar, väder och färg.' },
    make: a => { const c = ctx(a), sv = a.sv; return base('Demo', { ...c.loc, pages: [
      page(sv ? 'Välkommen' : 'Welcome', 'full', 10, [z('message', { lines: ['', sv ? 'HEJ FRÅN' : 'HELLO FROM', sv ? 'EN LEDIG SKÄRM' : 'A SPARE MONITOR', '', 'roygbv', ''] })]),
      page(sv ? 'Stor klocka' : 'Big clock', 'full', 10, [z('bigclock', { fmt: c.fmt, color: 'f' })]),
      page(sv ? 'Avgångar' : 'Departures', 'header', 14, [c.clock(), c.deps(9117, 'Odenplan', { modes: c.P && !inStockholm(c.P) ? null : ['METRO', 'TRAIN'] })]),
      page(sv ? 'Väder' : 'Weather', 'full', 12, [c.wx('now')]),
      page(sv ? 'Regnbåge' : 'Rainbow', 'full', 9, [z('art', { pattern: 'rainbow', step: 3 })]),
      page(sv ? 'Dagens ord' : 'Quote of the hour', 'ticker', 14, [z('quote'), z('message', { text: sv ? 'GRATIS, INGET KONTO BEHÖVS.' : 'FREE, NO ACCOUNT NEEDED.' })])
    ] }); }
  },
  {
    id: 'blank', group: 'start', works: 'anywhere', needs: [],
    name: { en: 'Blank', sv: 'Tom' },
    desc: { en: 'One empty board to type on.', sv: 'En tom tavla att skriva på.' },
    make: a => { const c = ctx(a), sv = a.sv; return base(sv ? 'Ny storyboard' : 'New storyboard', { ...c.loc, pages: [page(sv ? 'Tavla 1' : 'Board 1', 'full', 10, [z('message', { lines: ['', '', sv ? 'SKRIV HÄR' : 'TYPE HERE'] })])] }); }
  },
  {
    id: 'home', group: 'home', works: 'anywhere', needs: ['departures', 'weather'],
    name: { en: 'Home dashboard', sv: 'Hemmapanel' },
    desc: { en: 'Clock, weather and your nearest departures, for the hallway.', sv: 'Klocka, väder och dina närmaste avgångar, för hallen.' },
    make: a => { const c = ctx(a), sv = a.sv; return base(sv ? 'Hemma' : 'Home', { ...c.loc, quiet: { on: true, from: '23:00', to: '06:30', mode: 'dim' }, pages: [
      page(sv ? 'Väder' : 'Weather', 'header', 15, [c.clock(), c.wx('now')]),
      page(sv ? 'Avgångar' : 'Departures', 'header', 20, [c.clock(), c.deps(9117, 'Odenplan')]),
      page(sv ? 'Timmar' : 'Next hours', 'full', 12, [c.wx('hours')]),
      page(!c.P || c.P.cc === 'SE' ? (sv ? 'Midsommar' : 'Midsummer') : (sv ? 'Nästa helgdag' : 'Next holiday'), 'full', 8, [c.countdown()])
    ] }); }
  },
  {
    id: 'morning', group: 'home', works: 'anywhere', needs: ['departures', 'weather', 'holidays'],
    name: { en: 'Morning', sv: 'Morgon' },
    desc: { en: 'Your trains or buses on weekday mornings, then the weather, the day and whether it will rain.', sv: 'Dina tåg eller bussar på vardagsmorgnar, sedan vädret, dagen och om det blir regn.' },
    make: a => { const c = ctx(a), sv = a.sv; return base(sv ? 'Morgon' : 'Morning', { ...c.loc, quiet: { on: true, from: '23:00', to: '06:00', mode: 'dim' }, pages: [
      Object.assign(page(sv ? 'Avgångar' : 'Departures', 'header', 30, [c.clock(), c.deps(9117, 'Odenplan', { eta: 'cycle' })], { from: '06:30', to: '09:00', days: [1, 2, 3, 4, 5] }), { alone: true }),
      page(sv ? 'Väder' : 'Weather', 'full', 15, [c.wx('now')]),
      page(sv ? 'Idag' : 'Today', 'full', 10, [z('today', {})]),
      page(sv ? 'Timmar' : 'Next hours', 'full', 12, [c.wx('hours')])
    ] }); }
  },
  {
    id: 'weather', group: 'home', works: 'anywhere', needs: ['weather'],
    name: { en: 'Weather station', sv: 'Väderstation' },
    desc: { en: 'Now, the next hours and three days ahead, on a white board.', sv: 'Nu, kommande timmar och tre dagar framåt, på en vit tavla.' },
    make: a => { const c = ctx(a), sv = a.sv; return base(sv ? 'Väder' : 'Weather', { ...c.loc, theme: 'white', soundStyle: 'soft', pages: [
      page(sv ? 'Nu' : 'Now', 'full', 12, [c.wx('now')]),
      page(sv ? 'Timmar' : 'Hours', 'full', 12, [c.wx('hours')]),
      page(sv ? 'Dagar' : 'Days', 'full', 12, [c.wx('days')])
    ] }); }
  },
  {
    id: 'station', group: 'commute', works: 'anywhere', needs: ['departures', 'weather'],
    name: { en: 'Station board', sv: 'Stationstavla' },
    desc: { en: 'A big amber departure board for your nearest station, with platforms and a heavy flap sound.', sv: 'En stor bärnstensgul avgångstavla för din närmaste station, med spår och tungt fällbladsljud.' },
    make: a => { const c = ctx(a), sv = a.sv; return base(sv ? 'Avgångar' : 'Departures', { ...c.loc, theme: 'solari', size: 'custom', rows: 10, cols: 32, speed: 'gentle', soundStyle: 'heavy', pages: [
      page(sv ? 'Avgångar' : 'Departures', 'header', 60, [c.clock(), c.deps(9001, 'T-Centralen', { eta: 'clock', view: 'board' })]),
      page(sv ? 'Väder' : 'Weather', 'header', 12, [c.clock(), c.wx('days')])
    ] }); }
  },
  {
    id: 'lobby', group: 'office', works: 'anywhere', needs: [],
    name: { en: 'Office lobby', sv: 'Kontorsentré' },
    desc: { en: 'A welcome that takes turns with notices, the time in three cities, and room prices.', sv: 'Ett välkommen som turas om med meddelanden, tiden i tre städer och rumspriser.' },
    make: a => { const c = ctx(a), sv = a.sv; return base(sv ? 'Entré' : 'Lobby', { ...c.loc, quiet: { on: true, from: '20:00', to: '07:00', mode: 'dim' }, pages: [
      page(sv ? 'Välkommen' : 'Welcome', 'header', 20, [c.clock({ date: false }), z('rotating', { messages: sv ? ['VÄLKOMMEN TILL ATELJÉN', 'GÄSTNÄT: ATELJE', 'MÖTEN PÅ PLAN 3'] : ['WELCOME TO THE STUDIO', 'GUEST WIFI: STUDIO', 'MEETINGS ON FLOOR 3'], interval: 6 })]),
      page(sv ? 'Världen' : 'World', 'full', 12, [z('worldtime', { places: cities(c), fmt: c.fmt })]),
      page(sv ? 'Rum' : 'Rooms', 'full', 15, [z('menu', menu(c, sv, 'rooms'))]),
      page(sv ? 'Idag' : 'Today', 'full', 10, [z('today', {})])
    ] }); }
  },
  {
    id: 'world', group: 'office', works: 'anywhere', needs: [],
    name: { en: 'World clock wall', sv: 'Världsklocka' },
    desc: { en: 'The time where your team or family is, in a row of cities, for a wide screen.', sv: 'Tiden där ditt team eller din familj är, i en rad städer, för en bred skärm.' },
    make: a => { const c = ctx(a), sv = a.sv; return base(sv ? 'Världsklocka' : 'World clock', { ...c.loc, size: 'custom', rows: 6, cols: 26, speed: 'gentle', pages: [
      page(sv ? 'Städer' : 'Cities', 'full', 3600, [z('worldtime', { places: cities(c).concat([{ city: 'Sydney', tz: 'Australia/Sydney' }, { city: 'San Francisco', tz: 'America/Los_Angeles' }]).filter((x, i, l) => l.findIndex(y => y.tz === x.tz) === i).slice(0, 5), fmt: c.fmt })])
    ] }); }
  },
  {
    id: 'cafe', group: 'shop', works: 'anywhere', needs: [],
    name: { en: 'Café', sv: 'Kafé' },
    desc: { en: 'Today’s menu with prices in your currency, and a coffee call, on a white board.', sv: 'Dagens meny med priser i din valuta, och ett fikarop, på en vit tavla.' },
    make: a => { const c = ctx(a), sv = a.sv, fika = !c.P || c.P.cc === 'SE'; return base(sv ? 'Kafé' : 'Café', { ...c.loc, theme: 'white', soundStyle: 'soft', pages: [
      page(sv ? 'Meny' : 'Menu', 'full', 20, [z('menu', menu(c, sv, 'cafe'))]),
      page(fika ? 'Fika' : (sv ? 'Kaffe' : 'Coffee'), 'full', 8, [z('bigtext', { text: fika ? 'FIKA' : (sv ? 'KAFFE' : 'COFFEE'), color: 'o' })]),
      page(sv ? 'Öppet' : 'Opening hours', 'full', 12, [z('message', { lines: ['', sv ? 'ÖPPET' : 'OPEN', '', sv ? 'VARDAGAR 7 TILL 18' : 'WEEKDAYS 7 TO 18', sv ? 'HELGER 9 TILL 16' : 'WEEKENDS 9 TO 16', 'oooooo'] })])
    ] }); }
  },
  {
    id: 'money', group: 'money', works: 'anywhere', needs: ['fx'],
    name: { en: 'Currency board', sv: 'Valutatavla' },
    desc: { en: 'Exchange rates in your currency, and bitcoin and ether with a green or red flap for their day.', sv: 'Växelkurser i din valuta, och bitcoin och ether med en grön eller röd flapp för dygnet.' },
    make: a => { const c = ctx(a), sv = a.sv, cur = c.cur && ['EUR', 'USD', 'GBP', 'SEK', 'NOK', 'DKK', 'CHF', 'JPY', 'PLN', 'CZK', 'AUD', 'CAD'].includes(c.cur) ? c.cur : 'SEK';
      const pairs = ['EUR', 'USD', 'GBP', 'JPY', 'SEK'].filter(p => p !== cur).slice(0, 4);
      return base(sv ? 'Valuta' : 'Currency', { ...c.loc, pages: [
        page(sv ? 'Valutor' : 'Currencies', 'header', 15, [c.clock(), z('currency', { base: cur, pairs, dec: 2 })]),
        page(sv ? 'Krypto' : 'Crypto', 'header', 12, [c.clock(), z('currency', { base: cur, pairs: ['BTC', 'ETH'], dec: 0 })])
      ] }); }
  },
  {
    id: 'colour', group: 'fun', works: 'anywhere', needs: [],
    name: { en: 'Colour mosaic', sv: 'Färgmosaik' },
    desc: { en: 'No words at all: flags, rain, waves and confetti, flap by flap.', sv: 'Inga ord alls: flaggor, regn, vågor och konfetti, blad för blad.' },
    make: a => { const sv = a.sv; return base(sv ? 'Mosaik' : 'Mosaic', { transition: 'wave', pages: [
      page(sv ? 'Nordiska flaggor' : 'Nordic flags', 'full', 25, [z('art', { pattern: 'nordic', step: 5 })]),
      page(sv ? 'Regn' : 'Rain', 'full', 16, [z('art', { pattern: 'rain', step: 2 })]),
      page(sv ? 'Våg' : 'Wave', 'full', 14, [z('art', { pattern: 'wave', step: 2 })]),
      page('Konfetti', 'full', 12, [z('art', { pattern: 'confetti', step: 3 })]),
      page(sv ? 'Regnbåge' : 'Rainbow', 'full', 12, [z('art', { pattern: 'rainbow', step: 2 })])
    ] }); }
  },
  {
    id: 'letters', group: 'fun', works: 'anywhere', needs: [],
    name: { en: 'Letter clock', sv: 'Bokstavsklocka' },
    desc: { en: 'The time lit up in a grid of letters, with a dot in a corner for each minute in between.', sv: 'Tiden tänd i ett rutnät av bokstäver, med en prick i ett hörn för varje minut däremellan.' },
    make: a => { const sv = a.sv; return base(sv ? 'Bokstavsklocka' : 'Letter clock', { size: 'custom', rows: 11, cols: 15, speed: 'gentle', transition: 'drift', soundStyle: 'soft',
      quiet: { on: true, from: '23:00', to: '06:30', mode: 'dim' }, pages: [page(sv ? 'Klocka' : 'Clock', 'full', 3600, [z('letterclock')])] }); }
  },
  {
    id: 'showcase', group: 'fun', works: 'anywhere', needs: [],
    name: { en: 'Everything at once', sv: 'Allt på en gång' },
    desc: { en: 'The extreme one: fills the screen, rolls every flap the long way round, and never sits still.', sv: 'Den extrema: fyller skärmen, rullar varje blad hela varvet och står aldrig still.' },
    make: a => { const sv = a.sv; return base(sv ? 'Allt på en gång' : 'Everything at once', { size: 'fill', speed: 'authentic', transition: 'curtain', soundStyle: 'heavy', pages: [
      page('HEJ', 'full', 9, [z('bigtext', { text: 'HEJ!', color: 'rainbow' })]),
      page('Konfetti', 'full', 10, [z('art', { pattern: 'confetti', step: 3 })]),
      page(sv ? 'Klocka' : 'Clock', 'full', 10, [z('bigclock', { fmt: '24', color: 'rainbow' })]),
      page(sv ? 'Flaggor' : 'Flags', 'full', 15, [z('art', { pattern: 'nordic', step: 3 })]),
      page(sv ? 'Budskap' : 'Message', 'full', 12, [z('message', { lines: ['rrooyyggbbvvrrooyyggbbvv', '', sv ? 'GRATIS' : 'FREE', sv ? 'INGET KONTO' : 'NO ACCOUNT', sv ? 'BEHÖVS' : 'NEEDED', '', 'vvbbggyyoorrvvbbggyyoorr'] })]),
      page(sv ? 'Våg' : 'Wave', 'full', 10, [z('art', { pattern: 'wave', step: 2 })]),
      page(sv ? 'Hjärta' : 'Heart', 'full', 8, [z('bigtext', { text: '*', color: 'r' })])
    ] }); }
  }
];

// A template for a place: works says the countries it has data for, and needs the
// sources it reads, so one switched off hides only the templates that depend on it.
export const availableFor = (tp, place, off = []) => (tp.works === 'anywhere' || !place || !place.cc || tp.works.includes(place.cc)) && !tp.needs.some(n => off.includes(n === 'departures' ? 'transit' : n));

export function fromTemplate(id, lang, home, place) {
  const t = TEMPLATES.find(x => x.id === id) || TEMPLATES[0];
  return Object.assign(t.make({ sv: lang === 'sv', home: !!(home && home.sites && home.sites.length), place: place || null }), { from: t.id });
}
export const TEMPLATE_IDS = TEMPLATES.map(t => t.id);
