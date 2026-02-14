/**
 * @fileoverview usage.js
 * 
 * Usage and productivity metrics
 * 
 * @module extractors/data-flow/core/data-flow-analyzer/metrics/usage
 */

/**
 * Calcula tasa de uso de inputs
 */
export function calculateUsageRate(total, unused) {
  if (total === 0) return 100;
  return Math.round(((total - unused) / total) * 100 * 100) / 100;
}

/**
 * Calcula productividad de transformaciones
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
 * Calcula diversidad de outputs
 */
export function calculateOutputDiversity(outputs) {
  if (outputs.length === 0) return 0;

  const types = new Set(outputs.map(o => o.type));
  const operations = new Set(outputs.map(o => o.operation));

  const typeScore = types.size * 20;
  const operationScore = operations.size * 10;

  return Math.min(100, typeScore + operationScore);
}
