/**
 * @fileoverview Phase 5: Calculate Severities
 * 
 * Calculates severity for each race condition.
 * Part of the Race Detection Pipeline.
 * 
 * @module race-detector/phases/severity-phase
 * @version 1.0.0
 */

import { createLogger } from '#utils/logger.js';

const logger = createLogger('race-detector:phases:severity');

/**
 * Calculate severity for each race
 * @param {Array} races - Array of race conditions
 * @param {Object} riskScorer - Risk scorer instance
 * @param {Object} project - Project data
 * @returns {Array} - Races with severity calculated
 */
export function calculateSeverities(races, riskScorer, project) {
  logger.debug('Phase 5: Calculating severities...');
  
  for (const race of races) {
    race.severity = riskScorer.calculate(race, project);
  }
  
  return races;
}

/**
 * Severity phase class for pipeline integration
 */
export class SeverityPhase {
  constructor(races, riskScorer, project) {
    this.races = races;
    this.riskScorer = riskScorer;
    this.project = project;
  }
  
  execute() {
    return calculateSeverities(this.races, this.riskScorer, this.project);
  }
}

export default SeverityPhase;
