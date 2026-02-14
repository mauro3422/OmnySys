/**
 * @fileoverview PatternRegistry.js
 * 
 * Registry for race pattern metadata including severity and mitigation strategies.
 * 
 * @module race-detector/strategies/race-detection-strategy/strategy/PatternRegistry
 */

/**
 * Registry for race pattern metadata
 */
export class PatternRegistry {
  constructor() {
    this.severityMap = new Map();
    this.mitigationMap = new Map();
    this.initializeDefaults();
  }

  /**
   * Initialize default severity levels and mitigations
   * @private
   */
  initializeDefaults() {
    // Severity levels by race type
    this.severityMap.set('WW', 'high');
    this.severityMap.set('RW', 'high');
    this.severityMap.set('IE', 'critical');
    this.severityMap.set('EH', 'medium');

    // Mitigation strategies by race type
    this.mitigationMap.set('WW', ['locking', 'atomic-operations', 'immutable-state']);
    this.mitigationMap.set('RW', ['locking', 'read-copy-update', 'version-control']);
    this.mitigationMap.set('IE', ['double-checked-locking', 'initialization-queue', 'eager-init']);
    this.mitigationMap.set('EH', ['event-serialization', 'event-queue', 'state-snapshot']);
  }

  /**
   * Get severity for a race type
   * @param {string} raceType - Type of race
   * @returns {string|null} - Severity level or null
   */
  getSeverity(raceType) {
    return this.severityMap.get(raceType) || null;
  }

  /**
   * Set severity for a race type
   * @param {string} raceType - Type of race
   * @param {string} severity - Severity level
   */
  setSeverity(raceType, severity) {
    this.severityMap.set(raceType, severity);
  }

  /**
   * Get mitigation strategies for a race type
   * @param {string} raceType - Type of race
   * @returns {Array<string>} - Array of mitigation strategies
   */
  getMitigationStrategies(raceType) {
    return this.mitigationMap.get(raceType) || [];
  }

  /**
   * Register custom mitigation strategies
   * @param {string} raceType - Type of race
   * @param {Array<string>} strategies - Array of strategies
   */
  registerMitigations(raceType, strategies) {
    this.mitigationMap.set(raceType, strategies);
  }
}

/** Default registry instance */
export const defaultRegistry = new PatternRegistry();

export default PatternRegistry;
