/**
 * @fileoverview Validation Result - Backward Compatibility Wrapper
 * 
 * @deprecated Use ./results/index.js directly
 * This file is kept for backward compatibility only.
 * 
 * @module validation/core/validation-result
 */

// Re-export everything from the new modular structure
export {
  ValidationSeverity,
  ValidationType,
  ValidationResult,
  ValidationReport,
  createReport
} from './results/index.js';

// Default export for backward compatibility
export { default } from './results/index.js';
