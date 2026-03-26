/**
 * @fileoverview shared.js
 *
 * Shared utilities for cache storage operations.
 *
 * @module cache-invalidator/storage-operations/shared
 */

export function normalizeCachePath(filePath) {
  return filePath.replace(/\\/g, '/');
}
