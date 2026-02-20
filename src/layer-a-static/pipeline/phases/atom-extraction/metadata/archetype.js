/**
 * @fileoverview archetype.js
 *
 * Atom archetype detection and recalculation
 *
 * @module pipeline/phases/atom-extraction/metadata/archetype
 */

/**
 * Detect atom archetype based on metadata
 * @param {Object} atomMetadata - Atom metadata
 * @returns {Object} - Archetype with type, severity, and confidence
 */
export function detectAtomArchetype(atomMetadata) {
  const { 
    complexity, 
    hasSideEffects, 
    hasNetworkCalls, 
    externalCallCount, 
    linesOfCode, 
    isExported, 
    calledBy, 
    className 
  } = atomMetadata;
  
  const callerCount = calledBy?.length || 0;
  const isClassMethod = !!className;

  // God function: excessive complexity OR high complexity with many connections
  if (complexity > 50 || linesOfCode > 150 ||
      (complexity > 20 && (externalCallCount > 5 || callerCount > 10))) {
    return { type: 'god-function', severity: 10, confidence: 1.0 };
  }

  if (hasNetworkCalls && !atomMetadata.hasErrorHandling) {
    return { type: 'fragile-network', severity: 8, confidence: 0.9 };
  }

  if (isExported && callerCount > 5 && complexity < 15) {
    return { type: 'hot-path', severity: 7, confidence: 0.9 };
  }

  // Class methods are NOT dead — they're accessed via the class instance.
  // Only standalone non-exported functions with zero callers are dead.
  if (!isExported && callerCount === 0 && !isClassMethod) {
    return { type: 'dead-function', severity: 5, confidence: 1.0 };
  }

  // Class methods with no internal callers: they're entry points of the class API
  if (isClassMethod && callerCount === 0) {
    return { type: 'class-method', severity: 2, confidence: 1.0 };
  }

  if (!isExported && callerCount > 0 && !hasSideEffects && complexity < 10) {
    return { type: 'private-utility', severity: 3, confidence: 0.9 };
  }

  if (!hasSideEffects && complexity < 5 && linesOfCode < 20) {
    return { type: 'utility', severity: 2, confidence: 1.0 };
  }

  return { type: 'standard', severity: 1, confidence: 1.0 };
}

/**
 * Recalculate archetypes for all atoms with calledBy info
 * @param {Array} atoms - Array of atom metadata
 */
export function recalculateArchetypes(atoms) {
  atoms.forEach(atom => {
    atom.archetype = detectAtomArchetype(atom);
  });
}

export default { detectAtomArchetype, recalculateArchetypes };
