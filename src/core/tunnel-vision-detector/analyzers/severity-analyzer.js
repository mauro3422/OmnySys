/**
 * @fileoverview Severity Analyzer
 * 
 * Calculates severity of tunnel vision alerts based on
 * various risk factors.
 * 
 * @module tunnel-vision-detector/analyzers/severity-analyzer
 */

/**
 * Severity thresholds
 * @const {Object}
 */
const THRESHOLDS = {
  CRITICAL: 15,
  HIGH: 10,
  MEDIUM: 5
};

/**
 * Archetype risk scores
 * @const {Object}
 */
const ARCHETYPE_SCORES = {
  'god-function': 10,
  'hot-path': 10,
  'fragile-network': 5
};

/**
 * Complexity thresholds
 * @const {Object}
 */
const COMPLEXITY_SCORES = {
  high: 3,
  medium: 1,
  threshold: { high: 20, medium: 10 }
};

/**
 * Analyzes and calculates alert severity
 * 
 * @class SeverityAnalyzer
 */
export class SeverityAnalyzer {
  /**
   * Calculates severity based on risk factors
   * 
   * @param {Object} atom - Modified atom
   * @param {number} unmodifiedCallerCount - Number of unmodified callers
   * @returns {string} Severity level (CRITICAL, HIGH, MEDIUM, LOW)
   */
  calculate(atom, unmodifiedCallerCount) {
    let score = this._calculateBaseScore(unmodifiedCallerCount);
    score += this._calculateArchetypeScore(atom);
    score += this._calculateComplexityScore(atom);
    score += this._calculateSideEffectScore(atom);
    score += this._calculateAsyncScore(atom);

    return this._classify(score);
  }

  /**
   * Calculates base score from caller count
   * @private
   */
  _calculateBaseScore(unmodifiedCallerCount) {
    return unmodifiedCallerCount * 2;
  }

  /**
   * Calculates archetype risk score
   * @private
   */
  _calculateArchetypeScore(atom) {
    if (!atom.archetype) return 0;

    const type = atom.archetype.type;
    if (ARCHETYPE_SCORES[type] !== undefined) {
      return ARCHETYPE_SCORES[type];
    }

    return atom.archetype.severity || 0;
  }

  /**
   * Calculates complexity risk score
   * @private
   */
  _calculateComplexityScore(atom) {
    if (atom.complexity > COMPLEXITY_SCORES.threshold.high) {
      return COMPLEXITY_SCORES.high;
    }
    if (atom.complexity > COMPLEXITY_SCORES.threshold.medium) {
      return COMPLEXITY_SCORES.medium;
    }
    return 0;
  }

  /**
   * Calculates side effects risk score
   * @private
   */
  _calculateSideEffectScore(atom) {
    return atom.hasSideEffects ? 2 : 0;
  }

  /**
   * Calculates async risk score
   * @private
   */
  _calculateAsyncScore(atom) {
    return atom.isAsync ? 1 : 0;
  }

  /**
   * Classifies score into severity level
   * @private
   */
  _classify(score) {
    if (score >= THRESHOLDS.CRITICAL) return 'CRITICAL';
    if (score >= THRESHOLDS.HIGH) return 'HIGH';
    if (score >= THRESHOLDS.MEDIUM) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Gets the most severe level from a list
   * 
   * @param {Array<string>} severities - List of severity levels
   * @returns {string} Most severe level
   */
  getMostSevere(severities) {
    const order = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    return severities.reduce((max, s) => 
      order[s] > order[max] ? s : max, 'LOW');
  }
}

export default SeverityAnalyzer;
