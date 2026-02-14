/**
 * File Analysis Validator
 */

import { validateSemanticConnection } from './connection.js';
import { validateSideEffects } from './side-effects.js';
import { validateRiskScore } from './risk-score.js';

/**
 * Valida un FileAnalysis completo
 * @param {object} fileAnalysis - Análisis de archivo
 * @param {object} options - Opciones de validación
 * @returns {object} - { valid: boolean, errors: string[], warnings: string[] }
 */
export function validateFileAnalysis(fileAnalysis, options = {}) {
  const { minConfidence = 0.7, strict = false } = options;
  const errors = [];
  const warnings = [];

  // Required fields
  if (!fileAnalysis.path) errors.push('Missing required field: path');
  if (!fileAnalysis.imports) errors.push('Missing required field: imports');
  if (!fileAnalysis.exports) errors.push('Missing required field: exports');

  // Validate semantic connections
  if (fileAnalysis.semanticConnections) {
    for (const conn of fileAnalysis.semanticConnections) {
      const result = validateSemanticConnection(conn, minConfidence);
      if (!result.valid) {
        if (strict) {
          errors.push(...result.errors.map(e => `Connection ${conn.id}: ${e}`));
        } else {
          warnings.push(...result.errors.map(e => `Connection ${conn.id}: ${e}`));
        }
      }
    }
  }

  // Validate side effects
  if (fileAnalysis.sideEffects) {
    const result = validateSideEffects(fileAnalysis.sideEffects);
    if (!result.valid) {
      warnings.push(...result.errors.map(e => `Side effects: ${e}`));
    }
  }

  // Validate risk score
  if (fileAnalysis.riskScore) {
    const result = validateRiskScore(fileAnalysis.riskScore);
    if (!result.valid) {
      warnings.push(...result.errors.map(e => `Risk score: ${e}`));
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
