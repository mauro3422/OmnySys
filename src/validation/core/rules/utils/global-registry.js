/**
 * @fileoverview Global Registry Singleton Utilities
 * @module validation/core/rules/utils/global-registry
 */

import { RuleRegistry } from '../RuleRegistry.js';
import { ValidationRule } from '../ValidationRule.js';

let globalRegistry = null;

/**
 * Obtiene el registro global singleton
 */
export function getGlobalRegistry() {
  if (!globalRegistry) {
    globalRegistry = new RuleRegistry();
  }
  return globalRegistry;
}

/**
 * Reinicia el registro global
 */
export function resetGlobalRegistry() {
  globalRegistry = new RuleRegistry();
  return globalRegistry;
}

/**
 * Helper para crear reglas rápidamente
 */
export function createRule(config) {
  return new ValidationRule(config);
}
