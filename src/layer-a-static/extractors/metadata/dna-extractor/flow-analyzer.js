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
 * Rule set para detectar flow type basado en flags booleanos.
 * Cada regla tiene un patrón y un tipo de retorno.
 * El orden importa: la primera coincidencia gana.
 */
const FLOW_TYPE_RULES = [
  { pattern: ({ throwOnly, write }) => throwOnly && !write, type: 'guard' },
  { pattern: ({ read, transform, write, ret }) => read && transform && write && ret, type: 'read-transform-persist-return' },
  { pattern: ({ read, transform, ret }) => read && transform && ret, type: 'read-transform-return' },
  { pattern: ({ read, write, ret }) => read && write && ret, type: 'read-persist-return' },
  { pattern: ({ transform, write, ret }) => transform && write && ret, type: 'transform-persist-return' },
  { pattern: ({ read, transform, write }) => read && transform && write, type: 'read-transform-persist' },
  { pattern: ({ read, write }) => read && write, type: 'read-persist' },
  { pattern: ({ transform, write }) => transform && write, type: 'transform-persist' },
  { pattern: ({ transform, ret }) => transform && ret, type: 'transform-return' },
  { pattern: ({ read, ret }) => read && ret, type: 'read-return' },
  { pattern: ({ write }) => write, type: 'side-effect-only' },
  { pattern: ({ ret }) => ret, type: 'passthrough' },
  { pattern: ({ transform }) => transform, type: 'transform-only' },
  { pattern: ({ read }) => read, type: 'read-only' },
  { pattern: ({ read, transform, write, ret }) => !read && !transform && !write && !ret, type: 'noop' }
];

function classifyFlowType(flags) {
  const rule = FLOW_TYPE_RULES.find(r => r.pattern(flags));
  return rule ? rule.type : 'unknown';
}

function analyzeFlowFlags(dataFlow, operations) {
  return {
    read: operations.some(o => READ_OPS.has(o)),
    transform: operations.some(o => TRANSFORM_OPS.has(o)),
    write: (dataFlow.outputs || []).some(o => o.type === 'side_effect' || o.isSideEffect) ||
      operations.some(o => WRITE_OPS.has(o)),
    ret: (dataFlow.outputs || []).some(o => o.type === 'return'),
    throwOnly: !(dataFlow.outputs || []).some(o => o.type === 'return') &&
      (dataFlow.outputs || []).some(o => o.type === 'throw')
  };
}

/**
 * Detects data flow type
 * Uses real operation names from the system (property_access, function_call, etc.)
 * @param {Object} dataFlow - Data flow object
 * @returns {string} Flow type
 */
export function detectFlowType(dataFlow) {
  if (!dataFlow || typeof dataFlow !== 'object') {
    logger.debug('detectFlowType: Invalid or null dataFlow provided');
    return 'unknown';
  }

  try {
    const operations = (dataFlow.transformations || []).map(t => t.operation);
    const flags = analyzeFlowFlags(dataFlow, operations);
    return classifyFlowType(flags);
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
