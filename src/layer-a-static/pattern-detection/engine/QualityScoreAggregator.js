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
  constructor(config = {}) {
    this.config = config;
    this.weights = config.weights || {};
  }

  /**
   * Calculate aggregated quality score
   */
  calculate(results) {
    if (!results || results.length === 0) {
      return this.createEmptyScore();
    }

    let totalWeightedScore = 0;
    let totalWeight = 0;
    const breakdown = {};

    // Use equal weight distribution if no weights defined
    const hasWeights = Object.keys(this.weights).length > 0;
    const equalWeight = hasWeights ? 0 : 1 / results.length;

    for (const result of results) {
      const weight = this.weights[result.detector] ?? 
                     this.weights[result.name] ?? 
                     (hasWeights ? 0.1 : equalWeight);
      const score = result.score ?? 100;
      
      totalWeightedScore += score * weight;
      totalWeight += weight;
      
      breakdown[result.detector || result.name] = {
        score,
        weight,
        contribution: score * weight,
        findings: result.findings?.length || 0
      };
    }

    // If totalWeight is 0, return 100 as a graceful fallback
    const finalScore = totalWeight > 0 
      ? totalWeightedScore / totalWeight
      : 100;

    // Build components object with just scores
    const components = {};
    for (const key of Object.keys(breakdown)) {
      components[key] = breakdown[key].score;
    }

    // Support both API styles: result.score and result.total
    return {
      total: Math.round(finalScore),
      score: Math.round(finalScore),
      grade: this.calculateGrade(finalScore),
      totalIssues: results.reduce((sum, r) => sum + (r.findings?.length || 0), 0),
      breakdown,
      components,
      recommendations: this.generateRecommendations(results),
      weights: this.weights
    };
  }

  /**
   * Calculate grade based on score
   */
  calculateGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Convert score to grade (alias for engine compatibility)
   */
  scoreToGrade(score) {
    return this.calculateGrade(score);
  }

  /**
   * Generate recommendations based on results
   */
  generateRecommendations(results) {
    const recommendations = [];
    
    const sortedByScore = [...results]
      .sort((a, b) => (a.score ?? 100) - (b.score ?? 100))
      .slice(0, 3);
    
    for (const result of sortedByScore) {
      if ((result.score ?? 100) < 80) {
        recommendations.push({
          priority: (result.score ?? 100) < 50 ? 'high' : 'medium',
          category: result.name || result.detector,
          message: result.recommendation || `${result.findings?.length || 0} issues found`,
          score: result.score
        });
      }
    }
    
    return recommendations;
  }

  /**
   * Calculate grade based on score
   */
  calculateGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Create empty score for when there are no results
   */
  createEmptyScore() {
    return {
      total: 100,
      score: 100,
      grade: 'A',
      totalIssues: 0,
      breakdown: {},
      components: {},
      recommendations: ['No analysis results available'],
      weights: this.weights
    };
  }

  /**
   * Adjust weights based on project type
   */
  adjustWeightsForProjectType(projectType) {
    const adjustments = {
      microservices: {
        coupling: 0.25,
        circularDeps: 0.20,
        sharedObjects: 0.10
      },
      library: {
        unusedExports: 0.20,
        circularDeps: 0.10,
        sharedObjects: 0.05
      }
    };

    if (adjustments[projectType]) {
      this.weights = { ...this.weights, ...adjustments[projectType] };
    }
  }
}

export default QualityScoreAggregator;
