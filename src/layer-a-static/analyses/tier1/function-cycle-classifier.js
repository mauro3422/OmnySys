/**
 * @fileoverview function-cycle-classifier.js
 * 
 * 🔄 LEGACY WRAPPER - Maintained for backward compatibility
 * 
 * This file is a thin wrapper around the new modular structure.
 * New code should import from './function-cycle-classifier/index.js' directly.
 * 
 * @deprecated Use './function-cycle-classifier/index.js' instead
 * @module analyses/tier1/function-cycle-classifier
 */

export {
  classifyFunctionCycle,
  classifyAllFunctionCycles,
  FUNCTION_CYCLE_RULES,
  extractFunctionMetadata
} from './function-cycle-classifier/index.js';

export { default } from './function-cycle-classifier/index.js';
