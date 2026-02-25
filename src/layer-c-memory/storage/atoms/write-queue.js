/**
 * @fileoverview write-queue.js
 *
 * Cola de escritura con límite de concurrencia y backpressure.
 *
 * @module layer-c-memory/storage/atoms/write-queue
 */

import { createLogger } from '#utils/logger.js';
import { createStats, updateStats, recordEMFILE, getStatus } from './write-queue/queue-stats.js';
import { isEMFILE, executeTask, retryAfterEMFILE } from './write-queue/task-executor.js';

const logger = createLogger('OmnySys:write-queue');

const DEFAULT_CONCURRENCY = 20;
const DEFAULT_QUEUE_LIMIT = 500;

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
  #stats;
  #emfileBackoff = 1;

  constructor(options = {}) {
    this.#concurrency = options.concurrency || DEFAULT_CONCURRENCY;
    this.#queueLimit = options.queueLimit || DEFAULT_QUEUE_LIMIT;
    this.#stats = createStats();

    logger.info(`WriteQueue initialized: concurrency=${this.#concurrency}, limit=${this.#queueLimit}`);
  }

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
        retries: 5,
        addedAt: Date.now(),
        resolve,
        reject
      };

      this.#enqueue(task);
      this.#tryProcess();
    });
  }

  async addAll(fns, options = {}) {
    const promises = fns.map((fn, i) => this.add(fn, { ...options, id: `${options.id || 'batch'}-${i}` }));
    return Promise.all(promises);
  }

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

  #tryProcess() {
    while (!this.#paused && this.#activeCount < this.#concurrency && this.#queue.length > 0) {
      const task = this.#queue.shift();
      this.#executeTask(task);
    }
  }

  async #executeTask(task) {
    this.#activeCount++;
    this.#active.set(task.id, task);

    const onEMFILE = () => {
      this.#stats = recordEMFILE(this.#stats);
      this.#activeCount--;
      this.#active.delete(task.id);
      this.#emfileBackoff = retryAfterEMFILE(task, (t) => this.#enqueue(t), () => this.#tryProcess(), this.#emfileBackoff);
    };

    const onComplete = (error, result, waitTime) => {
      const execTime = Date.now() - task.addedAt - waitTime;
      this.#stats = updateStats(this.#stats, !error, execTime);

      if (!error && (execTime > 100 || waitTime > 500)) {
        logger.debug(`Task ${task.id}: wait=${waitTime}ms, exec=${execTime}ms`);
      }

      this.#activeCount--;
      this.#active.delete(task.id);

      if (!error) {
        task.resolve(result);
      } else {
        logger.error(`Task ${task.id} failed:`, error.message);
        task.reject(error);
      }

      this.#tryProcess();
    };

    await executeTask(task, onEMFILE, onComplete);
  }

  pause() {
    this.#paused = true;
    logger.info('WriteQueue paused');
  }

  resume() {
    this.#paused = false;
    this.#tryProcess();
    logger.info('WriteQueue resumed');
  }

  async onIdle() {
    while (this.#activeCount > 0 || this.#queue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  clear() {
    const cleared = this.#queue.length;
    this.#queue.forEach(t => t.reject(new Error('Queue cleared')));
    this.#queue = [];
    logger.info(`WriteQueue cleared: ${cleared} tasks discarded`);
    return cleared;
  }

  get status() {
    return getStatus(this.#stats, this.#queue.length, this.#activeCount, this.#paused, this.#concurrency, this.#queueLimit);
  }

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
