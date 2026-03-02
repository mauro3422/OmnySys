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
    this._recentChangeCount = (this._recentChangeCount || 0) + 1;

    // Reset counter every second
    if (!this._lastResetTime || Date.now() - this._lastResetTime > 1000) {
      this._lastResetTime = Date.now();
      this._recentChangeCount = 1;
    }

    if (this._recentChangeCount > BATCH_CONFIG.MASS_CHANGE_THRESHOLD) {
      if (this.state !== BatchState.ACCUMULATING) {
        this._setState(BatchState.ACCUMULATING);

        if (this.options.verbose) {
          logger.info(`🚀 Batch mode activated: >${BATCH_CONFIG.MASS_CHANGE_THRESHOLD} changes/second detected`);
        }
      }
    }
  }

  /**
   * Gets the current time window (adaptive)
   */
  getCurrentWindow() {
    return calculateAdaptiveWindow(
      this.changeBuffer.size,
      this.options.debounceMs,
      BATCH_CONFIG.MAX_WINDOW_MS
    );
  }

  /**
   * Gets changes ready for processing
   */
  getReadyChanges() {
    return getReadyChanges(this.changeBuffer, this.getCurrentWindow());
  }

  /**
   * Processes the current batch
   */
  async processBatch(processFn) {
    if (this.state === BatchState.PROCESSING) {
      logger.warn('⚠️ BatchProcessor is already processing');
      return { processed: 0, skipped: 0 };
    }

    const readyChanges = this.getReadyChanges();

    if (readyChanges.length === 0) {
      return { processed: 0, skipped: 0 };
    }

    this._setState(BatchState.PROCESSING);

    const startTime = Date.now();
    const isMassBatch = readyChanges.length > BATCH_CONFIG.MASS_CHANGE_THRESHOLD;

    if (isMassBatch && this.options.verbose) {
      logger.info(`📦 Processing mass batch: ${readyChanges.length} changes`);
    }

    // Group changes by type
    const groups = groupChangesByType(readyChanges);

    try {
      // Process all groups
      const results = await processAllGroups(
        groups,
        processFn,
        this.options.maxConcurrent
      );

      // Clear processed changes from buffer
      for (const change of readyChanges) {
        this.changeBuffer.delete(change.filePath);
      }

      // Update statistics
      this.stats.update(readyChanges.length, isMassBatch);

      const duration = Date.now() - startTime;

      if (this.options.verbose || isMassBatch) {
        logger.info(`✅ Batch completed: ${results.processed} processed in ${duration}ms`);
      }

      // Cooldown after mass batch
      if (isMassBatch) {
        this._setState(BatchState.COOLDOWN);
        setTimeout(() => {
          this._setState(BatchState.IDLE);
        }, BATCH_CONFIG.BATCH_COOLDOWN_MS);
      } else {
        this._setState(BatchState.IDLE);
      }

      return results;

    } catch (error) {
      logger.error('❌ Error processing batch:', error);
      this._setState(BatchState.IDLE);
      throw error;
    }
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
  hasReadyChanges() { return this.getReadyChanges().length > 0; }

  clear() {
    const count = this.changeBuffer.size;
    this.changeBuffer.clear();
    this._setState(BatchState.IDLE);
    return count;
  }

  getStats() {
    return {
      ...this.stats.get(),
      currentState: this.state,
      bufferedChanges: this.changeBuffer.size,
      currentWindow: this.getCurrentWindow()
    };
  }
}

export default SmartBatchProcessor;
