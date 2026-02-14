/**
 * @fileoverview Chain detection and complexity analysis
 * @module molecular-chains/argument-mapper/analysis/chains
 */

/**
 * Detects chained transformations
 * @param {Object} mapping - Mapping result with mappings array
 * @param {Object} callerAtom - Caller atom
 * @param {Object} calleeAtom - Callee atom
 * @returns {Array} Detected chains
 */
export function detectChainedTransforms(mapping, callerAtom, calleeAtom) {
  const chains = [];
  
  for (const m of mapping.mappings) {
    // If argument is result of another transformation in caller
    const callerTransforms = callerAtom.dataFlow?.transformations || [];
    
    const sourceTransform = callerTransforms.find(t => 
      t.to === m.argument.variable || 
      t.output?.name === m.argument.variable
    );
    
    if (sourceTransform) {
      chains.push({
        from: `${callerAtom.name}.${sourceTransform.type}`,
        to: `${calleeAtom.name}.input`,
        via: m.argument.variable
      });
    }
  }
  
  return chains;
}

/**
 * Calculates chain complexity
 * @param {Object} mapping - Mapping result
 * @param {Object} returnUsage - Return usage analysis
 * @returns {number} Complexity score
 */
export function calculateChainComplexity(mapping, returnUsage) {
  let complexity = 0;
  
  // +1 for each non-direct mapping
  complexity += mapping.mappings.filter(m => 
    m.transform.type !== 'DIRECT_PASS'
  ).length;
  
  // +1 if return is used
  if (returnUsage.isUsed) complexity += 1;
  
  // +1 for each return usage
  complexity += (returnUsage.usages || []).length;
  
  return complexity;
}

export default { detectChainedTransforms, calculateChainComplexity };
