import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clamp } from './clamp.js';

test('returns the value when it is inside the range', () => {
  assert.equal(clamp(5, 0, 10), 5);
});

test('returns the nearest bound when the value is outside the range', () => {
  assert.equal(clamp(-3, 0, 10), 0);
  assert.equal(clamp(42, 0, 10), 10);
});

test('throws RangeError when min is greater than max', () => {
  assert.throws(() => clamp(5, 10, 0), RangeError);
});
