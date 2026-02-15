import { describe, it, expect } from 'vitest';
import { findHotspots } from '#layer-a/analyses/tier1/hotspots.js';

describe('analyses/tier1/hotspots.js', () => {
  it('returns empty report when function_links is missing', () => {
    const out = findHotspots({});
    expect(out.total).toBe(0);
    expect(out.functions).toEqual([]);
  });

  it('detects hotspots from repeated inbound callers', () => {
    const links = Array.from({ length: 6 }, (_, i) => ({
      from: `caller${i}`,
      to: 'targetFn'
    }));
    const out = findHotspots({ function_links: links });
    expect(out.total).toBe(1);
    expect(out.functions[0].functionId).toBe('targetFn');
    expect(out.functions[0].severity).toBe('MEDIUM');
  });
});

