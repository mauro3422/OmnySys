/**
 * @fileoverview batch-scheduler.js
 * 
 * Servicio: Gestiona temporizador de batching
 * 
 * @module batch-processor/batch-scheduler
 */

import { DEFAULT_CONFIG } from './constants.js';

/**
 * Scheduler para batches
 */
export class BatchScheduler {
  /**
   * @param {Object} options - Opciones
   * @param {number} options.batchTimeoutMs - Timeout en ms
   * @param {Function} options.onFlush - Callback cuando se debe hacer flush
   */
  constructor(options = {}) {
    this.batchTimeoutMs = options.batchTimeoutMs ?? DEFAULT_CONFIG.batchTimeoutMs;
    this.onFlush = options.onFlush ?? (() => {});
    this.timer = null;
    this.isRunning = false;
  }

  /**
   * Inicia el scheduler
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.scheduleTick();
  }

  /**
   * Detiene el scheduler
   */
  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Fuerza un tick inmediato
   */
  tick() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.onFlush();
    if (this.isRunning) {
      this.scheduleTick();
    }
  }

  /**
   * Programa el próximo tick
   * @private
   */
  scheduleTick() {
    this.timer = setTimeout(() => {
      if (!this.isRunning) return;
      
      this.onFlush();
      
      // Reprogramar si sigue corriendo
      if (this.isRunning) {
        this.scheduleTick();
      }
    }, this.batchTimeoutMs);
  }
}
