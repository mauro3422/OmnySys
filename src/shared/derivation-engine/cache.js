/**
 * @fileoverview Derivation Cache
 * 
 * Cache para derivaciones moleculares.
 * Maneja invalidación por dependencias.
 * 
 * @module derivation-engine/cache
 * @version 1.0.0
 */

import { DerivationRules } from './rules/index.js';
import {
  deriveCachedValue,
  invalidateCachedDerivations,
  invalidateCachedMolecule,
  clearDerivationCache,
  getDerivationValue,
  hasDerivationValue
} from './cache-helpers.js';

/**
 * Derivation Cache - Evita recalcular derivaciones
 */
export class DerivationCache {
  constructor() {
    this.cache = new Map();
    this.dependencyGraph = new Map(); // atom ID → Set<cacheKey>
    this.stats = {
      hits: 0,
      misses: 0
    };
  }

  /**
   * Deriva una propiedad molecular desde átomos
   * @param {string} moleculeId - Molecule identifier
   * @param {Array} atoms - Functions in the molecule
   * @param {string} ruleName - Name of derivation rule
   * @returns {*} - Derived value
   */
  derive(moleculeId, atoms, ruleName) {
    return deriveCachedValue(this, moleculeId, atoms, ruleName);
  }

  /**
   * Invalida todas las derivaciones que dependen de un átomo
   * @param {string} atomId - Atom identifier that changed
   */
  invalidate(atomId) {
    return invalidateCachedDerivations(this, atomId);
  }

  /**
   * Invalida todas las derivaciones de una molécula
   * @param {string} moleculeId - Molecule identifier
   */
  invalidateMolecule(moleculeId) {
    return invalidateCachedMolecule(this, moleculeId);
  }

  /**
   * Reinicia toda la cache
   */
  reset() {
    return clearDerivationCache(this);
  }

  /**
   * Obtiene estadísticas de la cache
   * @returns {Object} - Cache stats
   */
  getDerivationCacheStats() {
    const total = this.stats.hits + this.stats.misses;

    return {
      size: this.cache.size,
      dependencyNodes: this.dependencyGraph.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total === 0 ? 0 : this.stats.hits / total
    };
  }

  getStats() {
    return this.getDerivationCacheStats();
  }

  /**
   * Verifica si una key está en cache
   * @param {string} cacheKey - Key a verificar
   * @returns {boolean} - True si está cacheada
   */
  contains(cacheKey) {
    return hasDerivationValue(this, cacheKey);
  }

  /**
   * Obtiene valor cacheado
   * @param {string} cacheKey - Key
   * @returns {*} - Valor o undefined
   */
  valueForKey(cacheKey) {
    return getDerivationValue(this, cacheKey);
  }
}

export default DerivationCache;

