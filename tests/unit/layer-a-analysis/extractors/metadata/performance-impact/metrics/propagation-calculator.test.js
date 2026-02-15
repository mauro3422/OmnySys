import { describe, it, expect } from 'vitest';
import { PropagationCalculator } from '#layer-a/extractors/metadata/performance-impact/metrics/propagation-calculator.js';

describe('extractors/metadata/performance-impact/metrics/propagation-calculator.js', () => {
  it('calculates propagated severity and categorizes impact levels', () => {
    const calc = new PropagationCalculator();
    const propagated = calc.calculate({ impactScore: 0.4 }, { impactScore: 0.8 });
    expect(propagated).toHaveProperty('score');
    expect(propagated).toHaveProperty('severity');

    const levels = calc.categorizeByImpact([
      { performance: { impactScore: 0.8 } },
      { performance: { impactScore: 0.6 } },
      { performance: { impactScore: 0.4 } }
    ]);
    expect(levels.critical.length).toBe(1);
    expect(levels.high.length).toBe(1);
    expect(levels.medium.length).toBe(1);
  });

  it('generates human-readable propagation reason', () => {
    const calc = new PropagationCalculator();
    const reason = calc.generateReason(
      { name: 'slow', performance: { resources: { network: true }, complexity: { bigO: 'O(n^2)' }, expensiveOps: { nestedLoops: 1 } } },
      { name: 'caller' }
    );
    expect(reason).toContain('caller');
    expect(reason).toContain('slow');
  });
});

