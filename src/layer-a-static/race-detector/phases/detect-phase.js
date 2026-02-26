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
 * Filter shared state to only include SHARED variables (not local)
 * @param {Map} sharedState - Full shared state map
 * @returns {Map} - Filtered shared state (only shared variables)
 */
function filterSharedState(sharedState) {
  const filtered = new Map();
  const sharedPrefixes = ['global', 'module', 'closure', 'external', 'singleton'];
  
  for (const [stateKey, accesses] of sharedState) {
    const prefix = stateKey.split(':')[0];
    
    // Solo incluir variables compartidas, NO las locales
    if (sharedPrefixes.includes(prefix)) {
      filtered.set(stateKey, accesses);
    }
    // Las variables con prefix 'local' o 'function' se filtran
  }
  
  return filtered;
}

/**
 * Detect races using strategies
 * @param {Array} strategies - Array of strategy instances
 * @param {Map} sharedState - Shared state map
 * @param {Object} project - Project data
 * @returns {Array} - Array of detected races
 */
export function detectRaces(strategies, sharedState, project) {
  logger.debug('Phase 2: Detecting races...');
  
  // FILTRO CRÍTICO: Remover variables locales - NO son estado compartido
  const filteredSharedState = filterSharedState(sharedState);
  logger.debug(`Filtered shared state: ${sharedState.size} -> ${filteredSharedState.size} (removed local variables)`);

  const races = [];

  for (const strategy of strategies) {
    const detected = strategy.detect(filteredSharedState, project);
    races.push(...detected);
  }

  logger.info(`Detected ${races.length} potential races (after filtering local variables)`);
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
