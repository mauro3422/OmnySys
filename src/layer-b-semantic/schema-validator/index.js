/**
 * Schema Validator for Enhanced System Map
 *
 * Responsabilidad:
 * - Validar que el output de análisis semántico cumple con el schema
 * - Filtrar conexiones con confidence < threshold
 * - Validar tipos de datos
 * - Generar warnings si hay problemas
 *
 * @module schema-validator
 */

// Schema
export { schema } from './schema/index.js';

// Validators
export {
  validateSemanticConnection,
  validateSideEffects,
  validateRiskScore,
  validateFileAnalysis,
  validateEnhancedSystemMap
} from './validators/index.js';

// Filters
export {
  filterByConfidence,
  filterBySeverity
} from './filters/index.js';

// Report
export { generateValidationReport } from './report/index.js';
