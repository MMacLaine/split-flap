// Interest rates (0.9.2): the four replies to one shape, when a rate last moved, and the
// zone as a list and as a line. The replies are cut down from the real ones of 30 September.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ecbSeries, fedSeries, boeSeries, riksSeries, lastChange, ratesCells, rateText, bankFor } from '../src/rates.js';
import { sanitizeConnection } from '../src/connections.js';
import { signOutAll, switchUserAll, healBroken } from '../src/sync.js';

const rows = g => g.map(r => r.join('').trimEnd());

test('the ECB, the Fed, the Bank of England and the Riksbank, to one series', () => {
  const ecb = { dataSets: [{ series: { '0:0:0:0:0:0:0': { observations: { 0: [2.25], 1: [2.5], 2: [2.5] } } } }], structure: { dimensions: { observation: [{ id: 'TIME_PERIOD', values: [{ id: '2026-06-10' }, { id: '2026-06-11' }, { id: '2026-06-12' }] }] } } };
  assert.deepEqual(ecbSeries(ecb), [{ d: '2026-06-10', c: 2.25 }, { d: '2026-06-11', c: 2.5 }, { d: '2026-06-12', c: 2.5 }]);
  const fed = { refRates: [{ effectiveDate: '2026-09-28', percentRate: 3.88, targetRateFrom: 3.75, targetRateTo: 4 }, { effectiveDate: '2026-09-25', percentRate: 3.88, targetRateFrom: 3.75, targetRateTo: 4 }] };
  assert.deepEqual(fedSeries(fed), [{ d: '2026-09-25', c: 4, from: 3.75, to: 4, eff: 3.88 }, { d: '2026-09-28', c: 4, from: 3.75, to: 4, eff: 3.88 }]);   // oldest first
  assert.deepEqual(boeSeries('DATE,IUDBEDR\n01 Sep 2026,3.75\n02 Sep 2026,3.75\n'), [{ d: '2026-09-01', c: 3.75 }, { d: '2026-09-02', c: 3.75 }]);
  assert.deepEqual(riksSeries([{ date: '2026-09-01', value: 1.75 }, { date: 'bad', value: 1 }]), [{ d: '2026-09-01', c: 1.75 }]);
  assert.deepEqual(ecbSeries({}), []);
});

test('when a rate last moved, and how it is written', () => {
  assert.equal(lastChange([{ d: '2026-06-10', c: 2.25 }, { d: '2026-06-11', c: 2.5 }, { d: '2026-06-12', c: 2.5 }]), '2026-06-11');
  assert.equal(lastChange([{ d: '2026-06-10', c: 2 }, { d: '2026-06-11', c: 2 }]), null);   // no change within the period
  assert.equal(rateText('fed', [{ d: '2026-09-28', c: 4, from: 3.75, to: 4 }], 'en'), '3.75-4.00%');
  assert.equal(rateText('riks', [{ d: '2026-09-28', c: 1.75 }], 'sv'), '1,75%');
  assert.equal(bankFor('SE'), 'riks'); assert.equal(bankFor('DE'), 'ecb'); assert.equal(bankFor('GB'), 'boe'); assert.equal(bankFor('US'), 'fed');
});

test('the zone: a list of banks, and one bank as a line with its rate beside it', () => {
  const live = { rates: { 'riks:1': { series: [{ d: '2026-05-01', c: 2 }, { d: '2026-06-25', c: 1.75 }, { d: '2026-09-29', c: 1.75 }] }, 'ecb:1': { series: [{ d: '2026-06-11', c: 2.5 }] }, 'fed:1': {} } };
  // 4 rows, 22 wide (20 inside the margins): one line per bank, the rate at the right edge
  // of those 20, and room for when it moved under each of two
  assert.deepEqual(rows(ratesCells({ banks: ['riks', 'ecb'], years: 1, view: 'list' }, { h: 4, w: 22 }, live, 'en')), [' RIKSBANK       1.75%', ' SINCE 25 JUN', ' ECB            2.50%', '']);
  // three banks in three rows: no room for the dates; one still on its way says so
  assert.deepEqual(rows(ratesCells({ banks: ['riks', 'ecb', 'fed'], years: 1, view: 'list' }, { h: 3, w: 22 }, live, 'sv')), [' RIKSBANKEN     1,75%', ' ECB            2,50%', ' FED           LADDAR']);
  const one = rows(ratesCells({ banks: ['riks'], years: 1 }, { h: 12, w: 40 }, live, 'en')).map(r => r.slice(25).trim()).filter(Boolean);   // 40 wide: chart 24, a gap, the panel from 25
  assert.deepEqual(one, ['RIKSBANK', 'POLICY RATE', '1.75%', 'SINCE 25 JUN', '1 YEAR']);
});

test('a connection: a key or an https link, and nothing else', () => {
  assert.deepEqual(sanitizeConnection({ id: 'c1', kind: 'av', name: ' My key ', value: 'ABCD1234EFGH', updated: 5, extra: 'x' }), { id: 'c1', kind: 'av', name: 'My key', value: 'ABCD1234EFGH', updated: 5 });
  assert.equal(sanitizeConnection({ id: 'c1', kind: 'av', value: 'no spaces allowed' }), null);
  assert.equal(sanitizeConnection({ id: 'c1', kind: 'sheet', value: 'http://docs.google.com/x' }), null);   // https only
  assert.equal(sanitizeConnection({ id: 'x1', kind: 'sheet', value: 'https://docs.google.com/x' }), null);  // ids start with c
  assert.equal(sanitizeConnection({ id: 'c1', kind: 'shell', value: 'https://a.b/c' }), null);
});

test('sign out takes every connection the account owns, pushed or not; another account\'s leave too', () => {
  const items = [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }];
  const st = { user: 'u1', boards: { c1: { owner: 'u1', rev: 1 }, c2: { owner: 'u1', rev: 0, dirty: true } } };   // c3 is a guest's
  assert.deepEqual(signOutAll(items, st).boards.map(x => x.id), ['c3']);
  assert.deepEqual(switchUserAll(items, st, 'u2').boards.map(x => x.id), ['c3']);
});

test('a value the server could not open is sent again from a browser that has it', () => {
  const remote = [{ id: 'c1', rev: 2, board: { id: 'c1', kind: 'av', value: '', broken: true } }, { id: 'c2', rev: 1, board: { id: 'c2', kind: 'av', value: 'OK12345678' } }, { id: 'c3', rev: 1, board: { id: 'c3', broken: true, value: '' } }];
  const local = [{ id: 'c1', kind: 'av', value: 'REAL1234KEY' }, { id: 'c2', kind: 'av', value: 'OK12345678' }];   // c3 is not here: nothing to send
  const state = { user: 'u', boards: { c1: { owner: 'u', rev: 2 }, c2: { owner: 'u', rev: 1 }, c3: { owner: 'u', rev: 1 } } };
  assert.deepEqual(healBroken(remote, local, state), ['c1']);
});
