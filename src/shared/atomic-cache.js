/**
 * @fileoverview atomic-cache.js
 *
 * Caché optimizado para el sistema atómico
 * Estructura: 3 niveles de caché
 *
 * Nivel 1: RAM Cache (Map) - Datos calientes, TTL 5 min
 * Nivel 2: Derivation Cache - Metadata derivada con invalidación inteligente  
 * Nivel 3: Disco - Átomos individuales (SSOT)
 *
 * @module shared/atomic-cache
 */

import {
  buildAtomicCacheStats,
  evictLeastRecentlyUsedAtom,
  getAtomicCacheAtom,
  getAtomicCacheAtoms,
  setAtomicCacheAtom,
  invalidateAtomicCacheAtom,
  invalidateAtomicCacheFile,
  deriveAtomicCache,
  purgeAtomicCache
} from './atomic-cache-helpers.js';
import {
  buildAtomicCacheOptions,
  initializeAtomicCacheState
} from './atomic-cache-factory-helpers.js';

/**
 * AtomicCache - Gestiona caché de átomos con invalidación inteligente
 * 
 * Estructura de datos:
 * {
 *   atoms: Map<atomId, Atom>,           // Caché RAM de átomos
 *   derivations: DerivationCache,        // Metadata derivada
 *   fileToAtoms: Map<filePath, Set<atomId>> // Índice inverso
 * }
 */
export class AtomicCache {
  constructor(options = {}) {
    initializeAtomicCacheState(this);
    const atomicOptions = buildAtomicCacheOptions(options);
    this.maxAtoms = atomicOptions.maxAtoms;
    this.ttlMs = atomicOptions.ttlMs;
  }

  /**
   * Obtiene un átomo del caché
   * @param {string} atomId - ID del átomo (filePath::functionName)
   * @returns {Atom|null}
   */
  getAtom(atomId) {
    return getAtomicCacheAtom(this, atomId);
  }

  /**
   * Guarda un átomo en el caché
   * @param {string} atomId - ID del átomo
   * @param {object} atomData - Datos del átomo
   * @param {string} filePath - Archivo al que pertenece (para índice)
   */
  setAtom(atomId, atomData, filePath) {
    return setAtomicCacheAtom(this, atomId, atomData, filePath);
  }

  /**
   * Obtiene múltiples átomos (batch)
   * @param {string[]} atomIds - IDs de átomos
   * @returns {Map<string, Atom>} - Mapa de átomos encontrados
   */
  getAtoms(atomIds) {
    return getAtomicCacheAtoms(this, atomIds);
  }

  /**
   * Invalida un átomo específico
   * @param {string} atomId - ID del átomo
   */
  invalidateAtom(atomId) {
    return invalidateAtomicCacheAtom(this, atomId);
  }

  /**
   * Invalida todos los átomos de un archivo
   * @param {string} filePath - Ruta del archivo
   */
  invalidateFile(filePath) {
    return invalidateAtomicCacheFile(this, filePath);
  }

  /**
   * Deriva metadata molecular (con caché)
   * @param {string} filePath - Archivo
   * @param {Array} atoms - Átomos del archivo
   * @param {string} ruleName - Regla de derivación
   * @returns {any}
   */
  derive(filePath, atoms, ruleName) {
    return deriveAtomicCache(this, filePath, atoms, ruleName);
  }

  /**
   * Obtiene estadísticas del caché
   */
  getAtomicCacheStats() {
    return buildAtomicCacheStats(this);
  }

  /**
   * Limpia todo el caché
   */
  purge() {
    return purgeAtomicCache(this);
  }

  /**
   * Evicción LRU (Least Recently Used)
   * @private
   */
  _evictLRU() {
    evictLeastRecentlyUsedAtom(this);
  }
}

// Instancia global (singleton)
export const atomicCache = new AtomicCache();

