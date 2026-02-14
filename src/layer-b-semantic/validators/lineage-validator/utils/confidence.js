/**
 * @fileoverview Confidence Calculator
 * 
 * Calcula nivel de confianza en los metadatos.
 * 
 * @module layer-b-semantic/validators/lineage-validator/utils/confidence
 */

/**
 * Calcula nivel de confianza en los metadatos
 * @param {Object} atom - Átomo evaluado
 * @param {Array} errors - Errores detectados
 * @param {Array} warnings - Advertencias
 * @returns {string} Nivel de confianza
 */
export function calculateConfidence(atom, errors, warnings) {
  let score = 100;
  
  // Penalizar errores graves
  score -= errors.length * 30;
  
  // Penalizar warnings
  score -= warnings.length * 10;
  
  // Bonificaciones
  if (atom.dna) score += 10;
  if (atom.semantic) score += 10;
  if (atom.standardized) score += 10;
  
  // Determinar nivel
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}
