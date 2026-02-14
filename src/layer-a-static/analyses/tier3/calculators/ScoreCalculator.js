/**
 * @fileoverview ScoreCalculator.js
 * 
 * Calculates individual score components.
 * 
 * @module analyses/tier3/calculators/ScoreCalculator
 */

import { calculateStaticComplexity } from '../factors/StaticComplexity.js';
import { calculateSemanticScore } from '../factors/SemanticScore.js';
import { calculateSideEffectScore } from '../factors/SideEffectScore.js';
import { calculateHotspotScore } from '../factors/HotspotScore.js';
import { calculateCouplingScore } from '../factors/CouplingScore.js';
import { calculateScoreSeverity } from './SeverityCalculator.js';

/**
 * Calculates overall risk score
 */
export function calculateRiskScore(
  fileAnalysis = {},
  semanticConnections = [],
  sideEffects = {},
  graphMetrics = {}
) {
  let score = 0;
  const breakdown = {
    staticComplexity: 0,
    semanticConnections: 0,
    sideEffects: 0,
    hotspotRisk: 0,
    couplingRisk: 0
  };

  const explanations = [];

  // 1. STATIC COMPLEXITY (0-3 points)
  const staticResult = calculateStaticComplexity(fileAnalysis);
  breakdown.staticComplexity = staticResult.score;
  if (staticResult.explanation) explanations.push(staticResult.explanation);
  score += breakdown.staticComplexity;

  // 2. SEMANTIC CONNECTIONS (0-3 points)
  const semanticResult = calculateSemanticScore(semanticConnections);
  breakdown.semanticConnections = semanticResult.score;
  if (semanticResult.explanation) explanations.push(semanticResult.explanation);
  score += breakdown.semanticConnections;

  // 3. SIDE EFFECTS (0-3 points)
  const sideEffectResult = calculateSideEffectScore(sideEffects);
  breakdown.sideEffects = sideEffectResult.score;
  if (sideEffectResult.explanation) explanations.push(sideEffectResult.explanation);
  score += breakdown.sideEffects;

  // 4. HOTSPOT RISK (0-2 points)
  const hotspotResult = calculateHotspotScore(graphMetrics);
  breakdown.hotspotRisk = hotspotResult.score;
  if (hotspotResult.explanation) explanations.push(hotspotResult.explanation);
  score += breakdown.hotspotRisk;

  // 5. COUPLING RISK (0-1 point)
  const couplingResult = calculateCouplingScore(graphMetrics);
  breakdown.couplingRisk = couplingResult.score;
  if (couplingResult.explanation) explanations.push(couplingResult.explanation);
  score += breakdown.couplingRisk;

  // Final score
  const finalScore = Math.min(10, score);
  const severity = calculateScoreSeverity(finalScore);

  return {
    total: finalScore,
    breakdown,
    severity,
    explanation: explanations.join('; ') || 'Low risk baseline',
    metrics: staticResult.metrics
  };
}

export default calculateRiskScore;
