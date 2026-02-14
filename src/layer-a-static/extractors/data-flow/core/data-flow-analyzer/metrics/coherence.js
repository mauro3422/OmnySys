/**
 * @fileoverview coherence.js
 * 
 * Coherence and coverage metrics
 * 
 * @module extractors/data-flow/core/data-flow-analyzer/metrics/coherence
 */

/**
 * Calcula coherencia general (0-100)
 */
export function calculateCoherence(unusedInputs, deadVariables, coverage, inputs, outputs) {
  let score = 100;

  // Penalizar inputs no usados
  const inputPenalty = unusedInputs.length * 10;
  score -= Math.min(inputPenalty, 30);

  // Penalizar variables muertas
  const deadPenalty = deadVariables.length * 5;
  score -= Math.min(deadPenalty, 20);

  // Bonus por buena cobertura
  if (coverage > 80) score += 10;
  if (coverage > 90) score += 5;

  // Penalizar flujos vacíos
  if (inputs.length === 0 && outputs.length === 0) {
    score = 0;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calcula cobertura del flujo
 */
export function calculateCoverage(inputs, transformations, outputs, unusedInputs) {
  if (inputs.length === 0 && transformations.length === 0 && outputs.length === 0) {
    return 0;
  }

  const unusedCount = unusedInputs?.length || 0;
  const totalInputs = inputs.length || 1;
  const inputCoverage = ((totalInputs - unusedCount) / totalInputs) * 100;

  const hasOutput = outputs.length > 0;
  const outputScore = hasOutput ? 100 : 0;

  const hasFlow = transformations.length > 0;
  const flowScore = hasFlow ? 100 : 0;

  return Math.round((inputCoverage * 0.4 + outputScore * 0.3 + flowScore * 0.3) * 100) / 100;
}
