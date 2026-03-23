/**
 * @fileoverview index.js
 * 
 * Facade del módulo batch-processor
 * Exporta API pública con clases importadas de módulos especializados
 * 
 * @module batch-processor
 */

import { EventEmitter } from 'events';
import { Priority, BatchState, Events } from './constants.js';
import {
  buildBatchProcessorOptions,
  initializeBatchProcessorState,
  createBatchProcessorScheduler,
  buildBatchProcessorStats
} from './helpers.js';
import {
  activateBatchProcessor,
  stopBatchProcessor,
  queueBatchChange,
  flushBatch,
  drainBatchQueue,
  executeBatchJob
} from './batch-processor-actions.js';

/**
 * Procesador de cambios batch con soporte para dependencias y prioridades
 * @extends EventEmitter
 */
export class BatchProcessor extends EventEmitter {
  /**
   * @param {Object} options - Opciones de configuración
   * @param {number} options.maxBatchSize - Tamaño máximo de batch
   * @param {number} options.batchTimeoutMs - Timeout para flushear batch
   * @param {number} options.maxConcurrent - Procesos concurrentes máximos
   * @param {Object} options.dependencyGraph - Grafo de dependencias
   * @param {Function} options.processChange - Callback de procesamiento
   * @param {Function} options.afterBatch - Callback post-batch
   */
  constructor(options = {}) {
    super();
    this.options = buildBatchProcessorOptions(options);
    initializeBatchProcessorState(this);
    this.scheduler = createBatchProcessorScheduler(this);
  }

  /**
   * Inicia el procesador
   */
  start() {
    activateBatchProcessor(this);
  }

  /**
   * Detiene el procesador
   */
  stop() {
    stopBatchProcessor(this);
  }

  /**
   * Agrega un cambio al batch pendiente
   * @param {string} filePath - Ruta del archivo
   * @param {string} changeType - Tipo de cambio
   * @param {Object} options - Opciones adicionales
   * @returns {FileChange} - El cambio creado
   */
  queueChange(filePath, changeType, options = {}) {
    return queueBatchChange(this, filePath, changeType, options);
  }

  /**
   * Fuerza el flusheo del batch actual
   * @returns {Batch|null} - El batch creado o null
   */
  flushBatch() {
    return flushBatch(this);
  }

  /**
   * Procesa batches disponibles
   * @private
   */
  async drainBatchQueue() {
    return drainBatchQueue(this);
  }

  /**
   * Procesa un batch específico
   * @private
   * @param {Batch} batch - Batch a procesar
   */
  async executeBatchJob(batch) {
    return executeBatchJob(this, batch);
  }

  /**
   * Obtiene estadísticas del procesador
   * @returns {Object}
   */
  getProcessorStats() {
    return buildBatchProcessorStats(this);
  }

  getStats() {
    return this.getProcessorStats();
  }
}

// Re-exportar API pública
export { Priority, BatchState } from './constants.js';
export { FileChange } from './models/file-change.js';
export { Batch } from './models/batch.js';
export { calculatePriority } from './priority-calculator.js';
export { loadDependencies } from './dependency-loader.js';
export { BatchScheduler } from './batch-scheduler.js';
export { executeBatch, executeBatchChange } from './change-processor.js';

