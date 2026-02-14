/**
 * @fileoverview risk-scorer.js
 * 
 * Backward compatibility wrapper.
 * Use './index.js' for new code.
 * 
 * @deprecated Use './index.js' instead
 * @module analyses/tier3/risk-scorer
 */

export {
  RiskScorer,
  RiskScorer as default,
  calculateRiskScore,
  calculateScoreSeverity,
  calculateAllRiskScores,
  identifyHighRiskFiles,
  generateRiskReport
} from './index.js';
