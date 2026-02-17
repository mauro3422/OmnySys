/**
 * @fileoverview Shadow Checks
 * 
 * Valida sombras y matches.
 * 
 * @module layer-b-semantic/validators/lineage-validator/checks/shadow-checks
 */

/**
 * Valida que una sombra tenga sentido como antepasado
 * 
 * @param {Object} shadow - Sombra a validar
 * @returns {Object} Resultado de validación
 */
export function validateShadow(shadow) {
  const errors = [];
  
  if (!shadow.shadowId) errors.push('Missing shadowId');
  if (!shadow.originalId) errors.push('Missing originalId');
  if (!shadow.dna) errors.push('Missing DNA');
  if (!shadow.diedAt) errors.push('Missing diedAt timestamp');
  
  // Validar que tenga metadatos mínimos para ser útil
  if (!shadow.metadata) {
    errors.push('Missing metadata');
  }
  
  return {
    valid: errors.length === 0,
    confidence: errors.length === 0 ? 'high' : 'none',
    errors,
    warnings: []
  };
}

/**
 * Valida que un match entre átomo y sombra sea legítimo
 * 
 * @param {Object} atom - Átomo nuevo
 * @param {Object} shadow - Sombra candidata
 * @returns {{valid: boolean, similarity: number, reason: string}}
 */
export function validateMatch(atom, shadow) {
  if (!atom.dna || !shadow.dna) {
    return { valid: false, similarity: 0, reason: 'Missing DNA' };
  }
  
  // Calcular similitud
  const similarity = computeSimilarity(atom.dna, shadow.dna);
  
  // Umbral mínimo
  if (similarity < 0.6) {
    return { valid: false, similarity, reason: 'Similarity below threshold (0.6)' };
  }
  
  // Verificar que no sea un falso positivo (misma estructura, semántica muy diferente)
  if (similarity > 0.8 && atom.semantic && shadow.metadata?.semantic) {
    const verbMatch = atom.semantic.verb === shadow.metadata.semantic.verb;
    const domainDiff = atom.semantic.domain !== shadow.metadata.semantic.domain;
    
    if (!verbMatch && domainDiff) {
      return { 
        valid: false, 
        similarity, 
        reason: 'High structural similarity but different semantics (possible false positive)' 
      };
    }
  }
  
  return { valid: true, similarity, reason: 'Match validated' };
}

/**
 * Computa similitud entre dos DNAs
 * @param {Object} dna1 - Primer DNA
 * @param {Object} dna2 - Segundo DNA
 * @returns {number} Similitud 0-1
 */
function computeSimilarity(dna1, dna2) {
  // Importar desde dna-extractor para consistencia
  const { compareDNA } = require('../../../../layer-a-static/extractors/metadata/dna-extractor.js');
  return compareDNA(dna1, dna2);
}
