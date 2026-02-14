/**
 * @fileoverview patterns.js
 * 
 * Pattern detection in data flows
 * 
 * @module extractors/data-flow/core/data-flow-analyzer/validators/patterns
 */

/**
 * Detecta patrones de flujo
 */
export function detectPatterns(inputs, transformations, outputs) {
  const patterns = [];

  // Pattern: read-transform-persist
  const hasRead = inputs.length > 0;
  const hasTransform = transformations.length > 0;
  const hasPersist = outputs.some(o => 
    o.type === 'side_effect' && o.operation === 'persistence'
  );

  if (hasRead && hasTransform && hasPersist) {
    patterns.push('read-transform-persist');
  }

  // Pattern: pure-function
  const hasSideEffects = outputs.some(o => o.type === 'side_effect');
  if (!hasSideEffects && outputs.some(o => o.type === 'return')) {
    patterns.push('pure-function');
  }

  // Pattern: event-handler
  const emitsEvents = outputs.some(o => 
    o.type === 'side_effect' && o.operation === 'event_emission'
  );
  if (emitsEvents) {
    patterns.push('event-handler');
  }

  // Pattern: validator
  const hasEarlyReturn = outputs.filter(o => o.type === 'return').length > 1;
  if (hasEarlyReturn && inputs.length > 0) {
    patterns.push('validator');
  }

  return patterns;
}

/**
 * Genera sugerencias de mejora
 */
export function generateSuggestions(analysis, inputs, transformations, outputs) {
  const suggestions = [];

  if (analysis.unusedInputs.length > 0) {
    suggestions.push({
      type: 'unused-inputs',
      severity: 'warning',
      message: `${analysis.unusedInputs.length} input(s) not used`,
      suggestion: 'Remove unused parameters or use them in the function'
    });
  }

  if (analysis.deadVariables.length > 0) {
    suggestions.push({
      type: 'dead-code',
      severity: 'info',
      message: `${analysis.deadVariables.length} variable(s) defined but not used`,
      suggestion: 'Remove unused variables to simplify the code'
    });
  }

  if (analysis.coverage < 50) {
    suggestions.push({
      type: 'low-coverage',
      severity: 'warning',
      message: `Data flow coverage is ${analysis.coverage}%`,
      suggestion: 'Review function logic for incomplete data usage'
    });
  }

  const patterns = detectPatterns(inputs, transformations, outputs);
  if (patterns.includes('pure-function')) {
    suggestions.push({
      type: 'pattern-detected',
      severity: 'info',
      message: 'Pure function detected',
      suggestion: 'This function has no side effects - good for testing and memoization'
    });
  }

  return suggestions;
}
