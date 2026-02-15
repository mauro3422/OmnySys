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
  
  const checker = project && Object.keys(project).length > 0 ? new MitigationChecker(project) : null;
  const filteredRaces = [];
  
  for (const race of races) {
    // Skip races without proper accesses
    if (!race?.accesses || race.accesses.length < 2) {
      filteredRaces.push(race);
      continue;
    }
    
    const detectedMitigation = checker ? checker.findMitigation(race) : null;
    const hasExistingMitigation = race.hasMitigation || race.mitigationType;
    
    if (detectedMitigation || hasExistingMitigation) {
      // Update with detected info if available
      if (detectedMitigation) {
        race.hasMitigation = true;
        race.mitigationType = detectedMitigation.type;
      }
      
      // Only filter out if not critical and has complete mitigation
      const mitigationType = race.mitigationType;
      const isCritical = race.severity === 'critical';
      const isPartial = mitigationType?.startsWith('partial-');
      
      if (isCritical || isPartial) {
        filteredRaces.push(race);
      }
      // else: filter out race (don't add to filteredRaces)
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
