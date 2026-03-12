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
function collectSharedCallerIds(callers1, callers2) {
  const callerSet = new Set(callers2);
  return callers1.filter(callerId => callerSet.has(callerId));
}

function hasSequentialAwaitPattern(code) {
  const lines = code.split('\n');
  let lastAwaitIndex = -Infinity;

  for (let idx = 0; idx < lines.length; idx++) {
    if (!lines[idx].includes('await')) continue;

    if (idx - lastAwaitIndex <= 4) {
      return true;
    }

    lastAwaitIndex = idx;
  }

  return false;
}

export function haveSameAwaitContext(access1, access2, project, analyzer) {
  const callers1 = analyzer.getAtomCallers(access1.atom, project);
  const callers2 = analyzer.getAtomCallers(access2.atom, project);
  const sharedCallers = collectSharedCallerIds(callers1, callers2);
  
  for (const callerId of sharedCallers) {
    const caller = analyzer.findAtomById(callerId, project);
    if (!caller?.code) continue;
    
    // Check for Promise.all pattern (concurrent)
    if (caller.code.includes('Promise.all') || 
        caller.code.includes('Promise.allSettled')) {
      return false;
    }
    
    // Check for sequential await pattern
    if (hasSequentialAwaitPattern(caller.code)) return true;
  }
  
  return false;
}
