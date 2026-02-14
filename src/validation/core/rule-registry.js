/**
 * @fileoverview Rule Registry (Legacy Entry Point)
 * 
 * @deprecated Use ./rules/index.js directly
 * 
 * This file re-exports from the modular structure for backward compatibility.
 * 
 * @module validation/core/rule-registry
 * @version 0.9.4 - Modularizado
 */

export {
  ValidationRule,
  RuleRegistry,
  getGlobalRegistry,
  resetGlobalRegistry,
  createRule
} from './rules/index.js';

export { default } from './rules/index.js';
