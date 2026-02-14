/**
 * @fileoverview Lineage Validator - Valida que los metadatos tengan sentido para lineage
 * 
 * SSOT: Única fuente de validación de metadatos para Shadow Registry.
 * Garantiza que solo metadatos válidos y coherentes entren al sistema.
 * 
 * @module layer-b-semantic/validators/lineage-validator
 * @deprecated Use modular version: lineage-validator/index.js
 */

// Re-export from modular version for backward compatibility
export {
  validateForLineage,
  validateDataFlow,
  validateCoherence,
  validateSemantic,
  validateShadow,
  validateMatch,
  calculateConfidence,
  extractMetadata
} from './lineage-validator/index.js';
