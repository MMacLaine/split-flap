// Worker checks that need no running server.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { devTest } from '../src/index.js';

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
