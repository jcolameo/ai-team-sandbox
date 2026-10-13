import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from './slugify.js';

test('lowercases and joins words with dashes', () => {
  assert.equal(slugify('Hello World'), 'hello-world');
});

test('strips accents and punctuation', () => {
  assert.equal(slugify('Grüezi, Zürich!'), 'gruezi-zurich');
});

test('rejects non-strings', () => {
  assert.throws(() => slugify(42), TypeError);
});
