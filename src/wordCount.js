// Counts words: runs of non-whitespace characters.
export function wordCount(text) {
  if (typeof text !== 'string') {
    throw new TypeError('wordCount expects a string');
  }
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}
