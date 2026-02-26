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
import { BatchWriterQueue } from './batch-writer-queue.js';
import { BatchWriterFlusher } from './batch-writer-flusher.js';

const logger = createLogger('OmnySys:batch-writer');

const DEFAULT_DEBOUNCE_MS = 100;
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_FLUSH_INTERVAL = 1000;

/**
 * Batch Writer con debounce y deduplicación (Facade)
 */
export class DebouncedBatchWriter {
  #queue;
  #flusher;

  constructor(options = {}) {
    this.#queue = new BatchWriterQueue();
    this.#flusher = new BatchWriterFlusher(this.#queue, {
      debounceMs: options.debounceMs || DEFAULT_DEBOUNCE_MS,
      batchSize: options.batchSize || DEFAULT_BATCH_SIZE,
      flushInterval: options.flushInterval || DEFAULT_FLUSH_INTERVAL,
      writeQueue: options.writeQueue || getWriteQueue()
    });

    this.#flusher.startTimer();
    logger.info(`DebouncedBatchWriter: started via modular components`);
  }

  /**
   * Encola una escritura (debounced)
   */
  async write(path, data, options = {}) {
    const existing = this.#queue.get(path);
    if (!existing) {
      let resolve, reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      this.#queue.add(path, data, options, { promise, resolve, reject });
    } else {
      this.#queue.add(path, data, options, {}); // will dedupe inside and resolve previous
    }

    if (this.#queue.size >= this.#flusher.batchSize) {
      await this.#flusher.flush();
    }

    return this.#queue.get(path)?.promise || Promise.resolve();
  }

  /**
   * Encola múltiples escrituras
   */
  async writeAll(items, options = {}) {
    const promises = items.map(item => this.write(item.path, item.data, options));
    return Promise.all(promises);
  }

  /**
   * Fuerza el flush inmediato de todos los pendientes
   */
  async flush() {
    return this.#flusher.flush();
  }

  /**
   * Detiene el timer de flush
   */
  stopFlushTimer() {
    this.#flusher.stopTimer();
  }

  /**
   * Espera a que todo esté escrito
   */
  async drain() {
    return this.#flusher.drain();
  }

  /**
   * Estado del batch writer
   */
  get status() {
    return {
      pending: this.#queue.size,
      isFlushing: this.#flusher.isFlushing,
      stats: { ...this.#queue.stats, ...this.#flusher.stats },
      queueStatus: this.#flusher.queueStatus,
      health: this.#queue.size > 500 ? 'backlogged' : 'healthy'
    };
  }

  /**
   * Limpia todo lo pendiente
   */
  clear() {
    const cleared = this.#queue.clear();
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
