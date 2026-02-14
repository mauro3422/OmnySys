/**
 * @fileoverview QualityScoreAggregator.js
 * 
 * Aggregates quality scores from pattern detection results.
 * 
 * @module pattern-detection/engine/QualityScoreAggregator
 */

/**
 * Aggregates quality scores
 */
export class QualityScoreAggregator {
  constructor(config) {
    this.config = config;
    this.weights = config.weights || {
      deepChains: 0.15,
      sharedObjects: 0.20,
      circularDeps: 0.15,
      coupling: 0.15,
      unusedExports: 0.10,
      hotspots: 0.15,
      unusedImports: 0.10
    };
  }

  /**
   * Calculate aggregated quality score
   */
  calculate(patternResults) {
    let totalScore = 0;
    let totalWeight = 0;
    const componentScores = {};

    for (const result of patternResults) {
      const weight = this.weights[result.detector] || 0.1;
      const score = result.score ?? 100;
      
      totalScore += score * weight;
      totalWeight += weight;
      componentScores[result.detector] = score;
    }

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 100;

    return {
      total: Math.round(finalScore),
      grade: this.scoreToGrade(finalScore),
      components: componentScores,
      recommendations: this.generateRecommendations(patternResults)
    };
  }

  /**
   * Convert score to grade
   */
  scoreToGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(patternResults) {
    const recommendations = [];

    for (const result of patternResults) {
      if (result.score < 70 && result.recommendation) {
        recommendations.push({
          detector: result.detector,
          message: result.recommendation,
          priority: result.score < 50 ? 'high' : 'medium'
        });
      }
    }

    return recommendations;
  }
}

export default QualityScoreAggregator;
