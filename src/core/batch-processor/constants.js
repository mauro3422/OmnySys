/**
 * @fileoverview constants.js
 * 
 * SSOT - Constantes del Batch Processor
 * 
 * @module batch-processor/constants
 */

// Re-export from centralized config
export { FileChangeType as ChangeType, Priority, BatchState } from '#config/change-types.js';

// Keep local definitions for backward compatibility during transition
import { FileChangeType, Priority as ConfigPriority, BatchState as ConfigBatchState } from '#config/change-types.js';

/**
 * Tipos de prioridad para el procesamiento
 * @readonly
 * @enum {number}
 * @deprecated Use Priority from '#config/change-types.js' instead
 */
export const Priority = ConfigPriority;

/**
 * Estados de un batch
 * @readonly
 * @enum {string}
 * @deprecated Use BatchState from '#config/change-types.js' instead
 */
export const BatchState = ConfigBatchState;

/**
 * Tipos de cambio soportados
 * @readonly
 * @enum {string}
 * @deprecated Use FileChangeType from '#config/change-types.js' instead
 */
export const ChangeType = FileChangeType;

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
