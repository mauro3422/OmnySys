/**
 * @fileoverview batch processor helpers
 */

import { DEFAULT_CONFIG } from './constants.js';
import { BatchScheduler } from './batch-scheduler.js';

export function buildBatchProcessorOptions(options = {}) {
  return {
    maxBatchSize: options.maxBatchSize ?? DEFAULT_CONFIG.maxBatchSize,
    batchTimeoutMs: options.batchTimeoutMs ?? DEFAULT_CONFIG.batchTimeoutMs,
    maxConcurrent: options.maxConcurrent ?? DEFAULT_CONFIG.maxConcurrent,
    dependencyGraph: options.dependencyGraph ?? null,
    processChange: options.processChange ?? null,
    afterBatch: options.afterBatch ?? null
  };
}

export function initializeBatchProcessorState(instance) {
  instance.pendingChanges = new Map();
  instance.processingQueue = [];
  instance.processingBatches = new Map();
  instance.completedBatches = [];
  instance.isRunning = false;
  instance.activeProcesses = 0;
}

export function createBatchProcessorScheduler(instance) {
  return new BatchScheduler({
    batchTimeoutMs: instance.options.batchTimeoutMs,
    onFlush: () => instance.flushBatch()
  });
}

export function buildBatchProcessorStats(instance) {
  return {
    isRunning: instance.isRunning,
    pendingChanges: instance.pendingChanges.size,
    queuedBatches: instance.processingQueue.length,
    processingBatches: instance.processingBatches.size,
    activeProcesses: instance.activeProcesses,
    completedBatches: instance.completedBatches.length
  };
}
