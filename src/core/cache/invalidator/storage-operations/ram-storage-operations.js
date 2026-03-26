/**
 * @fileoverview ram-storage-operations.js
 *
 * Operaciones de almacenamiento para el caché RAM.
 *
 * @module cache-invalidator/storage-operations/ram-storage-operations
 */

import { createLogger } from '../../../utils/logger.js';
import { deleteMatchingKeys } from '../../../../shared/cache/cache-maintenance.js';

const logger = createLogger('OmnySys:cache:storage');

function invalidateLegacyRamKey(ramCache, key) {
  if (typeof key === 'string' && (key.includes('*') || key.includes('?'))) {
    return deleteMatchingKeys(ramCache, key) > 0;
  }

  return ramCache.delete(key);
}

function captureLegacyRamSnapshot(cache, key) {
  if (typeof cache?.get === 'function') {
    const item = cache.get(key);
    if (!item) {
      return { existed: false, key };
    }

    return {
      existed: true,
      key,
      data: JSON.parse(JSON.stringify(item))
    };
  }

  const item = cache.ramCache?.get(key);
  if (!item) {
    return { existed: false, key };
  }

  return {
    existed: true,
    key,
    data: JSON.parse(JSON.stringify(item.data))
  };
}

function restoreLegacyRamSnapshot(cache, snapshot) {
  if (!snapshot.existed) {
    return;
  }

  if (typeof cache?.set === 'function') {
    cache.set(snapshot.key, snapshot.data);
    return;
  }

  if (!cache.ramCache) {
    cache.ramCache = new Map();
  }

  cache.ramCache.set(snapshot.key, {
    data: snapshot.data,
    expiry: null,
    createdAt: Date.now()
  });
}

/**
 * Operaciones de almacenamiento en RAM
 */
export class RamStorageOperations {
  constructor(cacheManager) {
    this.cache = cacheManager;
  }

  /**
   * Invalida una entrada del caché RAM
   * @param {string} key - Clave a invalidar
   * @returns {boolean} - true si se eliminó
   */
  invalidateEntry(key) {
    if (typeof this.cache?.invalidate === 'function') {
      const deleted = this.cache.invalidate(key);
      if (deleted) {
        logger.debug(`🗑️  Invalidated RAM entry: ${key}`);
      }
      return deleted;
    }

    if (!this.cache?.ramCache) {
      return false;
    }

    const deleted = invalidateLegacyRamKey(this.cache.ramCache, key);
    if (deleted) {
      logger.debug(`🗑️  Invalidated RAM entry: ${key}`);
    }
    return deleted;
  }

  /**
   * Guarda snapshot del estado actual para rollback
   * @param {string} key - Clave a guardar
   * @returns {object|null} - Snapshot o null
   */
  captureSnapshot(key) {
    if (typeof this.cache?.get !== 'function' && !this.cache?.ramCache) {
      return null;
    }

    return captureLegacyRamSnapshot(this.cache, key);
  }

  /**
   * Restaura desde snapshot (rollback)
   * @param {object} snapshot - Snapshot a restaurar
   */
  restoreSnapshot(snapshot) {
    if (snapshot.existed) {
      restoreLegacyRamSnapshot(this.cache, snapshot);
      logger.debug(`↩️  Restored RAM entry from snapshot: ${snapshot.key}`);
    }
  }
}
