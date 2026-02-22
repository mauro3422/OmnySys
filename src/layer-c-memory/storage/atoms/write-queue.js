/**
 * @fileoverview write-queue.js
 * 
 * Cola de escritura con límite de concurrencia y backpressure.
 * Siguiendo el patrón de p-queue pero sin dependencias externas.
 * 
 * @module layer-c-memory/storage/atoms/write-queue
 * 
 * @description
 * Problema que resuelve:
 * - EMFILE: too many open files (cuando se abren demasiados archivos)
 * - Desincronización entre productores y consumidores
 * - Memory pressure por operaciones pendientes
 * 
 * Solución:
 * - Límite de concurrencia configurable (default: 50)
 * - Cola con backpressure (rechaza cuando está llena)
 * - Priorización de operaciones críticas
 * - Métricas de salud del sistema
 * 
 * Basado en:
 * - p-queue (sindresorhus)
 * - graceful-fs (isaacs)
 * - VSCode file watcher internals
 */

import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:write-queue');

const DEFAULT_CONCURRENCY = 20;
const DEFAULT_QUEUE_LIMIT = 500;
const EMFILE_RETRY_DELAY = 100;
const MAX_EMFILE_RETRIES = 5;

/**
 * @typedef {Object} WriteTask
 * @property {string} id - ID único de la tarea
 * @property {Function} fn - Función a ejecutar
 * @property {number} priority - Prioridad (mayor = más importante)
 * @property {number} retries - Reintentos restantes
 * @property {number} addedAt - Timestamp de adición
 */

/**
 * Cola de escritura con control de concurrencia
 */
export class WriteQueue {
  #concurrency;
  #queueLimit;
  #queue = [];
  #active = new Map();
  #activeCount = 0;
  #paused = false;
  #stats = {
    total: 0,
    completed: 0,
    failed: 0,
    retried: 0,
    emfileRetries: 0,
    avgWaitTime: 0,
    avgExecTime: 0
  };
  #waitTimeSum = 0;
  #execTimeSum = 0;
  #emfileBackoff = 1;

  constructor(options = {}) {
    this.#concurrency = options.concurrency || DEFAULT_CONCURRENCY;
    this.#queueLimit = options.queueLimit || DEFAULT_QUEUE_LIMIT;
    
    logger.info(`WriteQueue initialized: concurrency=${this.#concurrency}, limit=${this.#queueLimit}`);
  }

  /**
   * Añade una tarea a la cola
   * @param {Function} fn - Función async a ejecutar
   * @param {Object} options - Opciones
   * @param {number} options.priority - Prioridad (default: 0)
   * @param {string} options.id - ID para tracking
   * @returns {Promise<any>} Resultado de la función
   */
  async add(fn, options = {}) {
    const { priority = 0, id = `task-${Date.now()}-${Math.random().toString(36).slice(2)}` } = options;

    if (this.#queue.length >= this.#queueLimit) {
      throw new Error(`WriteQueue full (${this.#queueLimit} tasks). Backpressure applied.`);
    }

    return new Promise((resolve, reject) => {
      const task = {
        id,
        fn,
        priority,
        retries: MAX_EMFILE_RETRIES,
        addedAt: Date.now(),
        resolve,
        reject
      };

      this.#enqueue(task);
      this.#tryProcess();
    });
  }

  /**
   * Añade múltiples tareas y espera a que todas terminen
   * @param {Array<Function>} fns - Funciones a ejecutar
   * @param {Object} options - Opciones compartidas
   * @returns {Promise<Array>} Resultados en orden
   */
  async addAll(fns, options = {}) {
    const promises = fns.map((fn, i) => this.add(fn, { ...options, id: `${options.id || 'batch'}-${i}` }));
    return Promise.all(promises);
  }

  /**
   * Encola una tarea respetando prioridad
   */
  #enqueue(task) {
    this.#stats.total++;
    
    let insertIndex = this.#queue.length;
    for (let i = 0; i < this.#queue.length; i++) {
      if (task.priority > this.#queue[i].priority) {
        insertIndex = i;
        break;
      }
    }
    
    this.#queue.splice(insertIndex, 0, task);
  }

  /**
   * Intenta procesar tareas de la cola
   */
  #tryProcess() {
    while (!this.#paused && this.#activeCount < this.#concurrency && this.#queue.length > 0) {
      const task = this.#queue.shift();
      this.#executeTask(task);
    }
  }

  /**
   * Ejecuta una tarea
   */
  async #executeTask(task) {
    this.#activeCount++;
    this.#active.set(task.id, task);
    
    const waitTime = Date.now() - task.addedAt;
    this.#waitTimeSum += waitTime;
    this.#stats.avgWaitTime = this.#waitTimeSum / this.#stats.total;

    const startTime = Date.now();

    try {
      const result = await task.fn();
      
      const execTime = Date.now() - startTime;
      this.#execTimeSum += execTime;
      this.#stats.avgExecTime = this.#execTimeSum / (this.#stats.completed + 1);
      
      this.#stats.completed++;
      
      if (execTime > 100 || waitTime > 500) {
        logger.debug(`Task ${task.id}: wait=${waitTime}ms, exec=${execTime}ms`);
      }
      
      task.resolve(result);
    } catch (error) {
      if (this.#isEMFILE(error) && task.retries > 0) {
        this.#handleEMFILE(task);
        return;
      }
      
      this.#stats.failed++;
      logger.error(`Task ${task.id} failed:`, error.message);
      task.reject(error);
    } finally {
      this.#activeCount--;
      this.#active.delete(task.id);
      this.#tryProcess();
    }
  }

  /**
   * Detecta error EMFILE
   */
  #isEMFILE(error) {
    return error.code === 'EMFILE' || 
           error.code === 'ENFILE' ||
           (error.message && error.message.includes('too many open files'));
  }

  /**
   * Maneja error EMFILE con backoff exponencial
   */
  #handleEMFILE(task) {
    task.retries--;
    this.#stats.retried++;
    this.#stats.emfileRetries++;
    
    this.#emfileBackoff = Math.min(this.#emfileBackoff * 2, 2000);
    
    const delay = EMFILE_RETRY_DELAY * this.#emfileBackoff;
    
    logger.warn(`EMFILE detected, retrying ${task.id} in ${delay}ms (retries left: ${task.retries})`);
    
    this.#activeCount--;
    this.#active.delete(task.id);
    
    setTimeout(() => {
      this.#enqueue(task);
      this.#tryProcess();
    }, delay);
  }

  /**
   * Pausa el procesamiento
   */
  pause() {
    this.#paused = true;
    logger.info('WriteQueue paused');
  }

  /**
   * Reanuda el procesamiento
   */
  resume() {
    this.#paused = false;
    this.#tryProcess();
    logger.info('WriteQueue resumed');
  }

  /**
   * Espera a que todas las tareas pendientes terminen
   */
  async onIdle() {
    while (this.#activeCount > 0 || this.#queue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  /**
   * Limpia la cola (no cancela tareas en ejecución)
   */
  clear() {
    const cleared = this.#queue.length;
    this.#queue.forEach(t => t.reject(new Error('Queue cleared')));
    this.#queue = [];
    logger.info(`WriteQueue cleared: ${cleared} tasks discarded`);
    return cleared;
  }

  /**
   * Estado actual de la cola
   */
  get status() {
    return {
      pending: this.#queue.length,
      active: this.#activeCount,
      idle: this.#activeCount === 0 && this.#queue.length === 0,
      paused: this.#paused,
      concurrency: this.#concurrency,
      queueLimit: this.#queueLimit,
      stats: { ...this.#stats },
      health: this.#assessHealth()
    };
  }

  /**
   * Evalúa la salud del sistema
   */
  #assessHealth() {
    const queueRatio = this.#queue.length / this.#queueLimit;
    
    if (this.#stats.emfileRetries > 10) return 'critical';
    if (queueRatio > 0.8) return 'warning';
    if (this.#stats.avgExecTime > 1000) return 'slow';
    return 'healthy';
  }

  /**
   * Ajusta la concurrencia dinámicamente
   */
  setConcurrency(value) {
    const newConcurrency = Math.max(1, Math.min(100, value));
    const oldConcurrency = this.#concurrency;
    this.#concurrency = newConcurrency;
    
    logger.info(`WriteQueue concurrency: ${oldConcurrency} -> ${newConcurrency}`);
    
    this.#tryProcess();
    return newConcurrency;
  }
}

let globalQueue = null;

export function getWriteQueue(options = {}) {
  if (!globalQueue) {
    globalQueue = new WriteQueue(options);
  }
  return globalQueue;
}

export function resetWriteQueue() {
  if (globalQueue) {
    globalQueue.clear();
    globalQueue = null;
  }
}

export default WriteQueue;
