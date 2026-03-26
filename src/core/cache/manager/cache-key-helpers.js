/**
 * @fileoverview cache-key-helpers.js
 *
 * Shared helpers for namespaced cache keys inside the cache manager module.
 */

export function buildNamespacedCacheKey(namespace, value) {
  return `${namespace}:${value}`;
}

export function buildFileAtomPattern(filePath) {
  const fileId = String(filePath || '')
    .replace(/\\/g, '_')
    .replace(/\//g, '_');

  return `atom:${fileId}::*`;
}

export function getNamespacedCacheValue(cache, namespace, value) {
  return cache.get(buildNamespacedCacheKey(namespace, value));
}

export function setNamespacedCacheValue(cache, namespace, value, data, ttlMinutes) {
  return cache.set(buildNamespacedCacheKey(namespace, value), data, ttlMinutes);
}

export function invalidateNamespacedCacheValue(cache, namespace, value) {
  return cache.invalidate(buildNamespacedCacheKey(namespace, value));
}

export function invalidateNamespacedCachePattern(cache, namespace, pattern) {
  return cache.invalidate(`${namespace}:${pattern}`);
}

export function invalidateFileAtomPattern(cache, filePath) {
  return cache.invalidate(buildFileAtomPattern(filePath));
}
