import { describe, it, expect } from 'vitest';
import * as tier2 from '#layer-a/analyses/tier2/index.js';

describe('analyses/tier2/index.js', () => {
  it('exports tier2 analysis APIs through barrel', () => {
    expect(tier2.analyzeCoupling).toBeTypeOf('function');
    expect(tier2.findUnresolvedImports).toBeTypeOf('function');
    expect(tier2.findUnusedImports).toBeTypeOf('function');
    expect(tier2.analyzeReexportChains).toBeTypeOf('function');
  });
});

