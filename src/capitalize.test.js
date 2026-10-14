import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capitalize } from './capitalize.js';

test('uppercases the first letter and lowercases the rest', () => {
  assert.equal(capitalize('hELLO'), 'Hello');
});

test('returns an empty string unchanged', () => {
  assert.equal(capitalize(''), '');
});

test('throws TypeError for non-string input', () => {
  assert.throws(() => capitalize(123), TypeError);
  assert.throws(() => capitalize(null), TypeError);
});
