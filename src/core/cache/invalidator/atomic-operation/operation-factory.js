/**
 * @fileoverview operation-factory.js
 *
 * Fábrica de operaciones comunes para invalidación atómica.
 *
 * @module cache-invalidator/atomic-operation/operation-factory
 */

import { CacheOperation } from './cache-operation.js';
import { CacheOperationType } from '../constants.js';

/**
 * Fábrica de operaciones comunes
 */
export class OperationFactory {
  /**
   * Crea operación de invalidación de RAM
   */
  static createRamInvalidation(ramStorage, key, createSnapshotFn) {
    let snapshot = null;

    return new CacheOperation(
      CacheOperationType.INVALIDATE_RAM,
      async () => {
        // Guardar snapshot antes de modificar
        snapshot = createSnapshotFn ? createSnapshotFn() : null;
        return ramStorage.invalidateEntry(key);
      },
      async () => {
        // Restaurar desde snapshot
        if (snapshot) {
          ramStorage.restoreSnapshot(snapshot);
        }
      },
      `Invalidate RAM cache: ${key}`
    );
  }

  /**
   * Crea operación de eliminación de archivo en disco
   */
  static createDiskDeletion(diskStorage, filePath) {
    let backup = null;

    return new CacheOperation(
      CacheOperationType.DELETE_DISK_FILE,
      async () => {
        // Crear backup antes de eliminar
        backup = await diskStorage.createBackup(filePath);
        return diskStorage.deleteFile(filePath);
      },
      async () => {
        // Restaurar desde backup
        if (backup) {
          await diskStorage.restoreFromBackup(backup);
        }
      },
      `Delete disk cache file: ${filePath}`
    );
  }

  /**
   * Crea operación de actualización de índice
   */
  static createIndexUpdate(indexOps, filePath) {
    let entry = null;

    return new CacheOperation(
      CacheOperationType.UPDATE_INDEX,
      async () => {
        // Guardar entrada antes de eliminar (with safety check)
        entry = indexOps.cache?.index?.entries?.[filePath] || null;
        return indexOps.removeEntry(filePath);
      },
      async () => {
        // Restaurar entrada
        if (entry) {
          indexOps.restoreEntry(filePath, entry);
        }
      },
      `Update cache index: ${filePath}`
    );
  }
}
