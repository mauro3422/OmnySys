/**
 * @fileoverview LRU Cache - Caché simple de tipo LRU
 * 
 * Responsabilidad Única (SRP): Gestionar caché en memoria de sombras.
 * 
 * @module layer-c-memory/shadow-registry/cache
 */

/**
 * Gestiona una caché LRU simple para sombras
 */
export class ShadowCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Obtiene una sombra de la caché
   * @param {string} shadowId 
   * @returns {Object|undefined}
   */
  get(shadowId) {
    return this.cache.get(shadowId);
  }

  /**
   * Verifica si una sombra está en caché
   * @param {string} shadowId 
   * @returns {boolean}
   */
  has(shadowId) {
    return this.cache.has(shadowId);
  }

  /**
   * Agrega una sombra a la caché
   * @param {string} shadowId 
   * @param {Object} shadow 
   */
  set(shadowId, shadow) {
    if (this.cache.size >= this.maxSize) {
      // Eliminar el más antiguo (primer entry)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(shadowId, shadow);
  }

  /**
   * Elimina una sombra de la caché
   * @param {string} shadowId 
   */
  delete(shadowId) {
    this.cache.delete(shadowId);
  }

  /**
   * Limpia toda la caché
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Obtiene el tamaño actual de la caché
   * @returns {number}
   */
  get size() {
    return this.cache.size;
  }
}
