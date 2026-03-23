/**
 * @fileoverview BatchProcessor action helpers
 */

import { Events } from './constants.js';
import {
  createProcessedChange,
  registerPendingChange,
  createBatchFromPendingChanges,
  enqueueBatch,
  processBatchThroughProcessor,
  shouldFlushBatch
} from './batch-processor-flow.js';

export function startBatchProcessor(instance) {
  if (instance.isRunning) return;

  instance.isRunning = true;
  instance.scheduler.start();
  instance.emit(Events.STARTED);
}

export function stopBatchProcessor(instance) {
  if (!instance.isRunning) return;

  instance.isRunning = false;
  instance.scheduler.stop();
  instance.emit(Events.STOPPED);
}

export function addBatchChange(instance, filePath, changeType, options = {}) {
  const change = createProcessedChange(filePath, changeType, options);
  registerPendingChange(instance, change);
  instance.emit(Events.CHANGE_ADDED, change);

  if (shouldFlushBatch(instance)) {
    flushBatch(instance);
  }

  return change;
}

export function flushBatch(instance) {
  if (instance.pendingChanges.size === 0) return null;

  const batch = createBatchFromPendingChanges(instance);
  enqueueBatch(instance, batch);
  instance.emit(Events.BATCH_CREATED, batch);
  processNextBatches(instance);
  return batch;
}

export function processNextBatches(instance) {
  while (
    instance.isRunning &&
    instance.processingQueue.length > 0 &&
    instance.activeProcesses < instance.options.maxConcurrent
  ) {
    const batch = instance.processingQueue.shift();
    void processBatchItem(instance, batch);
  }
}

export async function processBatchItem(instance, batch) {
  instance.activeProcesses++;
  instance.processingBatches.set(batch.id, batch);
  batch.start();

  instance.emit(Events.BATCH_STARTED, batch);

  try {
    await processBatchThroughProcessor(instance, batch);

    batch.complete();
    instance.completedBatches.push(batch);
    instance.emit(Events.BATCH_COMPLETED, batch);

    if (instance.options.afterBatch) {
      await instance.options.afterBatch(batch);
    }
  } catch (error) {
    batch.fail(error);
    instance.emit(Events.BATCH_FAILED, batch, error);
  } finally {
    instance.processingBatches.delete(batch.id);
    instance.activeProcesses--;
    processNextBatches(instance);
  }
}
