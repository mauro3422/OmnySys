import { describe, it, expect } from 'vitest';
import { analyzeCoupling } from '#layer-a/analyses/tier2/coupling.js';

describe('analyses/tier2/coupling.js', () => {
  it('handles null/undefined systemMap gracefully', () => {
    expect(analyzeCoupling(null)).toEqual({ couplings: [], total: 0 });
  });

  it('detects bidirectional coupling between files', () => {
    const systemMap = {
      files: {
        'a.js': { dependsOn: ['b.js'], usedBy: [] },
        'b.js': { dependsOn: [], usedBy: ['a.js'] }
      }
    };
    const out = analyzeCoupling(systemMap);
    expect(out.total).toBe(1);
    expect(out.maxCoupling).toBe(1);
  });
});

