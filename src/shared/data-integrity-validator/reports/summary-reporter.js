/**
 * @fileoverview Summary Reporter
 * 
 * Generates validation summary reports.
 * Formats and logs validation results.
 * 
 * @module data-integrity-validator/reports/summary-reporter
 */

import { createLogger } from '#utils/logger.js';

const logger = createLogger('integrity-validator');

/**
 * Generates validation summaries
 * 
 * @class SummaryReporter
 */
export class SummaryReporter {
  /**
   * Logs validation summary
   * 
   * @param {ValidationResult} result - Validation result
   */
  logSummary(result) {
    const separator = '='.repeat(60);
    
    logger.info(separator);
    logger.info('DATA INTEGRITY VALIDATION COMPLETE');
    logger.info(separator);
    logger.info(`Status: ${result.valid ? 'VALID' : 'INVALID'}`);
    logger.info(`Atoms checked: ${result.stats.atomsChecked}`);
    logger.info(`Molecules checked: ${result.stats.moleculesChecked}`);
    logger.info(`References checked: ${result.stats.referencesChecked}`);
    logger.info(`Errors: ${result.errors.length}`);
    logger.info(`Warnings: ${result.warnings.length}`);

    this._logErrors(result.errors);
    this._logWarnings(result.warnings);

    logger.info(separator);
  }

  /**
   * Logs errors
   * @private
   */
  _logErrors(errors) {
    if (errors.length === 0) return;

    logger.info('\nERRORS:');
    errors.forEach((err, i) => {
      logger.info(`  ${i + 1}. ${err.message}`);
    });
  }

  /**
   * Logs warnings
   * @private
   */
  _logWarnings(warnings) {
    if (warnings.length === 0) return;

    logger.info('\nWARNINGS:');
    warnings.forEach((warn, i) => {
      logger.info(`  ${i + 1}. ${warn.message}`);
    });
  }

  /**
   * Generates JSON report
   * 
   * @param {ValidationResult} result - Validation result
   * @returns {Object} JSON-serializable report
   */
  generateJsonReport(result) {
    return {
      timestamp: new Date().toISOString(),
      valid: result.valid,
      summary: {
        atomsChecked: result.stats.atomsChecked,
        moleculesChecked: result.stats.moleculesChecked,
        referencesChecked: result.stats.referencesChecked,
        errorCount: result.errors.length,
        warningCount: result.warnings.length
      },
      errors: result.errors,
      warnings: result.warnings
    };
  }
}

export default SummaryReporter;
