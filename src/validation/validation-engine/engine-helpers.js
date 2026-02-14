/**
 * @fileoverview Engine Helpers - Helpers para el ValidationEngine
 * 
 * @module validation-engine/engine-helpers
 */

import { SyntaxValidator, SchemaValidator, SemanticValidator } from './strategies/index.js';
import { ParallelRunner, SequentialRunner } from './runners/index.js';

/**
 * Inicializa estrategias según configuración
 * @param {string[]} enabled
 * @returns {Map}
 */
export function initializeStrategies(enabled) {
  const strategies = new Map();
  if (enabled.includes('syntax')) strategies.set('syntax', new SyntaxValidator());
  if (enabled.includes('schema')) strategies.set('schema', new SchemaValidator());
  if (enabled.includes('semantic')) strategies.set('semantic', new SemanticValidator());
  return strategies;
}

/**
 * Inicializa runner según configuración
 * @param {object} options
 * @returns {BaseValidationRunner}
 */
export function initializeRunner(options) {
  const runnerOptions = { maxConcurrency: options.maxConcurrency };
  return options.parallel 
    ? new ParallelRunner(runnerOptions)
    : new SequentialRunner(runnerOptions);
}

export default { initializeStrategies, initializeRunner };
