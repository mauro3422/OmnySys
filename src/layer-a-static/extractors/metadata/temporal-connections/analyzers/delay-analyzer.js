/**
 * @fileoverview Delay Analyzer
 * 
 * Analyzes timing delays and categorizes them for:
 * - Performance impact assessment
 * - Race condition detection
 * - Optimization opportunities
 * 
 * @module layer-a-static/extractors/metadata/temporal-connections/analyzers/delay-analyzer
 */

/**
 * Delay category thresholds (in milliseconds)
 * @enum {number}
 */
export const DelayThresholds = {
  IMMEDIATE: 0,
  FAST: 100,
  NORMAL: 1000,
  SLOW: 5000
};

/**
 * Delay impact levels
 * @enum {string}
 */
export const DelayImpact = {
  CRITICAL: 'critical',    // > 5s, blocks user
  HIGH: 'high',            // 1-5s, noticeable delay
  MEDIUM: 'medium',        // 100ms-1s, minor impact
  LOW: 'low',              // 0-100ms, negligible
  NONE: 'none'             // 0ms, immediate execution
};

/**
 * Analyzes delay characteristics
 * @typedef {Object} DelayAnalysis
 * @property {number|'unknown'} delay - Original delay value
 * @property {string} category - Delay category
 * @property {string} impact - Performance impact level
 * @property {string[]} recommendations - Optimization suggestions
 * @property {boolean} isBlocking - Whether delay blocks execution
 */

/**
 * Categorizes a delay value
 * 
 * @param {number|'unknown'} delay - Delay in milliseconds
 * @returns {string} Delay category
 */
export function categorizeDelay(delay) {
  if (delay === 'unknown') return 'unknown';
  if (delay === 0) return 'immediate';
  if (delay <= DelayThresholds.FAST) return 'fast';
  if (delay <= DelayThresholds.NORMAL) return 'normal';
  if (delay <= DelayThresholds.SLOW) return 'slow';
  return 'very-slow';
}

/**
 * Determines the performance impact of a delay
 * 
 * @param {number|'unknown'} delay - Delay in milliseconds
 * @returns {string} Impact level from DelayImpact enum
 */
export function determineImpact(delay) {
  if (delay === 'unknown') return DelayImpact.MEDIUM;
  if (delay === 0) return DelayImpact.NONE;
  if (delay <= DelayThresholds.FAST) return DelayImpact.LOW;
  if (delay <= DelayThresholds.NORMAL) return DelayImpact.MEDIUM;
  if (delay <= DelayThresholds.SLOW) return DelayImpact.HIGH;
  return DelayImpact.CRITICAL;
}

/**
 * Generates optimization recommendations for delays
 * 
 * @param {number|'unknown'} delay - Delay in milliseconds
 * @param {string} context - Usage context (timeout, interval, etc.)
 * @returns {string[]} Array of recommendations
 */
export function getRecommendations(delay, context = 'timeout') {
  const recommendations = [];
  
  if (delay === 'unknown') {
    recommendations.push('Consider specifying explicit delay values');
    return recommendations;
  }
  
  if (context === 'timeout') {
    if (delay === 0) {
      recommendations.push('setTimeout(fn, 0) defers to next tick; consider queueMicrotask for microtask queue');
      recommendations.push('Consider requestAnimationTask for UI updates');
    }
    if (delay > DelayThresholds.SLOW) {
      recommendations.push('Consider breaking long timeout into smaller intervals with progress checks');
      recommendations.push('Evaluate if this delay impacts user experience');
    }
  }
  
  if (context === 'interval') {
    if (delay < 16) {
      recommendations.push('Intervals < 16ms may cause performance issues; consider requestAnimationFrame');
    }
    if (delay > DelayThresholds.NORMAL) {
      recommendations.push('Long intervals may miss time-sensitive updates');
    }
    recommendations.push('Ensure interval is cleared when component unmounts');
  }
  
  return recommendations;
}

/**
 * Analyzes a delay comprehensively
 * 
 * @param {number|'unknown'} delay - Delay in milliseconds
 * @param {string} context - Usage context
 * @returns {DelayAnalysis} Complete delay analysis
 * 
 * @example
 * const analysis = analyzeDelay(5000, 'timeout');
 * // {
 * //   delay: 5000,
 * //   category: 'slow',
 * //   impact: 'high',
 * //   recommendations: [...],
 * //   isBlocking: false
 * // }
 */
export function analyzeDelay(delay, context = 'timeout') {
  const category = categorizeDelay(delay);
  const impact = determineImpact(delay);
  
  return {
    delay,
    category,
    impact,
    recommendations: getRecommendations(delay, context),
    isBlocking: context === 'timeout' && delay !== 'unknown' && delay > 0
  };
}

/**
 * Analyzes multiple delays and finds optimization opportunities
 * 
 * @param {Array<{delay: number|'unknown', context: string}>} delays - Delays to analyze
 * @returns {Object} Aggregate analysis
 */
export function analyzeDelayPatterns(delays) {
  const analyses = delays.map(d => analyzeDelay(d.delay, d.context));
  
  const criticalCount = analyses.filter(a => a.impact === DelayImpact.CRITICAL).length;
  const highCount = analyses.filter(a => a.impact === DelayImpact.HIGH).length;
  const unknownCount = analyses.filter(a => a.delay === 'unknown').length;
  
  return {
    total: delays.length,
    byCategory: groupByCategory(analyses),
    byImpact: groupByImpact(analyses),
    concerns: {
      hasCritical: criticalCount > 0,
      hasHigh: highCount > 0,
      hasUnknown: unknownCount > 0,
      totalConcerns: criticalCount + highCount + unknownCount
    },
    recommendations: generateAggregateRecommendations(analyses)
  };
}

/**
 * Groups analyses by category
 * @param {DelayAnalysis[]} analyses - Delay analyses
 * @returns {Object} Grouped counts
 */
function groupByCategory(analyses) {
  const groups = {};
  for (const analysis of analyses) {
    groups[analysis.category] = (groups[analysis.category] || 0) + 1;
  }
  return groups;
}

/**
 * Groups analyses by impact
 * @param {DelayAnalysis[]} analyses - Delay analyses
 * @returns {Object} Grouped counts
 */
function groupByImpact(analyses) {
  const groups = {};
  for (const analysis of analyses) {
    groups[analysis.impact] = (groups[analysis.impact] || 0) + 1;
  }
  return groups;
}

/**
 * Generates aggregate recommendations
 * @param {DelayAnalysis[]} analyses - Delay analyses
 * @returns {string[]} Unique recommendations
 */
function generateAggregateRecommendations(analyses) {
  const allRecommendations = analyses.flatMap(a => a.recommendations);
  return [...new Set(allRecommendations)];
}
