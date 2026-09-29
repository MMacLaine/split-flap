// Every outside source a tile reads (0.8), in one place: who runs it, its terms and the
// day they were read, the credit it asks for, how often we ask, and who to talk to. The
// tile notes and Help build their credits from this list, so none is missed. A source
// the Worker lists in SOURCES_OFF is hidden from the picker (see live.js, fetchStatus).
//
// tier: 'browser' asks the source straight from the page (keyless, open CORS);
// 'worker' goes through our Worker's cache (worker/src/data.js).

export const SOURCES = {
  transit: {
    name: 'Transitous', tier: 'worker', tiles: ['departures'], every: 'each stop once a minute, cached by the Worker for every screen',
    terms: 'Free for open-source, non-commercial projects that are light on its resources. Send a User-Agent or Referer, link its sources page, credit OpenStreetMap. Ask in its Matrix channel before heavy use.',
    checked: '2026-09-29', contact: 'transitous.org (Matrix: #transitous:matrix.spline.de)',
    credit: { en: 'Departures from Transitous and the timetable sources it lists, with map data from OpenStreetMap contributors.', sv: 'Avgångar från Transitous och de tidtabellskällor den listar, med kartdata från OpenStreetMaps bidragsgivare.' },
    link: 'https://transitous.org/sources/'
  },
  sl: {
    name: 'SL Transport API (Trafiklab)', tier: 'browser', tiles: ['sl', 'departures'], every: 'each site once a minute, one site per two seconds',
    terms: 'Open data under CC0, keyless.', checked: '2026-09-27', contact: 'trafiklab.se',
    credit: { en: 'Stockholm departures from SL through Trafiklab.', sv: 'Avgångar i Stockholm från SL via Trafiklab.' }, link: 'https://www.trafiklab.se/'
  },
  weather: {
    name: 'Open-Meteo', tier: 'browser', tiles: ['weather'], every: 'each place every 15 minutes',
    terms: 'Free for non-commercial use, CC BY 4.0, under 10 000 calls a day.', checked: '2026-09-27', contact: 'open-meteo.com',
    credit: { en: 'Weather data by Open-Meteo.com.', sv: 'Väderdata från Open-Meteo.com.' }, link: 'https://open-meteo.com/'
  },
  holidays: {
    name: 'Nager.Date', tier: 'browser', tiles: ['today', 'countdown'], every: 'each country once a day',
    terms: 'Free public API, MIT licensed, no key.', checked: '2026-09-29', contact: 'date.nager.at',
    credit: { en: 'Public holidays from Nager.Date.', sv: 'Helgdagar från Nager.Date.' }, link: 'https://date.nager.at/'
  },
  electricity: {
    name: 'elprisetjustnu.se', tier: 'browser', tiles: ['electricity'], every: 'each area every 30 minutes',
    terms: 'Free, keyless, credit asked for.', checked: '2026-09-27', contact: 'elprisetjustnu.se',
    credit: { en: 'Prices from elprisetjustnu.se.', sv: 'Priser från elprisetjustnu.se.' }, link: 'https://www.elprisetjustnu.se/'
  },
  fx: {
    name: 'Frankfurter', tier: 'browser', tiles: ['currency'], every: 'each base every three hours',
    terms: 'Free, keyless, European Central Bank reference rates.', checked: '2026-09-27', contact: 'frankfurter.dev',
    credit: { en: 'European Central Bank reference rates, through Frankfurter.', sv: 'Europeiska centralbankens referenskurser, via Frankfurter.' }, link: 'https://frankfurter.dev/'
  },
  markets: {
    name: 'Alpha Vantage', tier: 'worker', tiles: ['markets'], every: 'each symbol once a day after its exchange closes, through one Durable Object for every screen',
    terms: 'Split-Flap was approved for Alpha Vantage\'s programme for open-source projects on 29 September 2026. The key it granted answers as a standard free key, 25 calls a day.', checked: '2026-09-29', contact: 'support@alphavantage.co',
    credit: { en: 'Stock and ETF prices from Alpha Vantage.', sv: 'Aktie- och fondkurser från Alpha Vantage.' }, link: 'https://www.alphavantage.co/'
  },
  ratesEcb: { name: 'ECB Data Portal', tier: 'browser', tiles: ['rates'], every: 'once every six hours', terms: 'ECB statistics, free to reuse with the source named.', checked: '2026-09-30', contact: 'data.ecb.europa.eu',
    credit: { en: 'ECB rates from the ECB Data Portal.', sv: 'ECB:s räntor från ECB Data Portal.' }, link: 'https://data.ecb.europa.eu/' },
  ratesFed: { name: 'Federal Reserve Bank of New York', tier: 'browser', tiles: ['rates'], every: 'once every six hours', terms: 'Public reference rates, free to use with credit.', checked: '2026-09-30', contact: 'newyorkfed.org',
    credit: { en: 'Fed rates from the Federal Reserve Bank of New York.', sv: 'Feds räntor från Federal Reserve Bank of New York.' }, link: 'https://www.newyorkfed.org/markets/reference-rates/effr' },
  ratesBoe: { name: 'Bank of England', tier: 'worker', tiles: ['rates'], every: 'once a day, through the Worker', terms: 'Bank of England database, free to reuse with credit.', checked: '2026-09-30', contact: 'bankofengland.co.uk',
    credit: { en: 'Bank Rate from the Bank of England.', sv: 'Bank Rate från Bank of England.' }, link: 'https://www.bankofengland.co.uk/boeapps/database/' },
  ratesRiks: { name: 'Sveriges Riksbank', tier: 'worker', tiles: ['rates'], every: 'once a day, through the Worker', terms: 'Open data from the Riksbank\'s SWEA API.', checked: '2026-09-30', contact: 'riksbank.se',
    credit: { en: 'The policy rate from Sveriges Riksbank.', sv: 'Styrräntan från Sveriges riksbank.' }, link: 'https://www.riksbank.se/en-gb/statistics/' },
  crypto: {
    name: 'CoinGecko', tier: 'browser', tiles: ['currency', 'markets'], every: 'every five minutes for the coins on a board',
    terms: 'Public API without a key, around 30 calls a minute, attribution required.', checked: '2026-09-29', contact: 'coingecko.com',
    credit: { en: 'Crypto prices by CoinGecko.', sv: 'Kryptopriser från CoinGecko.' }, link: 'https://www.coingecko.com/'
  },
  onthisday: {
    name: 'Wikipedia', tier: 'browser', tiles: ['onthisday'], every: 'each edition every six hours',
    terms: 'CC BY-SA 4.0.', checked: '2026-09-27', contact: 'wikimedia.org',
    credit: { en: 'Events from Wikipedia, CC BY-SA 4.0.', sv: 'Händelser från Wikipedia, CC BY-SA 4.0.' }, link: 'https://www.wikipedia.org/'
  }
};

// The sources a tile draws on, for its note in the editor.
export const sourcesFor = tile => Object.entries(SOURCES).filter(([, s]) => s.tiles.includes(tile)).map(([id, s]) => Object.assign({ id }, s));
