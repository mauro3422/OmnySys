import { describe, it, expect } from 'vitest';
import { classifyCycle, aggregateClassifications } from '#layer-a/analyses/tier1/function-cycle-classifier/classifier.js';

describe('analyses/tier1/function-cycle-classifier/classifier.js', () => {
  it('returns UNKNOWN classification when no rules match', () => {
    const cycle = ['a::x', 'b::y', 'c::z'];
    const out = classifyCycle(cycle, {});
    expect(out.category).toBe('UNKNOWN');
    expect(out.autoIgnore).toBe(false);
  });

  it('aggregates valid/problematic counters from classifications', () => {
    const cycles = [['a'], ['b']];
    const classifications = [
      { category: 'VALID_PATTERN', autoIgnore: true, cycle: ['a'] },
      { category: 'CRITICAL_ISSUE', autoIgnore: false, cycle: ['b'] }
    ];
    const out = aggregateClassifications(cycles, classifications);
    expect(out.total).toBe(2);
    expect(out.valid).toBe(1);
    expect(out.problematic).toBe(1);
  });
});

