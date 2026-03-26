/**
 * @fileoverview Derivation cache helpers
 */

import { DerivationRules } from './rules/index.js';

import {
  deleteCacheEntries,
  deleteCacheEntriesByPrefix,
  purgeCacheState
} from '../cache/cache-maintenance.js';

export function deriveCachedValue(cache, moleculeId, atoms, ruleName) {
  const cacheKey = `${moleculeId}::${ruleName}`;

  if (cache.cache.has(cacheKey)) {
    cache.stats.hits++;
    return cache.cache.get(cacheKey);
  }

  const rule = DerivationRules[ruleName];
  if (!rule) {
    throw new Error(`Unknown derivation rule: ${ruleName}`);
  }

  cache.stats.misses++;
  const result = rule(atoms);
  cache.cache.set(cacheKey, result);

  for (const atom of atoms) {
    if (!cache.dependencyGraph.has(atom.id)) {
      cache.dependencyGraph.set(atom.id, new Set());
    }
    cache.dependencyGraph.get(atom.id).add(cacheKey);
  }

  return result;
}

export function invalidateCachedDerivations(cache, atomId) {
  const affected = cache.dependencyGraph.get(atomId) || new Set();
  deleteCacheEntries(cache.cache, affected);
  cache.dependencyGraph.delete(atomId);
}

export function invalidateCachedMolecule(cache, moleculeId) {
  deleteCacheEntriesByPrefix(cache.cache, `${moleculeId}::`);
}

export function purgeDerivationCache(cache) {
  purgeCacheState(cache, ['cache', 'dependencyGraph'], [
    (target) => {
      target.stats = { hits: 0, misses: 0 };
    }
  ]);
}

export function buildDerivationCacheStats(cache) {
  const total = cache.stats.hits + cache.stats.misses;

  return {
    size: cache.cache.size,
    dependencyNodes: cache.dependencyGraph.size,
    hits: cache.stats.hits,
    misses: cache.stats.misses,
    hitRate: total === 0 ? 0 : cache.stats.hits / total
  };
}

export function getDerivationValue(cache, cacheKey) {
  return cache.cache.get(cacheKey);
}

export function hasDerivationValue(cache, cacheKey) {
  return cache.cache.has(cacheKey);
}
