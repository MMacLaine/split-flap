// Feeds (0.9.3): which addresses may be fetched, what counts as a feed, the items in RSS,
// Atom and JSON Feed, and the Headlines zone. The feeds are cut down from real ones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { feedUrl, looksLikeFeed, parseFeed } from '../src/feeds.js';
import { headlineLines } from '../src/content.js';
import { sanitizeConnection } from '../src/connections.js';
import { sanitizeBoard } from '../src/store.js';

test('only public https feed addresses, never the Worker itself or a private machine', () => {
  assert.equal(feedUrl('https://feeds.bbci.co.uk/news/rss.xml#top'), 'https://feeds.bbci.co.uk/news/rss.xml');
  assert.equal(feedUrl('https://FEEDS.BBCI.CO.UK/news/rss.xml'), 'https://feeds.bbci.co.uk/news/rss.xml');
  for (const bad of ['http://x.com/a', 'https://127.0.0.1/', 'https://10.0.0.5/f', 'https://[::1]/', 'https://localhost/x', 'https://router.local/f', 'https://maclaine.se/split-flap/api/me',
    'https://www.maclaine.se/x', 'https://a.workers.dev/', 'https://x.com:8443/', 'https://user:pw@x.com/', 'https://intranet/', 'javascript:alert(1)', ''])
    assert.equal(feedUrl(bad), null, bad);
});

test('a body is a feed from its first bytes', () => {
  assert.ok(looksLikeFeed('﻿  <?xml version="1.0"?><rss>'));
  assert.ok(looksLikeFeed('<feed xmlns="http://www.w3.org/2005/Atom">'));
  assert.ok(looksLikeFeed('{"version":"https://jsonfeed.org/version/1.1"}'));
  assert.ok(!looksLikeFeed('<!DOCTYPE html><html><script>alert(1)</script>'));
  assert.ok(!looksLikeFeed('<html>'));
});

test('RSS, Atom and JSON Feed items, newest first, with entities and CDATA undone', () => {
  const rss = '<?xml version="1.0"?><rss><channel><title>BBC News</title><item><title><![CDATA[Petrol &amp; no explosives found]]></title><link>https://bbc.co.uk/a</link><pubDate>Tue, 29 Sep 2026 21:02:23 GMT</pubDate></item><item><title>Older &#8216;story&#8217;</title><pubDate>Mon, 28 Sep 2026 09:00:00 GMT</pubDate></item></channel></rss>';
  assert.deepEqual(parseFeed(rss), { title: 'BBC News', items: [
    { title: 'Petrol & no explosives found', date: '2026-09-29T21:02:23.000Z', link: 'https://bbc.co.uk/a' },
    { title: 'Older ‘story’', date: '2026-09-28T09:00:00.000Z', link: '' }] });
  const atom = '<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Recent Commits</title><entry><title>0.9.2: sources</title><updated>2026-09-29T20:15:16Z</updated><link href="https://github.com/x"/></entry></feed>';
  assert.deepEqual(parseFeed(atom).items[0], { title: '0.9.2: sources', date: '2026-09-29T20:15:16.000Z', link: 'https://github.com/x' });
  assert.equal(parseFeed(atom).title, 'Recent Commits');
  const json = JSON.stringify({ version: 'https://jsonfeed.org/version/1.1', title: 'A blog', items: [{ title: 'Hello', url: 'https://a.b/1', date_published: '2026-09-01T10:00:00Z' }] });
  assert.deepEqual(parseFeed(json), { title: 'A blog', items: [{ title: 'Hello', date: '2026-09-01T10:00:00.000Z', link: 'https://a.b/1' }] });
  assert.deepEqual(parseFeed('<html>'), { title: '', items: [] });
});

test('the Headlines zone: the feed\'s name, then the headline wrapped, one at a time', () => {
  const live = { feeds: { 'https://f.example/a': { title: 'Feed A', items: [{ title: 'First story about Łódź' }, { title: 'Second story' }] } } };
  const o = { feeds: [{ url: 'https://f.example/a', name: 'Feed A' }], every: 10 };
  // 22 wide, 20 inside the margins: "FIRST STORY ABOUT" then "LODZ"
  assert.deepEqual(headlineLines(o, { h: 6, w: 22 }, 0, 20, { headlines: 'HEADLINES' }, live).lines, ['FEED A', '', 'FIRST STORY ABOUT', 'LODZ']);
  assert.deepEqual(headlineLines(o, { h: 6, w: 22 }, 10e3, 20, {}, live).lines, ['FEED A', '', 'SECOND STORY']);
  assert.deepEqual(headlineLines(o, { h: 6, w: 22 }, 0, 20, { loading: 'LOADING' }, { feeds: {} }).lines, ['FEED A', '', 'LOADING']);
  assert.equal(headlineLines(o, { h: 6, w: 22 }, 0, 20, { feedNotAdded: 'SIGN IN TO ADD THIS FEED' }, { feeds: { 'https://f.example/a': { notAdded: true } } }).lines[2], 'SIGN IN TO ADD THIS FEED');
});

test('a feed connection and a Headlines zone keep only fetchable addresses', () => {
  assert.equal(sanitizeConnection({ id: 'c1', kind: 'feed', value: 'https://127.0.0.1/feed' }), null);
  assert.equal(sanitizeConnection({ id: 'c1', kind: 'feed', value: 'https://feeds.bbci.co.uk/news/rss.xml' }).value, 'https://feeds.bbci.co.uk/news/rss.xml');
  const b = sanitizeBoard({ pages: [{ layout: 'full', zones: [{ ch: 'headlines', o: { feeds: [{ url: 'https://a.example/f', name: 'A' }, { url: 'http://b.example/f' }, { url: 'https://localhost/f' }], every: 2 } }] }] });
  assert.deepEqual(b.pages[0].zones[0].o, { feeds: [{ url: 'https://a.example/f', name: 'A' }], every: 5, count: 5 });
});
