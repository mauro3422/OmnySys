/**
 * @fileoverview BatchProcessor action helpers
 */

import { Events } from './constants.js';
import {
  createProcessedChange,
  registerPendingChange,
  createBatchFromPendingChanges,
  enqueueBatch,
  runBatchThroughProcessor,
  shouldFlushBatch
} from './batch-processor-flow.js';

export function activateBatchProcessor(instance) {
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

export function queueBatchChange(instance, filePath, changeType, options = {}) {
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
  const pumpQueue = drainBatchQueue;
  pumpQueue(instance);
  return batch;
}

export function drainBatchQueue(instance) {
  while (
    instance.isRunning &&
    instance.processingQueue.length > 0 &&
    instance.activeProcesses < instance.options.maxConcurrent
  ) {
    const batch = instance.processingQueue.shift();
    const runBatchJob = executeBatchJob;
    void runBatchJob(instance, batch);
  }
}

export async function executeBatchJob(instance, batch) {
  instance.activeProcesses++;
  instance.processingBatches.set(batch.id, batch);
  batch.start();

  instance.emit(Events.BATCH_STARTED, batch);

  try {
    await runBatchThroughProcessor(instance, batch);

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
    instance.scheduler?.requestDrain?.();
  }
}
