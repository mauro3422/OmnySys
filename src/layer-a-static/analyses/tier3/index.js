/**
 * @fileoverview index.js
 * 
 * Main entry point for tier3 analysis module.
 * 
 * @module analyses/tier3
 */

// Scorers
export { RiskScorer } from './scorers/RiskScorer.js';

// Calculators
export {
  calculateRiskScore,
  calculateScoreSeverity,
  getSeverityThreshold,
  ReportGenerator
} from './calculators/index.js';

// Factors
export {
  calculateStaticComplexity,
  calculateSemanticScore,
  calculateSideEffectScore,
  calculateHotspotScore,
  calculateCouplingScore
} from './factors/index.js';

// Legacy function exports for backward compatibility
export function calculateRiskScore(fileAnalysis, semanticConnections, sideEffects, graphMetrics) {
  return calculateRiskScore(fileAnalysis, semanticConnections, sideEffects, graphMetrics);
}

export function calculateScoreSeverity(score) {
  return calculateScoreSeverity(score);
}

export function calculateAllRiskScores(systemMap, semanticConnectionsByFile, sideEffectsByFile, graphMetrics) {
  const scorers = new RiskScorer();
  return scorers.calculateAll(systemMap, semanticConnectionsByFile, sideEffectsByFile, graphMetrics);
}

export function identifyHighRiskFiles(riskScores, threshold = 6.0) {
  const scorers = new RiskScorer();
  return scorers.identifyHighRiskFiles(riskScores, threshold);
}

export function generateRiskReport(riskScores, options = {}) {
  const scorers = new RiskScorer();
  return scorers.generateReport(riskScores, options);
}

// Default export
export { RiskScorer as default } from './scorers/RiskScorer.js';
