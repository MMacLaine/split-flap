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
import { FX_CURRENCIES } from './place.js';

const t2 = (en, sv) => ({ en, sv });
const SEG = (k, label, opts, extra) => Object.assign({ k, t: 'seg', label, opts }, extra);
const TOG = (k, label, extra) => Object.assign({ k, t: 'toggle', label }, extra);
const FMT = SEG('fmt', t2('Format', 'Format'), [['24', t2('24 h', '24 h')], ['12', t2('12 h', '12 h')]]);

export const GROUPS = [['words', t2('Words', 'Ord')], ['time', t2('Time', 'Tid')], ['live', t2('Live', 'Live')], ['finance', t2('Finance', 'Ekonomi')], ['pictures', t2('Pictures', 'Bilder')], ['later', t2('Later', 'Senare')]];

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
      SEG('suffix', t2('After the price', 'Efter priset'), [['', t2('Nothing', 'Inget')], [' KR', t2('KR', 'KR')], [':-', t2(':-', ':-')], [' EUR', t2('EUR', 'EUR')], [' GBP', t2('GBP', 'GBP')], [' CHF', t2('CHF', 'CHF')]], { dflt: '', adv: 1 }),
      SEG('prefix', t2('Before the price', 'Före priset'), [['', t2('Nothing', 'Inget')], ['$', t2('$', '$')]], { dflt: '', adv: 1, hint: t2('The flaps have $ but no € or £, so those print as EUR and GBP after the price.', 'Flapparna har $ men inte € eller £, så de skrivs som EUR och GBP efter priset.') })] },

  { id: 'clock', g: 'time', ch: 'clock', name: t2('Clock and date', 'Klocka och datum'), desc: t2('The time with the day and date', 'Tiden med dag och datum'), def: { fmt: '24' },
    fields: [FMT, TOG('date', t2('Show the date', 'Visa datum'), { dflt: true, adv: 1 }), TOG('week', t2('Show the week number', 'Visa veckonummer'), { dflt: false, adv: 1 })] },
  { id: 'bigclock', g: 'time', ch: 'bigclock', name: t2('Big clock', 'Stor klocka'), desc: t2('The time across the whole zone', 'Tiden över hela zonen'), def: { fmt: '24', color: 'f' },
    fields: [FMT, { k: 'color', t: 'colour', label: t2('Colour', 'Färg'), rainbow: 1 }] },
  { id: 'wordclock', g: 'time', ch: 'wordclock', name: t2('Word clock', 'Ordklocka'), desc: t2('The time in words, to five minutes', 'Tiden i ord, på fem minuter när'), def: {},
    fields: [{ t: 'note', label: t2('Follows your language in Account, English or Swedish.', 'Följer ditt språk under Konto, engelska eller svenska.') }] },
  { id: 'letterclock', g: 'time', ch: 'letterclock', name: t2('Letter clock', 'Bokstavsklocka'), desc: t2('The time lit up in a grid of letters', 'Tiden tänd i ett rutnät av bokstäver'), def: {},
    fields: [TOG('dots', t2('Minute dots in the corners', 'Minutprickar i hörnen'), { dflt: true }),
      { t: 'note', label: t2('Follows your language in Account. The grid needs a zone of 9 × 13, and 11 × 15 for the minute dots. The Letter clock template sets that up.', 'Följer ditt språk under Konto. Rutnätet behöver en zon på 9 × 13, och 11 × 15 för minutprickarna. Mallen Bokstavsklocka ställer in det.') }] },
  { id: 'worldtime', g: 'time', ch: 'worldtime', name: t2('World clock', 'Världsklocka'), desc: t2('The time in a few cities', 'Tiden i några städer'),
    def: { places: [{ city: 'London', tz: 'Europe/London' }, { city: 'New York', tz: 'America/New_York' }, { city: 'Tokyo', tz: 'Asia/Tokyo' }], fmt: '24' },
    fields: [{ k: 'places', t: 'tzcities', label: t2('Cities', 'Städer'), max: 6 }, FMT,
      { t: 'note', label: t2('A city already on tomorrow shows +1 after its time, and one still on yesterday shows -1.', 'En stad som redan är på morgondagen visar +1 efter tiden, och en som fortfarande är på gårdagen visar -1.') }] },
  { id: 'countdown', g: 'time', ch: 'countdown', name: t2('Countdown', 'Nedräkning'), desc: t2('Days to a date, or days since one', 'Dagar till ett datum, eller sedan ett'), def: { label: 'MIDSOMMAR', date: '2027-06-25' },
    fields: [SEG('to', t2('Count to', 'Räkna till'), [['date', t2('A date', 'Ett datum')], ['holiday', t2('The next public holiday', 'Nästa helgdag')]], { dflt: 'date', hint: t2('The holiday follows the country of the place in Display.', 'Helgdagen följer landet för platsen under Visning.') }),
      { k: 'label', t: 'text', label: t2('Label', 'Etikett'), upper: 1, len: 60, show: o => o.to !== 'holiday' }, { k: 'date', t: 'date', label: t2('Date', 'Datum'), show: o => o.to !== 'holiday' },
      SEG('dir', t2('Count', 'Räkna'), [['down', t2('Down to the date', 'Ner till datumet')], ['up', t2('Up from the date', 'Upp från datumet')]], { dflt: 'down', show: o => o.to !== 'holiday' }),
      SEG('unit', t2('Count in', 'Räkna i'), [['auto', t2('Days, then hours', 'Dagar, sedan timmar')], ['days', t2('Days only', 'Bara dagar')]], { dflt: 'auto', adv: 1, show: o => o.dir !== 'up' })] },
  { id: 'today', g: 'time', ch: 'today', name: t2('Today', 'Idag'), desc: t2('Date, week, public holidays and sun times', 'Datum, vecka, helgdagar och soltider'), def: {},
    fields: [TOG('days', t2('Public holidays (and flag days in Sweden)', 'Helgdagar (och flaggdagar i Sverige)'), { dflt: true, hint: t2('For the country of the place in Display.', 'För landet för platsen under Visning.') }), TOG('week', t2('Week number', 'Veckonummer'), { dflt: true }),
      TOG('sun', t2('Sunrise and sunset', 'Soluppgång och solnedgång'), { dflt: true }), { t: 'locnote' }, TOG('doy', t2('Day of the year', 'Dag på året'), { dflt: false, adv: 1 })] },

  // Departures (0.8): one tile for every stop, anywhere Transitous has timetables, with SL's
  // own API for Stockholm stops. The SL tile below stays for boards made before 0.8 (and
  // for the SL map's home station), but the picker no longer offers it.
  { id: 'departures', g: 'live', ch: 'departures', src: 'transit', name: t2('Departures', 'Avgångar'), desc: t2('The next trains, buses and trams from a stop, almost anywhere', 'Nästa tåg, bussar och spårvagnar från en hållplats, nästan var som helst'),
    def: { eta: 'min', near: true },
    fields: [{ k: 'stops', t: 'stops', label: t2('Stops', 'Hållplatser'), max: 4 },
      { k: 'modes', t: 'chips', label: t2('Show', 'Visa'), all: 1, opts: [['TRAIN', t2('Train', 'Tåg')], ['METRO', t2('Metro', 'Tunnelbana')], ['TRAM', t2('Tram', 'Spårvagn')], ['BUS', t2('Bus', 'Buss')], ['SHIP', t2('Boat', 'Båt')]] },
      SEG('eta', t2('Departure time as', 'Avgångstid som'), [['min', t2('Minutes to go', 'Minuter kvar')], ['clock', t2('Clock time', 'Klockslag')], ['cycle', t2('Both, taking turns', 'Båda, växelvis')]], { dflt: 'min' }),
      SEG('view', t2('Look', 'Utseende'), [['list', t2('A list', 'En lista')], ['board', t2('Station board', 'Stationstavla')]], { dflt: 'list', adv: 1, hint: t2('The station board adds the platform and on time, late or cancelled. It needs a zone about 30 flaps wide.', 'Stationstavlan visar också spår och i tid, sen eller inställd. Den behöver en zon som är ungefär 30 flappar bred.') }),
      Object.assign({}, FMT, { adv: 1, show: o => o.eta === 'clock' || o.eta === 'cycle' || o.view === 'board' }),
      { k: 'lines', t: 'text', label: t2('Only these lines', 'Bara de här linjerna'), upper: 1, len: 60, adv: 1, hint: t2('Line numbers with commas between, for example 17, 18. Empty shows every line.', 'Linjenummer med komma emellan, till exempel 17, 18. Tomt visar alla linjer.') },
      { k: 'rows', t: 'stepper', label: t2('Departures per stop', 'Avgångar per hållplats'), min: 1, max: 12, step: 1, unit: '', dflt: 0, auto: t2('As many as fit', 'Så många som ryms'), adv: 1 },
      { k: 'walk', t: 'stepper', label: t2('Hide departures sooner than', 'Dölj avgångar tidigare än'), min: 0, max: 30, step: 1, unit: 'min', dflt: 0, adv: 1, hint: t2('Set it to your walk to the stop.', 'Ställ in hur lång tid det tar att gå till hållplatsen.') },
      SEG('cancelled', t2('Cancelled departures', 'Inställda avgångar'), [['show', t2('Show as cancelled', 'Visa som inställda')], ['hide', t2('Hide', 'Dölj')]], { dflt: 'show', adv: 1 }),
      TOG('merge', t2('Several stops in one list, soonest first', 'Flera hållplatser i en lista, närmast först'), { dflt: false, adv: 1, show: o => Array.isArray(o.stops) && o.stops.length > 1 }),
      TOG('alert', t2('A line for disruptions, when there are any', 'En rad för störningar, när det finns några'), { dflt: false, adv: 1 }),
      { t: 'credit', src: ['transit', 'sl'] }] },
  { id: 'sl', g: 'live', ch: 'sl', hide: 1, name: t2('SL departures', 'SL-avgångar'), desc: t2('Next departures from Storstockholms Lokaltrafik (SL)', 'Nästa avgångar från Storstockholms Lokaltrafik (SL)'), def: { eta: 'min' },
    fields: [{ t: 'slhome' }, { k: 'stations', t: 'stations', label: t2('Stations', 'Stationer'), max: 6, show: o => !o.home },
      { k: 'modes', t: 'chips', label: t2('Show', 'Visa'), all: 1, opts: [['METRO', t2('Metro', 'Tunnelbana')], ['TRAIN', t2('Commuter train', 'Pendeltåg')], ['TRAM', t2('Tram', 'Spårvagn')], ['BUS', t2('Bus', 'Buss')], ['SHIP', t2('Boat', 'Båt')]] },
      SEG('eta', t2('Departure time as', 'Avgångstid som'), [['min', t2('Minutes to go', 'Minuter kvar')], ['clock', t2('Clock time', 'Klockslag')], ['cycle', t2('Both, taking turns', 'Båda, växelvis')]], { dflt: 'min' }),
      Object.assign({}, FMT, { adv: 1, show: o => o.eta === 'clock' || o.eta === 'cycle' }),
      { k: 'rows', t: 'stepper', label: t2('Departures per station', 'Avgångar per station'), min: 1, max: 12, step: 1, unit: '', dflt: 0, auto: t2('As many as fit', 'Så många som ryms'), adv: 1 },
      { k: 'walk', t: 'stepper', label: t2('Hide departures sooner than', 'Dölj avgångar tidigare än'), min: 0, max: 30, step: 1, unit: 'min', dflt: 0, adv: 1, hint: t2('Set it to your walk to the stop.', 'Ställ in hur lång tid det tar att gå till hållplatsen.') }] },
  { id: 'weather', g: 'live', ch: 'weather', name: t2('Weather', 'Väder'), desc: t2('Now, the next hours or the next days', 'Nu, kommande timmar eller dagar'), def: { view: 'now' },
    fields: [{ k: 'city', t: 'search', pool: 'cities', label: t2('City', 'Stad'), hint: t2('Empty follows the place in Display.', 'Tomt följer platsen under Visning.') },
      SEG('view', t2('Show', 'Visa'), [['now', t2('Now', 'Nu')], ['hours', t2('Next hours', 'Kommande timmar')], ['days', t2('Three days', 'Tre dagar')]], { dflt: 'now' }),
      SEG('units', t2('Units', 'Enhet'), [['c', t2('°C', '°C')], ['f', t2('°F', '°F')]], { dflt: 'c', adv: 1 }), TOG('wind', t2('Show wind', 'Visa vind'), { dflt: true, adv: 1 }),
      TOG('soon', t2('Say when rain starts or stops in the next two hours', 'Säg när regn börjar eller slutar inom två timmar'), { dflt: true, adv: 1, show: o => (o.view || 'now') === 'now' }),
      { t: 'credit', src: ['weather'] }] },
  { id: 'electricity', g: 'live', ch: 'electricity', only: ['SE'], name: t2('Electricity price', 'Elpris'), desc: t2('Spot price by the hour for your price area', 'Spotpris per timme för ditt elområde'), def: { area: 'SE3', view: 'now' },
    fields: [SEG('area', t2('Price area', 'Elområde'), [['SE1', t2('SE1 Luleå', 'SE1 Luleå')], ['SE2', t2('SE2 Sundsvall', 'SE2 Sundsvall')], ['SE3', t2('SE3 Stockholm', 'SE3 Stockholm')], ['SE4', t2('SE4 Malmö', 'SE4 Malmö')]], { dflt: 'SE3' }),
      SEG('view', t2('Show', 'Visa'), [['now', t2('Price now', 'Pris nu')], ['chart', t2('Today as bars', 'Idag som staplar')]], { dflt: 'now' }),
      TOG('vat', t2('Include VAT (value added tax, moms)', 'Inklusive moms'), { dflt: true, adv: 1 }),
      { t: 'note', label: t2('Prices from elprisetjustnu.se, before network fees and your supplier’s markup.', 'Priser från elprisetjustnu.se, utan nätavgift och elhandlarens påslag.') }] },
  { id: 'markets', g: 'finance', ch: 'markets', src: 'markets', name: t2('Markets', 'Marknader'), desc: t2('A stock, ETF or coin as a line, green up and red down, with its price', 'En aktie, fond eller ett mynt som en linje, grön upp och röd ner, med priset'),
    def: { source: 'built', symbols: [{ s: 'SPY' }], period: '1m', every: 12 },
    fields: [SEG('source', t2('What', 'Vad'), [['built', t2('Stocks and ETFs', 'Aktier och fonder')], ['crypto', t2('Crypto', 'Krypto')]], { dflt: 'built', hint: t2('London and New York are built in, with each day\'s close. Swedish shares are priced through London.', 'London och New York finns inbyggt, med varje dags stängningskurs. Svenska aktier prissätts via London.') }),
      { k: 'symbols', t: 'symbols', label: t2('Symbols', 'Symboler'), max: 8 },
      SEG('period', t2('Period', 'Period'), [['1d', t2('Day', 'Dag')], ['1w', t2('Week', 'Vecka')], ['1m', t2('Month', 'Månad')], ['3m', t2('3 months', '3 månader')], ['1y', t2('Year', 'År')]], { dflt: '1m' }),
      SEG('source', t2('Your own source', 'Din egen källa'), [['key', t2('Your Alpha Vantage key', 'Din Alpha Vantage-nyckel')], ['sheet', t2('Your published sheet', 'Ditt publicerade kalkylark')]], { adv: 1, hint: t2('For symbols that are not built in, such as Stockholm itself or your funds.', 'För symboler som inte finns inbyggda, till exempel Stockholmsbörsen eller dina fonder.') }),
      { t: 'conn', adv: 1, show: o => o.source === 'key' || o.source === 'sheet' },
      { k: 'every', t: 'stepper', label: t2('Each symbol for', 'Varje symbol i'), min: 5, max: 120, step: 1, unit: 's', dflt: 12, adv: 1, show: o => Array.isArray(o.symbols) && o.symbols.length > 1 },
      SEG('line', t2('Line', 'Linje'), [['thin', t2('Half flaps', 'Halva flappar')], ['thick', t2('Whole flaps', 'Hela flappar')]], { dflt: 'thin', adv: 1, hint: t2('Whole flaps read better on a small board.', 'Hela flappar syns bättre på en liten tavla.') }),
      TOG('ref', t2('A faint line at the price the period started at', 'En svag linje vid priset när perioden började'), { dflt: false, adv: 1 }),
      SEG('side', t2('Chart on the', 'Diagrammet till'), [['left', t2('Left', 'Vänster')], ['right', t2('Right', 'Höger')]], { dflt: 'left', adv: 1 }),
      TOG('panel', t2('Show the name and price beside it', 'Visa namn och pris bredvid'), { dflt: true, adv: 1 }),
      SEG('cur', t2('Coins priced in', 'Mynt i'), [['USD', t2('USD', 'USD')], ['EUR', t2('EUR', 'EUR')], ['GBP', t2('GBP', 'GBP')], ['SEK', t2('SEK', 'SEK')]], { dflt: 'USD', adv: 1, show: o => o.source === 'crypto' }),
      { t: 'note', label: t2('The chart wants about 30 flaps across. A 12 × 40 board draws a month with room for the price.', 'Diagrammet vill ha ungefär 30 flappar i bredd. En tavla på 12 × 40 ritar en månad med plats för priset.') },
      { t: 'credit', src: ['markets', 'crypto'] }] },
  { id: 'rates', g: 'finance', ch: 'rates', src: 'rates', name: t2('Interest rates', 'Räntor'), desc: t2('Central banks\' policy rates, and when they last moved', 'Centralbankernas styrräntor, och när de senast ändrades'),
    def: { banks: ['ecb'], years: 5 },
    fields: [{ k: 'banks', t: 'chips', label: t2('Central banks', 'Centralbanker'), max: 4, opts: [['riks', t2('Riksbank', 'Riksbanken')], ['ecb', t2('ECB', 'ECB')], ['boe', t2('Bank of England', 'Bank of England')], ['fed', t2('Fed', 'Fed')]] },
      SEG('years', t2('Over', 'Över'), [[1, t2('1 year', '1 år')], [5, t2('5 years', '5 år')]], { dflt: 5 }),
      SEG('view', t2('Show', 'Visa'), [['chart', t2('A line, for one bank', 'En linje, för en bank')], ['list', t2('A list', 'En lista')]], { dflt: 'chart', adv: 1, hint: t2('Several banks always show as a list.', 'Flera banker visas alltid som en lista.') }),
      SEG('line', t2('Line', 'Linje'), [['thin', t2('Half flaps', 'Halva flappar')], ['thick', t2('Whole flaps', 'Hela flappar')]], { dflt: 'thin', adv: 1 }),
      { t: 'note', label: t2('The Fed shows its target range; the others their policy rate. The date is when it last changed within the period.', 'Fed visar sitt målintervall; de andra sin styrränta. Datumet är när den senast ändrades under perioden.') },
      { t: 'credit', src: ['ratesEcb', 'ratesFed', 'ratesBoe', 'ratesRiks'] }] },
  { id: 'currency', g: 'finance', ch: 'currency', name: t2('Currency', 'Valuta'), desc: t2('Exchange rates and crypto prices in your currency', 'Växelkurser och kryptopriser i din valuta'), def: { base: 'SEK', pairs: ['EUR', 'USD', 'GBP'], dec: 2 },
    fields: [{ k: 'base', t: 'select', label: t2('Priced in', 'Räknat i'), opts: FX_CURRENCIES.map(c => [c, t2(c, c)]), dflt: 'SEK', hint: t2('New tiles start in the currency of the place in Display.', 'Nya rutor börjar i valutan för platsen under Visning.') },
      { k: 'pairs', t: 'chips', label: t2('Currencies and coins', 'Valutor och mynt'), max: 6, opts: ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CNY', 'BTC', 'ETH'].map(c => [c, t2(c, c)]) },
      { k: 'pairs', t: 'chips', label: t2('More currencies and coins', 'Fler valutor och mynt'), max: 6, adv: 1, opts: FX_CURRENCIES.filter(c => !['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CNY'].includes(c)).concat(['SOL', 'XRP', 'ADA', 'DOGE']).map(c => [c, t2(c, c)]) },
      { k: 'dec', t: 'stepper', label: t2('Decimals', 'Decimaler'), min: 0, max: 4, step: 1, unit: '', dflt: 2, adv: 1 },
      { t: 'note', label: t2('Up to six. Currencies are the European Central Bank reference rates, updated once a working day. Coins update every five minutes, with a green or red flap for the last day.', 'Högst sex. Valutor är Europeiska centralbankens referenskurser, uppdaterade en gång per bankdag. Mynt uppdateras var femte minut, med en grön eller röd flapp för senaste dygnet.') },
      { t: 'credit', src: ['fx', 'crypto'] }] },
  { id: 'onthisday', g: 'live', ch: 'onthisday', name: t2('On this day', 'Den här dagen'), desc: t2('Something that happened on this date', 'Något som hände på dagens datum'), def: {},
    fields: [{ t: 'note', label: t2('From Wikipedia, in your language. A new event every minute.', 'Från Wikipedia, på ditt språk. En ny händelse varje minut.') }] },
  { id: 'headlines', g: 'live', ch: 'headlines', src: 'feeds', name: t2('Headlines', 'Rubriker'), desc: t2('The latest from news sites and other feeds, one at a time', 'Det senaste från nyhetssajter och andra flöden, en i taget'),
    def: { feeds: [], every: 10, count: 5 },
    fields: [{ k: 'feeds', t: 'feeds', label: t2('Feeds', 'Flöden'), max: 6 },
      { k: 'every', t: 'stepper', label: t2('Each headline for', 'Varje rubrik i'), min: 5, max: 120, step: 1, unit: 's', dflt: 10, adv: 1 },
      { k: 'count', t: 'stepper', label: t2('Newest headlines from each feed', 'Nyaste rubrikerna från varje flöde'), min: 1, max: 10, step: 1, unit: '', dflt: 5, adv: 1 },
      { t: 'note', label: t2('Most news sites do not let other pages read their feeds, so Split-Flap\'s server fetches them: the ones listed here for anyone, and any other once a signed-in account has added it. It is then kept with that account under Account, and wall screens showing it can read it without signing in.', 'De flesta nyhetssajter låter inte andra sidor läsa deras flöden, så Split-Flaps server hämtar dem: de som listas här för alla, och alla andra när ett inloggat konto har lagt till dem. Flödet sparas då med kontot under Konto, och väggskärmar som visar det kan läsa det utan att logga in.') },
      { t: 'credit', src: ['feedBbc', 'feedNasa', 'feedHn', 'feeds'] }] },
  { id: 'url', g: 'live', ch: 'url', name: t2('Follow a URL', 'Följ en URL'), desc: t2('Lines from any web address (URL) you choose', 'Rader från valfri webbadress (URL)'),
    def: { url: '', every: '5', tpl: '', max: 4 },
    fields: [{ k: 'url', t: 'text', label: t2('Web address (URL)', 'Webbadress (URL)'), len: 500, hint: t2('An https address that returns JSON (JavaScript Object Notation) or plain text, and allows other sites to read it. A GitHub Gist or a published Google Sheet works.', 'En https-adress som svarar med JSON (JavaScript Object Notation) eller vanlig text och låter andra webbplatser läsa den. En GitHub Gist eller ett publicerat Google-kalkylark fungerar.') },
      SEG('every', t2('Check every', 'Hämta var'), [['1', t2('1 min', '1 min')], ['5', t2('5 min', '5 min')], ['15', t2('15 min', '15 min')], ['60', t2('60 min', '60 min')]], { dflt: '5' }),
      { k: 'tpl', t: 'template', label: t2('Line template', 'Radmall'), hint: t2('Empty prints every field of an item, in order.', 'Tom skriver ut alla fält i en post, i ordning.') },
      { k: 'path', t: 'text', label: t2('Where the list is in the feed', 'Var listan finns i flödet'), len: 100, adv: 1, hint: t2('A dotted path such as data.departures. Leave it empty to use the first list in the feed.', 'En sökväg med punkter, till exempel data.departures. Lämna tomt för att använda första listan i flödet.') },
      { k: 'max', t: 'stepper', label: t2('Lines at most', 'Högst antal rader'), min: 1, max: 12, step: 1, unit: '', dflt: 4, adv: 1 },
      { k: 'header', t: 'text', label: t2('Heading line', 'Rubrikrad'), upper: 1, len: 60, adv: 1 }] },

  { id: 'meter', g: 'live', ch: 'meter', name: t2('Music meter', 'Musikmätare'), desc: t2('A level meter for the music in the room', 'En nivåmätare för musiken i rummet'), def: {},
    fields: [SEG('style', t2('Style', 'Stil'), [['mixer', t2('Mixer', 'Mixer')], ['bars', t2('Bars', 'Staplar')], ['mirror', t2('Mirror', 'Spegel')]], { dflt: 'mixer' }),
      { t: 'note', label: t2('It moves while Listen is on, from the control bar or Showing, or the L key on a kiosk. Listen keeps going while the playlist turns, until Stop or another playlist. Made for 12 × 40.', 'Den rör sig medan Lyssna är på, från kontrollraden eller Visas, eller tangenten L på en kiosk. Lyssna fortsätter medan spellistan går vidare, tills Stoppa eller en annan spellista. Gjord för 12 × 40.') }] },
  { id: 'draw', g: 'pictures', ch: 'message', mode: 'paint', name: t2('Draw', 'Rita'), desc: t2('Paint with the colour flaps', 'Måla med färgflapparna'), def: {} },
  { id: 'photo', g: 'pictures', ch: 'message', mode: 'photo', name: t2('Photo', 'Foto'), desc: t2('A picture turned into colour flaps', 'En bild omgjord till färgflappar'), def: {} },
  { id: 'art', g: 'pictures', ch: 'art', name: t2('Colour pattern', 'Färgmönster'), desc: t2('Rainbows, flags, rain and confetti', 'Regnbågar, flaggor, regn och konfetti'), def: { pattern: 'rainbow', step: 4 },
    fields: [SEG('pattern', t2('Pattern', 'Mönster'), PATTERNS.map(p => [p, null]), { dflt: 'rainbow', names: 'patterns' }),
      SEG('step', t2('Change every', 'Byt var'), [[2, t2('2 s', '2 s')], [4, t2('4 s', '4 s')], [8, t2('8 s', '8 s')], [15, t2('15 s', '15 s')]], { dflt: 4 }),
      { k: 'palette', t: 'palette', label: t2('Colours', 'Färger'), adv: 1, hint: t2('For the rainbow, confetti, wave and checker. None picked uses the rainbow.', 'För regnbåge, konfetti, våg och rutor. Inga valda ger regnbågen.') }] },

  { id: 'scoreboard', g: 'later', later: 1, name: t2('Scoreboard', 'Resultattavla') },
  { id: 'timer', g: 'later', later: 1, name: t2('Timer', 'Timer') },
  { id: 'list', g: 'later', later: 1, name: t2('List', 'Lista') }
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
const SAMPLE_TR = [['S1', 'AIRPORT', 2, 'TRAIN', '4'], ['12', 'OLD TOWN', 4, 'TRAM', ''], ['S3', 'HARBOUR', 7, 'TRAIN', '2'], ['40', 'UNIVERSITY', 9, 'BUS', ''], ['S1', 'AIRPORT', 17, 'TRAIN', '4'], ['12', 'OLD TOWN', 19, 'TRAM', '']];
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
    url: Object.assign({ sample: { items: SAMPLE_FEED } }, r.url),
    tr: Object.assign({ sample: { tz: null, deps: SAMPLE_TR.map(([line, dest, min, mode, platform]) => ({ line, dest, mode, platform, cancelled: false, time: new Date(now + min * 60e3).toISOString(), sched: new Date(now + min * 60e3).toISOString() })) } }, r.tr),
    near: r.near || {}, off: r.off || []
  };
}
// What Follow a URL shows before an address is set: a made-up departures feed.
export const SAMPLE_FEED = [{ line: '4', dest: 'Radiohuset', min: 3 }, { line: '2', dest: 'Sofia', min: 5 }, { line: '94', dest: 'Marieberg', min: 12 }];
