/**
 * @fileoverview Confidence calculation
 * @module molecular-chains/argument-mapper/utils/confidence
 */

/**
 * Calculates mapping confidence
 * @param {Object} arg - Argument object
 * @param {Object} param - Parameter object
 * @returns {number} Confidence score (0-1)
 */
export function calculateConfidence(arg, param) {
  let confidence = 0.5;

  // +0.3 if we have matching type information
  if (arg.dataType && param.dataType && arg.dataType === param.dataType) {
    confidence += 0.3;
  }

  // +0.2 if it's property access (very common and clear)
  if (arg.type === 'MemberExpression') {
    confidence += 0.2;
  }

  // +0.1 if it's direct pass
  if (arg.name === param.name) {
    confidence += 0.1;
  }

  // -0.2 if it's spread or complex destructuring
  if (arg.type === 'SpreadElement' || param.type === 'destructured') {
    confidence -= 0.2;
  }

  return Math.min(Math.max(confidence, 0), 1);
}

export default calculateConfidence;
