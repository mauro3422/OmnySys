/**
 * @fileoverview index.js
 * 
 * Facade del módulo batch-processor
 * Exporta API pública con clases importadas de módulos especializados
 * 
 * @module batch-processor
 */

import { EventEmitter } from 'events';
import { FileChange } from './models/file-change.js';
import { Batch } from './models/batch.js';
import { calculatePriority } from './priority-calculator.js';
import { loadDependencies } from './dependency-loader.js';
import { BatchScheduler } from './batch-scheduler.js';
import { processBatch } from './change-processor.js';
import { Priority, BatchState, DEFAULT_CONFIG, Events } from './constants.js';

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
    
    this.options = {
      maxBatchSize: options.maxBatchSize ?? DEFAULT_CONFIG.maxBatchSize,
      batchTimeoutMs: options.batchTimeoutMs ?? DEFAULT_CONFIG.batchTimeoutMs,
      maxConcurrent: options.maxConcurrent ?? DEFAULT_CONFIG.maxConcurrent,
      dependencyGraph: options.dependencyGraph ?? null,
      processChange: options.processChange ?? null,
      afterBatch: options.afterBatch ?? null
    };

    this.pendingChanges = new Map();
    this.processingQueue = [];
    this.processingBatches = new Map();
    this.completedBatches = [];
    this.isRunning = false;
    this.activeProcesses = 0;
    
    this.scheduler = new BatchScheduler({
      batchTimeoutMs: this.options.batchTimeoutMs,
      onFlush: () => this.flushBatch()
    });
  }

  /**
   * Inicia el procesador
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.scheduler.start();
    this.emit(Events.STARTED);
  }

  /**
   * Detiene el procesador
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    this.scheduler.stop();
    this.emit(Events.STOPPED);
  }

  /**
   * Agrega un cambio al batch pendiente
   * @param {string} filePath - Ruta del archivo
   * @param {string} changeType - Tipo de cambio
   * @param {Object} options - Opciones adicionales
   * @returns {FileChange} - El cambio creado
   */
  addChange(filePath, changeType, options = {}) {
    const priority = calculatePriority(filePath, changeType, {
      ...options,
      priority: options.priority
    });

    const change = new FileChange(filePath, changeType, {
      ...options,
      priority,
      metadata: {
        ...options.metadata,
        addedAt: Date.now()
      }
    });

    // Cargar dependencias si hay grafo disponible
    loadDependencies(change, this.options.dependencyGraph);

    this.pendingChanges.set(filePath, change);
    this.emit(Events.CHANGE_ADDED, change);

    // Flushear si alcanzamos el tamaño máximo
    if (this.pendingChanges.size >= this.options.maxBatchSize) {
      this.flushBatch();
    }

    return change;
  }

  /**
   * Fuerza el flusheo del batch actual
   * @returns {Batch|null} - El batch creado o null
   */
  flushBatch() {
    if (this.pendingChanges.size === 0) return null;

    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const batch = new Batch(batchId, Array.from(this.pendingChanges.values()));

    this.processingQueue.push(batch);
    this.pendingChanges.clear();
    this.emit(Events.BATCH_CREATED, batch);

    // Procesar batches disponibles
    this.processNextBatches();

    return batch;
  }

  /**
   * Procesa batches disponibles
   * @private
   */
  async processNextBatches() {
    while (
      this.isRunning &&
      this.processingQueue.length > 0 &&
      this.activeProcesses < this.options.maxConcurrent
    ) {
      const batch = this.processingQueue.shift();
      this.processBatch(batch);
    }
  }

  /**
   * Procesa un batch específico
   * @private
   * @param {Batch} batch - Batch a procesar
   */
  async processBatch(batch) {
    this.activeProcesses++;
    this.processingBatches.set(batch.id, batch);
    batch.start();

    this.emit(Events.BATCH_STARTED, batch);

    try {
      await processBatch(batch, {
        processFn: this.options.processChange,
        emitter: this
      });

      batch.complete();
      this.completedBatches.push(batch);
      this.emit(Events.BATCH_COMPLETED, batch);

      // Ejecutar callback post-batch si existe
      if (this.options.afterBatch) {
        await this.options.afterBatch(batch);
      }
    } catch (error) {
      batch.fail(error);
      this.emit(Events.BATCH_FAILED, batch, error);
    } finally {
      this.processingBatches.delete(batch.id);
      this.activeProcesses--;
      
      // Procesar más batches si hay disponibles
      this.processNextBatches();
    }
  }

  /**
   * Obtiene estadísticas del procesador
   * @returns {Object}
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      pendingChanges: this.pendingChanges.size,
      queuedBatches: this.processingQueue.length,
      processingBatches: this.processingBatches.size,
      activeProcesses: this.activeProcesses,
      completedBatches: this.completedBatches.length
    };
  }
}

// Re-exportar API pública
export { Priority, BatchState } from './constants.js';
export { FileChange } from './models/file-change.js';
export { Batch } from './models/batch.js';
export { calculatePriority } from './priority-calculator.js';
export { loadDependencies } from './dependency-loader.js';
export { BatchScheduler } from './batch-scheduler.js';
export { processBatch, processChange } from './change-processor.js';
