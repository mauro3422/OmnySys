/**
 * @fileoverview Batch Processor Statistics
 * Statistics tracking for the Smart Batch Processor
 * 
 * @module core/file-watcher/batch-processor/stats
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:file-watcher:batch:stats');

/**
 * Statistics tracker for batch processing
 */
export class BatchStats {
  constructor(verbose = false) {
    this.verbose = verbose;
    this.reset();
  }

  /**
   * Reset all statistics
   */
  reset() {
    this.totalBatches = 0;
    this.massBatches = 0;
    this.totalChanges = 0;
    this.avgBatchSize = 0;
    this.lastBatchTime = 0;
    this.batchCount = 0;
  }

  /**
   * Update statistics after processing a batch
   * @param {number} batchSize - Number of changes in the batch
   * @param {boolean} isMassBatch - Whether this was a mass batch
   */
  update(batchSize, isMassBatch) {
    this.totalBatches++;
    this.totalChanges += batchSize;
    this.lastBatchTime = Date.now();
    
    if (isMassBatch) {
      this.massBatches++;
    }
    
    // Moving average
    const total = this.totalBatches;
    this.avgBatchSize = 
      (this.avgBatchSize * (total - 1) + batchSize) / total;
    
    if (this.verbose) {
      logger.debug(`Stats updated: totalBatches=${this.totalBatches}, avgSize=${this.avgBatchSize.toFixed(2)}`);
    }
  }

  /**
   * Get current statistics
   */
  get() {
    return {
      totalBatches: this.totalBatches,
      massBatches: this.massBatches,
      totalChanges: this.totalChanges,
      avgBatchSize: this.avgBatchSize,
      lastBatchTime: this.lastBatchTime
    };
  }
}

export default BatchStats;
