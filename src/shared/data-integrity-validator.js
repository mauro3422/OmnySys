/**
 * @fileoverview Data Integrity Validator - Backward Compatibility Layer
 * 
 * This file provides backward compatibility for the refactored module.
 * All functionality has been moved to the modular architecture.
 * 
 * @deprecated Use './data-integrity-validator/index.js' instead
 * @module shared/data-integrity-validator
 */

import {
  DataIntegrityValidator,
  validateDataIntegrity,
  benchmarkValidation,
  ValidationResult,
  SummaryReporter,
  DataLoader,
  OrphanChecker,
  AtomValidator,
  MoleculeValidator,
  CrossReferenceValidator,
  DerivationValidator
} from './data-integrity-validator/index.js';

// Re-export all public APIs for backward compatibility
export {
  DataIntegrityValidator,
  validateDataIntegrity,
  benchmarkValidation,
  ValidationResult,
  SummaryReporter,
  DataLoader,
  OrphanChecker,
  AtomValidator,
  MoleculeValidator,
  CrossReferenceValidator,
  DerivationValidator
};

export default DataIntegrityValidator;
