/**
 * @fileoverview index-operations.js
 *
 * Operaciones con el índice del caché.
 *
 * @module cache-invalidator/storage-operations/index-operations
 */

import { createLogger } from '../../../utils/logger.js';
import { normalizeCachePath } from './shared.js';

const logger = createLogger('OmnySys:cache:storage');

/**
 * Operaciones con el índice del caché
 */
export class IndexOperations {
  constructor(cacheManager) {
    this.cache = cacheManager;
  }

  /**
   * Elimina entrada del índice
   * @param {string} filePath - Ruta del archivo
   * @returns {object} - Entrada eliminada o null
   */
  removeEntry(filePath) {
    const normalizedPath = normalizeCachePath(filePath);

    // Safety check: ensure index and entries exist
    if (!this.cache?.index?.entries) {
      logger.warn(`⚠️  Cannot remove entry: index not initialized`);
      return null;
    }

    const entry = this.cache.index.entries[normalizedPath];

    if (entry) {
      delete this.cache.index.entries[normalizedPath];
      if (this.cache.index.metadata) {
        this.cache.index.metadata.totalFiles--;
      }
      logger.debug(`🗑️  Removed index entry: ${normalizedPath}`);
    }

    return entry || null;
  }

  /**
   * Restaura entrada en el índice (rollback)
   * @param {string} filePath - Ruta del archivo
   * @param {object} entry - Entrada a restaurar
   */
  restoreEntry(filePath, entry) {
    const normalizedPath = normalizeCachePath(filePath);

    // Safety check: ensure index and entries exist
    if (!this.cache?.index) {
      this.cache.index = { entries: {}, metadata: { totalFiles: 0 } };
    }
    if (!this.cache.index.entries) {
      this.cache.index.entries = {};
    }
    if (!this.cache.index.metadata) {
      this.cache.index.metadata = { totalFiles: 0 };
    }

    this.cache.index.entries[normalizedPath] = entry;
    this.cache.index.metadata.totalFiles++;
    logger.debug(`↩️  Restored index entry: ${normalizedPath}`);
  }

  /**
   * Guarda índice en disco
   * @deprecated - Ya no se usa, SQLite es la fuente de datos
   */
  async saveIndex() {
    return;
  }
}
