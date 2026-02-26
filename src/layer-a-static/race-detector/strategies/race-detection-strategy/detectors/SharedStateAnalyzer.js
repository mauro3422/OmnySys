/**
 * @fileoverview SharedStateAnalyzer.js
 * 
 * Analyzes shared state access patterns for race condition detection.
 * 
 * @module race-detector/strategies/race-detection-strategy/detectors/SharedStateAnalyzer
 */

/**
 * Analyzes shared state access patterns
 */
export class SharedStateAnalyzer {
  constructor() {
    this.accessCache = new Map();
  }

  /**
   * Analyze shared state map and extract patterns
   * @param {Map<string, Array>} sharedState - Map of stateKey to access points
   * @returns {Object} - Analysis results
   */
  analyze(sharedState) {
    const results = {
      totalKeys: sharedState.size,
      globalState: [],
      moduleState: [],
      closureState: [],
      localState: [], // Variables locales (NO son race conditions reales)
      highContention: []
    };

    for (const [stateKey, accesses] of sharedState) {
      const stateType = this.getStateType(stateKey);
      
      // FILTRO CRÍTICO: Ignorar variables locales - NO son estado compartido
      if (!this.isSharedState(stateType)) {
        results.localState.push({
          stateKey,
          stateType,
          accesses: accesses.length,
          note: 'Variable local - no es race condition real'
        });
        continue; // Saltar al siguiente - NO analizar como race condition
      }
      
      const analysis = this.analyzeAccessPattern(stateKey, accesses);
      results[`${stateType}State`].push(analysis);

      if (analysis.contentionScore > 0.7) {
        results.highContention.push(analysis);
      }
    }

    return results;
  }

  /**
   * Determine state type from key
   * @param {string} stateKey - State key (format: "type:name")
   * @returns {string} - State type
   */
  getStateType(stateKey) {
    const prefix = stateKey.split(':')[0];
    const typeMap = {
      'global': 'global',
      'module': 'module',
      'closure': 'closure',
      'external': 'external',
      'singleton': 'singleton',
      // Variables locales NO son estado compartido - filtrarlas
      'local': 'local',
      'function': 'local'
    };
    return typeMap[prefix] || 'unknown';
  }

  /**
   * Check if state type is shared (not local)
   * @param {string} stateType - State type
   * @returns {boolean} - True if shared
   */
  isSharedState(stateType) {
    // Solo estos tipos son estado compartido real
    const sharedTypes = ['global', 'module', 'closure', 'external', 'singleton'];
    return sharedTypes.includes(stateType);
  }

  /**
   * Analyze access pattern for a state key
   * @param {string} stateKey - State key
   * @param {Array} accesses - Access points
   * @returns {Object} - Pattern analysis
   */
  analyzeAccessPattern(stateKey, accesses) {
    const reads = accesses.filter(a => a.type === 'read');
    const writes = accesses.filter(a => a.type === 'write');
    const readWrites = accesses.filter(a => a.type === 'read-write');

    return {
      stateKey,
      totalAccesses: accesses.length,
      reads: reads.length,
      writes: writes.length,
      readWrites: readWrites.length,
      contentionScore: this.calculateContention(writes, accesses.length),
      hasConcurrentAccess: this.hasConcurrentAccess(accesses)
    };
  }

  /**
   * Calculate contention score
   * @private
   */
  calculateContention(writes, total) {
    if (total === 0) return 0;
    const writeRatio = writes / total;
    return Math.min(writeRatio * 2 + (writes > 1 ? 0.3 : 0), 1.0);
  }

  /**
   * Check if accesses have potential concurrency
   * @private
   */
  hasConcurrentAccess(accesses) {
    const asyncCount = accesses.filter(a => a.isAsync).length;
    return asyncCount >= 2 || (asyncCount > 0 && accesses.length >= 2);
  }
}

export default SharedStateAnalyzer;
