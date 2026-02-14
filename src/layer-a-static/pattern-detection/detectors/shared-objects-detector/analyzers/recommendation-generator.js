/**
 * @fileoverview Recommendation Generator
 * 
 * Generates recommendations based on risk profile
 * 
 * @module shared-objects-detector/analyzers/recommendation-generator
 */

/**
 * Generate recommendation for an object
 * @param {Object} obj - Object with riskProfile
 * @returns {string} Recommendation
 */
export function generateRecommendation(obj) {
  if (obj.riskProfile.type === 'state') {
    return `Consider using Redux, Zustand, or Context API for "${obj.name}"`;
  }
  if (obj.riskProfile.type === 'potential_state') {
    return `Review if "${obj.name}" should be immutable or use state management`;
  }
  return `Monitor usage of "${obj.name}"`;
}

/**
 * Calculate score based on findings
 * @param {Array} findings - Detection findings
 * @returns {number} Score (0-100)
 */
export function calculateScore(findings) {
  if (findings.length === 0) return 100;
  
  const critical = findings.filter(f => f.severity === 'critical').length;
  const high = findings.filter(f => f.severity === 'high').length;
  const medium = findings.filter(f => f.severity === 'medium').length;
  
  let penalty = critical * 15 + high * 8 + medium * 3;
  return Math.max(0, 100 - penalty);
}
