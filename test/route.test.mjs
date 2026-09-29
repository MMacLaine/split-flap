// Editor addresses (0.7): every level has one, round trips, and Back goes up one level.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, routeHash, parentRoute } from '../src/route.js';

test('every level has an address that reads back as the same level', () => {
  for (const h of ['#/storyboards', '#/storyboards/b-1x/week', '#/storyboards/b-1x/boards', '#/storyboards/b-1x/display', '#/storyboards/b-1x/boards/p9',
    '#/my-boards', '#/my-boards/m1x', '#/explore', '#/explore/cafe', '#/account', '#/account/help', '#/account/log']) assert.equal(routeHash(parseRoute(h)), h, h);
});

test('board links and anything else are not editor addresses', () => {
  for (const h of ['', '#', '#b=abc', '#log', '#/nowhere']) assert.equal(parseRoute(h), null, h);
  assert.deepEqual(parseRoute('#/storyboards/b1'), { sec: 'sb', lv: 'sb', sb: 'b1', view: 'week' });   // the week is the main view
  assert.deepEqual(parseRoute('#/storyboards/<script>/week'), { sec: 'sb', lv: 'list' });                  // a bad id falls back to the list
});

test('Back goes up one level, and a section top has no Back', () => {
  const up = h => routeHash(parentRoute(parseRoute(h)));
  assert.equal(up('#/storyboards/b1/boards/p2'), '#/storyboards/b1/boards');
  assert.equal(up('#/storyboards/b1/week'), '#/storyboards');
  assert.equal(up('#/explore/cafe'), '#/explore');
  assert.equal(up('#/my-boards/m1'), '#/my-boards');
  assert.equal(up('#/account/log'), '#/account');
  for (const h of ['#/storyboards', '#/my-boards', '#/explore', '#/account']) assert.equal(parentRoute(parseRoute(h)), null, h);
  assert.equal(routeHash(parentRoute(Object.assign(parseRoute('#/storyboards/b1/boards/p2'), { from: 'week' }))), '#/storyboards/b1/week');   // back to the week it was opened from
});

test('Explore sections (0.9): a page each, a template inside one, and older template addresses still open', () => {
  assert.deepEqual(parseRoute('#/explore/finance'), { sec: 'ex', lv: 'section', section: 'finance' });
  assert.deepEqual(parseRoute('#/explore/finance/stocks'), { sec: 'ex', lv: 'tpl', tpl: 'stocks', section: 'finance' });
  assert.deepEqual(parseRoute('#/explore/station'), { sec: 'ex', lv: 'tpl', tpl: 'station' });
  assert.equal(routeHash({ sec: 'ex', lv: 'tpl', tpl: 'stocks', section: 'finance' }), '#/explore/finance/stocks');
  assert.equal(routeHash({ sec: 'ex', lv: 'section', section: 'finance' }), '#/explore/finance');
  assert.deepEqual(parentRoute({ sec: 'ex', lv: 'tpl', tpl: 'stocks', section: 'finance' }), { sec: 'ex', lv: 'section', section: 'finance' });
  assert.deepEqual(parentRoute({ sec: 'ex', lv: 'section', section: 'finance' }), { sec: 'ex', lv: 'list' });
});
