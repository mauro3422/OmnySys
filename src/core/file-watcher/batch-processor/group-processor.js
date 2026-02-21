/**
 * @fileoverview Group Processor
 * Processes groups of changes with concurrency limiting
 * 
 * @module core/file-watcher/batch-processor/group-processor
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:file-watcher:batch:group');

/**
 * Processes a group of changes with concurrency limiting
 * @param {Array} changes - Array of changes to process
 * @param {Function} processFn - Function to process each change
 * @param {number} maxConcurrent - Maximum concurrent operations
 * @returns {Promise<Object>} Processing results
 */
export async function processGroup(changes, processFn, maxConcurrent) {
  const results = { processed: 0, errors: [] };
  
  // Process in batches to limit concurrency
  for (let i = 0; i < changes.length; i += maxConcurrent) {
    const batch = changes.slice(i, i + maxConcurrent);
    
    await Promise.all(
      batch.map(async (change) => {
        try {
          await processFn(change);
          results.processed++;
        } catch (error) {
          results.errors.push({ filePath: change.filePath, error });
          logger.error(`Error processing ${change.filePath}:`, error.message);
        }
      })
    );
  }
  
  return results;
}

/**
 * Processes all change groups in order (delete → create → modify)
 * @param {Object} groups - Grouped changes by type
 * @param {Function} processFn - Function to process each change
 * @param {number} maxConcurrent - Maximum concurrent operations
 * @returns {Promise<Object>} Aggregated results
 */
export async function processAllGroups(groups, processFn, maxConcurrent) {
  const results = {
    processed: 0,
    skipped: 0,
    errors: []
  };
  
  // Process in order: deleted → created → modified
  const order = ['deleted', 'created', 'modified'];
  
  for (const type of order) {
    const groupChanges = groups[type] || [];
    
    if (groupChanges.length > 0) {
      const groupResult = await processGroup(groupChanges, processFn, maxConcurrent);
      results.processed += groupResult.processed;
      results.errors.push(...groupResult.errors);
    }
  }
  
  return results;
}

export default { processGroup, processAllGroups };
