/**
 * @fileoverview Phase 2: Detect Races
 * 
 * Detects race conditions using strategies.
 * Part of the Race Detection Pipeline.
 * 
 * @module race-detector/phases/detect-phase
 * @version 1.0.0
 */

import { createLogger } from '#utils/logger.js';

const logger = createLogger('race-detector:phases:detect');

/**
 * Detect races using strategies
 * @param {Array} strategies - Array of strategy instances
 * @param {Map} sharedState - Shared state map
 * @param {Object} project - Project data
 * @returns {Array} - Array of detected races
 */
export function detectRaces(strategies, sharedState, project) {
  logger.debug('Phase 2: Detecting races...');
  
  const races = [];
  
  for (const strategy of strategies) {
    const detected = strategy.detect(sharedState, project);
    races.push(...detected);
  }
  
  logger.info(`Detected ${races.length} potential races`);
  return races;
}

/**
 * Detect phase class for pipeline integration
 */
export class DetectPhase {
  constructor(strategies, sharedState, project) {
    this.strategies = strategies;
    this.sharedState = sharedState;
    this.project = project;
  }
  
  execute() {
    return detectRaces(this.strategies, this.sharedState, this.project);
  }
}

export default DetectPhase;
