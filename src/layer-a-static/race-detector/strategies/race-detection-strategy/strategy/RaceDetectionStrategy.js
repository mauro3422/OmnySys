/**
 * @fileoverview RaceDetectionStrategy.js
 * 
 * Abstract base class for race detection strategies.
 * Implements Strategy pattern for different race types.
 * 
 * @module race-detector/strategies/race-detection-strategy/strategy/RaceDetectionStrategy
 */

import { SharedStateAnalyzer } from '../detectors/SharedStateAnalyzer.js';
import { TimingAnalyzer } from '../detectors/TimingAnalyzer.js';
import { LockAnalyzer } from '../detectors/LockAnalyzer.js';
import { PatternMatcher } from '../detectors/PatternMatcher.js';
import { RaceFactory } from './RaceFactory.js';

/**
 * Abstract base class for race detection strategies
 * @abstract
 */
export class RaceDetectionStrategy {
  constructor(options = {}) {
    if (this.constructor === RaceDetectionStrategy) {
      throw new Error('Cannot instantiate abstract class RaceDetectionStrategy');
    }

    this.sharedStateAnalyzer = new SharedStateAnalyzer();
    this.timingAnalyzer = new TimingAnalyzer();
    this.lockAnalyzer = new LockAnalyzer();
    this.patternMatcher = new PatternMatcher(options);
    this.raceFactory = new RaceFactory(options.registry);
  }

  /**
   * Detect races from shared state
   * @abstract
   * @param {Map<string, Array>} sharedState - Map of stateKey to access points
   * @param {Object} project - Project data with modules and atoms
   * @returns {Array<Object>} - Array of detected races
   */
  detect(sharedState, project) {
    throw new Error('Subclasses must implement detect()');
  }

  /**
   * Get the type of race this strategy detects
   * @abstract
   * @returns {string} - Race type code (e.g., 'RW', 'WW', 'IE')
   */
  getRaceType() {
    throw new Error('Subclasses must implement getRaceType()');
  }

  /**
   * Check if two accesses can run concurrently
   * @protected
   */
  canRunConcurrently(access1, access2, project) {
    return this.timingAnalyzer.canRunConcurrently(access1, access2, project);
  }

  /**
   * Check if accesses are in same business flow
   * @protected
   */
  sameBusinessFlow(access1, access2, project) {
    return this.timingAnalyzer.sameBusinessFlow(access1, access2, project);
  }

  /**
   * Check if accesses share entry point
   * @protected
   */
  sameEntryPoint(access1, access2, project) {
    return this.timingAnalyzer.sameEntryPoint(access1, access2, project);
  }

  /**
   * Get callers of an atom
   * @protected
   */
  getAtomCallers(atomId, project) {
    return this.timingAnalyzer.getAtomCallers(atomId, project);
  }

  /**
   * Find entry points for an atom
   * @protected
   */
  findEntryPoints(atomId, project) {
    return this.timingAnalyzer.findEntryPoints(atomId, project);
  }

  /**
   * Find atom by ID
   * @protected
   */
  findAtomById(atomId, project) {
    return this.timingAnalyzer.findAtomById(atomId, project);
  }

  /**
   * Check if an access is protected by a lock
   * @protected
   */
  getLockProtection(access, atom, project) {
    return this.lockAnalyzer.getLockProtection(access, atom, project);
  }

  /**
   * Check if two accesses are protected by the same lock
   * @protected
   */
  haveCommonLock(access1, access2, atom1, atom2, project) {
    return this.lockAnalyzer.haveCommonLock(access1, access2, atom1, atom2, project);
  }

  /**
   * Check if race is mitigated by locking
   * @protected
   */
  checkMitigation(race, project) {
    return this.lockAnalyzer.checkMitigation(race, project);
  }

  /**
   * Create a race object
   * @protected
   */
  createRace(stateKey, access1, access2, raceType) {
    return this.raceFactory.create(stateKey, access1, access2, raceType);
  }

  /**
   * Match accesses against patterns
   * @protected
   */
  matchPatterns(access1, access2, project) {
    return this.patternMatcher.match(access1, access2, project);
  }

  /**
   * Get mitigation strategies for a pattern type
   * @protected
   */
  getMitigationStrategies(patternType) {
    return this.raceFactory.getMitigationStrategies(patternType);
  }
}

export default RaceDetectionStrategy;
