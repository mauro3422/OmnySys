import { describe, it, expect } from 'vitest';
import {
  findDeepDependencyChainsV2,
  analyzeSharedObjectsV2
} from '#layer-a/analyses/V2_ALGORITHMS_PROPOSAL.js';

describe('analyses/V2_ALGORITHMS_PROPOSAL.js', () => {
  it('returns structured deep-chain result for empty maps', () => {
    const out = findDeepDependencyChainsV2({ function_links: [], objectExports: {}, files: {} });
    expect(out).toHaveProperty('totalDeepChains');
    expect(Array.isArray(out.chains)).toBe(true);
  });

  it('analyzes shared objects V2 and returns structured output', () => {
    const out = analyzeSharedObjectsV2({
      objectExports: {
        'a.js': [{ name: 'appStore', isMutable: true, properties: ['setUser'] }]
      },
      files: {
        'a.js': { imports: [] },
        'b.js': { imports: [{ specifiers: [{ imported: 'appStore' }], source: './a.js' }] }
      }
    });
    expect(out).toHaveProperty('total');
    expect(out).toHaveProperty('criticalObjects');
  });
});
