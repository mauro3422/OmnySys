/**
 * System Map Validator
 */

import { validateFileAnalysis } from './file-analysis.js';

/**
 * Valida enhanced system map completo
 * @param {object} systemMap - System map a validar
 * @param {object} options - Opciones de validación
 * @returns {object} - { valid: boolean, errors: object, warnings: object, stats: object }
 */
export function validateEnhancedSystemMap(systemMap, options = {}) {
  const { minConfidence = 0.7, strict = false } = options;
  const results = {
    valid: true,
    errors: {},
    warnings: {},
    stats: {
      totalFiles: 0,
      filesWithErrors: 0,
      filesWithWarnings: 0,
      totalConnections: 0,
      validConnections: 0,
      lowConfidenceConnections: 0
    }
  };

  // Validate metadata
  if (!systemMap.metadata) {
    results.valid = false;
    results.errors['_metadata'] = ['Missing metadata'];
  }

  // Validate files
  if (!systemMap.files) {
    results.valid = false;
    results.errors['_files'] = ['Missing files object'];
    return results;
  }

  results.stats.totalFiles = Object.keys(systemMap.files).length;

  for (const [filePath, fileAnalysis] of Object.entries(systemMap.files)) {
    const validation = validateFileAnalysis(fileAnalysis, options);

    if (!validation.valid) {
      results.valid = false;
      results.errors[filePath] = validation.errors;
      results.stats.filesWithErrors++;
    }

    if (validation.warnings.length > 0) {
      results.warnings[filePath] = validation.warnings;
      results.stats.filesWithWarnings++;
    }

    // Count connections
    if (fileAnalysis.semanticConnections) {
      results.stats.totalConnections += fileAnalysis.semanticConnections.length;

      for (const conn of fileAnalysis.semanticConnections) {
        if (conn.confidence >= minConfidence) {
          results.stats.validConnections++;
        } else {
          results.stats.lowConfidenceConnections++;
        }
      }
    }
  }

  return results;
}
