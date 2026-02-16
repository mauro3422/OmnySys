import { describe, it, expect } from 'vitest';
import { calculateRiskScore } from '#layer-a/analyses/tier3/calculators/ScoreCalculator.js';

describe('analyses/tier3/calculators/ScoreCalculator.js', () => {
  it('calculates bounded risk score with breakdown and severity', () => {
    const out = calculateRiskScore(
      { functions: Array.from({ length: 12 }, () => ({})), imports: Array.from({ length: 4 }, () => ({})) },
      [{ severity: 'high' }, { severity: 'medium' }],
      { makesNetworkCalls: true, modifiesGlobalState: true },
      { inDegree: 10, outDegree: 12, problematicCycles: 1, coupledFiles: 4 }
    );
    expect(out.total).toBeLessThanOrEqual(10);
    expect(out).toHaveProperty('breakdown');
    expect(out).toHaveProperty('severity');
  });
});

