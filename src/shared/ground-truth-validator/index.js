/**
 * @fileoverview Ground Truth Validator Module
 * 
 * Sistema modular de validación Ground Truth.
 * 
 * @module ground-truth-validator
 * @version 2.0.0
 */

// Core
export { ValidationEngine, validateGroundTruth } from './validation-engine.js';
export { ValidationContext } from './utils/validation-context.js';
export { ValidationResult, ReportGenerator } from './reports/validation-report.js';

// Validators
export { BaseValidator } from './validators/base-validator.js';
export { AtomValidator } from './validators/atom-validator.js';
export { CallGraphValidator } from './validators/call-graph-validator.js';
