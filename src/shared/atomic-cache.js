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

import { DerivationCache } from './derivation-engine/index.js';

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
    // Caché RAM para átomos individuales
    this.atoms = new Map();
    
    // Caché para metadata derivada
    this.derivations = new DerivationCache();
    
    // Índice inverso: archivo → átomos (para invalidación eficiente)
    this.fileToAtoms = new Map();
    
    // Configuración
    this.maxAtoms = options.maxAtoms || 1000; // LRU limit
    this.ttlMs = options.ttlMs || 5 * 60 * 1000; // 5 min default
  }

  /**
   * Obtiene un átomo del caché
   * @param {string} atomId - ID del átomo (filePath::functionName)
   * @returns {Atom|null}
   */
  getAtom(atomId) {
    const cached = this.atoms.get(atomId);
    
    if (!cached) return null;
    
    // Verificar TTL
    if (Date.now() > cached.expiry) {
      this.atoms.delete(atomId);
      return null;
    }
    
    // Actualizar lastAccessed (para LRU)
    cached.lastAccessed = Date.now();
    
    return cached.data;
  }

  /**
   * Guarda un átomo en el caché
   * @param {string} atomId - ID del átomo
   * @param {object} atomData - Datos del átomo
   * @param {string} filePath - Archivo al que pertenece (para índice)
   */
  setAtom(atomId, atomData, filePath) {
    // LRU eviction si es necesario
    if (this.atoms.size >= this.maxAtoms) {
      this._evictLRU();
    }
    
    // Guardar átomo
    this.atoms.set(atomId, {
      data: atomData,
      expiry: Date.now() + this.ttlMs,
      createdAt: Date.now(),
      lastAccessed: Date.now()
    });
    
    // Actualizar índice inverso
    if (!this.fileToAtoms.has(filePath)) {
      this.fileToAtoms.set(filePath, new Set());
    }
    this.fileToAtoms.get(filePath).add(atomId);
  }

  /**
   * Obtiene múltiples átomos (batch)
   * @param {string[]} atomIds - IDs de átomos
   * @returns {Map<string, Atom>} - Mapa de átomos encontrados
   */
  getAtoms(atomIds) {
    const result = new Map();
    const missing = [];
    
    for (const id of atomIds) {
      const atom = this.getAtom(id);
      if (atom) {
        result.set(id, atom);
      } else {
        missing.push(id);
      }
    }
    
    return { found: result, missing };
  }

  /**
   * Invalida un átomo específico
   * @param {string} atomId - ID del átomo
   */
  invalidateAtom(atomId) {
    // Eliminar del caché de átomos
    this.atoms.delete(atomId);
    
    // Invalidar derivaciones que dependen de este átomo
    this.derivations.invalidate(atomId);
  }

  /**
   * Invalida todos los átomos de un archivo
   * @param {string} filePath - Ruta del archivo
   */
  invalidateFile(filePath) {
    const atomIds = this.fileToAtoms.get(filePath);
    
    if (atomIds) {
      for (const atomId of atomIds) {
        this.invalidateAtom(atomId);
      }
      this.fileToAtoms.delete(filePath);
    }
  }

  /**
   * Deriva metadata molecular (con caché)
   * @param {string} filePath - Archivo
   * @param {Array} atoms - Átomos del archivo
   * @param {string} ruleName - Regla de derivación
   * @returns {any}
   */
  derive(filePath, atoms, ruleName) {
    return this.derivations.derive(filePath, atoms, ruleName);
  }

  /**
   * Obtiene estadísticas del caché
   */
  getStats() {
    let memoryBytes = 0;
    for (const item of this.atoms.values()) {
      memoryBytes += JSON.stringify(item.data).length;
    }
    
    return {
      atomsCached: this.atoms.size,
      derivationsCached: this.derivations.cache.size,
      filesTracked: this.fileToAtoms.size,
      memoryUsageKB: Math.round(memoryBytes / 1024),
      derivationStats: this.derivations.getStats()
    };
  }

  /**
   * Limpia todo el caché
   */
  clear() {
    this.atoms.clear();
    this.derivations.clear();
    this.fileToAtoms.clear();
  }

  /**
   * Evicción LRU (Least Recently Used)
   * @private
   */
  _evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, item] of this.atoms.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.atoms.delete(oldestKey);
    }
  }
}

// Instancia global (singleton)
export const atomicCache = new AtomicCache();
