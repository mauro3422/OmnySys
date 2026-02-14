/**
 * @fileoverview Evolution Validator
 * 
 * Detecta y valida tipos de evolución entre sombras y átomos.
 * 
 * @module layer-c-memory/shadow-registry/lineage-tracker/validators/evolution
 */

import { EvolutionType } from '../../types.js';

/**
 * Detecta el tipo de evolución entre sombra y nuevo átomo
 * @param {Object} shadow - Sombra existente
 * @param {Object} newAtom - Nuevo átomo
 * @returns {string} Tipo de evolución
 */
export function detectEvolutionType(shadow, newAtom) {
  // Comparar DNA
  const dna1 = shadow.dna;
  const dna2 = newAtom.dna;
  
  if (!dna1 || !dna2) return EvolutionType.REFACTOR;
  
  // Mismo hash estructural = renombrado
  if (dna1.structuralHash === dna2.structuralHash) {
    return EvolutionType.RENAMED;
  }
  
  // Mismo patrón, diferente complejidad
  if (dna1.patternHash === dna2.patternHash) {
    if (dna2.complexityScore > dna1.complexityScore) {
      return EvolutionType.EXPANDED;
    }
    if (dna2.complexityScore < dna1.complexityScore) {
      return EvolutionType.SHRINKED;
    }
    return EvolutionType.REFACTOR;
  }
  
  // Cambio de dominio semántico
  if (dna1.semanticFingerprint !== dna2.semanticFingerprint) {
    return EvolutionType.DOMAIN_CHANGE;
  }
  
  // Cambio de patrón = reimplementación
  return EvolutionType.REIMPLEMENTED;
}
