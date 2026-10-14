// Forces a number into the range [min, max].
export function clamp(value, min, max) {
  for (const n of [value, min, max]) {
    if (typeof n !== 'number' || Number.isNaN(n)) {
      throw new TypeError('clamp expects numbers');
    }
  }
  if (min > max) {
    throw new RangeError('clamp expects min <= max');
  }
  return Math.min(Math.max(value, min), max);
}
