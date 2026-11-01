import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arabicCount, countTools, TOOL_FORMS } from './arabicCount.ts';

test('Arabic counted noun follows the number', () => {
  assert.equal(arabicCount(0, TOOL_FORMS), 'لا أدوات');
  assert.equal(arabicCount(1, TOOL_FORMS), 'أداة واحدة');
  assert.equal(arabicCount(2, TOOL_FORMS), 'أداتان');
  assert.equal(arabicCount(3, TOOL_FORMS), '3 أدوات');
  assert.equal(arabicCount(10, TOOL_FORMS), '10 أدوات');
  assert.equal(arabicCount(11, TOOL_FORMS), '11 أداة');
  assert.equal(arabicCount(99, TOOL_FORMS), '99 أداة');
  assert.equal(arabicCount(100, TOOL_FORMS), '100 أداة');
  assert.equal(arabicCount(103, TOOL_FORMS), '103 أدوات');
});

test('CLDR agrees on the class boundaries', () => {
  const pr = new Intl.PluralRules('ar');
  const want = { zero: 0, one: 1, two: 2, few: 7, many: 42, other: 100 };
  for (const [cls, n] of Object.entries(want)) assert.equal(pr.select(n), cls);
});

test('English count', () => {
  assert.equal(countTools(1, false), '1 tool');
  assert.equal(countTools(9, false), '9 tools');
  assert.equal(countTools(4, true), '4 أدوات');
});
