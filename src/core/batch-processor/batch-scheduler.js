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
    this.controller = createBatchSchedulerController(options);
  }

  /**
   * Inicia el scheduler
   */
  start() {
    this.controller.start();
  }

  /**
   * Detiene el scheduler
   */
  stop() {
    this.controller.stop();
  }

  /**
   * Fuerza un tick inmediato
   */
  tick() {
    this.controller.tick();
  }

  requestDrain() {
    this.controller.requestDrain();
  }

  flushDrainRequest() {
    this.controller.flushDrainRequest();
  }

  /**
   * Programa el próximo tick
   * @private
   */
  scheduleTick() {
    this.controller.scheduleTick();
  }

  scheduleDrainTick() {
    this.controller.scheduleDrainTick();
  }
}

export function createBatchSchedulerController(options = {}) {
  return {
    batchTimeoutMs: options.batchTimeoutMs ?? DEFAULT_CONFIG.batchTimeoutMs,
    onFlush: options.onFlush ?? (() => {}),
    onDrain: options.onDrain ?? (() => {}),
    timer: null,
    drainTimer: null,
    pendingDrain: false,
    isRunning: false,
    start() {
      startBatchScheduler(this);
    },
    stop() {
      stopBatchScheduler(this);
    },
    tick() {
      tickBatchScheduler(this);
    },
    requestDrain() {
      requestBatchDrain(this);
    },
    flushDrainRequest() {
      flushBatchDrainRequest(this);
    },
    scheduleTick() {
      scheduleBatchSchedulerTick(this);
    },
    scheduleDrainTick() {
      scheduleBatchDrainTick(this);
    }
  };
}

export function startBatchScheduler(instance) {
  if (instance.isRunning) return;

  instance.isRunning = true;
  instance.scheduleTick();
}

export function stopBatchScheduler(instance) {
  instance.isRunning = false;

  if (instance.timer) {
    clearTimeout(instance.timer);
    instance.timer = null;
  }

  if (instance.drainTimer) {
    clearTimeout(instance.drainTimer);
    instance.drainTimer = null;
  }

  instance.pendingDrain = false;
}

export function tickBatchScheduler(instance) {
  if (instance.timer) {
    clearTimeout(instance.timer);
    instance.timer = null;
  }

  instance.onFlush();
  instance.flushDrainRequest();

  if (instance.isRunning) {
    instance.scheduleTick();
  }
}

export function requestBatchDrain(instance) {
  instance.pendingDrain = true;

  if (!instance.isRunning || instance.drainTimer) {
    return;
  }

  instance.scheduleDrainTick();
}

export function flushBatchDrainRequest(instance) {
  if (!instance.pendingDrain) {
    return;
  }

  instance.pendingDrain = false;
  instance.onDrain();
}

export function scheduleBatchSchedulerTick(instance) {
  instance.timer = setTimeout(() => {
    if (!instance.isRunning) return;

    instance.onFlush();
    instance.flushDrainRequest();

    if (instance.isRunning) {
      instance.scheduleTick();
    }
  }, instance.batchTimeoutMs);
}

export function scheduleBatchDrainTick(instance) {
  instance.drainTimer = setTimeout(() => {
    instance.drainTimer = null;

    if (!instance.isRunning) {
      return;
    }

    instance.flushDrainRequest();
  }, 0);
}
