// Refresh data/sl-sites.json from SL's open site list (keyless). The full response is
// about 1.3 MB; this keeps only id, name and the disambiguating note, sorted by name,
// so station search can load it once, lazily, when someone opens the SL picker.
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
const list = raw
  .filter(s => s.id && s.name)
  .map(s => (s.note && s.note !== s.name ? [s.id, s.name, s.note] : [s.id, s.name]))
  .sort((a, b) => a[1].localeCompare(b[1], 'sv') || a[0] - b[0]);
writeFileSync(new URL('../data/sl-sites.json', import.meta.url), JSON.stringify(list));
console.log(`${list.length} sites written`);
