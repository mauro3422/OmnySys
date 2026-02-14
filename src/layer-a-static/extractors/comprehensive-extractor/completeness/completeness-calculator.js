/**
 * @fileoverview Completeness Calculator - Cálculo de score de completitud
 * 
 * @module comprehensive-extractor/completeness
 */

/**
 * Calculate completeness score
 * 
 * @param {Object} results - Extraction results
 * @returns {number} - Completeness percentage (0-100)
 */
export function calculateCompleteness(results) {
  const weights = {
    basic: 0.1,
    functions: 0.25,
    classes: 0.2,
    imports: 0.2,
    exports: 0.15,
    patterns: 0.1
  };
  
  let score = 0;
  let totalWeight = 0;
  
  for (const [key, weight] of Object.entries(weights)) {
    const data = results[key];
    totalWeight += weight;
    
    if (data && Object.keys(data).length > 0) {
      const hasRealData = Object.values(data).some(v =>
        v !== null &&
        v !== undefined &&
        (Array.isArray(v) ? v.length > 0 : true) &&
        (typeof v === 'object' ? Object.keys(v).length > 0 : true)
      );
      
      if (hasRealData) {
        score += weight;
      }
    }
  }
  
  return totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;
}

/**
 * Determine if LLM analysis is needed
 * 
 * @param {Object} results - Extraction results
 * @param {Function} completenessFn - Function to calculate completeness
 * @returns {boolean} - Whether LLM analysis is recommended
 */
export function shouldNeedLLM(results, completenessFn) {
  const hasComplexClasses = results.classes?.classes?.some(c => 
    c.methods?.length > 10 || c.inheritanceDepth > 2
  );
  
  const hasHighAsyncUsage = results.asyncPatterns?.asyncFunctionCount > 5 ||
                             results.asyncPatterns?.awaitCount > 10;
  
  const hasManyDependencies = results.imports?.metrics?.total > 20;
  
  const lowCompleteness = completenessFn(results) < 50;
  
  return hasComplexClasses || hasHighAsyncUsage || hasManyDependencies || lowCompleteness;
}

/**
 * Count active extractors
 * 
 * @param {Object} results - Extraction results
 * @returns {number} - Count of active extractors
 */
export function countActiveExtractors(results) {
  let count = 0;
  const extractors = ['functions', 'classes', 'imports', 'exports'];
  
  for (const key of extractors) {
    if (results[key]?._metadata?.success) {
      count++;
    }
  }
  
  return count;
}

/**
 * Get extraction quality assessment
 * @param {Object} results 
 * @param {number} completeness 
 * @returns {Object} Quality assessment
 */
export function assessQuality(results, completeness) {
  return {
    level: completeness >= 80 ? 'high' : completeness >= 50 ? 'medium' : 'low',
    completeness,
    issues: completeness < 50 ? ['low_completeness'] : [],
    recommendations: generateRecommendations(results, completeness)
  };
}

/**
 * Generate recommendations based on completeness
 * @param {Object} results 
 * @param {number} completeness 
 * @returns {Array<string>}
 */
function generateRecommendations(results, completeness) {
  const recommendations = [];
  
  if (completeness < 50) {
    recommendations.push('Consider using LLM analysis for better extraction');
  }
  
  if (!results.functions?.totalCount) {
    recommendations.push('No functions detected - verify file content');
  }
  
  return recommendations;
}
