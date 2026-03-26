/**
 * @fileoverview atoms.js - Extensión del caché para sistema atómico
 *
 * Agrega soporte para caché de átomos manteniendo compatibilidad
 * con el sistema de caché existente (RAM + LRU + TTL)
 *
 * @module unified-cache-manager/atoms
 */

import {
  getNamespacedCacheValue,
  invalidateFileAtomPattern,
  invalidateNamespacedCacheValue,
  setNamespacedCacheValue
} from './cache-key-helpers.js';

/**
 * Obtiene un átomo del caché RAM
 * @param {string} atomId - ID del átomo (filePath::functionName)
 * @returns {object|null}
 */
export function getAtom(atomId) {
  return getNamespacedCacheValue(this, 'atom', atomId);
}

/**
 * Guarda un átomo en el caché RAM
 * @param {string} atomId - ID del átomo
 * @param {object} atomData - Datos del átomo
 * @param {number} ttlMinutes - TTL opcional
 */
export function setAtom(atomId, atomData, ttlMinutes) {
  return setNamespacedCacheValue(this, 'atom', atomId, atomData, ttlMinutes);
}

/**
 * Obtiene múltiples átomos del caché (batch)
 * @param {string[]} atomIds - IDs de átomos
 * @returns {{found: Map, missing: string[]}}
 */
export function getAtoms(atomIds) {
  const found = new Map();
  const missing = [];
  
  for (const atomId of atomIds) {
    const atom = this.getAtom(atomId);
    if (atom) {
      found.set(atomId, atom);
    } else {
      missing.push(atomId);
    }
  }
  
  return { found, missing };
}

/**
 * Invalida un átomo específico
 * @param {string} atomId - ID del átomo
 * @returns {boolean}
 */
export function invalidateAtom(atomId) {
  return invalidateNamespacedCacheValue(this, 'atom', atomId);
}

/**
 * Invalida todos los átomos de un archivo usando wildcards
 * @param {string} filePath - Ruta del archivo
 * @returns {number} - Número de entradas invalidadas
 */
export function invalidateFileAtoms(filePath) {
  return invalidateFileAtomPattern(this, filePath);
}

/**
 * Guarda metadata derivada de un archivo
 * @param {string} filePath - Ruta del archivo
 * @param {object} derived - Metadata derivada
 * @param {number} ttlMinutes - TTL opcional
 */
export function setDerivedMetadata(filePath, derived, ttlMinutes) {
  return setNamespacedCacheValue(this, 'derived', filePath, derived, ttlMinutes);
}

/**
 * Obtiene metadata derivada de un archivo
 * @param {string} filePath - Ruta del archivo
 * @returns {object|null}
 */
export function getDerivedMetadata(filePath) {
  return getNamespacedCacheValue(this, 'derived', filePath);
}

/**
 * Invalida metadata derivada de un archivo
 * @param {string} filePath - Ruta del archivo
 * @returns {boolean}
 */
export function invalidateDerived(filePath) {
  return invalidateNamespacedCacheValue(this, 'derived', filePath);
}

/**
 * Obtiene estadísticas específicas de átomos
 * @returns {object}
 */
export function getAtomCacheStats() {
  const stats = {
    atomsCached: 0,
    derivedCached: 0,
    atomMemoryKB: 0,
    derivedMemoryKB: 0
  };
  
  if (!this.ramCache) return stats;
  
  for (const [key, item] of this.ramCache.entries()) {
    const size = JSON.stringify(item.data).length;
    
    if (key.startsWith('atom:')) {
      stats.atomsCached++;
      stats.atomMemoryKB += size / 1024;
    } else if (key.startsWith('derived:')) {
      stats.derivedCached++;
      stats.derivedMemoryKB += size / 1024;
    }
  }
  
  return {
    ...stats,
    atomMemoryKB: Math.round(stats.atomMemoryKB),
    derivedMemoryKB: Math.round(stats.derivedMemoryKB)
  };
}
