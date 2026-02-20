/**
 * @fileoverview Coherence Checks
 * 
 * Valida coherencia entre DNA, dataFlow y semantic.
 * 
 * @module layer-b-semantic/validators/lineage-validator/checks/coherence-checks
 */

/**
 * Valida coherencia entre DNA, dataFlow y semantic
 * @param {Object} atom - Átomo a validar
 * @returns {Object} Resultado de validación
 */
export function validateCoherence(atom) {
  const errors = [];
  
  // Coherencia: si semantic dice "validate", debería tener validación en transformations
  if (atom.semantic?.verb === 'validate' && atom.dataFlow?.transformations) {
    const hasValidation = atom.dataFlow.transformations.some(t => 
      ['validation', 'check', 'verify'].includes(t.operation)
    );
    
    if (!hasValidation) {
      errors.push('Semantic says "validate" but no validation operation found');
    }
  }
  
  // Coherencia: flowType debe coincidir con operaciones
  if (atom.dna?.flowType && atom.dataFlow?.transformations) {
    const operations = atom.dataFlow.transformations.map(t => t.operation);
    
    // "read" en flowType cubre: property_access, function_call, await_function_call, etc.
    const READ_OPS = new Set(['read', 'fetch', 'query', 'property_access', 'array_index_access', 'function_call', 'await_function_call', 'instantiation']);
    if (atom.dna.flowType.includes('read') && !operations.some(o => READ_OPS.has(o))) {
      errors.push('FlowType says "read" but no read-like operation found');
    }

    if (atom.dna.flowType.includes('persist') &&
        !atom.dataFlow.outputs?.some(o => o.type === 'side_effect' || o.isSideEffect) &&
        !operations.some(o => ['mutation', 'update'].includes(o))) {
      errors.push('FlowType says "persist" but no side effect output or mutation found');
    }
  }
  
  return { valid: errors.length === 0, errors };
}
