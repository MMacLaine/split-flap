// The week view and Today's playlist (0.7): the same rule as the wall, over a whole day.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextPage, allowedAt, dayPlaylist, blocksFor, comingDates, shiftWin } from '../src/schedule.js';

const W = (from, to, days, x) => Object.assign({ from, to, days: days || [] }, x || {});
const P = (name, wins, x) => Object.assign({ name, dur: 10, wins: wins || [] }, x || {});
// Thursday 1 October 2026, a storyboard with every kind of time
const THU = new Date(2026, 9, 1);
const home = [
  P('Departures', [W('06:30', '07:15', [1, 2, 3, 4, 5])], { alone: true }),
  P('Weather'),
  P('Quote'),
  P('Welcome home', [W('17:00', '17:30')]),
  P('Big clock', [W('22:00', '01:00', [3, 4])]),            // Wed and Thu nights, past midnight
  P('Movie night', [W('19:00', '23:00', [], { date: '2026-10-01' })])
];
const hm = t => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

test("Today's playlist agrees with what the wall plays, minute by minute over a day", () => {
  const segs = dayPlaylist(home, THU);
  assert.equal(segs[0].from, THU.getTime());
  assert.equal(segs.at(-1).to, new Date(2026, 9, 2).getTime());
  let idx = -1, start = THU.getTime();
  for (let t = THU.getTime(); t < THU.getTime() + 86400000; t += 60000) {
    const seg = segs.find(s => t >= s.from && t < s.to);
    const allowed = [...allowedAt(home, t).may].map(p => home.indexOf(p)).sort();
    assert.deepEqual([...seg.list].sort(), allowed, 'playlist at ' + hm(t));
    for (let k = 0; k < 6; k++) {                             // the wall ticks many times a minute
      const n = nextPage(home, idx, start, t + k * 10000); idx = n.idx; start = n.start;
      assert.ok(idx === -1 ? seg.list.length === 0 : seg.list.includes(idx), `the wall showed ${idx} at ${hm(t)} outside the playlist`);
    }
  }
});

test("Today's playlist reads as the design shows it", () => {
  const segs = dayPlaylist(home, THU).map(s => `${hm(s.from)} ${s.list.map(i => home[i].name).join('+')}${s.alone ? ' alone' : ''}`);
  assert.deepEqual(segs, [
    '00:00 Weather+Quote+Big clock',               // Wednesday night's Big clock runs to 01:00
    '01:00 Weather+Quote',
    '06:30 Departures alone',
    '07:15 Weather+Quote',
    '17:00 Weather+Quote+Welcome home',
    '17:30 Weather+Quote',
    '19:00 Weather+Quote+Movie night',
    '22:00 Weather+Quote+Big clock+Movie night',
    '23:00 Weather+Quote+Big clock'
  ]);
});

test('week blocks: past midnight on both days, overlaps in lanes, a date only on its day', () => {
  const b = blocksFor(home, THU).map(x => `${home[x.page].name} ${x.s}-${x.e}${x.cont ? ' ' + x.cont : ''} lane ${x.lane}/${x.lanes}`);
  assert.deepEqual(b, [
    'Big clock 0-60 prev lane 0/1',
    'Departures 390-435 lane 0/1',
    'Welcome home 1020-1050 lane 0/1',
    'Movie night 1140-1380 lane 0/2',
    'Big clock 1320-1440 next lane 1/2'
  ]);
  assert.equal(blocksFor(home, new Date(2026, 9, 2)).filter(x => home[x.page].name === 'Movie night').length, 0);
  assert.deepEqual(blocksFor(home, new Date(2026, 9, 2)).map(x => `${home[x.page].name}${x.cont ? ' ' + x.cont : ''}`), ['Big clock prev', 'Departures', 'Welcome home']);   // Fri: Thursday night's clock until 01:00
  assert.deepEqual(blocksFor(home, new Date(2026, 9, 3)).map(x => home[x.page].name), ['Welcome home']);                          // Sat: no clock night, no departures
});

test('coming dates, once or every year, soonest first', () => {
  const pages = [P('Birthday', [W('00:00', '00:00', [], { date: '2020-11-14', yearly: true })]), P('Movie', [W('19:00', '23:00', [], { date: '2026-10-02' })]), P('Past', [W('10:00', '11:00', [], { date: '2026-01-01' })])];
  const c = comingDates(pages, THU.getTime()).map(x => `${pages[x.page].name} ${x.day.toDateString()}`);
  assert.deepEqual(c, ['Movie Fri Oct 02 2026', 'Birthday Sat Nov 14 2026']);
});

test('a time moved sideways shifts its days or its date, and the original is untouched', () => {
  const w = W('06:30', '07:15', [1, 2, 3, 4, 5]);
  assert.deepEqual(shiftWin(w, 1).days, [2, 3, 4, 5, 6]);
  assert.deepEqual(shiftWin(W('10:00', '11:00', [6]), 1).days, [0]);
  assert.equal(shiftWin(W('10:00', '11:00', [], { date: '2026-12-31' }), 1).date, '2027-01-01');
  assert.deepEqual(w.days, [1, 2, 3, 4, 5]);
});
