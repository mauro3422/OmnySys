/**
 * @fileoverview RaceFactory.js
 * 
 * Factory for creating race condition objects.
 * Centralizes race object creation and metadata management.
 * 
 * @module race-detector/strategies/race-detection-strategy/strategy/RaceFactory
 */

import { PatternRegistry, defaultRegistry } from './PatternRegistry.js';

const typeNames = {
  'WW': 'Write-Write',
  'RW': 'Read-Write',
  'WR': 'Write-Read',
  'IE': 'Initialization Error',
  'EH': 'Event Handler',
  'AV': 'Atomicity Violation',
  'OV': 'Order Violation',
  'OTHER': 'Unknown'
};

/**
 * Factory for creating race condition objects
 */
export class RaceFactory {
  constructor(registry = null) {
    this.patternRegistry = registry || defaultRegistry;
  }

  /**
   * Create a race object
   * @param {string} stateKey - Key of shared state
   * @param {Object} access1 - First access
   * @param {Object} access2 - Second access
   * @param {string} raceType - Type of race (RW, WW, IE, etc.)
   * @returns {Object} - Race object with all required fields
   */
  create(stateKey, access1, access2, raceType) {
    const severity = this.patternRegistry.getSeverity(raceType) || 'pending';

    return {
      id: this.generateId(),
      type: raceType,
      stateKey,
      stateType: stateKey.split(':')[0],
      accesses: [access1, access2],
      severity,
      hasMitigation: false,
      mitigationType: null,
      description: this.buildDescription(raceType, stateKey, access1, access2)
    };
  }

  /**
   * Generate unique ID for race
   * @private
   */
  generateId() {
    return `race_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Build human-readable description
   * @private
   */
  buildDescription(raceType, stateKey, access1, access2) {
    const typeName = typeNames[raceType] || raceType;
    return `${typeName} race on ${stateKey}: ` +
           `${access1.atomName} (${access1.type}) vs ` +
           `${access2.atomName} (${access2.type})`;
  }

  /**
   * Get mitigation strategies for a pattern type
   * @param {string} patternType - Type of race pattern
   * @returns {Array<string>} - Mitigation strategies
   */
  getMitigationStrategies(patternType) {
    return this.patternRegistry.getMitigationStrategies(patternType);
  }
}

export default RaceFactory;
