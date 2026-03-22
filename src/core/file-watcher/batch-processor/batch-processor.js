import { statsPool } from '../../../shared/utils/stats-pool.js';
/**
 * @fileoverview Smart Batch Processor
 * Main class for batch processing file changes
 * 
 * @module core/file-watcher/batch-processor/batch-processor
 */

import { createLogger } from '../../../utils/logger.js';
import { BATCH_CONFIG, BatchState } from './config.js';
import { BatchStats } from './stats.js';
import {
  groupChangesByType,
  getReadyChanges,
  calculateAdaptiveWindow
} from './change-grouper.js';
import { processAllGroups } from './group-processor.js';

const logger = createLogger('OmnySys:file-watcher:batch');

function updateBatchMode(processor) {
  processor._recentChangeCount = (processor._recentChangeCount || 0) + 1;

  if (!processor._lastResetTime || Date.now() - processor._lastResetTime > 1000) {
    processor._lastResetTime = Date.now();
    processor._recentChangeCount = 1;
  }

  if (processor._recentChangeCount <= BATCH_CONFIG.MASS_CHANGE_THRESHOLD) {
    return;
  }

  if (processor.state !== BatchState.ACCUMULATING) {
    processor._setState(BatchState.ACCUMULATING);

    if (processor.options.verbose) {
      logger.info(`🚀 Batch mode activated: >${BATCH_CONFIG.MASS_CHANGE_THRESHOLD} changes/second detected`);
    }
  }
}

function getCurrentWindow(processor) {
  return calculateAdaptiveWindow(
    processor.changeBuffer.size,
    processor.options.debounceMs,
    BATCH_CONFIG.MAX_WINDOW_MS
  );
}

function getReadyChangesForProcessor(processor) {
  return getReadyChanges(processor.changeBuffer, getCurrentWindow(processor));
}

function completeSuccessfulBatch(processor, readyChanges, isMassBatch) {
  for (const change of readyChanges) {
    processor.changeBuffer.delete(change.filePath);
  }

  processor.stats.update(readyChanges.length, isMassBatch);

  if (isMassBatch) {
    processor._setState(BatchState.COOLDOWN);
    setTimeout(() => {
      processor._setState(BatchState.IDLE);
    }, BATCH_CONFIG.BATCH_COOLDOWN_MS);
    return;
  }

  processor._setState(BatchState.IDLE);
}

function handleBatchError(processor, error) {
  logger.error('❌ Error processing batch:', error);
  processor._setState(BatchState.IDLE);
  throw error;
}

async function processBatchWindow(processor, processFn) {
  if (processor.state === BatchState.PROCESSING) {
    logger.debug('⚠️ BatchProcessor is already processing');
    return { processed: 0, skipped: 0 };
  }

  const readyChanges = getReadyChangesForProcessor(processor);

  if (readyChanges.length === 0) {
    return { processed: 0, skipped: 0 };
  }

  processor._setState(BatchState.PROCESSING);

  const startTime = Date.now();
  const isMassBatch = readyChanges.length > BATCH_CONFIG.MASS_CHANGE_THRESHOLD;

  if (isMassBatch && processor.options.verbose) {
    logger.info(`📦 Processing mass batch: ${readyChanges.length} changes`);
  }

  const groups = groupChangesByType(readyChanges);

  try {
    const results = await processAllGroups(
      groups,
      processFn,
      processor.options.maxConcurrent
    );

    const duration = Date.now() - startTime;

    if (processor.options.verbose || isMassBatch) {
      logger.info(`✅ Batch completed: ${results.processed} processed in ${duration}ms`);
    }

    completeSuccessfulBatch(processor, readyChanges, isMassBatch);

    return results;
  } catch (error) {
    handleBatchError(processor, error);
  }
}

/**
 * Smart Batch Processor for file changes
 */
export class SmartBatchProcessor {
  constructor(options = {}) {
    this.options = {
      debounceMs: options.debounceMs || 500,
      maxConcurrent: options.maxConcurrent || 3,
      verbose: options.verbose || false,
      ...options
    };

    this.state = BatchState.IDLE;
    this.changeBuffer = new Map();
    this.stats = new BatchStats(this.options.verbose);

    this.onProcessBatch = null;
    this.onStateChange = null;
  }

  /**
   * Adds a change to the buffer
   */
  addChange(filePath, changeInfo) {
    this.changeBuffer.set(filePath, {
      ...changeInfo,
      timestamp: Date.now(),
      filePath
    });

    this._evaluateBatchMode();
    return this.changeBuffer.size;
  }

  /**
   * Evaluates if we should activate mass batch mode
   */
  _evaluateBatchMode() {
    updateBatchMode(this);
  }

  /**
   * Gets the current time window (adaptive)
   */
  /**
   * Processes the current batch
   */
  async processBatch(processFn) {
    return processBatchWindow(this, processFn);
  }

  /**
   * Changes state and notifies
   */
  _setState(newState) {
    const oldState = this.state;
    this.state = newState;

    if (this.options.verbose && oldState !== newState) {
      logger.debug(`BatchProcessor: ${oldState} → ${newState}`);
    }

    if (this.onStateChange) {
      this.onStateChange(newState, oldState);
    }
  }

  // Public API methods
  getBufferedCount() { return this.changeBuffer.size; }
  hasReadyChanges() { return getReadyChangesForProcessor(this).length > 0; }

  resetBuffer() {
    const count = this.changeBuffer.size;
    this.changeBuffer.clear();
    this._setState(BatchState.IDLE);
    return count;
  }

  getStats() {
    return statsPool.getStats('batch-processor');
  }
}

export function createSmartBatchProcessor(options = {}) {
  return new SmartBatchProcessor(options);
}

export default SmartBatchProcessor;

