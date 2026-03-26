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

export function isWildcardPattern(key) {
  return typeof key === 'string' && (key.includes('*') || key.includes('?'));
}

export function wildcardToSqlLike(pattern) {
  return String(pattern || '')
    .replace(/\*/g, '%')
    .replace(/\?/g, '_');
}

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

export function invalidateCacheStoreKey({ repository, table, key, memoryCache } = {}) {
  if (repository && table) {
    try {
      if (isWildcardPattern(key) && typeof repository.deleteByPattern === 'function') {
        const pattern = wildcardToSqlLike(key);
        const result = repository.deleteByPattern(table, 'key', pattern);
        return (result?.changes || 0) > 0;
      }

      if (typeof repository.delete === 'function') {
        const result = repository.delete(table, 'key', key);
        return (result?.changes || 0) > 0;
      }
    } catch (_error) {
      return false;
    }
  }

  if (!memoryCache || typeof memoryCache.delete !== 'function') {
    return false;
  }

  if (isWildcardPattern(key)) {
    return deleteMatchingKeys(memoryCache, key) > 0;
  }

  return memoryCache.delete(key);
}

export function purgeCacheStore({ repository, table, target, collections = [] } = {}) {
  let cleared = 0;

  if (repository && table && typeof repository.clearTable === 'function') {
    repository.clearTable(table);
    cleared += 1;
  }

  cleared += clearCacheCollections(target, collections);
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
