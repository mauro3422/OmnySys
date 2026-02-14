/**
 * @fileoverview RaceDetectionStrategy.js
 * 
 * Abstract base class for race detection strategies.
 * Implements Strategy pattern for different race types.
 * 
 * Uses modular analyzers for:
 * - Shared state analysis (SharedStateAnalyzer)
 * - Timing/concurrency analysis (TimingAnalyzer)
 * - Lock/synchronization analysis (LockAnalyzer)
 * 
 * Uses pattern system for:
 * - Pattern registration (PatternRegistry)
 * - Pattern matching (PatternMatcher)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📋 EXTENSION GUIDE - Creating New Race Detection Strategies
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * To detect a new type of race condition:
 *
 * 1️⃣  EXTEND RaceDetectionStrategy
 * 
 *     import { RaceDetectionStrategy } from './RaceDetectionStrategy.js';
 *     
 *     export class YourRaceStrategy extends RaceDetectionStrategy {
 *       getRaceType() {
 *         return 'YOUR_TYPE'; // e.g., 'TS' for Transaction-Serialization
 *       }
 *       
 *       detect(sharedState, project) {
 *         const races = [];
 *         
 *         for (const [stateKey, accesses] of sharedState) {
 *           // Your detection logic
 *           if (this.isYourRaceCondition(accesses)) {
 *             races.push(this.createRace(stateKey, access1, access2, 'YOUR_TYPE'));
 *           }
 *         }
 *         
 *         return races;
 *       }
 *     }
 *
 * 2️⃣  ADD TO PIPELINE in race-detector/index.js
 *     this.strategies.push(new YourRaceStrategy());
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * @module race-detector/strategies/race-detection-strategy/RaceDetectionStrategy
 */

import { SharedStateAnalyzer } from './analyzers/shared-state-analyzer.js';
import { TimingAnalyzer } from './analyzers/timing-analyzer.js';
import { LockAnalyzer } from './analyzers/lock-analyzer.js';
import { PatternMatcher } from './patterns/pattern-matcher.js';
import { PatternRegistry, defaultRegistry } from './patterns/pattern-registry.js';

/**
 * Abstract base class for race detection strategies
 * @abstract
 */
export class RaceDetectionStrategy {
  constructor(options = {}) {
    if (this.constructor === RaceDetectionStrategy) {
      throw new Error('Cannot instantiate abstract class RaceDetectionStrategy');
    }

    /** @type {SharedStateAnalyzer} */
    this.sharedStateAnalyzer = new SharedStateAnalyzer();
    
    /** @type {TimingAnalyzer} */
    this.timingAnalyzer = new TimingAnalyzer();
    
    /** @type {LockAnalyzer} */
    this.lockAnalyzer = new LockAnalyzer();
    
    /** @type {PatternMatcher} */
    this.patternMatcher = new PatternMatcher({
      registry: options.registry || defaultRegistry,
      checkTiming: options.checkTiming ?? true,
      checkLocks: options.checkLocks ?? true,
      checkConcurrency: options.checkConcurrency ?? true
    });

    /** @type {PatternRegistry} */
    this.patternRegistry = options.registry || defaultRegistry;
  }

  /**
   * Detect races from shared state
   * IMPLEMENT THIS METHOD in subclasses
   * 
   * @abstract
   * @param {Map<string, Array>} sharedState - Map of stateKey to access points
   * @param {Object} project - Project data with modules and atoms
   * @returns {Array<Object>} - Array of detected races
   * 
   * @example
   * detect(sharedState, project) {
   *   const races = [];
   *   for (const [stateKey, accesses] of sharedState) {
   *     // Check for race condition
   *     if (accesses.length >= 2 && this.canRace(accesses)) {
   *       races.push(this.createRace(stateKey, accesses[0], accesses[1], 'RW'));
   *     }
   *   }
   *   return races;
   * }
   */
  detect(sharedState, project) {
    throw new Error('Subclasses must implement detect()');
  }

  /**
   * Get the type of race this strategy detects
   * IMPLEMENT THIS METHOD in subclasses
   * 
   * @abstract
   * @returns {string} - Race type code (e.g., 'RW', 'WW', 'IE')
   * @example
   * getRaceType() {
   *   return 'RW'; // Read-Write race
   * }
   */
  getRaceType() {
    throw new Error('Subclasses must implement getRaceType()');
  }

  /**
   * Check if two accesses can run concurrently
   * Delegates to TimingAnalyzer
   * 
   * @protected
   * @param {Object} access1 - First access
   * @param {Object} access2 - Second access
   * @param {Object} project - Project data
   * @returns {boolean} - True if can run concurrently
   */
  canRunConcurrently(access1, access2, project) {
    return this.timingAnalyzer.canRunConcurrently(access1, access2, project);
  }

  /**
   * Check if accesses are in same business flow
   * Delegates to TimingAnalyzer
   * 
   * @protected
   * @param {Object} access1 - First access
   * @param {Object} access2 - Second access
   * @param {Object} project - Project data
   * @returns {boolean} - True if same flow (sequential)
   */
  sameBusinessFlow(access1, access2, project) {
    return this.timingAnalyzer.sameBusinessFlow(access1, access2, project);
  }

  /**
   * Check if accesses share entry point
   * Delegates to TimingAnalyzer
   * 
   * @protected
   * @param {Object} access1 - First access
   * @param {Object} access2 - Second access
   * @param {Object} project - Project data
   * @returns {boolean} - True if same entry point
   */
  sameEntryPoint(access1, access2, project) {
    return this.timingAnalyzer.sameEntryPoint(access1, access2, project);
  }

  /**
   * Get callers of an atom
   * Delegates to TimingAnalyzer
   * 
   * @protected
   * @param {string} atomId - Atom identifier
   * @param {Object} project - Project data
   * @returns {Array<string>} - Array of atom IDs that call this atom
   */
  getAtomCallers(atomId, project) {
    return this.timingAnalyzer.getAtomCallers(atomId, project);
  }

  /**
   * Find entry points for an atom
   * Delegates to TimingAnalyzer
   * 
   * @protected
   * @param {string} atomId - Atom identifier
   * @param {Object} project - Project data
   * @returns {Array<string>} - Entry point atom IDs
   */
  findEntryPoints(atomId, project) {
    return this.timingAnalyzer.findEntryPoints(atomId, project);
  }

  /**
   * Find atom by ID
   * Delegates to TimingAnalyzer
   * 
   * @protected
   * @param {string} atomId - Atom identifier
   * @param {Object} project - Project data
   * @returns {Object|null} - Atom data or null
   */
  findAtomById(atomId, project) {
    return this.timingAnalyzer.findAtomById(atomId, project);
  }

  /**
   * Check if an access is protected by a lock
   * Delegates to LockAnalyzer
   * 
   * @protected
   * @param {Object} access - Access point to check
   * @param {Object} atom - Atom containing the access
   * @param {Object} project - Project data
   * @returns {Object|null} - Lock info if protected
   */
  getLockProtection(access, atom, project) {
    return this.lockAnalyzer.getLockProtection(access, atom, project);
  }

  /**
   * Check if two accesses are protected by the same lock
   * Delegates to LockAnalyzer
   * 
   * @protected
   * @param {Object} access1 - First access
   * @param {Object} access2 - Second access
   * @param {Object} atom1 - First atom
   * @param {Object} atom2 - Second atom
   * @param {Object} project - Project data
   * @returns {boolean} - True if same lock protects both
   */
  haveCommonLock(access1, access2, atom1, atom2, project) {
    return this.lockAnalyzer.haveCommonLock(access1, access2, atom1, atom2, project);
  }

  /**
   * Check if race is mitigated by locking
   * Delegates to LockAnalyzer
   * 
   * @protected
   * @param {Object} race - Race condition object
   * @param {Object} project - Project data
   * @returns {Object} - Mitigation analysis
   */
  checkMitigation(race, project) {
    return this.lockAnalyzer.checkMitigation(race, project);
  }

  /**
   * Create a race object
   * Helper method for subclasses
   * 
   * @protected
   * @param {string} stateKey - Key of shared state
   * @param {Object} access1 - First access
   * @param {Object} access2 - Second access
   * @param {string} raceType - Type of race (RW, WW, IE, etc.)
   * @returns {Object} - Race object with all required fields
   * 
   * @example
   * const race = this.createRace(
   *   'global:counter',
   *   { atom: 'file.js::increment', type: 'read', ... },
   *   { atom: 'file.js::decrement', type: 'write', ... },
   *   'RW'
   * );
   */
  createRace(stateKey, access1, access2, raceType) {
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

    // Get severity from registry if available
    const severity = this.patternRegistry.getSeverity(raceType) || 'pending';

    return {
      id: `race_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: raceType,
      stateKey,
      stateType: stateKey.split(':')[0],
      accesses: [access1, access2],
      severity,
      hasMitigation: false,
      mitigationType: null,
      description: `${typeNames[raceType] || raceType} race on ${stateKey}: ` +
                   `${access1.atomName} (${access1.type}) vs ` +
                   `${access2.atomName} (${access2.type})`
    };
  }

  /**
   * Match accesses against patterns
   * Delegates to PatternMatcher
   * 
   * @protected
   * @param {Object} access1 - First access
   * @param {Object} access2 - Second access
   * @param {Object} project - Project data
   * @returns {Array} - Matching patterns
   */
  matchPatterns(access1, access2, project) {
    return this.patternMatcher.match(access1, access2, project);
  }

  /**
   * Get mitigation strategies for a pattern type
   * Delegates to PatternRegistry
   * 
   * @protected
   * @param {string} patternType - Type of race pattern
   * @returns {Array<string>} - Mitigation strategies
   */
  getMitigationStrategies(patternType) {
    return this.patternRegistry.getMitigationStrategies(patternType);
  }
}

export default RaceDetectionStrategy;
