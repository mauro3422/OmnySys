/**
 * Pattern detection utilities for data flow analysis
 * @module extractors/data-flow/core/analyzer/pattern-detector
 */

/**
 * Detects flow patterns
 * @param {Array} inputs - Array of inputs
 * @param {Array} transformations - Array of transformations
 * @param {Array} outputs - Array of outputs
 * @returns {string[]} - Array of detected patterns
 */
export function detectPatterns(inputs, transformations, outputs) {
  const patterns = [];

  const hasRead = inputs.length > 0;
  const hasTransform = transformations.length > 0;
  const hasPersist = outputs.some(o => 
    o.type === 'side_effect' && o.operation === 'persistence'
  );

  if (hasRead && hasTransform && hasPersist) {
    patterns.push('read-transform-persist');
  }

  const hasSideEffects = outputs.some(o => o.type === 'side_effect');
  if (!hasSideEffects && outputs.some(o => o.type === 'return')) {
    patterns.push('pure-function');
  }

  const emitsEvents = outputs.some(o => 
    o.type === 'side_effect' && o.operation === 'event_emission'
  );
  if (emitsEvents) {
    patterns.push('event-handler');
  }

  const hasEarlyReturn = outputs.filter(o => o.type === 'return').length > 1;
  if (hasEarlyReturn && inputs.length > 0) {
    patterns.push('validator');
  }

  return patterns;
}

/**
 * Generates improvement suggestions based on analysis
 * @param {Object} analysis - Analysis result with unusedInputs, deadVariables, coverage
 * @param {Function} detectPatternsFn - Function to detect patterns
 * @param {Array} inputs - Array of inputs
 * @param {Array} outputs - Array of outputs
 * @returns {Array} - Array of suggestion objects
 */
export function generateSuggestions(analysis, detectPatternsFn, inputs, outputs) {
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

  const patterns = detectPatternsFn(inputs, [], outputs);
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
