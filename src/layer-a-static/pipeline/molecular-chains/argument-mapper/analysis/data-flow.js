/**
 * @fileoverview Data flow analysis
 * @module molecular-chains/argument-mapper/analysis/data-flow
 */

import { trackReturnUsage } from './return-usage.js';
import { detectChainedTransforms, calculateChainComplexity } from './chains.js';

/**
 * Performs comprehensive data flow analysis between caller and callee
 * @param {Object} callerAtom - Caller atom
 * @param {Object} calleeAtom - Callee atom
 * @param {Object} callInfo - Call information
 * @param {Function} mapFn - Mapping function to get mappings
 * @returns {Object} Complete data flow analysis
 */
export function analyzeDataFlow(callerAtom, calleeAtom, callInfo, mapFn) {
  const mapping = mapFn();
  
  // Analyze if callee return is used in caller
  const returnUsage = trackReturnUsage(callerAtom, calleeAtom, callInfo);
  
  // Detect chained transformations
  const chainedTransforms = detectChainedTransforms(mapping, callerAtom, calleeAtom);

  return {
    ...mapping,
    returnUsage,
    chainedTransforms,
    
    // Summary
    summary: {
      hasDataTransformation: mapping.mappings.some(m => 
        m.transform.type !== 'DIRECT_PASS'
      ),
      hasReturnUsage: returnUsage.isUsed,
      chainComplexity: calculateChainComplexity(mapping, returnUsage)
    }
  };
}

export default analyzeDataFlow;
