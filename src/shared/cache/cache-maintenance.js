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

export function resolveCacheTargets({
  repository = null,
  table = null,
  target = null,
  memoryCache = null,
  collections = []
} = {}) {
  return {
    repository,
    table,
    target,
    memoryCache,
    collections: Array.isArray(collections)
      ? collections.filter((name) => typeof name === 'string' && name.length > 0)
      : []
  };
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
  const { target: resolvedTarget, collections: resolvedCollections } = resolveCacheTargets({
    target,
    collections: collectionNames
  });

  if (!resolvedTarget) return 0;

  let cleared = 0;
  for (const name of resolvedCollections) {
    const collection = resolvedTarget[name];
    if (collection && typeof collection.clear === 'function') {
      collection.clear();
      cleared++;
    }
  }

  return cleared;
}

export function deleteCacheEntries(collection, keys = []) {
  if (!collection || typeof collection.delete !== 'function') {
    return 0;
  }

  const resolvedKeys = Array.isArray(keys) || typeof keys?.[Symbol.iterator] === 'function'
    ? keys
    : [];

  let deleted = 0;
  for (const key of resolvedKeys) {
    if (collection.delete(key)) {
      deleted++;
    }
  }

  return deleted;
}

export function deleteCacheEntriesByPrefix(collection, prefix) {
  if (!collection || typeof collection.keys !== 'function' || typeof collection.delete !== 'function') {
    return 0;
  }

  const normalizedPrefix = String(prefix || '');
  let deleted = 0;

  for (const key of collection.keys()) {
    if (typeof key === 'string' && key.startsWith(normalizedPrefix)) {
      collection.delete(key);
      deleted++;
    }
  }

  return deleted;
}

export function purgeCacheState(target, collectionNames = [], resetters = []) {
  const cleared = clearCacheCollections(target, collectionNames);

  if (target && Array.isArray(resetters)) {
    for (const reset of resetters) {
      if (typeof reset === 'function') {
        reset(target);
      }
    }
  }

  return cleared;
}

export function invalidateCacheStoreKey({ repository, table, key, memoryCache } = {}) {
  const {
    repository: resolvedRepository,
    table: resolvedTable,
    memoryCache: resolvedMemoryCache
  } = resolveCacheTargets({ repository, table, memoryCache });

  if (resolvedRepository && resolvedTable) {
    try {
      if (isWildcardPattern(key) && typeof resolvedRepository.deleteByPattern === 'function') {
        const pattern = wildcardToSqlLike(key);
        const result = resolvedRepository.deleteByPattern(resolvedTable, 'key', pattern);
        return (result?.changes || 0) > 0;
      }

      if (typeof resolvedRepository.delete === 'function') {
        const result = resolvedRepository.delete(resolvedTable, 'key', key);
        return (result?.changes || 0) > 0;
      }
    } catch (_error) {
      return false;
    }
  }

  if (!resolvedMemoryCache || typeof resolvedMemoryCache.delete !== 'function') {
    return false;
  }

  if (isWildcardPattern(key)) {
    return deleteMatchingKeys(resolvedMemoryCache, key) > 0;
  }

  return resolvedMemoryCache.delete(key);
}

export function purgeCacheStore({ repository, table, target, collections = [] } = {}) {
  const {
    repository: resolvedRepository,
    table: resolvedTable,
    target: resolvedTarget,
    collections: resolvedCollections
  } = resolveCacheTargets({ repository, table, target, collections });

  let cleared = 0;

  if (resolvedRepository && resolvedTable && typeof resolvedRepository.clearTable === 'function') {
    resolvedRepository.clearTable(resolvedTable);
    cleared += 1;
  }

  cleared += clearCacheCollections(resolvedTarget, resolvedCollections);
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
