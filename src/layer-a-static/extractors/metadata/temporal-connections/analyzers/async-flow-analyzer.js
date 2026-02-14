/**
 * @fileoverview Async Flow Analyzer
 * 
 * Analyzes async/await and Promise patterns for:
 * - Race condition detection
 * - Deadlock potential
 * - Performance optimization opportunities
 * - Error handling coverage
 * 
 * @module layer-a-static/extractors/metadata/temporal-connections/analyzers/async-flow-analyzer
 */

/**
 * Async flow analysis result
 * @typedef {Object} AsyncFlowAnalysis
 * @property {string} pattern - Detected pattern type
 * @property {string} riskLevel - 'low' | 'medium' | 'high'
 * @property {string[]} concerns - Potential issues
 * @property {string[]} recommendations - Suggested improvements
 */

/**
 * Risk levels for async patterns
 * @enum {string}
 */
export const RiskLevel = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

/**
 * Analyzes Promise.all usage for potential issues
 * 
 * @param {Object} parallelOp - Parallel operation from detector
 * @param {string} code - Source context
 * @returns {AsyncFlowAnalysis} Analysis result
 */
export function analyzePromiseAll(parallelOp, code = '') {
  const concerns = [];
  const recommendations = [];
  
  // Check for empty arrays
  if (parallelOp.parallelCalls === 0) {
    concerns.push('Promise.all with empty array is a no-op');
    recommendations.push('Remove unnecessary Promise.all calls');
  }
  
  // Check for single promise (inefficient)
  if (parallelOp.parallelCalls === 1) {
    concerns.push('Promise.all with single promise is unnecessary overhead');
    recommendations.push('Use await directly for single promises');
  }
  
  // Check for error handling
  const hasCatch = code.includes('.catch(') || /try\s*\{[\s\S]*?await\s+Promise\.all/.test(code);
  if (!hasCatch) {
    concerns.push('Promise.all without error handling may cause unhandled rejections');
    recommendations.push('Add .catch() or wrap in try/catch');
  }
  
  // Check for very high parallelism
  if (parallelOp.parallelCalls > 10) {
    concerns.push(`High parallelism (${parallelOp.parallelCalls}) may overwhelm resources`);
    recommendations.push('Consider batching with p-map or similar');
  }
  
  return {
    pattern: 'Promise.all',
    riskLevel: concerns.length > 1 ? RiskLevel.HIGH : concerns.length > 0 ? RiskLevel.MEDIUM : RiskLevel.LOW,
    concerns,
    recommendations
  };
}

/**
 * Analyzes Promise.race usage
 * 
 * @param {Object} raceOp - Race operation from detector
 * @param {string} code - Source context
 * @returns {AsyncFlowAnalysis} Analysis result
 */
export function analyzePromiseRace(raceOp, code = '') {
  const concerns = [];
  const recommendations = [];
  
  concerns.push('Promise.race ignores results of slower promises');
  recommendations.push('Ensure slower promises are properly cleaned up');
  
  // Check for timeout pattern (common and valid use case)
  const hasTimeout = /setTimeout|timeout/i.test(code);
  if (!hasTimeout) {
    concerns.push('Promise.race without timeout may hang indefinitely');
    recommendations.push('Consider adding a timeout promise');
  }
  
  return {
    pattern: 'Promise.race',
    riskLevel: RiskLevel.MEDIUM,
    concerns,
    recommendations
  };
}

/**
 * Analyzes sequential await patterns
 * 
 * @param {Object} sequentialOp - Sequential operation from detector
 * @returns {AsyncFlowAnalysis} Analysis result
 */
export function analyzeSequentialAwaits(sequentialOp) {
  const concerns = [];
  const recommendations = [];
  
  if (sequentialOp.count > 5) {
    concerns.push(`Many sequential awaits (${sequentialOp.count}) may indicate waterfall pattern`);
    recommendations.push('Check if operations are truly dependent; consider Promise.all for independent ops');
  }
  
  if (sequentialOp.count > 3) {
    recommendations.push('Sequential operations add latency; total time = sum of all operations');
  }
  
  return {
    pattern: 'sequential-awaits',
    riskLevel: sequentialOp.count > 5 ? RiskLevel.HIGH : sequentialOp.count > 3 ? RiskLevel.MEDIUM : RiskLevel.LOW,
    concerns,
    recommendations,
    metrics: {
      sequentialCount: sequentialOp.count,
      estimatedLatency: 'depends on individual operation times'
    }
  };
}

/**
 * Analyzes promise chain patterns
 * 
 * @param {Object} chainOp - Chain operation from detector
 * @param {string} code - Source context
 * @returns {AsyncFlowAnalysis} Analysis result
 */
export function analyzePromiseChain(chainOp, code = '') {
  const concerns = [];
  const recommendations = [];
  
  // Check for error handling
  const hasCatch = code.includes('.catch(');
  const hasFinally = code.includes('.finally(');
  
  if (!hasCatch) {
    concerns.push('Promise chain without .catch() may have unhandled rejections');
    recommendations.push('Add .catch() for error handling');
  }
  
  if (chainOp.count > 4) {
    concerns.push('Long promise chains may be hard to debug');
    recommendations.push('Consider async/await for better readability');
  }
  
  return {
    pattern: 'promise-chain',
    riskLevel: !hasCatch ? RiskLevel.HIGH : chainOp.count > 4 ? RiskLevel.MEDIUM : RiskLevel.LOW,
    concerns,
    recommendations,
    metrics: {
      chainLength: chainOp.count,
      hasErrorHandling: hasCatch,
      hasCleanup: hasFinally
    }
  };
}

/**
 * Comprehensive async flow analysis
 * 
 * @param {Object} promisePatterns - Patterns from PromiseDetector
 * @param {string} code - Source code
 * @returns {Object} Complete flow analysis
 */
export function analyzeAsyncFlow(promisePatterns, code = '') {
  const analyses = [];
  
  // Analyze parallel operations
  for (const op of promisePatterns.parallelOperations || []) {
    if (op.type === 'Promise.all' || op.type === 'await-Promise.all') {
      analyses.push(analyzePromiseAll(op, code));
    }
    if (op.type === 'Promise.race') {
      analyses.push(analyzePromiseRace(op, code));
    }
  }
  
  // Analyze sequential operations
  for (const op of promisePatterns.sequentialOperations || []) {
    if (op.type === 'sequential-awaits') {
      analyses.push(analyzeSequentialAwaits(op));
    }
    if (op.type === 'promise-chain') {
      analyses.push(analyzePromiseChain(op, code));
    }
  }
  
  // Overall assessment
  const riskLevels = analyses.map(a => a.riskLevel);
  const overallRisk = riskLevels.includes(RiskLevel.HIGH) ? RiskLevel.HIGH :
                      riskLevels.includes(RiskLevel.MEDIUM) ? RiskLevel.MEDIUM :
                      RiskLevel.LOW;
  
  return {
    overallRisk,
    analyses,
    summary: {
      totalPatterns: analyses.length,
      highRisk: analyses.filter(a => a.riskLevel === RiskLevel.HIGH).length,
      mediumRisk: analyses.filter(a => a.riskLevel === RiskLevel.MEDIUM).length,
      lowRisk: analyses.filter(a => a.riskLevel === RiskLevel.LOW).length
    },
    allRecommendations: [...new Set(analyses.flatMap(a => a.recommendations))]
  };
}

/**
 * Detects potential race conditions between operations
 * 
 * @param {Array} atoms - Function atoms with temporal data
 * @returns {Array} Potential race conditions
 */
export function detectRaceConditions(atoms) {
  const races = [];
  
  // Group by lifecycle phase
  const byPhase = {};
  for (const atom of atoms) {
    const hooks = atom.temporal?.lifecycleHooks || [];
    for (const hook of hooks) {
      if (!byPhase[hook.phase]) byPhase[hook.phase] = [];
      byPhase[hook.phase].push({ atom, hook });
    }
  }
  
  // Check each phase for potential races
  for (const [phase, items] of Object.entries(byPhase)) {
    if (items.length > 1) {
      // Multiple operations in same phase
      const parallelOps = items.filter(item => 
        item.atom.temporal?.asyncPatterns?.parallelOperations?.length > 0
      );
      
      if (parallelOps.length > 1) {
        races.push({
          phase,
          type: 'lifecycle-parallel-conflict',
          participants: parallelOps.map(p => p.atom.id),
          description: `Multiple parallel operations in ${phase} phase may conflict`
        });
      }
    }
  }
  
  return races;
}
