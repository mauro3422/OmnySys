/**
 * @fileoverview Phase 1: Collect Shared State
 * 
 * Collects shared state from all trackers.
 * Part of the Race Detection Pipeline.
 * 
 * @module race-detector/phases/collect-phase
 * @version 1.0.0
 */

import { createLogger } from '#utils/logger.js';

const logger = createLogger('race-detector:phases:collect');

/**
 * Collect shared state from all trackers
 * @param {Array} trackers - Array of tracker instances
 * @returns {Map} - Map of shared state items
 */
export function collectSharedState(trackers) {
  logger.debug('Phase 1: Collecting shared state...');
  
  const sharedState = new Map();
  
  if (!trackers || !Array.isArray(trackers)) {
    logger.info(`Found 0 shared state items`);
    return sharedState;
  }
  
  for (const tracker of trackers) {
    if (!tracker || typeof tracker.track !== 'function') {
      continue;
    }
    
    const trackedState = tracker.track();
    
    if (!trackedState || !(trackedState instanceof Map)) {
      continue;
    }
    
    // Merge into shared state map
    for (const [key, accesses] of trackedState) {
      if (!sharedState.has(key)) {
        sharedState.set(key, []);
      }
      sharedState.get(key).push(...accesses);
    }
  }
  
  logger.info(`Found ${sharedState.size} shared state items`);
  return sharedState;
}

/**
 * Collect phase class for pipeline integration
 * Follows Strategy pattern for extensibility
 */
export class CollectPhase {
  constructor(trackers) {
    this.trackers = trackers;
  }
  
  execute() {
    return collectSharedState(this.trackers);
  }
}

export default CollectPhase;
