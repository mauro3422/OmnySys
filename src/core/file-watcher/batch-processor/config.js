/**
 * @fileoverview Batch Processor Configuration
 * Configuration constants for the Smart Batch Processor
 * 
 * @module core/file-watcher/batch-processor/config
 */

/**
 * Configuration for the batch processor
 */
export const BATCH_CONFIG = {
  // Threshold to activate batch mode (changes/second)
  MASS_CHANGE_THRESHOLD: 5,
  
  // Base time window
  BASE_WINDOW_MS: 500,
  
  // Maximum window in batch mode
  MAX_WINDOW_MS: 5000,
  
  // Maximum batch size per cycle
  MAX_BATCH_SIZE: 50,
  
  // Cooldown after a massive batch
  BATCH_COOLDOWN_MS: 1000
};

/**
 * Batch processor states
 */
export const BatchState = {
  IDLE: 'idle',
  ACCUMULATING: 'accumulating',
  PROCESSING: 'processing',
  COOLDOWN: 'cooldown'
};

export default { BATCH_CONFIG, BatchState };
