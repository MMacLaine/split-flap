// Departures from Transitous (0.8), the open, volunteer-run journey planner built on
// GTFS feeds from most of Europe and North America (transitous.org). Its terms: free for
// open-source, non-commercial projects that are light on its resources, with a link to
// transitous.org/sources and credit to OpenStreetMap.
//
// The Worker asks Transitous and caches the answer, so a hundred screens watching one
// stop cost one request a minute; the app falls back to asking Transitous itself when
// the Worker is not there (local development). Both go through the functions below, so
// the shape a tile sees is the same either way:
//   { line, dest, time, sched, platform, cancelled, mode, rt }   time and sched in UTC
// Pure functions, run by the app, the Worker and the Node tests alike.

import { printable } from './charset.js';

export const TRANSITOUS = 'https://api.transitous.org';

// The five kinds of vehicle the board filters by (the same as SL's), from GTFS modes.
export const MODES = ['METRO', 'TRAIN', 'TRAM', 'BUS', 'SHIP'];
export function modeOf(m) {
  m = String(m || '').toUpperCase();
  if (m === 'SUBWAY' || m === 'METRO') return 'METRO';
  if (m === 'TRAM' || m === 'CABLE_CAR' || m === 'FUNICULAR') return 'TRAM';
  if (m === 'BUS' || m === 'COACH' || m === 'TROLLEYBUS') return 'BUS';
  if (m === 'FERRY') return 'SHIP';
  if (/RAIL|SUBURBAN|LONG_DISTANCE|TRAIN/.test(m)) return 'TRAIN';
  return 'OTHER';
}

// Ids as Transitous writes them (se-Trafiklab_740021013, gb-great-britain_910GKNGX). The
// Worker only passes on ids of this shape, so it can never be made to fetch anything else.
export const STOP_ID = /^[A-Za-z0-9][A-Za-z0-9_.:\-]{0,119}$/;

// /api/v5/stoptimes to departures, with the stop's own time zone for printing the clock.
export function stoptimes(j) {
  const list = (j && Array.isArray(j.stopTimes) ? j.stopTimes : []).slice(0, 40);
  const tz = (j && j.place && j.place.tz) || (list[0] && list[0].place && list[0].place.tz) || null;
  const deps = list.map(s => {
    const p = s.place || {}, time = p.departure || p.scheduledDeparture || null;
    if (!time) return null;
    return {
      line: printable(s.routeShortName, s.tripShortName, s.displayName).slice(0, 6),
      dest: printable(s.headsign, s.tripTo && s.tripTo.name).slice(0, 40),
      time, sched: p.scheduledDeparture || time,
      platform: printable(p.track || p.scheduledTrack || '').slice(0, 4),
      cancelled: !!(p.cancelled || s.cancelled || s.tripCancelled),
      mode: modeOf(s.mode), rt: !!s.realTime
    };
  }).filter(Boolean);
  const alert = list.flatMap(s => (s.place && s.place.alerts) || []).map(a => a && a.headerText).find(Boolean);
  return Object.assign({ tz, deps }, alert ? { alert: printable(alert).slice(0, 200) } : {});
}

// /api/v1/geocode and /api/v1/reverse-geocode (type=STOP) to stops. Two stops with the
// same name are usually the platforms of one station, so only the first is kept.
export function stops(j) {
  const seen = new Set(), out = [];
  for (const x of Array.isArray(j) ? j : []) {
    if (!x || x.type !== 'STOP' || !STOP_ID.test(x.id || '')) continue;
    const name = String(x.name || '').slice(0, 80), key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    const area = (x.areas || []).find(a => a && a.default) || (x.areas || []).find(a => a && a.unique);
    out.push({ id: x.id, name, note: area && area.name !== name ? String(area.name).slice(0, 60) : '', modes: [...new Set((x.modes || []).map(modeOf))].filter(m => m !== 'OTHER'),
      lat: +(+x.lat).toFixed(4), lon: +(+x.lon).toFixed(4), ...(x.tz ? { tz: x.tz } : {}), ...(x.country ? { cc: String(x.country).toUpperCase() } : {}) });
    if (out.length >= 8) break;
  }
  return out;
}

// The upstream addresses, from checked parameters only.
export const upstream = {
  departures: (stop, n) => `${TRANSITOUS}/api/v5/stoptimes?stopId=${encodeURIComponent(stop)}&n=${n}&language=en`,
  search: (text, lang) => `${TRANSITOUS}/api/v1/geocode?text=${encodeURIComponent(text)}&type=STOP&language=${lang}`,
  near: (lat, lon) => `${TRANSITOUS}/api/v1/reverse-geocode?place=${lat},${lon}&type=STOP`
};
// Coordinates are rounded to about a hundred metres, so nearby screens share a cache entry.
export const roundLL = v => Math.round(+v * 1000) / 1000;
