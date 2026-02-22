/**
 * @fileoverview debounced-batch-writer.js
 * 
 * Agrupa múltiples escrituras cercanas en batches para eficiencia.
 * Evita escribir el mismo archivo múltiples veces en poco tiempo.
 * 
 * @module layer-c-memory/storage/atoms/debounced-batch-writer
 * 
 * @description
 * Problema que resuelve:
 * - File watcher detecta múltiples cambios en un archivo (ej: editor guarda 3 veces)
 * - Cada cambio dispara reindexado completo
 * - Se escriben los mismos átomos múltiples veces
 * 
 * Solución:
 * - Debounce: Espera un tiempo antes de procesar
 * - Batch: Agrupa escrituras del mismo archivo
 * - Dedupe: Solo escribe la versión más reciente
 * 
 * Patrón usado por:
 * - VSCode (file system watcher)
 * - TypeScript Server (incremental compilation)
 * - Webpack (watch mode)
 */

import { createLogger } from '#utils/logger.js';
import { getWriteQueue } from './write-queue.js';
import { writeJSON } from './graceful-write.js';

const logger = createLogger('OmnySys:batch-writer');

const DEFAULT_DEBOUNCE_MS = 100;
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_FLUSH_INTERVAL = 1000;

/**
 * @typedef {Object} PendingWrite
 * @property {string} path - Ruta del archivo
 * @property {any} data - Datos a escribir
 * @property {number} addedAt - Timestamp
 * @property {string} source - Origen del cambio
 */

/**
 * Batch Writer con debounce y deduplicación
 */
export class DebouncedBatchWriter {
  #pending = new Map();
  #debounceMs;
  #batchSize;
  #flushInterval;
  #flushTimer = null;
  #writeQueue;
  #stats = {
    batches: 0,
    writesDeduped: 0,
    writesTotal: 0,
    bytesWritten: 0,
    avgBatchSize: 0
  };
  #batchSizeSum = 0;
  #isFlushing = false;

  constructor(options = {}) {
    this.#debounceMs = options.debounceMs || DEFAULT_DEBOUNCE_MS;
    this.#batchSize = options.batchSize || DEFAULT_BATCH_SIZE;
    this.#flushInterval = options.flushInterval || DEFAULT_FLUSH_INTERVAL;
    this.#writeQueue = options.writeQueue || getWriteQueue();
    
    this.#startFlushTimer();
    
    logger.info(`DebouncedBatchWriter: debounce=${this.#debounceMs}ms, batch=${this.#batchSize}, interval=${this.#flushInterval}ms`);
  }

  /**
   * Encola una escritura (debounced)
   * 
   * @param {string} path - Ruta del archivo
   * @param {any} data - Datos a escribir
   * @param {Object} options - Opciones
   * @param {string} options.source - Origen del cambio
   * @param {number} options.priority - Prioridad
   * @returns {Promise<void>} Se resuelve cuando se escribe
   */
  async write(path, data, options = {}) {
    const { source = 'unknown', priority = 0 } = options;
    
    const existing = this.#pending.get(path);
    
    if (existing) {
      this.#stats.writesDeduped++;
      existing.data = data;
      existing.source = source;
      existing.priority = Math.max(existing.priority, priority);
      existing.updatedAt = Date.now();
      
      existing.resolve();
      existing.resolve = () => {};
      existing.reject = () => {};
    } else {
      let resolve, reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      
      this.#pending.set(path, {
        path,
        data,
        source,
        priority,
        addedAt: Date.now(),
        updatedAt: Date.now(),
        promise,
        resolve,
        reject
      });
      
      this.#stats.writesTotal++;
    }
    
    if (this.#pending.size >= this.#batchSize) {
      await this.flush();
    }
    
    return this.#pending.get(path)?.promise || Promise.resolve();
  }

  /**
   * Encola múltiples escrituras
   * 
   * @param {Array<{path: string, data: any}>} items - Items a escribir
   * @param {Object} options - Opciones compartidas
   */
  async writeAll(items, options = {}) {
    const promises = items.map(item => this.write(item.path, item.data, options));
    return Promise.all(promises);
  }

  /**
   * Fuerza el flush inmediato de todos los pendientes
   */
  async flush() {
    if (this.#isFlushing || this.#pending.size === 0) {
      return { flushed: 0 };
    }
    
    this.#isFlushing = true;
    const batch = this.#takeBatch();
    
    if (batch.length === 0) {
      this.#isFlushing = false;
      return { flushed: 0 };
    }
    
    this.#stats.batches++;
    this.#batchSizeSum += batch.length;
    this.#stats.avgBatchSize = this.#batchSizeSum / this.#stats.batches;
    
    logger.debug(`Flushing batch of ${batch.length} writes (${this.#pending.size} remaining)`);
    
    try {
      const results = await this.#writeQueue.addAll(
        batch.map(item => async () => {
          try {
            await writeJSON(item.path, item.data);
            const bytes = JSON.stringify(item.data).length;
            this.#stats.bytesWritten += bytes;
            item.resolve();
            return { success: true, path: item.path };
          } catch (error) {
            item.reject(error);
            logger.error(`Failed to write ${item.path}:`, error.message);
            return { success: false, path: item.path, error: error.message };
          }
        }),
        { id: `batch-${Date.now()}` }
      );
      
      return {
        flushed: batch.length,
        success: results.filter(r => r?.success).length,
        failed: results.filter(r => !r?.success).length
      };
    } finally {
      this.#isFlushing = false;
      
      if (this.#pending.size > 0) {
        process.nextTick(() => this.flush());
      }
    }
  }

  /**
   * Toma un batch del pending map (ordenado por prioridad)
   */
  #takeBatch() {
    const items = Array.from(this.#pending.values())
      .sort((a, b) => b.priority - a.priority)
      .slice(0, this.#batchSize);
    
    for (const item of items) {
      this.#pending.delete(item.path);
    }
    
    return items;
  }

  /**
   * Inicia el timer de flush automático
   */
  #startFlushTimer() {
    this.#flushTimer = setInterval(() => {
      if (this.#pending.size > 0) {
        this.flush().catch(err => {
          logger.error('Auto-flush error:', err);
        });
      }
    }, this.#flushInterval);
    
    this.#flushTimer.unref?.();
  }

  /**
   * Detiene el timer de flush
   */
  stopFlushTimer() {
    if (this.#flushTimer) {
      clearInterval(this.#flushTimer);
      this.#flushTimer = null;
    }
  }

  /**
   * Espera a que todo esté escrito
   */
  async drain() {
    while (this.#pending.size > 0 || this.#isFlushing) {
      await this.flush();
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    await this.#writeQueue.onIdle();
  }

  /**
   * Estado del batch writer
   */
  get status() {
    return {
      pending: this.#pending.size,
      isFlushing: this.#isFlushing,
      stats: { ...this.#stats },
      queueStatus: this.#writeQueue.status,
      health: this.#pending.size > 500 ? 'backlogged' : 'healthy'
    };
  }

  /**
   * Limpia todo lo pendiente
   */
  clear() {
    const cleared = this.#pending.size;
    
    for (const item of this.#pending.values()) {
      item.reject(new Error('Batch writer cleared'));
    }
    
    this.#pending.clear();
    
    logger.info(`Batch writer cleared: ${cleared} items discarded`);
    return cleared;
  }
}

let globalBatchWriter = null;

export function getBatchWriter(options = {}) {
  if (!globalBatchWriter) {
    globalBatchWriter = new DebouncedBatchWriter(options);
  }
  return globalBatchWriter;
}

export function resetBatchWriter() {
  if (globalBatchWriter) {
    globalBatchWriter.stopFlushTimer();
    globalBatchWriter.clear();
    globalBatchWriter = null;
  }
}

export default DebouncedBatchWriter;
