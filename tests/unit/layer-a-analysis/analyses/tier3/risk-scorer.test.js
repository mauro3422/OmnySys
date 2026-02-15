import { describe, it, expect } from 'vitest';
import RiskScorerDefault, {
  RiskScorer,
  calculateRiskScore,
  calculateScoreSeverity,
  calculateAllRiskScores,
  identifyHighRiskFiles,
  generateRiskReport
} from '#layer-a/analyses/tier3/risk-scorer.js';

describe('analyses/tier3/risk-scorer.js', () => {
  it('re-exports the compatibility API', () => {
    expect(RiskScorerDefault).toBe(RiskScorer);
    expect(RiskScorer).toBeTypeOf('function');
    expect(calculateRiskScore).toBeTypeOf('function');
    expect(calculateScoreSeverity).toBeTypeOf('function');
    expect(calculateAllRiskScores).toBeTypeOf('function');
    expect(identifyHighRiskFiles).toBeTypeOf('function');
    expect(generateRiskReport).toBeTypeOf('function');
  });

  it('keeps behavior compatible for score and severity', () => {
    const score = calculateRiskScore({}, [], {}, {});
    expect(score).toHaveProperty('total');
    expect(calculateScoreSeverity(score.total)).toMatch(/low|medium|high|critical/);
  });
});
