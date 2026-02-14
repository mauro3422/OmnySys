/**
 * @fileoverview Impact Score Calculator
 * 
 * Calculates overall performance impact score based on
 * complexity, expensive operations, and resource usage.
 * 
 * @module performance-impact/metrics/impact-calculator
 */

/**
 * Weight configuration for impact calculation
 * @const {Object}
 */
const WEIGHTS = {
  complexity: {
    cyclomaticHigh: 0.2,
    cyclomaticVeryHigh: 0.2,
    quadratic: 0.2,
    exponential: 0.4
  },
  operations: {
    nestedLoop: 0.1,
    recursion: 0.2,
    heavyCall: 0.05
  },
  resources: {
    network: 0.15,
    memoryHigh: 0.15,
    dom: 0.1
  }
};

/**
 * Calculates performance impact scores
 * 
 * @class ImpactCalculator
 */
export class ImpactCalculator {
  /**
   * Calculates overall impact score (0-1)
   * 
   * @param {Object} metrics - Performance metrics
   * @param {Object} metrics.complexity - Complexity metrics
   * @param {Object} metrics.expensiveOps - Expensive operations
   * @param {Object} metrics.resources - Resource usage
   * @returns {number} Impact score between 0 and 1
   */
  calculate(metrics) {
    let score = 0;

    score += this._calculateComplexityImpact(metrics.complexity);
    score += this._calculateOperationsImpact(metrics.expensiveOps);
    score += this._calculateResourceImpact(metrics.resources);

    return Math.min(score, 1);
  }

  /**
   * Calculates complexity contribution to score
   * @private
   * @param {Object} complexity - Complexity metrics
   * @returns {number} Complexity impact score
   */
  _calculateComplexityImpact(complexity) {
    let score = 0;

    if (complexity.cyclomatic > 10) score += WEIGHTS.complexity.cyclomaticHigh;
    if (complexity.cyclomatic > 20) score += WEIGHTS.complexity.cyclomaticVeryHigh;
    if (complexity.bigO === 'O(n^2)') score += WEIGHTS.complexity.quadratic;
    if (complexity.bigO === 'O(2^n)') score += WEIGHTS.complexity.exponential;

    return score;
  }

  /**
   * Calculates expensive operations contribution to score
   * @private
   * @param {Object} expensiveOps - Expensive operations metrics
   * @returns {number} Operations impact score
   */
  _calculateOperationsImpact(expensiveOps) {
    let score = 0;

    score += Math.min(
      expensiveOps.nestedLoops * WEIGHTS.operations.nestedLoop,
      0.3
    );
    
    if (expensiveOps.recursion) {
      score += WEIGHTS.operations.recursion;
    }
    
    score += Math.min(
      expensiveOps.heavyCalls.length * WEIGHTS.operations.heavyCall,
      0.2
    );

    return score;
  }

  /**
   * Calculates resource usage contribution to score
   * @private
   * @param {Object} resources - Resource usage metrics
   * @returns {number} Resource impact score
   */
  _calculateResourceImpact(resources) {
    let score = 0;

    if (resources.network) score += WEIGHTS.resources.network;
    if (resources.memory === 'high') score += WEIGHTS.resources.memoryHigh;
    if (resources.dom) score += WEIGHTS.resources.dom;

    return score;
  }

  /**
   * Estimates execution characteristics based on impact score
   * 
   * @param {number} impactScore - Overall impact score (0-1)
   * @param {boolean} hasNetwork - Whether code uses network
   * @returns {Object} Execution estimates
   */
  estimateExecution(impactScore, hasNetwork = false) {
    if (impactScore > 0.7) {
      return {
        executionTime: 'slow',
        blocking: true,
        async: hasNetwork
      };
    }

    if (impactScore > 0.4) {
      return {
        executionTime: 'medium',
        blocking: !hasNetwork,
        async: hasNetwork
      };
    }

    if (impactScore > 0.2) {
      return {
        executionTime: 'fast',
        blocking: false,
        async: false
      };
    }

    return {
      executionTime: 'instant',
      blocking: false,
      async: false
    };
  }
}

export default ImpactCalculator;
