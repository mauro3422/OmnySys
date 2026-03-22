/**
 * @fileoverview Shared array helpers.
 *
 * @module shared/utils/array-utils
 */

export function chunkArray(values, size = 500) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}
