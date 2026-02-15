import { describe, it, expect } from 'vitest';
import * as legacy from '#layer-a/extractors/metadata/performance-impact.js';

describe('extractors/metadata/performance-impact.js', () => {
  it('exports backward-compatibility API and default facade', () => {
    expect(legacy.extractPerformanceMetrics).toBeTypeOf('function');
    expect(legacy.extractPerformanceImpactConnections).toBeTypeOf('function');
    expect(legacy.ComplexityAnalyzer).toBeTypeOf('function');
    expect(legacy.default).toHaveProperty('extractPerformanceMetrics');
  });
});

