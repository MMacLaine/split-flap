# Split-Flap accounts API

A Cloudflare Worker on `maclaine.se/split-flap/api/*`, with a D1 database in the EU
jurisdiction and Better Auth for sign in with Google. The app in the repo root has no
dependencies and never loads this code; it only calls the API.

## What it stores

The account (Google's account id, the full name, email), the sessions (no IP address or
user agent), and the boards as the app sent them. No Google tokens, no profile picture,
no telemetry. Deleting the account deletes all of it.

## Live data (0.8)

`/split-flap/api/data/*` answers without a sign-in. It asks Transitous for departures,
stop searches and the stops near a place, with a User-Agent that names the app, and keeps
each answer in Cloudflare's edge cache (departures for a minute, stops for a day), so
every screen watching one stop shares one request. Only the routes and parameter shapes
in `src/data.js` are fetched. It is not a relay for other addresses. Uncached requests
are limited to 120 a minute per address by the `DATA` rate limit, and nothing about them
is stored or logged beyond the failure line every route has.

Every request to `/data/*` runs the Worker, cache hit or not, and the free plan allows
100 000 Worker requests a day for the whole account, the accounts API included. A screen
polls a stop every two minutes (every minute on a station board), about 720 requests a
day, so roughly 130 screen-stops use the allowance up. Watch the daily count in the
Worker's metrics; Workers Paid ($5 a month) is the answer past about half of it.

When the daily limit is reached, Cloudflare either fails open (requests go on to Pages,
which answers 404) or fails closed (an error page), set under the zone's Workers Routes.
Either way the app on maclaine.se never goes to Transitous directly: it decides once per
page load whether a Worker is there, and on maclaine.se there always is one, so
departures show their last data with its age until the Worker answers again. Fail open
also hides the account controls for that time, as for any other outage of the API.

To switch a source off without a release, set the `SOURCES_OFF` variable (for example
`transit`) in the dashboard under the Worker's Settings, Variables. Its routes answer
503 and the app hides its tile and the templates that use it within half an hour, or at
the next load. Empty it to switch the source back on.

## Connections (0.9.2)

`/split-flap/api/connections` keeps an account's own sources (an Alpha Vantage key, a
published sheet), with the same revision and delete rules as boards and blueprints. Each
value is sealed with AES-GCM before it reaches D1 (`src/seal.js`): a random IV for each
value, the account and connection ids bound in, and a `v1:` prefix for rotating the key.
The key is `CONN_KEY`, 32 random bytes in base64, a secret. Cloudflare never shows a
secret back, so keep a copy before setting it:

```sh
openssl rand -base64 32              # copy the output into your password manager as "Split-Flap CONN_KEY"
npx wrangler secret put CONN_KEY     # paste it when asked
```

**Never generate it again.** A new `CONN_KEY` makes every sealed value in D1 unreadable
for good. A browser that still holds a value sends it back and it is sealed again
(`healBroken` in `src/sync.js`), but a device with none gets nothing. To rotate the key
one day, add a `v2` key beside `v1` and seal new values with it, never replace `v1`.

Without it, `/connections` answers 503 and stores nothing; there is no plain text
fallback. It protects against a leak of the database, not against a Worker that has been
taken over. The export lists connections by name and kind, never their values, and
deleting the account removes them.

`/split-flap/api/data/feed?u=<address>` (0.9.3) fetches a feed for a screen, signed in or
not, but only a built-in one (`data/feeds.json`) or one some account has added as a feed
connection: the row carries an HMAC of the address (a key derived from `CONN_KEY` with
HKDF), and the route looks for it. https on port 443 to a public host only, re-checked on
every redirect; the body must start like a feed; 1 MB and 10 seconds at most; 20 feeds per
account and `FEEDS_PER_DAY` new addresses a day for everyone; kill switch `feeds`. The
body always goes back as `text/plain` in a sandbox, as an attachment.

`/split-flap/api/data/rates?b=boe|riks&y=1|5` fetches the Bank of England's and the
Riksbank's policy rates for the app, which cannot read them itself, cached for a day,
with the kill switch `rates`. Every `/data` answer carries `content-security-policy:
sandbox` and `content-disposition: attachment`, so none can run as a page on maclaine.se.

## Run it locally

```sh
cd ~/split-flap && npm run serve &                         # the app
cd worker && npm install
npx wrangler d1 migrations apply split-flap --local --env dev
npx wrangler dev --env dev --port 8787                     # app and API on http://localhost:8787
```

Secrets for local runs go in `worker/.dev.vars` (gitignored): `BETTER_AUTH_SECRET` and
`GOOGLE_CLIENT_SECRET`. The Google client ID goes in `wrangler.toml`, since it is not
secret.

## Tests

With the dev server running and `DEV_TEST=1` (add `--var DEV_TEST:1` to the dev command,
or put it in `.dev.vars`):

```sh
npm test
```

The test-only `/dev/session` route makes an account without Google. It only answers when
`DEV_TEST` is `1` and `BASE_URL` is a localhost address, so it can never run in production.

## Deploy

```sh
npx wrangler d1 create split-flap --jurisdiction eu          # once; put the id in wrangler.toml
npx wrangler d1 migrations apply split-flap --remote
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler deploy
```

After upgrading Better Auth, run `node scripts/gen-auth-sql.mjs`, and if
`migrations/0001_auth.sql` changed, write the difference as a new migration.
