// How Split-Flap is used: the anonymous counts from Workers Analytics Engine (0.11.5).
//
//   node _dev/stats.mjs            # the last 7 days
//   node _dev/stats.mjs 30         # the last 30 days (Analytics Engine keeps about 90)
//
// Needs an API token with Account Analytics: Read, and the account id. Set them as
// CF_API_TOKEN and CF_ACCOUNT_ID, or put them in _local/.env as KEY=value lines.
// The dataset and its columns are described in worker/src/events.js.

import { readFileSync } from 'node:fs';

const env = { ...process.env };
try {
  for (const line of readFileSync(new URL('../_local/.env', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/); if (m && !env[m[1]]) env[m[1]] = m[2];
  }
} catch { /* no _local/.env */ }
const { CF_API_TOKEN: TOKEN, CF_ACCOUNT_ID: ACCOUNT } = env;
if (!TOKEN || !ACCOUNT) {
  console.error('Set CF_API_TOKEN (Account Analytics: Read) and CF_ACCOUNT_ID, or put them in _local/.env.');
  process.exit(1);
}
const DAYS = Math.max(1, Math.min(90, +(process.argv[2] || 7)));
const DS = 'split_flap_events', SINCE = `timestamp > NOW() - INTERVAL '${DAYS}' DAY`;
const N = 'SUM(_sample_interval)';   // a count that allows for sampling

async function sql(q) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/analytics_engine/sql`, {
    method: 'POST', headers: { authorization: `Bearer ${TOKEN}` }, body: q
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${r.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text).data || [];
}
const pad = (s, n) => String(s).slice(0, n).padEnd(n);
function table(title, rows, cols) {
  console.log(`\n${title}`);
  if (!rows.length) { console.log('  (none yet)'); return; }
  for (const r of rows) console.log('  ' + cols.map(([k, w]) => pad(r[k] ?? '', w)).join('  '));
}
const top = (blob, where, limit = 15) =>
  sql(`SELECT ${blob} AS k, ${N} AS n FROM ${DS} WHERE ${SINCE} AND ${where} GROUP BY k ORDER BY n DESC LIMIT ${limit}`);

console.log(`Split-Flap, the last ${DAYS} day${DAYS > 1 ? 's' : ''}`);

const days = await sql(`SELECT toStartOfDay(timestamp) AS day,
  SUM(IF(blob1 = 'open' AND blob4 != 'kiosk', _sample_interval, 0)) AS visits,
  SUM(IF(blob1 = 'open' AND blob4 = 'kiosk', _sample_interval, 0)) AS walls,
  SUM(IF(blob1 = 'open' AND blob8 = 'no', _sample_interval, 0)) AS fresh,
  SUM(IF(blob1 = 'template_used', _sample_interval, 0)) AS templates,
  SUM(IF(blob1 = 'fail', _sample_interval, 0)) AS fails,
  SUM(IF(blob1 = 'error', _sample_interval, 0)) AS errors
  FROM ${DS} WHERE ${SINCE} GROUP BY day ORDER BY day`);
table('By day: visits (not walls), wall screens loading, new browsers, templates used, failed presses, errors', days.map(d => ({ ...d, day: String(d.day).slice(0, 10) })),
  [['day', 10], ['visits', 7], ['walls', 6], ['fresh', 6], ['templates', 10], ['fails', 6], ['errors', 6]]);

// from first visit to an account: where guests drop off
const f = (await sql(`SELECT
  SUM(IF(blob1 = 'open' AND blob2 = 'first', _sample_interval, 0)) AS firsts,
  SUM(IF(blob1 = 'view' AND blob8 = 'no', _sample_interval, 0)) AS explored,
  SUM(IF(blob1 = 'template_used' AND blob8 = 'no', _sample_interval, 0)) AS tpl,
  SUM(IF(blob1 = 'signin_offer' AND blob2 = 'kept', _sample_interval, 0)) AS kept
  FROM ${DS} WHERE ${SINCE}`))[0] || {};
console.log(`\nFirst visits ${f.firsts || 0}, screens opened by new browsers ${f.explored || 0}, used a template ${f.tpl || 0}, kept their boards at sign-in ${f.kept || 0}`);

table('Where people go (screens opened)', await top('blob2', "blob1 = 'view'", 20), [['k', 24], ['n', 8]]);
table('Templates used', await top('blob2', "blob1 = 'template_used'"), [['k', 24], ['n', 8]]);
table('Templates looked at', await top('blob3', "blob1 = 'view' AND blob2 = 'ex:tpl'"), [['k', 24], ['n', 8]]);
table('Look sheet opened (from where)', await top('blob2', "blob1 = 'look_sheet'"), [['k', 24], ['n', 8]]);
table('Looks picked', await top('blob2', "blob1 = 'look_used'"), [['k', 24], ['n', 8]]);
table('What is on when the board opens (look)', await top('blob3', "blob1 = 'open'"), [['k', 24], ['n', 8]]);
table('How it is shown', await top('blob4', "blob1 = 'open'"), [['k', 24], ['n', 8]]);
table('Failed presses (blockers)', await top('blob2', "blob1 = 'fail'"), [['k', 24], ['n', 8]]);
table('What the status line said most (what people did)', await top('blob2', "blob1 = 'said'", 25), [['k', 24], ['n', 8]]);
table('Listen', await top('blob2', "blob1 = 'listen'"), [['k', 24], ['n', 8]]);
table('Errors', await sql(`SELECT blob2 AS msg, blob3 AS at, ${N} AS n FROM ${DS} WHERE ${SINCE} AND blob1 = 'error' GROUP BY msg, at ORDER BY n DESC LIMIT 15`),
  [['msg', 44], ['at', 22], ['n', 6]]);
table('Screens', await top('blob5', "blob1 = 'open'"), [['k', 24], ['n', 8]]);
table('Countries', await top('blob11', "blob1 = 'open'"), [['k', 24], ['n', 8]]);
table('Languages', await top('blob6', "blob1 = 'open'"), [['k', 24], ['n', 8]]);
table('Versions', await top('blob7', "blob1 = 'open'"), [['k', 24], ['n', 8]]);
table('Library size at open (playlists / boards / board size)', await sql(`SELECT blob2 AS pl, blob3 AS bd, blob4 AS sz, ${N} AS n FROM ${DS} WHERE ${SINCE} AND blob1 = 'library' GROUP BY pl, bd, sz ORDER BY n DESC LIMIT 12`),
  [['pl', 6], ['bd', 6], ['sz', 8], ['n', 6]]);
