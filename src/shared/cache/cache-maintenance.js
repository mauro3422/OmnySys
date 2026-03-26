/**
 * @fileoverview Cache maintenance helpers
 *
 * Shared helpers for cache invalidation and purge routines.
 */

export const DEFAULT_CACHE_INVALIDATION_PATTERNS = Object.freeze([
  'analysis:*',
  'atom:*',
  'derived:*',
  'impact:*'
]);

export function invalidateCachePatterns(cache, patterns = DEFAULT_CACHE_INVALIDATION_PATTERNS) {
  if (!cache || typeof cache.invalidate !== 'function') {
    return { invalidated: 0, patterns: [...patterns] };
  }

  let invalidated = 0;
  for (const pattern of patterns) {
    if (cache.invalidate(pattern)) {
      invalidated++;
    }
  }

  return {
    invalidated,
    patterns: [...patterns]
  };
}

export function clearCacheCollections(target, collectionNames = []) {
  if (!target) return 0;

  let cleared = 0;
  for (const name of collectionNames) {
    const collection = target[name];
    if (collection && typeof collection.clear === 'function') {
      collection.clear();
      cleared++;
    }
  }

  return cleared;
}

export function wildcardToRegExp(pattern) {
  const escaped = String(pattern || '')
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');

  return new RegExp(`^${escaped}$`);
}

export function deleteMatchingKeys(collection, pattern) {
  if (!collection || typeof collection.keys !== 'function' || typeof collection.delete !== 'function') {
    return 0;
  }

  const regex = wildcardToRegExp(pattern);
  let deleted = 0;

  for (const key of collection.keys()) {
    if (regex.test(key)) {
      collection.delete(key);
      deleted++;
    }
  }

  return deleted;
}
