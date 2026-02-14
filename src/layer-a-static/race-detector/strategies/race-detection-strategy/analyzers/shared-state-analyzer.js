/**
 * @fileoverview shared-state-analyzer.js
 * 
 * Analyzes shared state access patterns to detect potential race conditions.
 * Focuses on identifying conflicting accesses to the same state from different
 * execution contexts.
 * 
 * @module race-detector/strategies/race-detection-strategy/analyzers/shared-state-analyzer
 */

/**
 * Analyzer for shared state access patterns
 */
export class SharedStateAnalyzer {
  constructor() {
    /** @type {Map<string, Array>} */
    this.sharedState = new Map();
  }

  /**
   * Build shared state map from project data
   * 
   * @param {Object} project - Project data with modules and atoms
   * @returns {Map<string, Array>} - Map of stateKey to access points
   */
  buildSharedState(project) {
    this.sharedState.clear();

    for (const module of project.modules || []) {
      for (const molecule of module.files || []) {
        for (const atom of molecule.atoms || []) {
          this._extractStateAccesses(atom, project);
        }
      }
    }

    return this.sharedState;
  }

  /**
   * Extract state accesses from an atom
   * @private
   * @param {Object} atom - Atom data
   * @param {Object} project - Project data
   */
  _extractStateAccesses(atom, project) {
    if (!atom.stateAccesses) return;

    for (const access of atom.stateAccesses) {
      const stateKey = this._getStateKey(access, atom);
      
      if (!this.sharedState.has(stateKey)) {
        this.sharedState.set(stateKey, []);
      }

      this.sharedState.get(stateKey).push({
        atom: atom.id,
        atomName: atom.name,
        type: access.type, // 'read' | 'write'
        isAsync: atom.isAsync || false,
        file: atom.filePath,
        module: atom.moduleId,
        isExported: atom.isExported || false,
        caller: access.caller || null,
        line: access.line || 0,
        column: access.column || 0
      });
    }
  }

  /**
   * Generate unique key for a state access
   * @private
   * @param {Object} access - State access data
   * @param {Object} atom - Atom data
   * @returns {string} - State key (e.g., 'global:counter', 'module:User.name')
   */
  _getStateKey(access, atom) {
    const scope = access.scope || 'global';
    const name = access.name || 'unknown';
    
    if (scope === 'module') {
      return `${scope}:${atom.moduleId}.${name}`;
    }
    
    return `${scope}:${name}`;
  }

  /**
   * Get all accesses for a specific state key
   * 
   * @param {string} stateKey - State identifier
   * @returns {Array} - Array of access points
   */
  getAccesses(stateKey) {
    return this.sharedState.get(stateKey) || [];
  }

  /**
   * Check if state has conflicting access types
   * 
   * @param {string} stateKey - State identifier
   * @returns {boolean} - True if has both reads and writes
   */
  hasConflictingAccesses(stateKey) {
    const accesses = this.getAccesses(stateKey);
    const hasRead = accesses.some(a => a.type === 'read');
    const hasWrite = accesses.some(a => a.type === 'write');
    
    return hasRead && hasWrite;
  }

  /**
   * Get write accesses for a state key
   * 
   * @param {string} stateKey - State identifier
   * @returns {Array} - Array of write access points
   */
  getWriteAccesses(stateKey) {
    return this.getAccesses(stateKey).filter(a => a.type === 'write');
  }

  /**
   * Get read accesses for a state key
   * 
   * @param {string} stateKey - State identifier
   * @returns {Array} - Array of read access points
   */
  getReadAccesses(stateKey) {
    return this.getAccesses(stateKey).filter(a => a.type === 'read');
  }

  /**
   * Check if state is accessed from multiple atoms
   * 
   * @param {string} stateKey - State identifier
   * @returns {boolean} - True if accessed from multiple atoms
   */
  isSharedAcrossAtoms(stateKey) {
    const accesses = this.getAccesses(stateKey);
    const uniqueAtoms = new Set(accesses.map(a => a.atom));
    return uniqueAtoms.size > 1;
  }

  /**
   * Get all state keys with potential races (accessed from multiple contexts)
   * 
   * @returns {Array<string>} - Array of state keys
   */
  getCandidateStateKeys() {
    const candidates = [];
    
    for (const [stateKey, accesses] of this.sharedState) {
      // Must have multiple accesses
      if (accesses.length < 2) continue;
      
      // Must be accessed from different atoms
      if (!this.isSharedAcrossAtoms(stateKey)) continue;
      
      candidates.push(stateKey);
    }
    
    return candidates;
  }

  /**
   * Clear all shared state data
   */
  clear() {
    this.sharedState.clear();
  }
}

export default SharedStateAnalyzer;
