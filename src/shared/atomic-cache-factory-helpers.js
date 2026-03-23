/**
 * @fileoverview Atomic cache factory helpers
 */

import { DerivationCache } from './derivation-engine/index.js';

export function buildAtomicCacheOptions(options = {}) {
  return {
    maxAtoms: options.maxAtoms || 1000,
    ttlMs: options.ttlMs || 5 * 60 * 1000
  };
}

export function initializeAtomicCacheState(cache) {
  cache.atoms = new Map();
  cache.derivations = new DerivationCache();
  cache.fileToAtoms = new Map();
}
