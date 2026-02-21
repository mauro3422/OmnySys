/**
 * @fileoverview Smart Batch Processor - Barrel Export
 * 
 * Re-exports all batch processor modules for easy importing.
 * 
 * @module core/file-watcher/batch-processor
 */

export { SmartBatchProcessor } from './batch-processor.js';
export { BATCH_CONFIG, BatchState } from './config.js';
export { BatchStats } from './stats.js';
export { 
  groupChangesByType, 
  getProcessingOrder, 
  getReadyChanges, 
  calculateAdaptiveWindow 
} from './change-grouper.js';
export { processGroup, processAllGroups } from './group-processor.js';
