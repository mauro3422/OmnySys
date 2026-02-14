/**
 * @fileoverview Semantic Checks
 * 
 * Valida análisis semántico.
 * 
 * @module layer-b-semantic/validators/lineage-validator/checks/semantic-checks
 */

const KNOWN_VERBS = ['get', 'set', 'update', 'delete', 'validate', 'process', 'handle', 'create', 'fetch'];

/**
 * Valida análisis semántico
 * @param {Object} semantic - Análisis semántico
 * @returns {Object} Resultado de validación
 */
export function validateSemantic(semantic) {
  const errors = [];
  
  if (!semantic.verb) {
    errors.push('Missing semantic verb');
  }
  
  if (!semantic.operationType) {
    errors.push('Missing operationType');
  }
  
  // Verbos conocidos
  if (semantic.verb && !KNOWN_VERBS.includes(semantic.verb)) {
    errors.push(`Unknown verb: ${semantic.verb}`);
  }
  
  return { valid: errors.length === 0, errors };
}
