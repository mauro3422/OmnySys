/**
 * @fileoverview Flow Analyzer
 * Analyzes data flow patterns and operations
 * 
 * @module layer-a-static/extractors/metadata/dna-extractor/flow-analyzer
 */

import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:FlowAnalyzer');

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
  // Validate input
  if (!dataFlow || typeof dataFlow !== 'object') {
    logger.debug('detectFlowType: Invalid or null dataFlow provided');
    return 'unknown';
  }

  try {
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
    if (hasTransform && hasWrite && hasReturn) return 'transform-persist-return';
    if (hasRead && hasTransform && hasWrite) return 'read-transform-persist';
    if (hasRead && hasWrite) return 'read-persist';
    if (hasTransform && hasWrite) return 'transform-persist';
    if (hasTransform && hasReturn) return 'transform-return';
    if (hasRead && hasReturn) return 'read-return';
    if (hasWrite) return 'side-effect-only';
    if (hasReturn) return 'passthrough';
    if (hasTransform) return 'transform-only';
    if (hasRead) return 'read-only';
    if (!hasRead && !hasTransform && !hasWrite && !hasReturn) return 'noop';

    return 'unknown';
  } catch (error) {
    logger.warn(`detectFlowType: Error analyzing data flow - ${error.message}`);
    return 'unknown';
  }
}

/**
 * Extracts operation sequence in order
 * @param {Object} dataFlow - Data flow object
 * @returns {string[]} Operation sequence
 */
export function extractOperationSequence(dataFlow) {
  if (!dataFlow || typeof dataFlow !== 'object') {
    logger.debug('extractOperationSequence: Invalid or null dataFlow provided');
    return [];
  }

  try {
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
  } catch (error) {
    logger.warn(`extractOperationSequence: Error extracting sequence - ${error.message}`);
    return [];
  }
}

/**
 * Computes complexity score (1-10)
 * @param {Object} dataFlow - Data flow object
 * @returns {number} Complexity score
 */
export function computeComplexity(dataFlow) {
  if (!dataFlow || typeof dataFlow !== 'object') {
    logger.debug('computeComplexity: Invalid or null dataFlow provided');
    return 1;
  }

  try {
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
  } catch (error) {
    logger.warn(`computeComplexity: Error computing complexity - ${error.message}`);
    return 1;
  }
}
