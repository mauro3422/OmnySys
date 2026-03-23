/**
 * @fileoverview State Validator
 * 
 * Validates cache state
 * 
 * @module cache-invalidator/validators/state-validator
 */

import { CACHE_KEY_PREFIXES } from '../constants.js';

/**
 * Create state validator
 * @param {Object} cache - Cache manager
 * @returns {Object} Validator functions
 */
export function createStateValidator(cache) {
  return {
    /**
     * Check if file is in RAM cache
     * @param {string} filePath - File path
     * @returns {boolean}
     */
    isInRam(filePath) {
      const key = `${CACHE_KEY_PREFIXES.ANALYSIS}${filePath}`;

      if (typeof cache?.get === 'function') {
        return cache.get(key) !== null;
      }

      if (!cache.ramCache) return false;
      return cache.ramCache.has(key);
    },

    /**
     * Check if file is in index
     * @param {string} filePath - File path
     * @returns {boolean}
     */
    isInIndex(filePath) {
      return !!(cache?.index?.entries && cache.index.entries[filePath]);
    },

    /**
     * Get full status
     * @param {string} filePath - File path
     * @returns {Object} Status
     */
    buildStatus(filePath) {
      return {
        filePath,
        inRam: this.isInRam(filePath),
        onDisk: false, // Async check
        inIndex: this.isInIndex(filePath)
      };
    }
  };
}
