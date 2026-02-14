/**
 * @fileoverview Phase 3: Enrich with Patterns
 * 
 * Enriches race conditions with pattern information.
 * Part of the Race Detection Pipeline.
 * 
 * @module race-detector/phases/enrich-phase
 * @version 1.0.0
 */

import { createLogger } from '#utils/logger.js';

const logger = createLogger('race-detector:phases:enrich');

/**
 * Enrich races with pattern information
 * @param {Array} races - Array of race conditions
 * @param {Object} patternMatcher - Pattern matcher instance
 * @returns {Array} - Enriched races
 */
export function enrichWithPatterns(races, patternMatcher) {
  logger.debug('Phase 3: Enriching with patterns...');
  
  for (const race of races) {
    const patterns = patternMatcher.detectPatterns(race);
    
    if (patterns.length > 0) {
      race.pattern = patterns[0].key;
      race.patternName = patterns[0].name;
      race.allPatterns = patterns.map(p => p.key);
    }
  }
  
  return races;
}

/**
 * Enrich phase class for pipeline integration
 */
export class EnrichPhase {
  constructor(races, patternMatcher) {
    this.races = races;
    this.patternMatcher = patternMatcher;
  }
  
  execute() {
    return enrichWithPatterns(this.races, this.patternMatcher);
  }
}

export default EnrichPhase;
