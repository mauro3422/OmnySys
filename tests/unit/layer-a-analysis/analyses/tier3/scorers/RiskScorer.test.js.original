import { describe, it, expect } from 'vitest';
import { RiskScorer } from '#layer-a/analyses/tier3/scorers/RiskScorer.js';

describe('analyses/tier3/scorers/RiskScorer.js', () => {
  it('calculates risk maps and identifies high-risk files', () => {
    const scorer = new RiskScorer();
    const scores = scorer.calculateAll(
      { files: { 'a.js': { functions: [] } } },
      { 'a.js': [] },
      { 'a.js': { sideEffects: {} } },
      { 'a.js': {} }
    );
    expect(scores['a.js']).toBeDefined();
    const high = scorer.identifyHighRiskFiles({ 'a.js': { total: 7, severity: 'high', explanation: '' } });
    expect(high.length).toBe(1);
  });
});

