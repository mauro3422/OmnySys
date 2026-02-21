/**
 * Coherence calculation utilities
 * @module extractors/data-flow/core/analyzer/coherence-calculator
 */

/**
 * Calculates overall coherence score (0-100)
 * @param {Array} unusedInputs - Array of unused inputs
 * @param {Array} deadVariables - Array of dead variables
 * @param {number} coverage - Coverage percentage
 * @param {Array} inputs - Array of inputs
 * @param {Array} outputs - Array of outputs
 * @returns {number} - Coherence score (0-100)
 */
export function calculateCoherence(unusedInputs, deadVariables, coverage, inputs, outputs) {
  let score = 100;

  const inputPenalty = unusedInputs.length * 10;
  score -= Math.min(inputPenalty, 30);

  const deadPenalty = deadVariables.length * 5;
  score -= Math.min(deadPenalty, 20);

  if (coverage > 80) score += 10;
  if (coverage > 90) score += 5;

  if (inputs.length === 0 && outputs.length === 0) {
    score = 0;
  }

  return Math.max(0, Math.min(100, score));
}
