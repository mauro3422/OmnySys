/**
 * @fileoverview Phase 6: Generate Summary
 * 
 * Generates detection summary with statistics.
 * Part of the Race Detection Pipeline.
 * 
 * @module race-detector/phases/summary-phase
 * @version 1.0.0
 */

import { createLogger } from '#utils/logger.js';

const logger = createLogger('race-detector:phases:summary');

/**
 * Generate detection summary
 * @param {Array} races - Array of race conditions
 * @param {Array} warnings - Array of warnings
 * @param {Map} sharedState - Shared state map
 * @param {Object} config - Configuration with trackers and strategies
 * @returns {Object} - Summary object
 */
export function generateSummary(races, warnings, sharedState, config) {
  logger.debug('Phase 6: Generating summary...');
  
  const byType = {};
  const bySeverity = {};
  
  for (const race of races) {
    byType[race.type] = (byType[race.type] || 0) + 1;
    bySeverity[race.severity] = (bySeverity[race.severity] || 0) + 1;
  }
  
  return {
    totalRaces: races.length,
    totalWarnings: warnings.length,
    byType,
    bySeverity,
    sharedStateItems: sharedState.size,
    trackersUsed: config.trackers?.length || 0,
    strategiesUsed: config.strategies?.length || 0,
    analyzedAt: new Date().toISOString()
  };
}

/**
 * Summary phase class for pipeline integration
 */
export class SummaryPhase {
  constructor(races, warnings, sharedState, config) {
    this.races = races;
    this.warnings = warnings;
    this.sharedState = sharedState;
    this.config = config;
  }
  
  execute() {
    return generateSummary(this.races, this.warnings, this.sharedState, this.config);
  }
}

export default SummaryPhase;
