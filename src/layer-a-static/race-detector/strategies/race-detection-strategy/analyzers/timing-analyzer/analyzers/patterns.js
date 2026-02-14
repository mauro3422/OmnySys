/**
 * @fileoverview patterns.js
 * 
 * Async pattern analysis
 * 
 * @module race-detector/strategies/race-detection-strategy/analyzers/timing-analyzer/analyzers/patterns
 */

/**
 * Check if two accesses have the same await context
 * 
 * @param {Object} access1 - First access
 * @param {Object} access2 - Second access
 * @param {Object} project - Project data
 * @param {Object} analyzer - TimingAnalyzer instance
 * @returns {boolean} - True if same await context
 */
export function haveSameAwaitContext(access1, access2, project, analyzer) {
  const callers1 = analyzer.getAtomCallers(access1.atom, project);
  const callers2 = analyzer.getAtomCallers(access2.atom, project);
  
  const sharedCallers = callers1.filter(c => callers2.includes(c));
  
  for (const callerId of sharedCallers) {
    const caller = analyzer.findAtomById(callerId, project);
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
