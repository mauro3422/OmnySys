/**
 * @fileoverview Smart Batch Processor (Barrel Export - DEPRECATED)
 * 
 * This file re-exports from the new modular batch-processor directory.
 * Please update your imports to use the new structure.
 * 
 * @deprecated Use ./batch-processor/index.js or specific modules
 * @module core/file-watcher/batch-processor-deprecated
 */

export {
  SmartBatchProcessor,
  BATCH_CONFIG,
  BatchState,
  BatchStats,
  groupChangesByType,
  getProcessingOrder,
  getReadyChanges,
  calculateAdaptiveWindow,
  processGroup,
  processAllGroups
} from './batch-processor/index.js';
