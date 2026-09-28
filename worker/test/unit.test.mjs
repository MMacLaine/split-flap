// Worker checks that need no running server.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { devTest, logFailure, routeName } from '../src/index.js';

test('the test-only session route cannot open with the production settings', async () => {
  const { readFileSync } = await import('node:fs');
  const toml = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
  const base = /\[vars\][^[]*BASE_URL = "([^"]+)"/.exec(toml)[1];
  assert.equal(base, 'https://maclaine.se');
  assert.ok(!/DEV_TEST/.test(toml.replace(/#.*$/gm, '')), 'DEV_TEST must never be set in wrangler.toml');
  assert.equal(devTest({ BASE_URL: base, DEV_TEST: '1' }), false);          // even with the flag, not on maclaine.se
  assert.equal(devTest({ BASE_URL: 'http://localhost:8787' }), false);      // not without the flag
  assert.equal(devTest({ BASE_URL: 'http://localhost:8787', DEV_TEST: '1' }), true);
});

test('D1 enforces that a board belongs to an account, so a deleted account cannot gain boards', () => {
  const run = sql => execFileSync('npx', ['wrangler', 'd1', 'execute', 'split-flap', '--local', '--env', 'dev', '--command', sql], { cwd: new URL('..', import.meta.url).pathname, stdio: 'pipe' }).toString();
  assert.throws(() => run("INSERT INTO board (user_id, id, rev, updated, deleted, json) VALUES ('no-such-user', 'x', 1, 0, 0, '{}')"), /FOREIGN KEY/);
});

test('a failed request is logged with its route, status and code, and nothing about the user', async () => {
  const req = (method, path) => [new Request('https://maclaine.se/split-flap/api' + path, { method }), new URL('https://maclaine.se/split-flap/api' + path)];
  const res = (status, body, headers = {}) => new Response(body ? JSON.stringify(body) : null, { status, headers });
  const quiet = console.warn; console.warn = () => {};
  try {
    assert.deepEqual(await logFailure(...req('PUT', '/boards/b-secret-id'), res(413, { error: 'too_many_boards' })),
      { failed: '/boards/:id', method: 'PUT', status: 413, error: 'too_many_boards' });
    assert.equal(await logFailure(...req('GET', '/me'), res(401, { error: 'signed_out' })), null);        // a guest, not a failure
    assert.equal(await logFailure(...req('GET', '/boards'), res(200, { boards: [] })), null);
    assert.deepEqual(await logFailure(...req('GET', '/auth/callback/google'), res(302, null, { location: '/split-flap/api/auth/error?error=state_mismatch' })),
      { failed: '/auth/callback', method: 'GET', status: 302, error: 'state_mismatch' });
    assert.equal(await logFailure(...req('GET', '/auth/callback/google'), res(302, null, { location: '/split-flap/' })), null);
  } finally { console.warn = quiet; }
  assert.equal(routeName('/export'), '/export');
  assert.equal(routeName('/blueprints/m-secret'), '/blueprints/:id');   // blueprint ids are not logged either
});

test('the production route is a top-level key, above every [table] in wrangler.toml', async () => {
  const { readFileSync } = await import('node:fs');
  const toml = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8').replace(/#.*$/gm, '');
  const top = toml.split(/^\[/m)[0];                  // TOML puts every key after a [header] inside that table
  assert.match(top, /^routes = \[\{ pattern = "maclaine\.se\/split-flap\/api\/\*"/m);
});
