import { describe, it, expect } from 'vitest';
import Tier3Default, {
  calculateAllRiskScores,
  identifyHighRiskFiles,
  generateRiskReport,
  RiskScorer
} from '#layer-a/analyses/tier3/index.js';
import { createMockSystemMap } from '../../../../factories/analysis.factory.js';

describe('analyses/tier3/index.js', () => {
  it('exports tier3 API surface', () => {
    expect(RiskScorer).toBeTypeOf('function');
    expect(calculateAllRiskScores).toBeTypeOf('function');
    expect(identifyHighRiskFiles).toBeTypeOf('function');
    expect(generateRiskReport).toBeTypeOf('function');
    expect(Tier3Default).toBe(RiskScorer);
  });

  it('documents current wrapper limitation for calculateAllRiskScores', () => {
    const systemMap = createMockSystemMap({
      files: {
        'src/a.js': { functions: [] },
        'src/b.js': { functions: [] }
      }
    });

    expect(() => calculateAllRiskScores(systemMap, {}, {}, {})).toThrow();
  });

  it('documents current wrapper limitation for identifyHighRiskFiles', () => {
    expect(() => identifyHighRiskFiles({
      'src/low.js': { total: 2, severity: 'low', explanation: 'ok' },
      'src/high.js': { total: 8, severity: 'critical', explanation: 'bad' }
    }, 6)).toThrow();
  });

  it('documents current wrapper limitation for generateRiskReport', () => {
    expect(() => generateRiskReport({
      'src/a.js': { total: 7, severity: 'high', explanation: 'x', breakdown: {} }
    }, { includeSummary: true })).toThrow();
  });
});
