// What the content picker offers: one tile per kind of content, grouped, each with a
// name and a line of description in both languages, the options it starts with, and
// the option fields the editor shows for it. Adapted from the editor handoff
// (design/editor/editor-channels.js); the ids are the ones boards store, so Draw and
// Photo are message zones that open the composer in Paint or Photo mode.
//
// Field types: text, date, seg (one of), chips (several of), toggle, stepper, colour,
// palette, search, stations, textlist, template, note. `adv` puts a field behind
// "More options"; `show` hides it unless the zone's options pass the test.

import { PATTERNS } from './pixels.js';

const t2 = (en, sv) => ({ en, sv });
const SEG = (k, label, opts, extra) => Object.assign({ k, t: 'seg', label, opts }, extra);
const TOG = (k, label, extra) => Object.assign({ k, t: 'toggle', label }, extra);
const FMT = SEG('fmt', t2('Format', 'Format'), [['24', t2('24 h', '24 h')], ['12', t2('12 h', '12 h')]]);

export const GROUPS = [['words', t2('Words', 'Ord')], ['time', t2('Time', 'Tid')], ['live', t2('Live', 'Live')], ['pictures', t2('Pictures', 'Bilder')], ['later', t2('Later', 'Senare')]];

export const TILES = [
  { id: 'message', g: 'words', ch: 'message', mode: 'type', name: t2('Message', 'Meddelande'), desc: t2('Type anything, letter by letter', 'Skriv vad du vill, bokstav för bokstav'), def: {} },
  { id: 'rotating', g: 'words', ch: 'rotating', name: t2('Rotating messages', 'Växlande meddelanden'), desc: t2('A few messages that take turns', 'Några meddelanden som turas om'),
    def: { messages: ['GOOD MORNING', 'COFFEE IS ON', 'LUNCH AT 12'], interval: 8 },
    fields: [{ k: 'messages', t: 'textlist', label: t2('Messages', 'Meddelanden'), add: t2('Add a message', 'Lägg till meddelande'), max: 12, len: 120 },
      { k: 'interval', t: 'stepper', label: t2('Each message for', 'Varje meddelande i'), min: 3, max: 120, step: 1, unit: 's', dflt: 8, adv: 1 },
      SEG('order', t2('Order', 'Ordning'), [['seq', t2('In order', 'I ordning')], ['shuffle', t2('Shuffled', 'Blandat')]], { dflt: 'seq', adv: 1 })] },
  { id: 'bigtext', g: 'words', ch: 'bigtext', name: t2('Big text', 'Stor text'), desc: t2('A short word built from flaps', 'Ett kort ord byggt av flappar'), def: { text: 'HEJ', color: 'rainbow' },
    fields: [{ k: 'text', t: 'text', label: t2('Text', 'Text'), upper: 1, len: 80, hint: t2('Big letters are five flaps tall. A 6 × 22 board fits about five at a time, and longer text pages through word by word.', 'Stora bokstäver är fem flappar höga. En 6 × 22-tavla rymmer ungefär fem åt gången, och längre text bläddras ord för ord.') },
      { k: 'color', t: 'colour', label: t2('Colour', 'Färg'), rainbow: 1 }] },
  { id: 'quote', g: 'words', ch: 'quote', name: t2('Quotes', 'Citat'), desc: t2('A saying that changes every minute', 'Ett ordspråk som byts varje minut'), def: {},
    fields: [SEG('set', t2('Collection', 'Samling'), [['proverbs', t2('Proverbs', 'Ordspråk')], ['work', t2('About work', 'Om arbete')]], { dflt: 'proverbs' })] },
  { id: 'menu', g: 'words', ch: 'menu', name: t2('Menu', 'Meny'), desc: t2('Items and prices, lined up', 'Rätter och priser på rad'),
    def: { title: 'TODAY', items: ['KAFFE 30', 'KANELBULLE 35', 'SMÖRGÅS 65', 'SOPPA 95'], suffix: ' KR' },
    fields: [{ k: 'title', t: 'text', label: t2('Heading', 'Rubrik'), upper: 1, len: 60 },
      { k: 'items', t: 'textlist', label: t2('Items', 'Rätter'), add: t2('Add an item', 'Lägg till rätt'), max: 16, len: 60, hint: t2('End a line with the price and it lines up on the right.', 'Avsluta raden med priset så hamnar det till höger.') },
      SEG('suffix', t2('After the price', 'Efter priset'), [['', t2('Nothing', 'Inget')], [' KR', t2('KR', 'KR')], [':-', t2(':-', ':-')]], { dflt: '', adv: 1 })] },

  { id: 'clock', g: 'time', ch: 'clock', name: t2('Clock and date', 'Klocka och datum'), desc: t2('The time with the day and date', 'Tiden med dag och datum'), def: { fmt: '24' },
    fields: [FMT, TOG('date', t2('Show the date', 'Visa datum'), { dflt: true, adv: 1 }), TOG('week', t2('Show the week number', 'Visa veckonummer'), { dflt: false, adv: 1 })] },
  { id: 'bigclock', g: 'time', ch: 'bigclock', name: t2('Big clock', 'Stor klocka'), desc: t2('The time across the whole zone', 'Tiden över hela zonen'), def: { fmt: '24', color: 'f' },
    fields: [FMT, { k: 'color', t: 'colour', label: t2('Colour', 'Färg'), rainbow: 1 }] },
  { id: 'wordclock', g: 'time', ch: 'wordclock', name: t2('Word clock', 'Ordklocka'), desc: t2('The time in words, to five minutes', 'Tiden i ord, på fem minuter när'), def: {},
    fields: [{ t: 'note', label: t2('Follows the board language, English or Swedish.', 'Följer tavlans språk, engelska eller svenska.') }] },
  { id: 'countdown', g: 'time', ch: 'countdown', name: t2('Countdown', 'Nedräkning'), desc: t2('Days to a date, or days since one', 'Dagar till ett datum, eller sedan ett'), def: { label: 'MIDSOMMAR', date: '2027-06-25' },
    fields: [{ k: 'label', t: 'text', label: t2('Label', 'Etikett'), upper: 1, len: 60 }, { k: 'date', t: 'date', label: t2('Date', 'Datum') },
      SEG('dir', t2('Count', 'Räkna'), [['down', t2('Down to the date', 'Ner till datumet')], ['up', t2('Up from the date', 'Upp från datumet')]], { dflt: 'down' }),
      SEG('unit', t2('Count in', 'Räkna i'), [['auto', t2('Days, then hours', 'Dagar, sedan timmar')], ['days', t2('Days only', 'Bara dagar')]], { dflt: 'auto', adv: 1, show: o => o.dir !== 'up' })] },
  { id: 'today', g: 'time', ch: 'today', name: t2('Today', 'Idag'), desc: t2('Date, week, red days and sun times', 'Datum, vecka, röda dagar och soltider'), def: {},
    fields: [TOG('days', t2('Red days and flag days', 'Röda dagar och flaggdagar'), { dflt: true }), TOG('week', t2('Week number', 'Veckonummer'), { dflt: true }),
      TOG('sun', t2('Sunrise and sunset', 'Soluppgång och solnedgång'), { dflt: true }), { t: 'locnote' }, TOG('doy', t2('Day of the year', 'Dag på året'), { dflt: false, adv: 1 })] },

  { id: 'sl', g: 'live', ch: 'sl', name: t2('SL departures', 'SL-avgångar'), desc: t2('Next departures from Storstockholms Lokaltrafik (SL)', 'Nästa avgångar från Storstockholms Lokaltrafik (SL)'), def: { eta: 'min' },
    fields: [{ t: 'slhome' }, { k: 'stations', t: 'stations', label: t2('Stations', 'Stationer'), max: 6, show: o => !o.home },
      { k: 'modes', t: 'chips', label: t2('Show', 'Visa'), all: 1, opts: [['METRO', t2('Metro', 'Tunnelbana')], ['TRAIN', t2('Commuter train', 'Pendeltåg')], ['TRAM', t2('Tram', 'Spårvagn')], ['BUS', t2('Bus', 'Buss')], ['SHIP', t2('Boat', 'Båt')]] },
      SEG('eta', t2('Departure time as', 'Avgångstid som'), [['min', t2('Minutes to go', 'Minuter kvar')], ['clock', t2('Clock time', 'Klockslag')], ['cycle', t2('Both, taking turns', 'Båda, växelvis')]], { dflt: 'min' }),
      Object.assign({}, FMT, { adv: 1, show: o => o.eta === 'clock' || o.eta === 'cycle' }),
      { k: 'rows', t: 'stepper', label: t2('Departures per station', 'Avgångar per station'), min: 1, max: 12, step: 1, unit: '', dflt: 0, auto: t2('As many as fit', 'Så många som ryms'), adv: 1 },
      { k: 'walk', t: 'stepper', label: t2('Hide departures sooner than', 'Dölj avgångar tidigare än'), min: 0, max: 30, step: 1, unit: 'min', dflt: 0, adv: 1, hint: t2('Set it to your walk to the stop.', 'Ställ in hur lång tid det tar att gå till hållplatsen.') }] },
  { id: 'weather', g: 'live', ch: 'weather', name: t2('Weather', 'Väder'), desc: t2('Now, the next hours or the next days', 'Nu, kommande timmar eller dagar'), def: { view: 'now' },
    fields: [{ k: 'city', t: 'search', pool: 'cities', label: t2('City', 'Stad'), hint: t2('Empty follows the board location.', 'Tomt följer tavlans plats.') },
      SEG('view', t2('Show', 'Visa'), [['now', t2('Now', 'Nu')], ['hours', t2('Next hours', 'Kommande timmar')], ['days', t2('Three days', 'Tre dagar')]], { dflt: 'now' }),
      SEG('units', t2('Units', 'Enhet'), [['c', t2('°C', '°C')], ['f', t2('°F', '°F')]], { dflt: 'c', adv: 1 }), TOG('wind', t2('Show wind', 'Visa vind'), { dflt: true, adv: 1 })] },
  { id: 'electricity', g: 'live', ch: 'electricity', name: t2('Electricity price', 'Elpris'), desc: t2('Spot price by the hour for your price area', 'Spotpris per timme för ditt elområde'), def: { area: 'SE3', view: 'now' },
    fields: [SEG('area', t2('Price area', 'Elområde'), [['SE1', t2('SE1 Luleå', 'SE1 Luleå')], ['SE2', t2('SE2 Sundsvall', 'SE2 Sundsvall')], ['SE3', t2('SE3 Stockholm', 'SE3 Stockholm')], ['SE4', t2('SE4 Malmö', 'SE4 Malmö')]], { dflt: 'SE3' }),
      SEG('view', t2('Show', 'Visa'), [['now', t2('Price now', 'Pris nu')], ['chart', t2('Today as bars', 'Idag som staplar')]], { dflt: 'now' }),
      TOG('vat', t2('Include VAT (value added tax, moms)', 'Inklusive moms'), { dflt: true, adv: 1 }),
      { t: 'note', label: t2('Prices from elprisetjustnu.se, before network fees and your supplier’s markup.', 'Priser från elprisetjustnu.se, utan nätavgift och elhandlarens påslag.') }] },
  { id: 'currency', g: 'live', ch: 'currency', name: t2('Currency', 'Valuta'), desc: t2('Exchange rates against the krona', 'Växelkurser mot kronan'), def: { base: 'SEK', pairs: ['EUR', 'USD', 'GBP'], dec: 2 },
    fields: [SEG('base', t2('Priced in', 'Räknat i'), [['SEK', t2('SEK', 'SEK')], ['EUR', t2('EUR', 'EUR')]], { dflt: 'SEK' }),
      { k: 'pairs', t: 'chips', label: t2('Currencies', 'Valutor'), max: 6, opts: ['EUR', 'USD', 'GBP', 'NOK', 'DKK', 'CHF', 'JPY', 'PLN', 'SEK'].map(c => [c, t2(c, c)]) },
      { k: 'dec', t: 'stepper', label: t2('Decimals', 'Decimaler'), min: 0, max: 4, step: 1, unit: '', dflt: 2, adv: 1 },
      { t: 'note', label: t2('European Central Bank reference rates, updated once a working day.', 'Europeiska centralbankens referenskurser, uppdateras en gång per bankdag.') }] },
  { id: 'onthisday', g: 'live', ch: 'onthisday', name: t2('On this day', 'Den här dagen'), desc: t2('Something that happened on this date', 'Något som hände på dagens datum'), def: {},
    fields: [{ t: 'note', label: t2('From Wikipedia, in the board language. A new event every minute.', 'Från Wikipedia, på tavlans språk. En ny händelse varje minut.') }] },
  { id: 'url', g: 'live', ch: 'url', name: t2('Follow a URL', 'Följ en URL'), desc: t2('Lines from any web address (URL) you choose', 'Rader från valfri webbadress (URL)'),
    def: { url: '', every: '5', tpl: '', max: 4 },
    fields: [{ k: 'url', t: 'text', label: t2('Web address (URL)', 'Webbadress (URL)'), len: 500, hint: t2('An https address that returns JSON (JavaScript Object Notation) or plain text, and allows other sites to read it. A GitHub Gist or a published Google Sheet works.', 'En https-adress som svarar med JSON (JavaScript Object Notation) eller vanlig text och låter andra webbplatser läsa den. En GitHub Gist eller ett publicerat Google-kalkylark fungerar.') },
      SEG('every', t2('Check every', 'Hämta var'), [['1', t2('1 min', '1 min')], ['5', t2('5 min', '5 min')], ['15', t2('15 min', '15 min')], ['60', t2('60 min', '60 min')]], { dflt: '5' }),
      { k: 'tpl', t: 'template', label: t2('Line template', 'Radmall'), hint: t2('Empty prints every field of an item, in order.', 'Tom skriver ut alla fält i en post, i ordning.') },
      { k: 'path', t: 'text', label: t2('Where the list is in the feed', 'Var listan finns i flödet'), len: 100, adv: 1, hint: t2('A dotted path such as data.departures. Leave it empty to use the first list in the feed.', 'En sökväg med punkter, till exempel data.departures. Lämna tomt för att använda första listan i flödet.') },
      { k: 'max', t: 'stepper', label: t2('Lines at most', 'Högst antal rader'), min: 1, max: 12, step: 1, unit: '', dflt: 4, adv: 1 },
      { k: 'header', t: 'text', label: t2('Heading line', 'Rubrikrad'), upper: 1, len: 60, adv: 1 }] },

  { id: 'draw', g: 'pictures', ch: 'message', mode: 'paint', name: t2('Draw', 'Rita'), desc: t2('Paint with the colour flaps', 'Måla med färgflapparna'), def: {} },
  { id: 'photo', g: 'pictures', ch: 'message', mode: 'photo', name: t2('Photo', 'Foto'), desc: t2('A picture turned into colour flaps', 'En bild omgjord till färgflappar'), def: {} },
  { id: 'art', g: 'pictures', ch: 'art', name: t2('Colour pattern', 'Färgmönster'), desc: t2('Rainbows, flags, rain and confetti', 'Regnbågar, flaggor, regn och konfetti'), def: { pattern: 'rainbow', step: 4 },
    fields: [SEG('pattern', t2('Pattern', 'Mönster'), PATTERNS.map(p => [p, null]), { dflt: 'rainbow', names: 'patterns' }),
      SEG('step', t2('Change every', 'Byt var'), [[2, t2('2 s', '2 s')], [4, t2('4 s', '4 s')], [8, t2('8 s', '8 s')], [15, t2('15 s', '15 s')]], { dflt: 4 }),
      { k: 'palette', t: 'palette', label: t2('Colours', 'Färger'), adv: 1, hint: t2('For the rainbow, confetti, wave and checker. None picked uses the rainbow.', 'För regnbåge, konfetti, våg och rutor. Inga valda ger regnbågen.') }] },

  { id: 'scoreboard', g: 'later', later: 1, name: t2('Scoreboard', 'Resultattavla') },
  { id: 'timer', g: 'later', later: 1, name: t2('Timer', 'Timer') },
  { id: 'list', g: 'later', later: 1, name: t2('List', 'Lista') },
  { id: 'stocks', g: 'later', later: 1, name: t2('Stock ticker', 'Aktiekurser') }
];
export const TILE = Object.fromEntries(TILES.map(t => [t.id, t]));

// The tile a stored zone belongs to: its channel, or for a message zone its mode.
export function tileFor(zone) {
  if (!zone || !zone.ch) return null;
  if (zone.ch === 'message') return TILE[zone.o && zone.o.mode === 'paint' ? 'draw' : zone.o && zone.o.mode === 'photo' ? 'photo' : 'message'];
  return TILES.find(t => t.ch === zone.ch && !t.mode) || null;
}

// Stand-in live data for picker previews, so a tile shows what the channel looks like
// before anything has been fetched. Real data, when the board already has it, wins.
const dep = (line, dest, min, mode) => ({ line, dest, min, mode });
const SAMPLE_SL = [dep('17', 'Åkeshov', 2, 'METRO'), dep('4', 'Radiohuset', 3, 'BUS'), dep('18', 'Alvik', 6, 'METRO'), dep('40', 'Uppsala C', 7, 'TRAIN'), dep('19', 'Hässelby strand', 9, 'METRO'), dep('2', 'Sofia', 11, 'BUS')];
export function previewLive(real, now) {
  const r = real || {}, iso = m => {
    const d = new Date(now + m * 60e3), p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
  };
  const wall = new Date(now), key = `${wall.getFullYear()}-${String(wall.getMonth() + 1).padStart(2, '0')}-${String(wall.getDate()).padStart(2, '0')}`;
  const md = key.slice(5);
  const prices = [42, 38, 35, 33, 34, 40, 62, 88, 96, 84, 70, 61, 55, 52, 50, 56, 72, 110, 124, 98, 80, 66, 54, 46];
  const loc = r.loc || { city: 'Stockholm', lat: 59.33, lon: 18.07 };
  const has = (b, k) => r[b] && r[b][k] && !r[b][k].err;
  return {
    home: r.home, loc,
    sl: Object.assign({ 9117: { deps: SAMPLE_SL.map(x => ({ line: x.line, dest: x.dest, mode: x.mode, expected: iso(x.min) })) } }, r.sl),
    wx: Object.assign({ '59.33,18.07': { t: 12, feels: 10, code: 1, wind: 4, hourly: Array.from({ length: 12 }, (_, i) => ({ time: iso(i * 60).slice(0, 13) + ':00', t: 12 - Math.round(i / 3), pp: i > 6 ? 30 : 0, code: i > 6 ? 61 : 1 })), daily: [0, 1, 2, 3].map(i => ({ date: iso(i * 1440).slice(0, 10), code: [1, 61, 3, 0][i], max: 14 - i, min: 6 - i, pp: [0, 60, 20, 0][i], sum: [0, 4, 1, 0][i] })) } }, r.wx),
    el: Object.assign({ SE1: { days: { [key]: prices.map(p => p * 0.6) } }, SE2: { days: { [key]: prices.map(p => p * 0.62) } }, SE3: { days: { [key]: prices } }, SE4: { days: { [key]: prices.map(p => p * 1.3) } } }, r.el),
    fx: has('fx', 'SEK') || has('fx', 'EUR') ? r.fx : { SEK: { rates: { EUR: 0.0886, USD: 0.101, GBP: 0.0762, NOK: 1.06, DKK: 0.661, CHF: 0.0832, JPY: 15.1, PLN: 0.379 } }, EUR: { rates: { SEK: 11.29, USD: 1.14, GBP: 0.86, NOK: 11.9, DKK: 7.46, CHF: 0.94, JPY: 170, PLN: 4.28 } } },
    otd: has('otd', 'en') || has('otd', 'sv') ? r.otd : { en: { md, items: [{ year: 1825, text: 'The Stockton and Darlington Railway opens' }] }, sv: { md, items: [{ year: 1825, text: 'Järnvägen mellan Stockton och Darlington öppnar' }] } },
    url: Object.assign({ sample: { items: SAMPLE_FEED } }, r.url)
  };
}
// What Follow a URL shows before an address is set: a made-up departures feed.
export const SAMPLE_FEED = [{ line: '4', dest: 'Radiohuset', min: 3 }, { line: '2', dest: 'Sofia', min: 5 }, { line: '94', dest: 'Marieberg', min: 12 }];
