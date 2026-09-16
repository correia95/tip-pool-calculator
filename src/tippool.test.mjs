import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  effectiveWeight,
  totalWeight,
  rawShare,
  allocateShares,
  encodeState,
  decodeState,
} from './tippool.ts';

test('effectiveWeight multiplies hours by role weight', () => {
  assert.equal(effectiveWeight({ name: 'A', hours: 4, weight: 1.5 }), 6);
});

test('totalWeight sums effective weight across everyone', () => {
  const people = [
    { name: 'A', hours: 4, weight: 1.5 },
    { name: 'B', hours: 4, weight: 1 },
  ];
  assert.equal(totalWeight(people), 10);
});

test('rawShare splits the pool proportionally to effective weight', () => {
  const people = [
    { name: 'A', hours: 4, weight: 1.5 },
    { name: 'B', hours: 4, weight: 1 },
  ];
  const total = totalWeight(people);
  assert.equal(rawShare(200, people[0], total), 120);
  assert.equal(rawShare(200, people[1], total), 80);
});

test('allocateShares splits evenly by hours with no rounding needed', () => {
  const people = [
    { name: 'A', hours: 5, weight: 1 },
    { name: 'B', hours: 3, weight: 1 },
    { name: 'C', hours: 2, weight: 1 },
  ];
  const shares = allocateShares(300, people);
  assert.deepEqual(shares, [150, 90, 60]);
});

test('allocateShares uses the largest-remainder method so shares sum exactly to the pool', () => {
  // $100 split 3 ways is $33.33 recurring each - someone must get the extra cent.
  const people = [
    { name: 'A', hours: 1, weight: 1 },
    { name: 'B', hours: 1, weight: 1 },
    { name: 'C', hours: 1, weight: 1 },
  ];
  const shares = allocateShares(100, people);
  const sum = shares.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 100) < 1e-9);
  assert.equal(shares.filter((s) => s === 33.34).length, 1);
  assert.equal(shares.filter((s) => s === 33.33).length, 2);
});

test('allocateShares always sums to the pool across many uneven weight combinations', () => {
  const scenarios = [
    [1000, [{ hours: 7, weight: 1 }, { hours: 3, weight: 1.2 }, { hours: 5, weight: 0.8 }]],
    [77.77, [{ hours: 1, weight: 1 }, { hours: 1, weight: 1 }, { hours: 1, weight: 1 }, { hours: 1, weight: 1 }]],
    [50, [{ hours: 6, weight: 1 }]],
  ];
  for (const [pool, people] of scenarios) {
    const named = people.map((p, i) => ({ name: `P${i}`, ...p }));
    const shares = allocateShares(pool, named);
    const sum = Math.round(shares.reduce((a, b) => a + b, 0) * 100) / 100;
    assert.equal(sum, Math.round(pool * 100) / 100);
  }
});

test('allocateShares returns all zeros when total weight is zero', () => {
  const people = [{ name: 'A', hours: 0, weight: 1 }, { name: 'B', hours: 0, weight: 1 }];
  assert.deepEqual(allocateShares(100, people), [0, 0]);
});

test('encodeState/decodeState round-trips the staff list and currency', () => {
  const state = {
    pool: 300,
    people: [
      { name: 'Alex', hours: 5, weight: 1 },
      { name: 'Sam', hours: 3, weight: 1 },
    ],
    currency: 'USD',
  };
  const params = encodeState(state);
  const fallback = { pool: 0, people: [], currency: 'AUD' };
  assert.deepEqual(decodeState(params, fallback), state);
});

test('decodeState falls back to the default for corrupted data', () => {
  const params = new URLSearchParams();
  params.set('d', 'garbage!!!');
  const fallback = { pool: 300, people: [{ name: 'Alex', hours: 5, weight: 1 }], currency: 'USD' };
  assert.deepEqual(decodeState(params, fallback), fallback);
});
