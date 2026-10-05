import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectivePrice, fromHalala, isBuyable } from './effectivePrice.ts';

const TODAY = '2026-10-05';

test('halala converts to SAR minor-unit value', () => {
  assert.equal(fromHalala('245000'), 2450);
  assert.equal(fromHalala(115423), 1154.23);
});

test('halala rounding does not produce float drift', () => {
  assert.equal(fromHalala(115423), 1154.23);
  assert.equal(String(fromHalala('115423')), '1154.23');
});

test('absent or empty sale price is zero, not NaN', () => {
  assert.equal(fromHalala(null), 0);
  assert.equal(fromHalala(undefined), 0);
  assert.equal(fromHalala(''), 0);
});

test('active sale renders the offer price with a strikethrough', () => {
  const r = effectivePrice(
    { price: 24000, offerPrice: 18480, offerLabel: '23% off', offerUntil: '2026-10-31' },
    TODAY
  );
  assert.deepEqual(r, {
    current: 18480,
    was: 24000,
    badge: '23% off',
    expired: false,
    free: false,
  });
});

test('expired sale fails closed to the regular price', () => {
  const r = effectivePrice(
    {
      price: 24000,
      offerPrice: 18480,
      offerLabel: 'Saudi National Day 2026 — 23% off',
      offerUntil: '2026-09-30',
    },
    TODAY
  );
  assert.deepEqual(r, {
    current: 24000,
    was: null,
    badge: null,
    expired: true,
    free: false,
  });
});

test('a sale ending today is still active', () => {
  const r = effectivePrice({ price: 24000, offerPrice: 18480, offerUntil: TODAY }, TODAY);
  assert.equal(r.current, 18480);
  assert.equal(r.expired, false);
});

test('a lapsed sale window still fails closed even if flagged on', () => {
  const r = effectivePrice(
    { price: 24000, offerPrice: 18480, offerUntil: '2026-09-30' },
    TODAY
  );
  assert.equal(r.current, 24000);
  assert.equal(r.badge, null);
});

test('strikethrough never appears without a live discount', () => {
  const r = effectivePrice({ price: 100, offerPrice: 100 }, TODAY);
  assert.equal(r.was, null);
});

test('offerPrice higher than price is ignored', () => {
  const r = effectivePrice(
    { price: 100, offerPrice: 120, offerUntil: '2026-12-01' },
    TODAY
  );
  assert.equal(r.current, 100);
  assert.equal(r.was, null);
});

test('free item is distinguishable from a broken price', () => {
  const r = effectivePrice({ price: 0, free: true }, TODAY);
  assert.deepEqual(r, {
    current: 0,
    was: null,
    badge: null,
    expired: false,
    free: true,
  });
});

test('zero price without the free flag is not treated as free', () => {
  const r = effectivePrice({ price: 0 }, TODAY);
  assert.equal(r.free, false);
});

test('malformed offerUntil fails closed instead of throwing', () => {
  const r = effectivePrice({ price: 500, offerPrice: 400, offerUntil: 'soon' }, TODAY);
  assert.equal(r.current, 500);
  assert.equal(r.expired, true);
});

test('an unpublished item is not buyable', () => {
  assert.equal(isBuyable({ available: false }), false);
  assert.equal(isBuyable({ purchasable: false }), false);
  assert.equal(isBuyable({ available: true, purchasable: true }), true);
  assert.equal(isBuyable({}), true);
});

test('a malformed non-object item is never buyable', () => {
  assert.equal(isBuyable(null), false);
  assert.equal(isBuyable('nope'), false);
  assert.equal(isBuyable(undefined), false);
});

test('a missing catalog price renders zero rather than NaN', () => {
  assert.deepEqual(effectivePrice({}, TODAY), {
    current: 0,
    was: null,
    badge: null,
    expired: false,
    free: false,
  });
  assert.deepEqual(effectivePrice({ price: null }, TODAY), {
    current: 0,
    was: null,
    badge: null,
    expired: false,
    free: false,
  });
});

test('an offer is never shown against a missing base price', () => {
  const r = effectivePrice({ offerPrice: 100, offerUntil: '2026-12-01' }, TODAY);
  assert.equal(r.current, 0);
  assert.equal(r.was, null);
});