/**
 * @fileoverview Metrics Calculator - Cálculo de métricas derivadas
 * 
 * @module comprehensive-extractor/metrics
 */

/**
 * Calculate derived metrics from extraction results
 * 
 * @param {Object} results - Extraction results
 * @returns {Object} - Calculated metrics
 */
export function calculateMetrics(results) {
  const metrics = {
    totalConstructs: 0,
    complexity: {
      cyclomatic: 0,
      cognitive: 0
    },
    maintainability: {
      score: 0,
      factors: []
    }
  };
  
  // Function metrics
  if (results.functions) {
    metrics.totalConstructs += results.functions.totalCount || 0;
    metrics.complexity.functionCount = results.functions.totalCount || 0;
    metrics.complexity.asyncCount = results.functions.asyncCount || 0;
  }
  
  // Class metrics
  if (results.classes) {
    metrics.totalConstructs += results.classes.count || 0;
    metrics.complexity.classCount = results.classes.count || 0;
    metrics.complexity.inheritanceDepth = results.classes.inheritanceDepth || 0;
  }
  
  // Import metrics
  if (results.imports) {
    metrics.dependencies = results.imports.metrics || {};
    metrics.hasDynamicImports = results.imports.dynamicImports?.length > 0;
  }
  
  // Export metrics
  if (results.exports) {
    metrics.publicAPI = results.exports.metrics?.publicAPI || [];
    metrics.hasDefaultExport = results.exports.patterns?.hasDefaultExport || false;
  }
  
  // Calculate maintainability score
  metrics.maintainability.score = calculateMaintainabilityScore(metrics);
  
  return metrics;
}

/**
 * Calculate maintainability score (0-100)
 * @param {Object} metrics - Calculated metrics
 * @returns {number} Score 0-100
 */
function calculateMaintainabilityScore(metrics) {
  let score = 100;
  
  // Penalize high complexity
  const functionCount = metrics.complexity?.functionCount || 0;
  if (functionCount > 20) score -= 10;
  if (functionCount > 50) score -= 20;
  
  // Penalize deep inheritance
  const inheritanceDepth = metrics.complexity?.inheritanceDepth || 0;
  if (inheritanceDepth > 2) score -= 10;
  if (inheritanceDepth > 4) score -= 20;
  
  // Penalize many dependencies
  const dependencyCount = metrics.dependencies?.total || 0;
  if (dependencyCount > 10) score -= 5;
  if (dependencyCount > 30) score -= 15;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate complexity score
 * @param {Object} results - Extraction results
 * @returns {number} Complexity score
 */
export function calculateComplexityScore(results) {
  let score = 0;
  
  // Function complexity
  if (results.functions?.functions) {
    for (const fn of results.functions.functions) {
      score += fn.params?.length || 0;
      score += fn.async ? 1 : 0;
    }
  }
  
  // Class complexity
  if (results.classes?.classes) {
    for (const cls of results.classes.classes) {
      score += cls.methods?.length || 0;
      score += cls.properties?.length || 0;
    }
  }
  
  return score;
}
