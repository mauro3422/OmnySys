/**
 * @fileoverview Constants for validation results
 * 
 * Defines severity levels and validation types used across
 * the validation framework.
 * 
 * @module validation/core/results/constants
 */

/**
 * Niveles de severidad para resultados de validación
 * @readonly
 * @enum {string}
 */
export const ValidationSeverity = {
  /** Informative message, no action required */
  INFO: 'info',
  
  /** Warning that should be reviewed but doesn't block */
  WARNING: 'warning',
  
  /** Error that failed validation */
  ERROR: 'error',
  
  /** Critical invariant violation */
  CRITICAL: 'critical'
};

/**
 * Tipos de validación según la arquitectura de 4 capas
 * @readonly
 * @enum {string}
 */
export const ValidationType = {
  /** Capa 1: Ground Truth */
  SOURCE: 'source',
  
  /** Capa 2: Fractal Derivations */
  DERIVATION: 'derivation',
  
  /** Capa 3: Data Flow Semantics */
  SEMANTIC: 'semantic',
  
  /** Capa 4: Cross-Metadata Insights */
  CROSS_METADATA: 'cross-metadata'
};

export default { ValidationSeverity, ValidationType };
