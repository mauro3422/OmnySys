/**
 * @fileoverview cache-operation.js
 *
 * Operación individual del caché con rollback.
 *
 * @module cache-invalidator/atomic-operation/cache-operation
 */

import { createLogger } from '../../../utils/logger.js';
import { InvalidationStatus } from '../constants.js';

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
