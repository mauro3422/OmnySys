/**
 * @fileoverview Change Grouper
 * Groups changes by type and priority for batch processing
 * 
 * @module core/file-watcher/batch-processor/change-grouper
 */

/**
 * Groups changes by their type
 * @param {Array} changes - Array of change objects
 * @returns {Object} Grouped changes by type
 */
export function groupChangesByType(changes) {
  const groups = {
    deleted: [],
    created: [],
    modified: []
  };
  
  for (const change of changes) {
    if (groups[change.type]) {
      groups[change.type].push(change);
    }
  }
  
  return groups;
}

/**
 * Gets the processing order for change types
 * Delete -> Create -> Modify
 * @returns {Array} Ordered array of change types
 */
export function getProcessingOrder() {
  return ['deleted', 'created', 'modified'];
}

/**
 * Filters changes ready for processing based on timestamp
 * @param {Map} changeBuffer - Map of filePath -> changeInfo
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Array} Array of changes ready to process
 */
export function getReadyChanges(changeBuffer, windowMs) {
  const now = Date.now();
  const ready = [];
  
  for (const [filePath, changeInfo] of changeBuffer) {
    if (now - changeInfo.timestamp >= windowMs) {
      ready.push(changeInfo);
    }
  }
  
  return ready;
}

/**
 * Calculates the adaptive time window based on buffer size
 * @param {number} bufferedCount - Number of changes in buffer
 * @param {number} baseWindowMs - Base window in milliseconds
 * @param {number} maxWindowMs - Maximum window in milliseconds
 * @returns {number} Calculated window in milliseconds
 */
export function calculateAdaptiveWindow(bufferedCount, baseWindowMs, maxWindowMs) {
  if (bufferedCount < 5) {
    return baseWindowMs;
  }
  
  if (bufferedCount < 20) {
    return Math.min(baseWindowMs * 2, maxWindowMs);
  }
  
  // Mass batch mode
  return Math.min(baseWindowMs * 5, maxWindowMs);
}

export default {
  groupChangesByType,
  getProcessingOrder,
  getReadyChanges,
  calculateAdaptiveWindow
};
