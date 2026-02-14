/**
 * @fileoverview timing-analyzer.js
 * 
 * Analyzes timing and execution context to determine if two operations
 * can run concurrently. Includes business flow analysis, entry point
 * detection, and async context evaluation.
 * 
 * @module race-detector/strategies/race-detection-strategy/analyzers/timing-analyzer
 */

/**
 * Analyzer for timing and concurrency patterns
 */
export class TimingAnalyzer {
  constructor() {
    /** @type {WeakMap<Object, Map<string, any>>} */
    this._cache = new WeakMap();
  }

  /**
   * Check if two accesses can run concurrently
   * 
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
   * Implements sophisticated flow analysis to determine if two accesses
   * can run concurrently or are serialized by the same business flow.
   * 
   * @param {Object} access1 - First access
   * @param {Object} access2 - Second access
   * @param {Object} project - Project data
   * @returns {boolean} - True if same flow (sequential), false if can run concurrently
   */
  sameBusinessFlow(access1, access2, project) {
    // Strategy 1: Same file, same caller function = same flow
    if (access1.file === access2.file && 
        access1.caller === access2.caller) {
      return true;
    }
    
    // Strategy 2: Check if they share common callers
    const callers1 = this.getAtomCallers(access1.atom, project);
    const callers2 = this.getAtomCallers(access2.atom, project);
    const sharedCallers = callers1.filter(c => callers2.includes(c));
    
    if (sharedCallers.length > 0) {
      // They have common callers - check if sequential in code
      for (const callerId of sharedCallers) {
        if (this.areSequentialInCaller(callerId, access1, access2, project)) {
          return true;
        }
      }
    }
    
    // Strategy 3: Check if both are called from same entry point
    const entryPoints1 = this.findEntryPoints(access1.atom, project);
    const entryPoints2 = this.findEntryPoints(access2.atom, project);
    
    // Different entry points = potentially concurrent
    if (!entryPoints1.some(ep => entryPoints2.includes(ep))) {
      return false;
    }
    
    // Strategy 4: Analyze async context
    // If both are in async functions but not awaited by same parent, concurrent
    if (access1.isAsync && access2.isAsync) {
      const sameAwaitContext = this.haveSameAwaitContext(access1, access2, project);
      if (!sameAwaitContext) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check if accesses share entry point
   * 
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
   * Check if two accesses are sequential within a caller function
   * 
   * @param {string} callerId - Caller atom ID
   * @param {Object} access1 - First access
   * @param {Object} access2 - Second access
   * @param {Object} project - Project data
   * @returns {boolean} - True if sequential in caller
   */
  areSequentialInCaller(callerId, access1, access2, project) {
    const caller = this.findAtomById(callerId, project);
    if (!caller?.code) return false;
    
    // Find line numbers of calls to these atoms
    const atom1Name = access1.atom.split('::')[1];
    const atom2Name = access2.atom.split('::')[1];
    
    const lines = caller.code.split('\n');
    let line1 = -1, line2 = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(atom1Name) && lines[i].includes('await')) {
        line1 = i;
      }
      if (lines[i].includes(atom2Name) && lines[i].includes('await')) {
        line2 = i;
      }
    }
    
    // If we can't determine order, assume concurrent
    if (line1 === -1 || line2 === -1) return false;
    
    // Check if there's a dependency chain (one uses result of other)
    const hasDependency = this.checkDependencyChain(caller, access1, access2);
    
    // Sequential if ordered and no parallel execution pattern
    return hasDependency || Math.abs(line1 - line2) <= 3;
  }

  /**
   * Check if two accesses have the same await context
   * 
   * @param {Object} access1 - First access
   * @param {Object} access2 - Second access
   * @param {Object} project - Project data
   * @returns {boolean} - True if same await context
   */
  haveSameAwaitContext(access1, access2, project) {
    // If both are awaited by the same parent with Promise.all, concurrent
    // If one awaits the other, sequential
    
    const callers1 = this.getAtomCallers(access1.atom, project);
    const callers2 = this.getAtomCallers(access2.atom, project);
    
    const sharedCallers = callers1.filter(c => callers2.includes(c));
    
    for (const callerId of sharedCallers) {
      const caller = this.findAtomById(callerId, project);
      if (!caller?.code) continue;
      
      // Check for Promise.all pattern (concurrent)
      if (caller.code.includes('Promise.all') || 
          caller.code.includes('Promise.allSettled')) {
        return false;
      }
      
      // Check for sequential await pattern
      const lines = caller.code.split('\n');
      const hasSequentialAwait = lines.some((line, idx) => {
        if (line.includes('await')) {
          // Check next few lines for second await
          for (let i = idx + 1; i < Math.min(idx + 5, lines.length); i++) {
            if (lines[i].includes('await')) {
              return true;
            }
          }
        }
        return false;
      });
      
      if (hasSequentialAwait) return true;
    }
    
    return false;
  }

  /**
   * Check if there's a data dependency between two accesses
   * 
   * @param {Object} caller - Caller atom
   * @param {Object} access1 - First access
   * @param {Object} access2 - Second access
   * @returns {boolean} - True if dependency exists
   */
  checkDependencyChain(caller, access1, access2) {
    const code = caller.code;
    const atom1Name = access1.atom.split('::')[1];
    const atom2Name = access2.atom.split('::')[1];
    
    // Check if result of first is used as argument to second
    const regex = new RegExp(
      `(const|let|var)\\s+(\\w+)\\s*=\\s*await\\s+${atom1Name}.*?` +
      `${atom2Name}\\s*\\(\\s*\\2`,
      's'
    );
    
    return regex.test(code);
  }

  /**
   * Get callers of an atom
   * 
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
   * Find atom by ID
   * 
   * @param {string} atomId - Atom identifier
   * @param {Object} project - Project data
   * @returns {Object|null} - Atom data or null
   */
  findAtomById(atomId, project) {
    for (const module of project.modules || []) {
      for (const molecule of module.files || []) {
        for (const atom of molecule.atoms || []) {
          if (atom.id === atomId || 
              `${molecule.filePath}::${atom.name}` === atomId) {
            return atom;
          }
        }
      }
    }
    return null;
  }

  /**
   * Analyze execution timing for a set of accesses
   * 
   * @param {Array} accesses - Array of access points
   * @param {Object} project - Project data
   * @returns {Object} - Timing analysis result
   */
  analyzeTiming(accesses, project) {
    const concurrentPairs = [];
    
    for (let i = 0; i < accesses.length; i++) {
      for (let j = i + 1; j < accesses.length; j++) {
        if (this.canRunConcurrently(accesses[i], accesses[j], project)) {
          concurrentPairs.push([accesses[i], accesses[j]]);
        }
      }
    }
    
    return {
      totalAccesses: accesses.length,
      concurrentPairs: concurrentPairs.length,
      pairs: concurrentPairs,
      isConcurrent: concurrentPairs.length > 0
    };
  }
}

export default TimingAnalyzer;
