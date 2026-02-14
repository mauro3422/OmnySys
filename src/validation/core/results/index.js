/**
 * @fileoverview Validation Results Module
 * 
 * Central module for validation results exports.
 * Provides classes and constants for handling validation outcomes.
 * 
 * @module validation/core/results
 */

// Constants
export { ValidationSeverity, ValidationType } from './constants.js';

// Classes
export { ValidationResult } from './ValidationResult.js';
export { ValidationReport } from './ValidationReport.js';

// Helper functions
import { ValidationReport } from './ValidationReport.js';

/**
 * Helper para crear un reporte rápido
 * @param {Object} options - Report options
 * @returns {ValidationReport} New validation report
 */
export function createReport(options) {
  return new ValidationReport(options);
}

// Default export
export { default as ValidationResultDefault } from './ValidationResult.js';
export { default as ValidationReportDefault } from './ValidationReport.js';
export { default as ConstantsDefault } from './constants.js';

import { ValidationResult } from './ValidationResult.js';
import { ValidationSeverity, ValidationType } from './constants.js';

/**
 * Default export aggregating all validation result components
 */
export default {
  ValidationResult,
  ValidationReport,
  ValidationSeverity,
  ValidationType,
  createReport
};
