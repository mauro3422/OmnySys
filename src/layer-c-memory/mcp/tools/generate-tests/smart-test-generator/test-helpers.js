/**
 * Test helpers and metrics
 * @module mcp/tools/generate-tests/smart-test-generator/test-helpers
 */

/**
 * Cuenta tests en el código generado
 * @param {string} code - Generated test code
 * @returns {number} - Test count
 */
export function countTests(code) {
  const matches = code.match(/it\(/g);
  return matches ? matches.length : 0;
}

/**
 * Genera recomendaciones basadas en el análisis
 * @param {Array} methods - Instance methods
 * @param {Array} staticMethods - Static methods
 * @param {string} className - Class name
 * @returns {Array} - Array of recommendations
 */
export function generateRecommendations(methods, staticMethods, className) {
  const recommendations = [];
  
  if (methods.length > 20) {
    recommendations.push(`⚠️ Class has ${methods.length} methods - consider splitting into smaller builders`);
  }
  
  if (!methods.some(m => m.name === 'build')) {
    recommendations.push(`⚠️ No 'build' method found - may not be a builder pattern`);
  }
  
  if (staticMethods.length === 0) {
    recommendations.push(`💡 Consider adding static factory methods (e.g., ${className}.create())`);
  }
  
  return recommendations;
}
