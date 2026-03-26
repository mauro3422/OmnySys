/**
 * @fileoverview cache-key-helpers.js
 *
 * Shared helpers for namespaced cache keys inside the cache manager module.
 */

import { invalidateCachePatterns } from '../../../shared/cache/cache-maintenance.js';

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
  return invalidateNamespacedCacheKeys(cache, [namespace], value);
}

export function invalidateNamespacedCachePattern(cache, namespace, pattern) {
  return cache.invalidate(`${namespace}:${pattern}`);
}

export function invalidateFileAtomPattern(cache, filePath) {
  return cache.invalidate(buildFileAtomPattern(filePath));
}

export function invalidateNamespacedCacheKeys(cache, namespaces = [], value, pattern = null) {
  if (!cache) {
    return 0;
  }

  const normalizedValue = String(value ?? '');
  const resolvedNamespaces = Array.isArray(namespaces) ? namespaces : [namespaces];
  const keys = [];

  for (const namespace of resolvedNamespaces) {
    if (typeof namespace !== 'string' || namespace.length === 0) continue;
    keys.push(buildNamespacedCacheKey(namespace, normalizedValue));
  }

  const result = invalidateCachePatterns(cache, keys);

  if (pattern && typeof cache.invalidatePattern === 'function') {
    cache.invalidatePattern(pattern);
  }

  return result.invalidated;
}

export function invalidateFileCacheEntries(cache, filePath, namespaces = ['analysis', 'atom']) {
  return invalidateNamespacedCacheKeys(cache, namespaces, filePath);
}
