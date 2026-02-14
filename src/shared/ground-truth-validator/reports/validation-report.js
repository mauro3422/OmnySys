/**
 * @fileoverview Validation Report
 * 
 * Generador de reportes de validación.
 * 
 * @module ground-truth-validator/reports/validation-report
 * @version 1.0.0
 */

import { createLogger } from '../../logger-system.js';

const logger = createLogger('OmnySys:validator:report');

/**
 * Resultado de validación consolidado
 */
export class ValidationResult {
  constructor() {
    this.valid = true;
    this.phases = [];
    this.stats = {
      filesChecked: 0,
      atomsVerified: 0,
      callsVerified: 0,
      errors: 0,
      warnings: 0
    };
    this.mismatches = [];
    this.warnings = [];
    this.duration = 0;
  }

  addPhase(result) {
    this.phases.push(result);
    
    if (!result.valid) this.valid = false;
    
    // Acumular stats
    Object.keys(result.stats || {}).forEach(key => {
      if (this.stats[key] !== undefined) {
        this.stats[key] += result.stats[key];
      }
    });

    this.mismatches.push(...(result.mismatches || []));
  }

  addWarning(warning) {
    this.warnings.push(warning);
    this.stats.warnings++;
  }
}

/**
 * Generador de reportes
 */
export class ReportGenerator {
  static generate(result) {
    const lines = [
      '='.repeat(70),
      'GROUND TRUTH VALIDATION REPORT',
      '='.repeat(70),
      `Status: ${result.valid ? '✅ VALID' : '❌ MISMATCHES FOUND'}`,
      `Duration: ${result.duration}ms`,
      '',
      'Statistics:',
      `  Files checked: ${result.stats.filesChecked}`,
      `  Atoms verified: ${result.stats.atomsVerified}`,
      `  Calls verified: ${result.stats.callsVerified}`,
      `  Errors: ${result.stats.errors}`,
      `  Warnings: ${result.stats.warnings}`,
      ''
    ];

    if (result.mismatches.length > 0) {
      lines.push('Mismatches:');
      result.mismatches.forEach((m, i) => {
        lines.push(`  ${i + 1}. [${m.type}] ${m.file || m.caller || 'unknown'}`);
        if (m.function) lines.push(`      Function: ${m.function}`);
        if (m.callee) lines.push(`      Call: ${m.callee}`);
      });
      lines.push('');
    }

    lines.push('='.repeat(70));
    return lines.join('\n');
  }

  static log(result) {
    logger.info(this.generate(result));
  }
}

export default { ValidationResult, ReportGenerator };
