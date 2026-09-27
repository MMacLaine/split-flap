// Ready-made boards. Each template is a function of the language and the SL home
// station (if the visitor starred one on the maclaine.se SL map), returning a board.
// SL pages follow that home station when there is one, and fall back to a central
// station otherwise.

import { newId } from './content.js';

const page = (name, layout, dur, zones, win = null) => ({ id: newId('p'), name, layout, dur, win, zones });
const z = (ch, o = {}) => ({ ch, o });
const base = (name, extra) => Object.assign({
  id: newId('b'), name, size: '6x22', rows: 6, cols: 22, theme: 'black', transition: 'classic', speed: 'fast',
  sound: false, soundStyle: 'clack', volume: 70, quiet: { on: false, from: '23:00', to: '07:00', mode: 'dim' }, pages: []
}, extra);

const sl = (home, site, name, extra) => home ? z('sl', { home: true, eta: 'min', ...extra }) : z('sl', { sites: [site], name, eta: 'min', ...extra });
const STHLM = { city: 'Stockholm', lat: 59.33, lon: 18.07 };

export const TEMPLATES = [
  {
    id: 'demo',
    name: { en: 'Demo', sv: 'Demo' },
    desc: { en: 'A tour of everything: messages, big clock, departures, weather and colour.', sv: 'En rundtur: meddelanden, stor klocka, avgångar, väder och färg.' },
    make: (sv, home) => base(sv ? 'Demotavla' : 'Demo board', { pages: [
      page(sv ? 'Välkommen' : 'Welcome', 'full', 10, [z('message', { lines: ['', sv ? 'HEJ FRÅN' : 'HELLO FROM', sv ? 'EN LEDIG SKÄRM' : 'A SPARE MONITOR', '', 'roygbv', ''] })]),
      page(sv ? 'Stor klocka' : 'Big clock', 'full', 10, [z('bigclock', { fmt: '24', color: 'f' })]),
      page(sv ? 'Avgångar' : 'Departures', 'header', 14, [z('clock', { fmt: '24' }), sl(home, 9117, 'Odenplan', { modes: ['METRO', 'TRAIN'] })]),
      page(sv ? 'Väder' : 'Weather', 'full', 12, [z('weather', { ...STHLM, view: 'now' })]),
      page(sv ? 'Regnbåge' : 'Rainbow', 'full', 9, [z('art', { pattern: 'rainbow', step: 3 })]),
      page(sv ? 'Dagens ord' : 'Quote of the hour', 'ticker', 14, [z('quote'), z('message', { text: sv ? 'GRATIS, INGET KONTO. ALLT STANNAR I DIN WEBBLÄSARE.' : 'FREE, NO ACCOUNT. EVERYTHING STAYS IN YOUR BROWSER.' })])
    ] })
  },
  {
    id: 'home',
    name: { en: 'Home dashboard', sv: 'Hemmapanel' },
    desc: { en: 'Clock, weather and your nearest departures, for the hallway.', sv: 'Klocka, väder och dina närmaste avgångar, för hallen.' },
    make: (sv, home) => base(sv ? 'Hemma' : 'Home', { quiet: { on: true, from: '23:00', to: '06:30', mode: 'dim' }, pages: [
      page(sv ? 'Väder' : 'Weather', 'header', 15, [z('clock', { fmt: '24' }), z('weather', { ...STHLM, view: 'now' })]),
      page(sv ? 'Avgångar' : 'Departures', 'header', 20, [z('clock', { fmt: '24' }), sl(home, 9117, 'Odenplan')]),
      page(sv ? 'Timmar' : 'Next hours', 'full', 12, [z('weather', { ...STHLM, view: 'hours' })]),
      page(sv ? 'Midsommar' : 'Midsummer', 'full', 8, [z('countdown', { label: 'MIDSOMMAR', date: '2027-06-25' })])
    ] })
  },
  {
    id: 'station',
    name: { en: 'Station board', sv: 'Stationstavla' },
    desc: { en: 'A big amber departure board with a heavy flap sound.', sv: 'En stor bärnstensgul avgångstavla med tungt fällbladsljud.' },
    make: (sv, home) => base(sv ? 'Avgångar' : 'Departures', { theme: 'solari', size: 'custom', rows: 10, cols: 32, speed: 'gentle', soundStyle: 'heavy', pages: [
      page(sv ? 'Avgångar' : 'Departures', 'header', 60, [z('clock', { fmt: '24' }), sl(home, 9001, 'T-Centralen', { eta: 'clock' })]),
      page(sv ? 'Väder' : 'Weather', 'header', 12, [z('clock', { fmt: '24' }), z('weather', { ...STHLM, view: 'days' })])
    ] })
  },
  {
    id: 'weather',
    name: { en: 'Weather station', sv: 'Väderstation' },
    desc: { en: 'Now, the next hours and three days ahead, on a white board.', sv: 'Nu, kommande timmar och tre dagar framåt, på en vit tavla.' },
    make: sv => base(sv ? 'Väder' : 'Weather', { theme: 'white', soundStyle: 'soft', pages: [
      page(sv ? 'Nu' : 'Now', 'full', 12, [z('weather', { ...STHLM, view: 'now' })]),
      page(sv ? 'Timmar' : 'Hours', 'full', 12, [z('weather', { ...STHLM, view: 'hours' })]),
      page(sv ? 'Dagar' : 'Days', 'full', 12, [z('weather', { ...STHLM, view: 'days' })])
    ] })
  },
  {
    id: 'colour',
    name: { en: 'Colour mosaic', sv: 'Färgmosaik' },
    desc: { en: 'No words at all: flags, rain, waves and confetti, flap by flap.', sv: 'Inga ord alls: flaggor, regn, vågor och konfetti, blad för blad.' },
    make: sv => base(sv ? 'Mosaik' : 'Mosaic', { transition: 'wave', pages: [
      page(sv ? 'Nordiska flaggor' : 'Nordic flags', 'full', 25, [z('art', { pattern: 'nordic', step: 5 })]),
      page(sv ? 'Regn' : 'Rain', 'full', 16, [z('art', { pattern: 'rain', step: 2 })]),
      page(sv ? 'Våg' : 'Wave', 'full', 14, [z('art', { pattern: 'wave', step: 2 })]),
      page('Konfetti', 'full', 12, [z('art', { pattern: 'confetti', step: 3 })]),
      page(sv ? 'Regnbåge' : 'Rainbow', 'full', 12, [z('art', { pattern: 'rainbow', step: 2 })])
    ] })
  },
  {
    id: 'showcase',
    name: { en: 'Everything at once', sv: 'Allt på en gång' },
    desc: { en: 'The extreme one: fills the screen, rolls every flap the long way round, and never sits still.', sv: 'Den extrema: fyller skärmen, rullar varje blad hela varvet och står aldrig still.' },
    make: sv => base(sv ? 'Allt på en gång' : 'Everything at once', { size: 'fill', speed: 'authentic', transition: 'curtain', soundStyle: 'heavy', pages: [
      page('HEJ', 'full', 9, [z('bigtext', { text: 'HEJ!', color: 'rainbow' })]),
      page('Konfetti', 'full', 10, [z('art', { pattern: 'confetti', step: 3 })]),
      page(sv ? 'Klocka' : 'Clock', 'full', 10, [z('bigclock', { fmt: '24', color: 'rainbow' })]),
      page(sv ? 'Flaggor' : 'Flags', 'full', 15, [z('art', { pattern: 'nordic', step: 3 })]),
      page(sv ? 'Budskap' : 'Message', 'full', 12, [z('message', { lines: ['rrooyyggbbvvrrooyyggbbvv', '', sv ? 'GRATIS' : 'FREE', sv ? 'INGET KONTO' : 'NO ACCOUNT', sv ? 'INGEN SERVER' : 'NO SERVER', '', 'vvbbggyyoorrvvbbggyyoorr'] })]),
      page(sv ? 'Våg' : 'Wave', 'full', 10, [z('art', { pattern: 'wave', step: 2 })]),
      page(sv ? 'Hjärta' : 'Heart', 'full', 8, [z('bigtext', { text: '*', color: 'r' })])
    ] })
  },
  {
    id: 'cafe',
    name: { en: 'Café', sv: 'Kafé' },
    desc: { en: 'Today’s menu with prices, and a fika call, on a white board.', sv: 'Dagens meny med priser, och ett fikarop, på en vit tavla.' },
    make: sv => base(sv ? 'Kafé' : 'Café', { theme: 'white', soundStyle: 'soft', pages: [
      page(sv ? 'Meny' : 'Menu', 'full', 20, [z('menu', { title: sv ? 'IDAG' : 'TODAY', items: ['KAFFE 30', 'KANELBULLE 35', 'SMÖRGÅS 65', 'SOPPA 95', sv ? 'DAGENS KAKA 45' : 'CAKE 45'], suffix: ' KR' })]),
      page('Fika', 'full', 8, [z('bigtext', { text: 'FIKA', color: 'o' })]),
      page(sv ? 'Öppet' : 'Opening hours', 'full', 12, [z('message', { lines: ['', sv ? 'ÖPPET' : 'OPEN', '', sv ? 'VARDAGAR 7 TILL 18' : 'WEEKDAYS 7 TO 18', sv ? 'HELGER 9 TILL 16' : 'WEEKENDS 9 TO 16', 'oooooo'] })])
    ] })
  },
  {
    id: 'lobby',
    name: { en: 'Office lobby', sv: 'Kontorsentré' },
    desc: { en: 'A welcome that takes turns with notices, the time and room prices.', sv: 'Ett välkommen som turas om med meddelanden, tiden och rumspriser.' },
    make: sv => base(sv ? 'Entré' : 'Lobby', { quiet: { on: true, from: '20:00', to: '07:00', mode: 'dim' }, pages: [
      page(sv ? 'Välkommen' : 'Welcome', 'header', 20, [z('clock', { fmt: '24', date: false }), z('rotating', { messages: sv ? ['VÄLKOMMEN TILL ATELJÉN', 'GÄSTNÄT: ATELJE', 'MÖTEN PÅ PLAN 3'] : ['WELCOME TO THE STUDIO', 'GUEST WIFI: STUDIO', 'MEETINGS ON FLOOR 3'], interval: 6 })]),
      page(sv ? 'Rum' : 'Rooms', 'full', 15, [z('menu', { title: sv ? 'RUM PER TIMME' : 'ROOMS PER HOUR', items: [sv ? 'STORA SALEN 900' : 'THE HALL 900', sv ? 'BIBLIOTEKET 450' : 'THE LIBRARY 450', sv ? 'TELEFONRUM 150' : 'PHONE ROOM 150'], suffix: ' KR' })]),
      page(sv ? 'Idag' : 'Today', 'full', 10, [z('today', {})])
    ] })
  },
  {
    id: 'blank',
    name: { en: 'Blank', sv: 'Tom' },
    desc: { en: 'One empty page to type on.', sv: 'En tom sida att skriva på.' },
    make: sv => base(sv ? 'Ny tavla' : 'New board', { pages: [page(sv ? 'Sida 1' : 'Page 1', 'full', 10, [z('message', { lines: ['', '', sv ? 'SKRIV HÄR' : 'TYPE HERE'] })])] })
  }
];

export function fromTemplate(id, lang, home) {
  const t = TEMPLATES.find(x => x.id === id) || TEMPLATES[0];
  return Object.assign(t.make(lang === 'sv', !!(home && home.sites && home.sites.length)), { from: t.id });
}
export const TEMPLATE_IDS = TEMPLATES.map(t => t.id);
