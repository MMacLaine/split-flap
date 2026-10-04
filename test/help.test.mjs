// Help (0.11.5): both languages have the same sections, in the same order, and start
// with Start here; no section makes a privacy claim (those live on the privacy page).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HELP, INTRO } from '../src/help.js';

test('English and Swedish Help have the same sections, starting with Start here', () => {
  assert.equal(HELP.en.length, HELP.sv.length);
  assert.equal(HELP.en[0].h, 'Start here'); assert.equal(HELP.sv[0].h, 'Börja här');
  HELP.en.forEach((s, i) => assert.equal(!!s.fig, !!HELP.sv[i].fig, `section ${i + 1} figure`));
  assert.ok(INTRO.en.toc && INTRO.sv.toc);
});
test('links in Help go to levels the editor knows', () => {
  const known = new Set(['account', 'help', 'log', 'start', 'settings', 'privacy', 'playlists', 'spellistor']);   // the last two land on the playlist list, editor.go's default
  for (const l of ['en', 'sv']) for (const s of HELP[l]) for (const p of s.p || []) if (Array.isArray(p)) for (const x of p) if (typeof x === 'object') assert.ok(known.has(x.k || x.href), `${l}: ${x.k || x.href}`);
});
