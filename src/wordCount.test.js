import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wordCount } from './wordCount.js';

test('counts words separated by a single space', () => {
  assert.equal(wordCount('hello world'), 2);
});

test('treats repeated spaces, tabs and newlines as one separator', () => {
  assert.equal(wordCount('  a \t b\nc '), 3);
});

test('throws TypeError for non-string input', () => {
  assert.throws(() => wordCount(null), TypeError);
  assert.throws(() => wordCount(123), TypeError);
  assert.throws(() => wordCount(undefined), TypeError);
});
