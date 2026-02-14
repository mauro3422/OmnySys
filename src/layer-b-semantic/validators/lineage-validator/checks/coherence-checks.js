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
    
    if (atom.dna.flowType.includes('read') && !operations.some(o => ['read', 'fetch'].includes(o))) {
      errors.push('FlowType says "read" but no read operation found');
    }
    
    if (atom.dna.flowType.includes('persist') && !atom.dataFlow.outputs?.some(o => o.type === 'side_effect')) {
      errors.push('FlowType says "persist" but no side effect output found');
    }
  }
  
  return { valid: errors.length === 0, errors };
}
