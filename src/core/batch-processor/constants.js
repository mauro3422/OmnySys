/**
 * @fileoverview constants.js
 * 
 * SSOT - Constantes del Batch Processor
 * 
 * @module batch-processor/constants
 */

// Re-export from centralized config for backward compatibility
export { FileChangeType as ChangeType, Priority, BatchState } from '#config/change-types.js';

/**
 * Configuración por defecto del BatchProcessor
 * @constant
 */
export const DEFAULT_CONFIG = {
  maxBatchSize: 50,
  batchTimeoutMs: 1000,
  maxConcurrent: 5,
  maxRetries: 3
};

/**
 * Nombres de eventos emitidos
 * @readonly
 * @enum {string}
 */
export const Events = {
  STARTED: 'started',
  STOPPED: 'stopped',
  CHANGE_ADDED: 'change:added',
  CHANGE_PROCESSING: 'change:processing',
  CHANGE_COMPLETED: 'change:completed',
  CHANGE_ERROR: 'change:error',
  BATCH_CREATED: 'batch:created',
  BATCH_STARTED: 'batch:started',
  BATCH_COMPLETED: 'batch:completed',
  BATCH_FAILED: 'batch:failed'
};
