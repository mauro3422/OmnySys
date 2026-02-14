/**
 * @fileoverview Performance Impact Propagation Calculator
 * 
 * Calculates how performance impacts propagate between functions.
 * If A is slow and B calls A, B also becomes slow.
 * 
 * @module performance-impact/metrics/propagation-calculator
 */

/**
 * Severity thresholds for propagated impact
 * @const {Object}
 */
const SEVERITY_THRESHOLDS = {
  critical: 0.7,
  high: 0.5,
  medium: 0.3
};

/**
 * Calculates performance impact propagation
 * 
 * @class PropagationCalculator
 */
export class PropagationCalculator {
  /**
   * Calculates propagated impact from callee to caller
   * 
   * @param {Object} callerPerf - Caller's performance metrics
   * @param {Object} calleePerf - Callee's performance metrics
   * @returns {Object} Propagated impact with score and severity
   */
  calculate(callerPerf, calleePerf) {
    const baseScore = calleePerf?.impactScore || 0;
    const callerScore = callerPerf?.impactScore || 0;

    // Impact is additive (approximately)
    const propagatedScore = Math.min(baseScore + callerScore * 0.5, 1);
    const severity = this._determineSeverity(propagatedScore);

    return { score: propagatedScore, severity };
  }

  /**
   * Determines severity level from score
   * @private
   * @param {number} score - Propagated impact score
   * @returns {string} Severity level
   */
  _determineSeverity(score) {
    if (score > SEVERITY_THRESHOLDS.critical) return 'critical';
    if (score > SEVERITY_THRESHOLDS.high) return 'high';
    if (score > SEVERITY_THRESHOLDS.medium) return 'medium';
    return 'low';
  }

  /**
   * Categorizes atoms by impact level
   * 
   * @param {Array} atoms - All atoms to categorize
   * @returns {Object} Atoms grouped by impact level
   */
  categorizeByImpact(atoms) {
    const levels = {
      critical: [],
      high: [],
      medium: []
    };

    for (const atom of atoms) {
      const score = atom.performance?.impactScore || 0;

      if (score > SEVERITY_THRESHOLDS.critical) {
        levels.critical.push(atom);
      } else if (score > SEVERITY_THRESHOLDS.high) {
        levels.high.push(atom);
      } else if (score > SEVERITY_THRESHOLDS.medium) {
        levels.medium.push(atom);
      }
    }

    return levels;
  }

  /**
   * Generates description of the impact
   * 
   * @param {Object} slowFunction - The slow function being called
   * @param {Object} caller - The calling function
   * @returns {string} Human-readable impact reason
   */
  generateReason(slowFunction, caller) {
    const reasons = [];

    if (slowFunction.performance?.resources?.network) {
      reasons.push('network call');
    }

    if (slowFunction.performance?.complexity?.bigO !== 'O(1)') {
      reasons.push(`complexity ${slowFunction.performance.complexity.bigO}`);
    }

    if (slowFunction.performance?.expensiveOps?.nestedLoops > 0) {
      reasons.push('nested loops');
    }

    return `${caller.name} calls ${slowFunction.name} which has: ${reasons.join(', ')}`;
  }
}

export default PropagationCalculator;
