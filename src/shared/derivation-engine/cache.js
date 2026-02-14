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
    const cacheKey = `${moleculeId}::${ruleName}`;

    // Check cache
    if (this.cache.has(cacheKey)) {
      this.stats.hits++;
      return this.cache.get(cacheKey);
    }

    // Apply rule
    const rule = DerivationRules[ruleName];
    if (!rule) {
      throw new Error(`Unknown derivation rule: ${ruleName}`);
    }

    this.stats.misses++;
    const result = rule(atoms);
    this.cache.set(cacheKey, result);

    // Register dependencies for invalidation
    for (const atom of atoms) {
      if (!this.dependencyGraph.has(atom.id)) {
        this.dependencyGraph.set(atom.id, new Set());
      }
      this.dependencyGraph.get(atom.id).add(cacheKey);
    }

    return result;
  }

  /**
   * Invalida todas las derivaciones que dependen de un átomo
   * @param {string} atomId - Atom identifier that changed
   */
  invalidate(atomId) {
    const affected = this.dependencyGraph.get(atomId) || new Set();
    for (const cacheKey of affected) {
      this.cache.delete(cacheKey);
    }

    // También limpiar del dependency graph
    this.dependencyGraph.delete(atomId);
  }

  /**
   * Invalida todas las derivaciones de una molécula
   * @param {string} moleculeId - Molecule identifier
   */
  invalidateMolecule(moleculeId) {
    const keysToDelete = [];
    for (const [key] of this.cache.entries()) {
      if (key.startsWith(`${moleculeId}::`)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Limpia toda la cache
   */
  clear() {
    this.cache.clear();
    this.dependencyGraph.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Obtiene estadísticas de la cache
   * @returns {Object} - Cache stats
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      cacheSize: this.cache.size,
      dependencyCount: this.dependencyGraph.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0
    };
  }

  /**
   * Verifica si una key está en cache
   * @param {string} cacheKey - Key a verificar
   * @returns {boolean} - True si está cacheada
   */
  has(cacheKey) {
    return this.cache.has(cacheKey);
  }

  /**
   * Obtiene valor cacheado
   * @param {string} cacheKey - Key
   * @returns {*} - Valor o undefined
   */
  get(cacheKey) {
    return this.cache.get(cacheKey);
  }
}

export default DerivationCache;
