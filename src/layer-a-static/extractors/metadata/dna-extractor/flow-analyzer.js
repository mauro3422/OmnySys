/**
 * @fileoverview Flow Analyzer
 * Analyzes data flow patterns and operations
 * 
 * @module layer-a-static/extractors/metadata/dna-extractor/flow-analyzer
 */

/**
 * Operation sets for flow type detection
 */
const READ_OPS = new Set([
  'property_access', 'array_index_access', 'function_call', 
  'await_function_call', 'instantiation'
]);

const TRANSFORM_OPS = new Set([
  'binary_operation', 'unary_operation', 'template_literal', 
  'conditional', 'object_literal', 'array_literal'
]);

const WRITE_OPS = new Set(['mutation', 'update']);

/**
 * Detects data flow type
 * Uses real operation names from the system (property_access, function_call, etc.)
 * @param {Object} dataFlow - Data flow object
 * @returns {string} Flow type
 */
export function detectFlowType(dataFlow) {
  const operations = (dataFlow.transformations || []).map(t => t.operation);

  const hasRead = operations.some(o => READ_OPS.has(o));
  const hasTransform = operations.some(o => TRANSFORM_OPS.has(o));
  const hasWrite = (dataFlow.outputs || []).some(o => o.type === 'side_effect' || o.isSideEffect) ||
                   operations.some(o => WRITE_OPS.has(o));
  const hasReturn = (dataFlow.outputs || []).some(o => o.type === 'return');
  const hasThrowOnly = !hasReturn && (dataFlow.outputs || []).some(o => o.type === 'throw');

  if (hasThrowOnly && !hasWrite) return 'guard';
  if (hasRead && hasTransform && hasWrite && hasReturn) return 'read-transform-persist-return';
  if (hasRead && hasTransform && hasReturn) return 'read-transform-return';
  if (hasRead && hasWrite && hasReturn) return 'read-persist-return';
  if (hasRead && hasWrite) return 'read-persist';
  if (hasTransform && hasReturn) return 'transform-return';
  if (hasRead && hasReturn) return 'read-return';
  if (hasWrite) return 'side-effect-only';
  if (hasReturn) return 'passthrough';

  return 'unknown';
}

/**
 * Extracts operation sequence in order
 * @param {Object} dataFlow - Data flow object
 * @returns {string[]} Operation sequence
 */
export function extractOperationSequence(dataFlow) {
  const sequence = [];

  // Inputs
  if (dataFlow.inputs?.length > 0) {
    sequence.push('receive');
  }

  // Transformations in order
  (dataFlow.transformations || []).forEach(t => {
    sequence.push(t.operation || 'transform');
  });

  // Outputs
  (dataFlow.outputs || []).forEach(o => {
    if (o.type === 'side_effect') sequence.push('emit');
    if (o.type === 'return') sequence.push('return');
  });

  return sequence;
}

/**
 * Computes complexity score (1-10)
 * @param {Object} dataFlow - Data flow object
 * @returns {number} Complexity score
 */
export function computeComplexity(dataFlow) {
  let score = 1;

  // +1 por cada input
  score += (dataFlow.inputs?.length || 0) * 0.5;

  // +1 por cada transformación
  score += (dataFlow.transformations?.length || 0) * 0.8;

  // +1 por cada output
  score += (dataFlow.outputs?.length || 0) * 0.5;

  // +2 si tiene side effects
  if ((dataFlow.outputs || []).some(o => o.type === 'side_effect')) {
    score += 2;
  }

  return Math.min(10, Math.round(score));
}
