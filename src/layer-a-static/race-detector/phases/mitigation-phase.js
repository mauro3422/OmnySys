/**
 * @fileoverview Phase 4: Check Mitigations
 * 
 * Checks for existing mitigations in race conditions.
 * Filters out mitigated races unless critical.
 * 
 * @module race-detector/phases/mitigation-phase
 * @version 1.0.0
 */

import { createLogger } from '#utils/logger.js';
import { MitigationChecker } from '../mitigation/index.js';

const logger = createLogger('race-detector:phases:mitigation');

/**
 * Check for existing mitigations
 * @param {Array} races - Array of race conditions
 * @param {Object} project - Project data
 * @param {Array} warnings - Array to collect warnings
 * @returns {Array} - Filtered races
 */
export function checkMitigations(races, project, warnings = []) {
  logger.debug('Phase 4: Checking mitigations...');
  
  const checker = new MitigationChecker(project);
  const filteredRaces = [];
  
  for (const race of races) {
    const mitigation = checker.findMitigation(race);
    
    if (mitigation) {
      race.hasMitigation = true;
      race.mitigationType = mitigation.type;
      
      // Only filter out if not critical and has complete mitigation
      if (race.severity === 'critical' || mitigation.type.startsWith('partial-')) {
        filteredRaces.push(race);
      }
    } else {
      filteredRaces.push(race);
    }
  }
  
  logger.info(`Mitigations found: ${races.length - filteredRaces.length} filtered`);
  return filteredRaces;
}

/**
 * Mitigation phase class for pipeline integration
 */
export class MitigationPhase {
  constructor(races, project, warnings = []) {
    this.races = races;
    this.project = project;
    this.warnings = warnings;
  }
  
  execute() {
    return checkMitigations(this.races, this.project, this.warnings);
  }
}

export default MitigationPhase;
