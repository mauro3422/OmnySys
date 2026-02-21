/**
 * Data flow metrics calculation utilities
 * @module extractors/data-flow/core/analyzer/metrics-calculator
 */

import { findUnusedInputs } from './input-analyzer.js';

/**
 * Calculates flow coverage
 * @param {Array} inputs - Array of inputs
 * @param {Array} transformations - Array of transformations
 * @param {Array} outputs - Array of outputs
 * @returns {number} - Coverage percentage (0-100)
 */
export function calculateCoverage(inputs, transformations, outputs) {
  if (inputs.length === 0 && transformations.length === 0 && outputs.length === 0) {
    return 0;
  }

  const unusedCount = findUnusedInputs(inputs, transformations, outputs).length;
  const totalInputs = inputs.length || 1;
  const inputCoverage = ((totalInputs - unusedCount) / totalInputs) * 100;

  const hasOutput = outputs.length > 0;
  const outputScore = hasOutput ? 100 : 0;

  const hasFlow = transformations.length > 0;
  const flowScore = hasFlow ? 100 : 0;

  return Math.round((inputCoverage * 0.4 + outputScore * 0.3 + flowScore * 0.3) * 100) / 100;
}

/**
 * Calculates input usage rate
 * @param {number} total - Total number of inputs
 * @param {number} unused - Number of unused inputs
 * @returns {number} - Usage rate percentage
 */
export function calculateUsageRate(total, unused) {
  if (total === 0) return 100;
  return Math.round(((total - unused) / total) * 100 * 100) / 100;
}

/**
 * Calculates transformation productivity
 * @param {Array} transformations - Array of transformations
 * @param {Array} outputs - Array of outputs
 * @returns {number} - Productivity percentage
 */
export function calculateProductivity(transformations, outputs) {
  if (transformations.length === 0) return 0;

  const productiveTransforms = transformations.filter(t => {
    return outputs.some(o => 
      o.sources?.includes(t.to) || 
      o.value?.includes(t.to)
    );
  });

  return Math.round((productiveTransforms.length / transformations.length) * 100 * 100) / 100;
}

/**
 * Calculates output diversity
 * @param {Array} outputs - Array of outputs
 * @returns {number} - Diversity score (0-100)
 */
export function calculateOutputDiversity(outputs) {
  if (outputs.length === 0) return 0;

  const types = new Set(outputs.map(o => o.type));
  const operations = new Set(outputs.map(o => o.operation));

  const typeScore = types.size * 20;
  const operationScore = operations.size * 10;

  return Math.min(100, typeScore + operationScore);
}
