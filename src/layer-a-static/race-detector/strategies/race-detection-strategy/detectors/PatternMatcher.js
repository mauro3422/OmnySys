/**
 * @fileoverview PatternMatcher.js
 * 
 * Matches race patterns against known patterns.
 * 
 * @module race-detector/strategies/race-detection-strategy/detectors/PatternMatcher
 */

import { PatternRegistry, defaultRegistry } from '../strategy/PatternRegistry.js';

/**
 * Matches accesses against known patterns
 */
export class PatternMatcher {
  constructor(options = {}) {
    this.registry = options.registry || defaultRegistry;
    this.checkTiming = options.checkTiming ?? true;
    this.checkLocks = options.checkLocks ?? true;
    this.checkConcurrency = options.checkConcurrency ?? true;
  }

  /**
   * Match accesses against patterns
   * @param {Object} access1 - First access
   * @param {Object} access2 - Second access
   * @param {Object} project - Project data
   * @returns {Array} - Matching patterns
   */
  match(access1, access2, project) {
    const matches = [];

    if (this.isReadWritePattern(access1, access2)) {
      matches.push({
        type: 'RW',
        name: 'Read-Write Race',
        severity: 'high'
      });
    }

    if (this.isWriteWritePattern(access1, access2)) {
      matches.push({
        type: 'WW',
        name: 'Write-Write Race',
        severity: 'critical'
      });
    }

    if (this.isInitializationPattern(access1, access2)) {
      matches.push({
        type: 'IE',
        name: 'Initialization Error',
        severity: 'critical'
      });
    }

    return matches;
  }

  /**
   * Check for read-write pattern
   * @private
   */
  isReadWritePattern(access1, access2) {
    const types = [access1.type, access2.type];
    return types.includes('read') && types.includes('write');
  }

  /**
   * Check for write-write pattern
   * @private
   */
  isWriteWritePattern(access1, access2) {
    return access1.type === 'write' && access2.type === 'write';
  }

  /**
   * Check for initialization pattern
   * @private
   */
  isInitializationPattern(access1, access2) {
    const isInit1 = access1.type === 'initialization' || access1.isLazy;
    const isInit2 = access2.type === 'initialization' || access2.isLazy;
    return isInit1 || isInit2;
  }
}

export default PatternMatcher;
