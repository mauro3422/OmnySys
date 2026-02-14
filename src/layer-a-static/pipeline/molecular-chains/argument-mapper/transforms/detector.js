/**
 * @fileoverview Transform detection logic
 * @module molecular-chains/argument-mapper/transforms/detector
 */

import { TransformType } from './types.js';

/**
 * Detects what transformation is applied to an argument
 * @param {Object} arg - Argument object
 * @param {Object} param - Parameter object
 * @returns {Object} Transform description
 */
export function detectTransform(arg, param) {
  // Case 1: Property access
  // order.items → items (accessing property)
  if (arg.type === 'MemberExpression') {
    return {
      type: TransformType.PROPERTY_ACCESS,
      from: arg.object?.name || arg.object,
      property: arg.property?.name || arg.property,
      description: `${arg.object?.name}.${arg.property} → ${param.name}`
    };
  }

  // Case 2: Direct pass
  // order → order (no transformation)
  if (arg.name === param.name || 
      (arg.variable && arg.variable === param.name)) {
    return {
      type: TransformType.DIRECT_PASS,
      description: `${arg.name} → ${param.name}`
    };
  }

  // Case 3: Expression
  // calculateSubtotal(order) → items (expression result)
  if (arg.type === 'CallExpression') {
    return {
      type: TransformType.CALL_RESULT,
      call: arg.callee,
      description: `${arg.callee}() → ${param.name}`
    };
  }

  // Case 4: Literal
  // 100 → amount
  if (arg.type === 'Literal') {
    return {
      type: TransformType.LITERAL,
      value: arg.value,
      description: `${arg.value} → ${param.name}`
    };
  }

  // Case 5: Spread
  // ...args → params
  if (arg.type === 'SpreadElement') {
    return {
      type: TransformType.SPREAD,
      source: arg.argument?.name,
      description: `...${arg.argument?.name} → ${param.name}`
    };
  }

  // Default
  return {
    type: TransformType.UNKNOWN,
    description: `[${arg.type}] → ${param.name}`
  };
}

export default detectTransform;
