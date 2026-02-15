/**
 * @fileoverview Main Lineage Validator
 * 
 * Valida átomos completos para lineage.
 * 
 * @module layer-b-semantic/validators/lineage-validator/validators/main-validator
 */

import { validateDNA } from '#layer-a/extractors/metadata/dna-extractor.js';
import { validateDataFlow } from '../checks/dataflow-checks.js';
import { validateCoherence } from '../checks/coherence-checks.js';
import { validateSemantic } from '../checks/semantic-checks.js';
import { calculateConfidence } from '../utils/confidence.js';
import { extractMetadata } from '../utils/metadata-extractor.js';

/**
 * Resultado de validación
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Si pasa todas las validaciones
 * @property {string} confidence - 'high' | 'medium' | 'low'
 * @property {string[]} errors - Errores críticos
 * @property {string[]} warnings - Advertencias no críticas
 * @property {Object} metadata - Metadatos extraídos si es válido
 */

/**
 * Valida un átomo completo para lineage
 * 
 * @param {Object} atom - Átomo a validar
 * @param {Object} options 
 * @param {boolean} options.strict - Si true, warnings son errores
 * @returns {ValidationResult}
 */
export function validateForLineage(atom, options = {}) {
  const errors = [];
  const warnings = [];
  
  // 1. Validación estructural básica
  if (!atom) {
    return { valid: false, confidence: 'none', errors: ['Atom is null'], warnings: [] };
  }
  
  if (!atom.id) {
    errors.push('Atom missing ID');
  }
  
  if (!atom.name) {
    errors.push('Atom missing name');
  }
  
  // 2. Validar DNA
  if (!atom.dna) {
    errors.push('Atom missing DNA');
  } else {
    const dnaValidation = validateDNA(atom.dna);
    if (!dnaValidation.valid) {
      errors.push(...dnaValidation.errors.map(e => `DNA: ${e}`));
    }
  }
  
  // 3. Validar data flow
  const dataFlowValidation = validateDataFlow(atom.dataFlow);
  if (!dataFlowValidation.valid) {
    errors.push(...dataFlowValidation.errors);
  }
  if (dataFlowValidation.warnings.length > 0) {
    warnings.push(...dataFlowValidation.warnings);
  }
  
  // 4. Validar coherencia entre componentes
  const coherenceValidation = validateCoherence(atom);
  if (!coherenceValidation.valid) {
    errors.push(...coherenceValidation.errors);
  }
  
  // 5. Validar semántica (si existe)
  if (atom.semantic) {
    const semanticValidation = validateSemantic(atom.semantic);
    if (!semanticValidation.valid) {
      warnings.push(...semanticValidation.errors);
    }
  } else {
    warnings.push('Missing semantic analysis');
  }
  
  // Calcular confianza
  const confidence = calculateConfidence(atom, errors, warnings);
  
  // En modo estricto, warnings son errores
  const finalErrors = options.strict ? [...errors, ...warnings] : errors;
  
  return {
    valid: finalErrors.length === 0,
    confidence,
    errors: finalErrors,
    warnings: options.strict ? [] : warnings,
    metadata: finalErrors.length === 0 ? extractMetadata(atom) : null
  };
}
