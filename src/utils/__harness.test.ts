import { test } from 'node:test';
import assert from 'node:assert/strict';

test('harness runs TypeScript sources', () => {
  const value: number = 2;
  assert.equal(value + 2, 4);
});