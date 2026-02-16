import { describe, it, expect } from 'vitest';
import { ComplexityAnalyzer } from '#layer-a/extractors/metadata/performance-impact/analyzers/complexity-analyzer.js';

describe('extractors/metadata/performance-impact/analyzers/complexity-analyzer.js', () => {
  it('calculates cyclomatic/cognitive complexity and BigO estimate', () => {
    const analyzer = new ComplexityAnalyzer();
    const result = analyzer.analyze(`
      for (;;) {
        for (;;) {
          if (a && b) {
            x();
          }
        }
      }
    `);
    expect(result.cyclomatic).toBeGreaterThan(1);
    expect(result.cognitive).toBeGreaterThanOrEqual(1);
    expect(result.bigO).toBe('O(n^2)');
  });
});
