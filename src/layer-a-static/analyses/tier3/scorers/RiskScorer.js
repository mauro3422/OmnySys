/**
 * @fileoverview RiskScorer.js
 * 
 * Calculates risk scores based on deterministic rules (no AI).
 * 
 * @module analyses/tier3/scorers/RiskScorer
 */

import { calculateRiskScore, calculateScoreSeverity } from '../calculators/ScoreCalculator.js';
import { calculateScoreSeverity } from '../calculators/SeverityCalculator.js';
import { ReportGenerator } from '../calculators/ReportGenerator.js';

/**
 * Calculates risk scores for files
 */
export class RiskScorer {
  constructor() {
    this.scoreCalculator = { calculate: calculateRiskScore };
    this.severityCalculator = { calculate: calculateScoreSeverity };
    this.reportGenerator = new ReportGenerator();
  }

  /**
   * Calculate risk score for a file
   */
  calculate(fileAnalysis = {}, semanticConnections = [], sideEffects = {}, graphMetrics = {}) {
    return this.scoreCalculator.calculate(fileAnalysis, semanticConnections, sideEffects, graphMetrics);
  }

  /**
   * Calculate severity from score
   */
  calculateSeverity(score) {
    return calculateScoreSeverity(score);
  }

  /**
   * Calculate all risk scores
   */
  calculateAll(systemMap, semanticConnectionsByFile, sideEffectsByFile, graphMetrics) {
    const results = {};

    for (const [filePath, fileAnalysis] of Object.entries(systemMap.files || {})) {
      const semanticConnections = semanticConnectionsByFile[filePath] || [];
      const sideEffects = sideEffectsByFile[filePath]?.sideEffects || {};
      const metrics = graphMetrics[filePath] || {};

      results[filePath] = this.calculate(fileAnalysis, semanticConnections, sideEffects, metrics);
    }

    return results;
  }

  /**
   * Identify high risk files
   */
  identifyHighRiskFiles(riskScores, threshold = 6.0) {
    return Object.entries(riskScores)
      .filter(([_, analysis]) => analysis.total >= threshold)
      .map(([file, analysis]) => ({
        file,
        score: analysis.total,
        severity: analysis.severity,
        explanation: analysis.explanation
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Generate risk report
   */
  generateReport(riskScores, options = {}) {
    return this.reportGenerator.generate(riskScores, options);
  }
}

export default RiskScorer;
