/**
 * @fileoverview constants.js
 * 
 * Constantes para el sistema de invalidación de caché
 * SSOT: Todas las constantes en un solo lugar
 * 
 * @module cache-invalidator/constants
 */

/**
 * Estados de una operación de invalidación
 */
export const InvalidationStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  SUCCESS: 'success',
  FAILED: 'failed',
  ROLLING_BACK: 'rolling_back',
  ROLLED_BACK: 'rolled_back'
};

/**
 * Tipos de operaciones de caché
 */
export const CacheOperationType = {
  INVALIDATE_RAM: 'invalidate_ram',
  DELETE_DISK_FILE: 'delete_disk_file',
  UPDATE_INDEX: 'update_index',
  INVALIDATE_DEPENDENTS: 'invalidate_dependents'
};

/**
 * Configuración por defecto
 */
export const DEFAULT_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 100,
  operationTimeoutMs: 5000,
  enableRollback: true,
  logOperations: true
};

/**
 * Prefijos de claves de caché
 */
export const CACHE_KEY_PREFIXES = {
  ATOM: 'atom:',
  ANALYSIS: 'analysis:',
  DERIVED: 'derived:',
  CONNECTIONS: 'connections:'
};

/**
 * Eventos emitidos por el CacheInvalidator
 */
export const InvalidationEvents = {
  STARTED: 'invalidation:started',
  SUCCESS: 'invalidation:success',
  FAILED: 'invalidation:failed',
  RETRYING: 'invalidation:retrying',
  ROLLBACK_STARTED: 'rollback:started',
  ROLLBACK_COMPLETED: 'rollback:completed'
};
