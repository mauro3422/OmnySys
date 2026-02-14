/**
 * @fileoverview Rules Module - Registry and Validation Rules
 * 
 * @module validation/core/rules
 * @version 0.9.4 - Modularizado
 */

export { ValidationRule } from './ValidationRule.js';
export { RuleRegistry } from './RuleRegistry.js';
export { getGlobalRegistry, resetGlobalRegistry, createRule } from './utils/global-registry.js';

export { default } from './RuleRegistry.js';
