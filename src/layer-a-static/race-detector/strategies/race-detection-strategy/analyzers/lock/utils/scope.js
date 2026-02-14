/**
 * @fileoverview Scope Utilities
 * @module race-detector/strategies/race-detection-strategy/analyzers/lock/utils/scope
 */

/**
 * Determina el scope del lock desde el contexto
 * @param {string} lockName - Nombre del lock
 * @param {string} context - Contexto de código
 * @returns {string} - Scope (global, instance, local)
 */
export function determineScope(lockName, context) {
  if (context.includes('static') || context.includes('global')) {
    return 'global';
  }
  if (context.includes('this.') || context.includes('self.')) {
    return 'instance';
  }
  return 'local';
}
