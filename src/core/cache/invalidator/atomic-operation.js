/**
 * @fileoverview atomic-operation.js
 * 
 * Sistema de operaciones atómicas con rollback
 * ACID: Atomicity, Consistency, Isolation, Durability
 * 
 * @module cache-invalidator/atomic-operation
 */

import { createLogger } from '../../utils/logger.js';
import {
  InvalidationStatus,
  CacheOperationType,
  InvalidationEvents
} from './constants.js';

const logger = createLogger('OmnySys:cache:atomic');

/**
 * Operación individual del caché
 */
export class CacheOperation {
  constructor(type, action, undoAction, description) {
    this.type = type;
    this.action = action;
    this.undoAction = undoAction;
    this.description = description;
    this.status = InvalidationStatus.PENDING;
    this.result = null;
    this.error = null;
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * Ejecuta la operación
   */
  async perform() {
    this.startTime = Date.now();
    this.status = InvalidationStatus.IN_PROGRESS;

    try {
      this.result = await this.action();
      this.status = InvalidationStatus.SUCCESS;
      this.endTime = Date.now();
      return { success: true, result: this.result };
    } catch (error) {
      this.error = error;
      this.status = InvalidationStatus.FAILED;
      this.endTime = Date.now();
      return { success: false, error };
    }
  }

  /**
   * Ejecuta rollback de la operación
   */
  async revert() {
    if (this.status !== InvalidationStatus.FAILED &&
      this.status !== InvalidationStatus.SUCCESS) {
      return { success: true, message: 'Nothing to rollback' };
    }

    this.status = InvalidationStatus.ROLLING_BACK;

    try {
      await this.undoAction(this.result);
      this.status = InvalidationStatus.ROLLED_BACK;
      return { success: true };
    } catch (error) {
      logger.error(`❌ Rollback failed for ${this.type}:`, error.message);
      return { success: false, error };
    }
  }

  /**
   * Obtiene duración de la operación
   */
  getDuration() {
    if (!this.startTime) return 0;
    return (this.endTime || Date.now()) - this.startTime;
  }
}

/**
 * Transacción atómica de múltiples operaciones
 */
export class AtomicTransaction {
  constructor(filePath, config = {}) {
    this.filePath = filePath;
    this.operations = [];
    this.snapshots = new Map();
    this.status = InvalidationStatus.PENDING;
    this.config = config;
    this.startTime = null;
    this.endTime = null;
    this.events = [];
  }

  /**
   * Agrega una operación a la transacción
   */
  addOperation(operation) {
    this.operations.push(operation);
  }

  /**
   * Guarda snapshot antes de ejecutar
   */
  saveSnapshot(key, data) {
    this.snapshots.set(key, data);
  }

  /**
   * Obtiene snapshot
   */
  getSnapshot(key) {
    return this.snapshots.get(key);
  }

  /**
   * Ejecuta toda la transacción (todo o nada)
   */
  async commit() {
    this.startTime = Date.now();
    this.status = InvalidationStatus.IN_PROGRESS;

    logger.debug(`🚀 Starting atomic transaction for ${this.filePath}`);

    const completedOperations = [];

    try {
      await this._runOperations(completedOperations);
      this.status = InvalidationStatus.SUCCESS;
      this.endTime = Date.now();

      logger.debug(`✅ Atomic transaction completed in ${this.getDuration()}ms`);
      return this._buildSuccessResult(completedOperations.length);

    } catch (error) {
      return this._handleFailure(error, completedOperations);
    }
  }

  /**
   * Rollback de todas las operaciones completadas
   */
  async rollback(completedOperations) {
    await this._rollbackOperations(completedOperations);
  }

  /**
   * Obtiene duración de la transacción
   */
  getDuration() {
    if (!this.startTime) return 0;
    return (this.endTime || Date.now()) - this.startTime;
  }

  /**
   * Obtiene reporte de la transacción
   */
  getReport() {
    return {
      filePath: this.filePath,
      status: this.status,
      duration: this.getDuration(),
      totalOperations: this.operations.length,
      operations: this.operations.map(op => ({
        type: op.type,
        status: op.status,
        duration: op.getDuration(),
        error: op.error?.message
      }))
    };
  }

  async _runOperations(completedOperations) {
    // Ejecutar operaciones en orden
    for (let i = 0; i < this.operations.length; i++) {
      const operation = this.operations[i];

      logger.debug(`  [${i + 1}/${this.operations.length}] ${operation.description}`);

      const result = await operation.perform();

      if (!result.success) {
        throw new Error(`Operation ${operation.type} failed: ${result.error.message}`);
      }

      completedOperations.push(operation);
    }
  }

  _buildSuccessResult(operationsCompleted) {
    return {
      success: true,
      filePath: this.filePath,
      duration: this.getDuration(),
      operationsCompleted
    };
  }

  async _handleFailure(error, completedOperations) {
    // Algunas operaciones fallaron, hacer rollback
    this.status = InvalidationStatus.FAILED;
    logger.error(`❌ Transaction failed: ${error.message}`);

    await this._rollbackOperations(completedOperations);

    throw error;
  }

  async _rollbackOperations(completedOperations) {
    logger.warn(`↩️  Rolling back ${completedOperations.length} operations...`);
    this.status = InvalidationStatus.ROLLING_BACK;

    // Rollback en orden inverso
    for (let i = completedOperations.length - 1; i >= 0; i--) {
      const operation = completedOperations[i];

      logger.debug(`  Rolling back: ${operation.description}`);

      const result = await operation.revert();

      if (!result.success) {
        logger.error(`    ⚠️  Rollback failed for ${operation.type}:`, result.error?.message);
        // Continuar con el resto del rollback aunque uno falle
      }
    }

    this.status = InvalidationStatus.ROLLED_BACK;
    logger.info(`↩️  Rollback completed`);
  }
}

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
