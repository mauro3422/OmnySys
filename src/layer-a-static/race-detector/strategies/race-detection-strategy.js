/**
 * @fileoverview race-detection-strategy.js
 *
 * Base interface for race detection strategies
 * Implements Strategy pattern for different race types
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
      throw new Error('Cannot instantiate abstract class');
    }
  }

  /**
   * Detect races from shared state
   * @abstract
   * @param {Map} sharedState - Map of stateKey to access points
   * @param {Object} project - Project data
   * @returns {Array} - Array of detected races
   */
  detect(sharedState, project) {
    throw new Error('Must implement detect()');
  }

  /**
   * Get the type of race this strategy detects
   * @abstract
   * @returns {string} - Race type (e.g., 'RW', 'WW', 'IE')
   */
  getRaceType() {
    throw new Error('Must implement getRaceType()');
  }

  /**
   * Helper: Check if two accesses can run concurrently
   * @protected
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
   * Helper: Check if accesses are in same business flow
   * @protected
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
   * Helper: Check if accesses share entry point
   * @protected
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
   * Helper: Get callers of an atom
   * @protected
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
   * Helper: Find entry points for an atom
   * @protected
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
        const [file, name] = caller.split('::');
        // Simple heuristic: exported functions are entry points
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
   * Helper: Create race object
   * @protected
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
