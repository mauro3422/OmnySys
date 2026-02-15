/**
 * @fileoverview Tests for Tier 2 Coupling Analysis
 * 
 * Detects bidirectional dependencies between files.
 * Uses Meta-Factory pattern for standardized contracts.
 * 
 * @module tests/unit/layer-a-analysis/analyses/tier2/coupling
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { analyzeCoupling } from '#layer-a/analyses/tier2/coupling.js';

createAnalysisTestSuite({
  module: 'analyses/tier2/coupling',
  exports: { analyzeCoupling },
  analyzeFn: analyzeCoupling,
  expectedFields: {
    couplings: 'array',
    total: 'number',
    maxCoupling: 'number'
  },
  specificTests: [
    {
      name: 'detects bidirectional coupling between files',
      fn: () => {
        const systemMap = {
          files: {
            'a.js': { dependsOn: ['b.js'], usedBy: [] },
            'b.js': { dependsOn: [], usedBy: ['a.js'] }
          }
        };
        const out = analyzeCoupling(systemMap);
        expect(out.total).toBe(1);
        expect(out.maxCoupling).toBe(1);
      }
    }
  ]
});
