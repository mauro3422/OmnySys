/**
 * Report Generator
 */

/**
 * Genera reporte de validación
 * @param {object} validationResult - Resultado de validateEnhancedSystemMap
 * @returns {string} - Reporte formateado
 */
export function generateValidationReport(validationResult) {
  const lines = [];

  lines.push('=== Enhanced System Map Validation Report ===\n');

  // Stats
  lines.push('Statistics:');
  lines.push(`  Total files: ${validationResult.stats.totalFiles}`);
  lines.push(`  Files with errors: ${validationResult.stats.filesWithErrors}`);
  lines.push(`  Files with warnings: ${validationResult.stats.filesWithWarnings}`);
  lines.push(`  Total connections: ${validationResult.stats.totalConnections}`);
  lines.push(`  Valid connections: ${validationResult.stats.validConnections}`);
  lines.push(`  Low confidence: ${validationResult.stats.lowConfidenceConnections}\n`);

  // Overall result
  if (validationResult.valid) {
    lines.push('✅ Validation PASSED\n');
  } else {
    lines.push('❌ Validation FAILED\n');
  }

  // Errors
  if (Object.keys(validationResult.errors).length > 0) {
    lines.push('Errors:');
    for (const [file, errors] of Object.entries(validationResult.errors)) {
      lines.push(`  ${file}:`);
      for (const error of errors) {
        lines.push(`    - ${error}`);
      }
    }
    lines.push('');
  }

  // Warnings
  if (Object.keys(validationResult.warnings).length > 0) {
    lines.push('Warnings:');
    for (const [file, warnings] of Object.entries(validationResult.warnings)) {
      lines.push(`  ${file}:`);
      for (const warning of warnings) {
        lines.push(`    - ${warning}`);
      }
    }
  }

  return lines.join('\n');
}
