/**
 * @fileoverview constants.js
 * 
 * SSOT - Constantes del Batch Processor
 * 
 * @module batch-processor/constants
 */

/**
 * Tipos de prioridad para el procesamiento
 * @readonly
 * @enum {number}
 */
export const Priority = {
  CRITICAL: 4,  // Archivos con muchos dependientes
  HIGH: 3,      // Cambios en exports (breaking changes potenciales)
  MEDIUM: 2,    // Cambios en imports
  LOW: 1        // Cambios internos (funciones, no afectan API)
};

/**
 * Estados de un batch
 * @readonly
 * @enum {string}
 */
export const BatchState = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * Tipos de cambio soportados
 * @readonly
 * @enum {string}
 */
export const ChangeType = {
  CREATED: 'created',
  MODIFIED: 'modified',
  DELETED: 'deleted'
};

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
