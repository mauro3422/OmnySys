/**
 * Schema Validator for Enhanced System Map
 *
 * @deprecated Use ./schema-validator/index.js directly
 * This file is kept for backward compatibility
 *
 * @module schema-validator
 */

export {
  schema,
  validateSemanticConnection,
  validateSideEffects,
  validateRiskScore,
  validateFileAnalysis,
  validateEnhancedSystemMap,
  filterByConfidence,
  filterBySeverity,
  generateValidationReport
} from './schema-validator/index.js';
