/**
 * @fileoverview Data Flow Checks
 * 
 * Valida estructura de data flow.
 * 
 * @module layer-b-semantic/validators/lineage-validator/checks/dataflow-checks
 */

/**
 * Valida estructura de data flow
 * @param {Object} dataFlow - Data flow a validar
 * @returns {Object} Resultado de validación
 */
export function validateDataFlow(dataFlow) {
  const errors = [];
  const warnings = [];
  
  if (!dataFlow) {
    return { valid: false, errors: ['Missing dataFlow'], warnings: [] };
  }
  
  // Inputs pueden estar vacíos (funciones sin params)
  if (!Array.isArray(dataFlow.inputs)) {
    errors.push('dataFlow.inputs must be an array');
  }
  
  // Debe tener al menos outputs o transformations
  const hasOutputs = Array.isArray(dataFlow.outputs) && dataFlow.outputs.length > 0;
  const hasTransformations = Array.isArray(dataFlow.transformations) && dataFlow.transformations.length > 0;
  
  if (!hasOutputs && !hasTransformations) {
    warnings.push('Atom has no outputs or transformations (possible void function)');
  }
  
  // Validar que los outputs tengan tipo
  if (hasOutputs) {
    dataFlow.outputs.forEach((output, i) => {
      if (!output.type) {
        warnings.push(`Output ${i} missing type`);
      }
    });
  }
  
  return { valid: errors.length === 0, errors, warnings };
}
