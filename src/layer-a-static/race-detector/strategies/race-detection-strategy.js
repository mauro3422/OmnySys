/**
 * @fileoverview race-detection-strategy.js
 *
 * Base interface for race detection strategies
 * Implements Strategy pattern for different race types
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📋 EXTENSION GUIDE - Creating New Race Detection Strategies
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * To detect a new type of race condition:
 *
 * 1️⃣  EXTEND RaceDetectionStrategy
 * 
 *     import { RaceDetectionStrategy } from './race-detection-strategy.js';
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
 * @module race-detector/strategies/race-detection-strategy
 */

/**
 * Abstract base class for race detection strategies
 * @abstract
 */
export class RaceDetectionStrategy {
  constructor() {
    if (this.constructor === RaceDetectionStrategy) {
      throw new Error('Cannot instantiate abstract class RaceDetectionStrategy');
    }
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
   * Override for custom concurrency logic
   * 
   * @protected
   * @param {Object} access1 - First access
   * @param {Object} access2 - Second access
   * @param {Object} project - Project data
   * @returns {boolean} - True if can run concurrently
   */
  canRunConcurrently(access1, access2, project) {
    // Same atom = sequential
    if (access1.atom === access2.atom) return false;
    
    // Both sync and same flow = sequential
    if (!access1.isAsync && !access2.isAsync) {
      if (this.sameBusinessFlow(access1, access2, project)) {
        return false;
      }
    }
    
    // At least one async = potentially concurrent
    if (access1.isAsync || access2.isAsync) return true;
    
    // Different entry points = potentially concurrent
    if (!this.sameEntryPoint(access1, access2, project)) return true;
    
    return false;
  }

  /**
   * Check if accesses are in same business flow
   * 
   * @protected
   * @param {Object} access1 - First access
   * @param {Object} access2 - Second access
   * @param {Object} project - Project data
   * @returns {boolean} - True if same flow
   */
  sameBusinessFlow(access1, access2, project) {
    // Simplified: same file = likely same flow
    if (access1.file === access2.file) return true;
    
    // Check if they share callers
    const callers1 = this.getAtomCallers(access1.atom, project);
    const callers2 = this.getAtomCallers(access2.atom, project);
    
    return callers1.some(c => callers2.includes(c));
  }

  /**
   * Check if accesses share entry point
   * 
   * @protected
   * @param {Object} access1 - First access
   * @param {Object} access2 - Second access
   * @param {Object} project - Project data
   * @returns {boolean} - True if same entry point
   */
  sameEntryPoint(access1, access2, project) {
    if (access1.module === access2.module && 
        access1.isExported === access2.isExported) {
      return true;
    }
    
    // Check entry points
    const entryPoints1 = this.findEntryPoints(access1.atom, project);
    const entryPoints2 = this.findEntryPoints(access2.atom, project);
    
    return entryPoints1.some(ep => entryPoints2.includes(ep));
  }

  /**
   * Get callers of an atom
   * 
   * @protected
   * @param {string} atomId - Atom identifier
   * @param {Object} project - Project data
   * @returns {Array<string>} - Array of atom IDs that call this atom
   */
  getAtomCallers(atomId, project) {
    const callers = [];
    const atomName = atomId.split('::')[1];
    
    for (const module of project.modules || []) {
      for (const molecule of module.files || []) {
        for (const atom of molecule.atoms || []) {
          if (atom.calls?.some(call => call.name === atomName)) {
            callers.push(atom.id);
          }
        }
      }
    }
    
    return [...new Set(callers)];
  }

  /**
   * Find entry points for an atom
   * 
   * @protected
   * @param {string} atomId - Atom identifier
   * @param {Object} project - Project data
   * @returns {Array<string>} - Entry point atom IDs
   */
  findEntryPoints(atomId, project) {
    const entryPoints = [];
    const visited = new Set();
    const queue = [atomId];
    
    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);
      
      const callers = this.getAtomCallers(current, project);
      
      for (const caller of callers) {
        const [, name] = caller.split('::');
        // Heuristic: exported functions with capital letter are entry points
        if (name && name[0] === name[0].toUpperCase()) {
          entryPoints.push(caller);
        } else {
          queue.push(caller);
        }
      }
    }
    
    return entryPoints;
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
      'OTHER': 'Unknown'
    };

    return {
      id: `race_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: raceType,
      stateKey,
      stateType: stateKey.split(':')[0],
      accesses: [access1, access2],
      severity: 'pending',
      hasMitigation: false,
      mitigationType: null,
      description: `${typeNames[raceType] || raceType} race on ${stateKey}: ` +
                   `${access1.atomName} (${access1.type}) vs ` +
                   `${access2.atomName} (${access2.type})`
    };
  }
}

export default RaceDetectionStrategy;
