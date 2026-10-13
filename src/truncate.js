// Shortens text to at most `max` characters, ending in "…" when it was cut.
export function truncate(text, max) {
  if (typeof text !== 'string') {
    throw new TypeError('truncate expects a string');
  }
  if (typeof max !== 'number' || Number.isNaN(max) || max < 1) {
    throw new RangeError('truncate expects max >= 1');
  }
  if (text.length <= max) {
    return text;
  }
  return text.slice(0, max - 1) + '…';
}
