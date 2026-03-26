/**
 * @fileoverview atomic-cache helpers
 *
 * Small helpers extracted from AtomicCache so the class stays focused on
 * cache operations instead of stats/eviction bookkeeping.
 *
 * @module shared/atomic-cache-helpers
 */

import { clearCacheCollections } from './cache/cache-maintenance.js';

export function calculateAtomicCacheMemoryUsage(cache) {
  let memoryBytes = 0;
  for (const item of cache.atoms.values()) {
    memoryBytes += JSON.stringify(item.data).length;
  }

  return Math.round(memoryBytes / 1024);
}

export function evictLeastRecentlyUsedAtom(cache) {
  let oldestKey = null;
  let oldestTime = Infinity;

  for (const [key, item] of cache.atoms.entries()) {
    if (item.lastAccessed < oldestTime) {
      oldestTime = item.lastAccessed;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    cache.atoms.delete(oldestKey);
  }
}

export function buildAtomicCacheStats(cache) {
  return {
    atomsCached: cache.atoms.size,
    derivationsCached: cache.derivations.cache.size,
    filesTracked: cache.fileToAtoms.size,
    memoryUsageKB: calculateAtomicCacheMemoryUsage(cache),
    derivationStats: cache.derivations.getDerivationCacheStats()
  };
}

export function getAtomicCacheAtom(cache, atomId) {
  const cached = cache.atoms.get(atomId);

  if (!cached) return null;

  if (Date.now() > cached.expiry) {
    cache.atoms.delete(atomId);
    return null;
  }

  cached.lastAccessed = Date.now();
  return cached.data;
}

export function setAtomicCacheAtom(cache, atomId, atomData, filePath) {
  if (cache.atoms.size >= cache.maxAtoms) {
    evictLeastRecentlyUsedAtom(cache);
  }

  cache.atoms.set(atomId, {
    data: atomData,
    expiry: Date.now() + cache.ttlMs,
    createdAt: Date.now(),
    lastAccessed: Date.now()
  });

  if (!cache.fileToAtoms.has(filePath)) {
    cache.fileToAtoms.set(filePath, new Set());
  }
  cache.fileToAtoms.get(filePath).add(atomId);
}

export function getAtomicCacheAtoms(cache, atomIds) {
  const result = new Map();
  const missing = [];

  for (const id of atomIds) {
    const atom = getAtomicCacheAtom(cache, id);
    if (atom) {
      result.set(id, atom);
    } else {
      missing.push(id);
    }
  }

  return { found: result, missing };
}

export function invalidateAtomicCacheAtom(cache, atomId) {
  cache.atoms.delete(atomId);
  cache.derivations.invalidate(atomId);
}

export function invalidateAtomicCacheFile(cache, filePath) {
  const atomIds = cache.fileToAtoms.get(filePath);

  if (atomIds) {
    for (const atomId of atomIds) {
      invalidateAtomicCacheAtom(cache, atomId);
    }
    cache.fileToAtoms.delete(filePath);
  }
}

export function deriveAtomicCache(cache, filePath, atoms, ruleName) {
  return cache.derivations.derive(filePath, atoms, ruleName);
}

export function purgeAtomicCache(cache) {
  clearCacheCollections(cache, ['atoms', 'fileToAtoms']);
  cache.derivations.purge();
}
