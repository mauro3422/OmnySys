import { describe, it, expect } from 'vitest';
import { ResourceAnalyzer } from '#layer-a/extractors/metadata/performance-impact/analyzers/resource-analyzer.js';

describe('extractors/metadata/performance-impact/analyzers/resource-analyzer.js', () => {
  it('detects network/disk/memory characteristics', () => {
    const analyzer = new ResourceAnalyzer();
    const out = analyzer.analyze('fetch("/x"); localStorage.setItem("k","v"); new Array(10000); memoize(fn);');
    expect(out.resources.network).toBe(true);
    expect(out.resources.disk).toBe(true);
    expect(out.resources.memory).toBe('high');
    expect(out.estimates.expensiveWithCache).toBe(true);
  });
});

