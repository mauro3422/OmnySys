/**
 * @fileoverview BatchProcessor flow helpers
 */

import { FileChange } from './models/file-change.js';
import { Batch } from './models/batch.js';
import { calculatePriority } from './priority-calculator.js';
import { loadDependencies } from './dependency-loader.js';
import { executeBatch as runBatchProcessor } from './change-processor.js';

export function buildBatchId(now = Date.now(), randomValue = Math.random()) {
  return `batch-${now}-${randomValue.toString(36).slice(2, 11)}`;
}

export function createProcessedChange(filePath, changeType, options = {}) {
  const priority = calculatePriority(filePath, changeType, {
    ...options,
    priority: options.priority
  });

  return new FileChange(filePath, changeType, {
    ...options,
    priority,
    metadata: {
      ...options.metadata,
      addedAt: Date.now()
    }
  });
}

export function registerPendingChange(instance, change) {
  loadDependencies(change, instance.options.dependencyGraph);
  instance.pendingChanges.set(change.filePath, change);
}

export function createBatchFromPendingChanges(instance) {
  return new Batch(buildBatchId(), Array.from(instance.pendingChanges.values()));
}

export function enqueueBatch(instance, batch) {
  instance.processingQueue.push(batch);
  instance.pendingChanges.clear();
}

export async function runBatchThroughProcessor(instance, batch) {
  await runBatchProcessor(batch, {
    processFn: instance.options.processChange,
    emitter: instance
  });
}

export function shouldFlushBatch(instance) {
  return instance.pendingChanges.size >= instance.options.maxBatchSize;
}
