// Uppercases the first character and lowercases the rest.
export function capitalize(text) {
  if (typeof text !== 'string') {
    throw new TypeError('capitalize expects a string');
  }
  if (text === '') {
    return text;
  }
  return text[0].toUpperCase() + text.slice(1).toLowerCase();
}
