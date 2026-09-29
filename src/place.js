// The Place (0.8): where a storyboard's screen is. One city search in Display sets it,
// and every live tile reads its defaults from it: the weather, the nearest stops, the
// holidays, the currency, and 12 or 24 hours. Pure functions, so they run in Node tests.
//
// A Place is { city, lat, lon, cc, tz }: cc is the ISO 3166 country code and tz the
// IANA time zone, both from Open-Meteo's city search. Boards saved before 0.8 have only
// city, lat and lon, and read as a place with no country until the city is picked again.

// Countries whose clocks, timetables and shop signs use 12 hours. Intl's hour cycle for a
// country depends on the language asked with (en-GB says 12, sv-SE says 24), so this is a
// table: it answers the same in every browser.
const H12 = new Set(['US', 'CA', 'AU', 'NZ', 'PH', 'IN', 'PK', 'BD', 'EG', 'SA', 'MY', 'KR', 'JO', 'CO']);
// Fahrenheit for the air temperature.
const FAHRENHEIT = new Set(['US', 'LR', 'BS', 'BZ', 'KY', 'PW', 'FM', 'MH']);

// ISO 3166 country to ISO 4217 currency, grouped by currency. Frankfurter (the rates
// source) quotes about thirty of these; the rest still name the currency in Menu.
const BY_CURRENCY = {
  EUR: 'AT BE HR CY EE FI FR DE GR IE IT LV LT LU MT NL PT SK SI ES AD MC SM VA ME XK AX GF GP MQ RE YT PM BL MF',
  USD: 'US EC SV PA PR TL GU AS VI MP FM MH PW BQ TC VG IO',
  GBP: 'GB IM JE GG', SEK: 'SE', NOK: 'NO SJ BV', DKK: 'DK FO GL', ISK: 'IS', CHF: 'CH LI', PLN: 'PL', CZK: 'CZ',
  HUF: 'HU', RON: 'RO', BGN: 'BG', RSD: 'RS', BAM: 'BA', MKD: 'MK', ALL: 'AL', MDL: 'MD', UAH: 'UA', BYN: 'BY', RUB: 'RU',
  TRY: 'TR', GEL: 'GE', AMD: 'AM', AZN: 'AZ', KZT: 'KZ', UZS: 'UZ', KGS: 'KG', TJS: 'TJ', TMT: 'TM',
  CAD: 'CA', MXN: 'MX', BRL: 'BR', ARS: 'AR', CLP: 'CL', COP: 'CO', PEN: 'PE', UYU: 'UY', PYG: 'PY', BOB: 'BO', VES: 'VE',
  GTQ: 'GT', HNL: 'HN', NIO: 'NI', CRC: 'CR', DOP: 'DO', JMD: 'JM', TTD: 'TT', BBD: 'BB', BSD: 'BS', BZD: 'BZ', HTG: 'HT', CUP: 'CU',
  XCD: 'AG DM GD KN LC VC AI MS', AWG: 'AW', ANG: 'CW SX', KYD: 'KY', BMD: 'BM', SRD: 'SR', GYD: 'GY',
  JPY: 'JP', CNY: 'CN', HKD: 'HK', MOP: 'MO', TWD: 'TW', KRW: 'KR', KPW: 'KP', MNT: 'MN', INR: 'IN BT', PKR: 'PK', BDT: 'BD',
  LKR: 'LK', NPR: 'NP', MVR: 'MV', AFN: 'AF', IRR: 'IR', IQD: 'IQ', SYP: 'SY', LBP: 'LB', JOD: 'JO', ILS: 'IL PS',
  SAR: 'SA', AED: 'AE', QAR: 'QA', BHD: 'BH', KWD: 'KW', OMR: 'OM', YER: 'YE',
  THB: 'TH', VND: 'VN', LAK: 'LA', KHR: 'KH', MMK: 'MM', MYR: 'MY', SGD: 'SG', BND: 'BN', IDR: 'ID', PHP: 'PH',
  AUD: 'AU KI NR TV CX CC NF', NZD: 'NZ CK NU PN TK', FJD: 'FJ', PGK: 'PG', SBD: 'SB', VUV: 'VU', WST: 'WS', TOP: 'TO', XPF: 'PF NC WF',
  ZAR: 'ZA', NAD: 'NA', BWP: 'BW', LSL: 'LS', SZL: 'SZ', EGP: 'EG', MAD: 'MA EH', DZD: 'DZ', TND: 'TN', LYD: 'LY', SDG: 'SD', SSP: 'SS',
  ETB: 'ET', KES: 'KE', UGX: 'UG', TZS: 'TZ', RWF: 'RW', BIF: 'BI', SOS: 'SO', DJF: 'DJ', ERN: 'ER', NGN: 'NG', GHS: 'GH',
  XOF: 'BJ BF CI GW ML NE SN TG', XAF: 'CM CF TD CG GQ GA', CDF: 'CD', AOA: 'AO', ZMW: 'ZM', MWK: 'MW', MZN: 'MZ', MGA: 'MG',
  MUR: 'MU', SCR: 'SC', KMF: 'KM', CVE: 'CV', GMD: 'GM', GNF: 'GN', SLE: 'SL', LRD: 'LR', MRU: 'MR', STN: 'ST', ZWG: 'ZW'
};
export const CURRENCY_OF = Object.fromEntries(Object.entries(BY_CURRENCY).flatMap(([cur, ccs]) => ccs.split(' ').map(cc => [cc, cur])));

// The currencies Frankfurter quotes (European Central Bank reference rates), for the
// Currency tile's lists.
export const FX_CURRENCIES = ['AUD', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD', 'HUF', 'IDR', 'ILS', 'INR', 'ISK', 'JPY',
  'KRW', 'MXN', 'MYR', 'NOK', 'NZD', 'PHP', 'PLN', 'RON', 'SEK', 'SGD', 'THB', 'TRY', 'USD', 'ZAR'];

const CC = /^[A-Z]{2}$/;
export const validTz = tz => { if (typeof tz !== 'string' || !tz || tz.length > 64) return false; try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; } };

// The country the browser is set to, from its language tag (en-GB to GB, sv to SE).
export function browserCountry(tags) {
  for (const tag of tags || []) {
    try { const r = new Intl.Locale(tag).maximize().region; if (r && CC.test(r)) return r; } catch { /* a malformed tag */ }
  }
  return null;
}
export const screenTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch { return null; } };

// The board's place with every field filled that can be: the stored city, else the
// browser's country and the screen's time zone (no coordinates, so no weather or stops).
export function placeOf(board, env = {}) {
  const l = board && board.loc && board.loc.lat != null ? board.loc : null;
  const cc = l && CC.test(l.cc || '') ? l.cc : l ? null : browserCountry(env.langs);
  return l ? { city: l.city || '', lat: l.lat, lon: l.lon, cc, tz: validTz(l.tz) ? l.tz : null, set: true }
    : { city: '', lat: null, lon: null, cc, tz: env.tz || null, set: false };
}

// What a new tile starts with for a place: 12 or 24 hours, °C or °F, the currency.
export function formatsFor(place) {
  const cc = place && place.cc;
  return { fmt: cc && H12.has(cc) ? '12' : '24', units: cc && FAHRENHEIT.has(cc) ? 'f' : 'c', currency: (cc && CURRENCY_OF[cc]) || null };
}

// How a price is marked in Menu. The drum has $ but no € or £, so dollar countries put
// $ in front, the Nordic crowns print KR after, and everything else prints its code.
const DOLLARS = new Set(['USD', 'CAD', 'AUD', 'NZD', 'SGD', 'HKD', 'MXN', 'TWD', 'BSD', 'BBD', 'BZD', 'JMD', 'TTD', 'XCD', 'FJD', 'KYD', 'BMD', 'LRD', 'NAD', 'SBD', 'SRD', 'GYD']);
export function priceMark(cur) {
  if (!cur) return { prefix: '', suffix: '' };
  if (DOLLARS.has(cur)) return { prefix: '$', suffix: '' };
  if (cur === 'SEK' || cur === 'NOK' || cur === 'DKK' || cur === 'ISK') return { prefix: '', suffix: ' KR' };
  return { prefix: '', suffix: ' ' + cur };
}

// The time zone a screen should mention: the place's, when it differs from the screen's
// own clock (which is what the schedule runs on).
export function tzDiffers(place, tz) { return !!(place && place.tz && tz && place.tz !== tz && offsetNow(place.tz) !== offsetNow(tz)); }
function offsetNow(tz, now = Date.now()) {
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(new Date(now)).map(x => [x.type, x.value]));
    return Math.round((Date.UTC(+p.year, p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(now / 60e3) * 60e3) / 60e3);
  } catch { return null; }
}
// The wall time in a zone, as hours and minutes, for the world clock.
export function wallIn(tz, now) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', weekday: 'short', hour: 'numeric', minute: 'numeric' }).formatToParts(new Date(now)).map(x => [x.type, x.value]));
  return { h: +p.hour % 24, m: +p.minute, dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday) };
}
