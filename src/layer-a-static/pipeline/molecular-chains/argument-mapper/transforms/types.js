/**
 * @fileoverview Transform type definitions
 * @module molecular-chains/argument-mapper/transforms/types
 */

/**
 * @typedef {Object} TransformResult
 * @property {string} type - Transform type
 * @property {string} description - Human-readable description
 * @property {string} [from] - Source object (for PROPERTY_ACCESS)
 * @property {string} [property] - Property name (for PROPERTY_ACCESS)
 * @property {string} [call] - Callee name (for CALL_RESULT)
 * @property {*} [value] - Literal value (for LITERAL)
 * @property {string} [source] - Source name (for SPREAD)
 */

/**
 * Transform types enum
 * @readonly
 * @enum {string}
 */
export const TransformType = {
  PROPERTY_ACCESS: 'PROPERTY_ACCESS',
  DIRECT_PASS: 'DIRECT_PASS',
  CALL_RESULT: 'CALL_RESULT',
  LITERAL: 'LITERAL',
  SPREAD: 'SPREAD',
  UNKNOWN: 'UNKNOWN'
};

export default TransformType;
