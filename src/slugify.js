// Turns a title into a URL-safe slug. Starter code so CI has something real to test.
export function slugify(text) {
  if (typeof text !== 'string') {
    throw new TypeError('slugify expects a string');
  }
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
