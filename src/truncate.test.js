import { test } from 'node:test';
import assert from 'node:assert/strict';
import { truncate } from './truncate.js';

test('returns short text unchanged', () => {
  assert.equal(truncate('hello', 10), 'hello');
});

test('cuts long text and appends an ellipsis within max length', () => {
  assert.equal(truncate('hello world', 8), 'hello w…');
});

test('throws TypeError for non-string input', () => {
  assert.throws(() => truncate(42, 5), TypeError);
});

test('throws RangeError when max < 1', () => {
  assert.throws(() => truncate('hello', 0), RangeError);
});
