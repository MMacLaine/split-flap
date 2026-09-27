# Split-Flap accounts API

A Cloudflare Worker on `maclaine.se/split-flap/api/*`, with a D1 database in the EU
jurisdiction and Better Auth for sign in with Google. The app in the repo root has no
dependencies and never loads this code; it only calls the API.

## What it stores

The account (Google's account id, the full name, email), the sessions (no IP address or
user agent), and the boards as the app sent them. No Google tokens, no profile picture,
no telemetry. Deleting the account deletes all of it.

## Run it locally

```sh
cd ~/split-flap && python3 -m http.server 8801 &          # the app
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
