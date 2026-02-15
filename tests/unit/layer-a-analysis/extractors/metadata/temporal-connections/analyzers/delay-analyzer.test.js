import { describe, it, expect } from 'vitest';
import {
  analyzeDelay,
  analyzeDelayPatterns,
  categorizeDelay,
  determineImpact,
  DelayImpact
} from '#layer-a/extractors/metadata/temporal-connections/analyzers/delay-analyzer.js';

describe('extractors/metadata/temporal-connections/analyzers/delay-analyzer.js', () => {
  it('categorizes delays and derives impact levels', () => {
    expect(categorizeDelay(0)).toBe('immediate');
    expect(determineImpact(0)).toBe(DelayImpact.NONE);
    expect(determineImpact(6000)).toBe(DelayImpact.CRITICAL);
  });

  it('builds a detailed delay analysis object', () => {
    const out = analyzeDelay(1500, 'timeout');
    expect(out.category).toBe('slow');
    expect(out.impact).toBe(DelayImpact.HIGH);
    expect(Array.isArray(out.recommendations)).toBe(true);
  });

  it('aggregates concerns across multiple delay samples', () => {
    const out = analyzeDelayPatterns([
      { delay: 0, context: 'timeout' },
      { delay: 9000, context: 'timeout' },
      { delay: 'unknown', context: 'interval' }
    ]);
    expect(out.total).toBe(3);
    expect(out.concerns.totalConcerns).toBeGreaterThan(0);
  });
});

