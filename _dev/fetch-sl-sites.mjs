// Refresh data/sl-sites.json from SL's open site list (keyless). The full response is
// about 1.3 MB; this keeps only id, name and the disambiguating note, sorted by name,
// so station search can load it once, lazily, when someone opens the SL picker.
// Rail stations are marked with their modes (M metro, R commuter/local rail, T tram)
// taken from the maclaine.se SL map's stations.geojson, so search can rank and label
// them above the thousands of bus stops.
//   node _dev/fetch-sl-sites.mjs [saved-response.json]
// The endpoint rate limits (HTTP 429); pass a previously saved response to skip the fetch.
import { readFileSync, writeFileSync } from 'node:fs';
let raw;
if (process.argv[2]) raw = JSON.parse(readFileSync(process.argv[2], 'utf8'));
else {
  const r = await fetch('https://transport.integration.sl.se/v1/sites?expand=false');
  if (!r.ok) throw new Error('SL sites: HTTP ' + r.status);
  raw = await r.json();
}
const GEO = process.env.SLMAP_STATIONS || '/Users/matthewmaclaine/personal website/stockholm-sl-map/data/stations.geojson';
const modes = new Map();
try {
  const letter = { metro: 'M', rail: 'R', tram: 'T' };
  for (const f of JSON.parse(readFileSync(GEO, 'utf8')).features) {
    const p = f.properties, ids = p.sites || (p.site ? [p.site] : []);
    for (const id of ids) modes.set(id, [...new Set([...(modes.get(id) || ''), ...(p.modes || []).map(m => letter[m] || '')])].join(''));
  }
} catch { console.warn('no SL map stations file; rail modes left out'); }
const list = raw
  .filter(s => s.id && s.name)
  .map(s => {
    const row = [s.id, s.name, s.note && s.note !== s.name ? s.note : '', modes.get(s.id) || ''];
    while (row.length > 2 && !row[row.length - 1]) row.pop();
    return row;
  })
  .sort((a, b) => a[1].localeCompare(b[1], 'sv') || a[0] - b[0]);
writeFileSync(new URL('../data/sl-sites.json', import.meta.url), JSON.stringify(list));
console.log(`${list.length} sites written`);
