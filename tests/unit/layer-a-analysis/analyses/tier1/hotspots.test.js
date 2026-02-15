/**
 * @fileoverview Tests for Tier 1 Hotspots Analysis
 * 
 * Detects functions with high inbound coupling (many callers).
 * Uses Meta-Factory pattern for standardized contracts.
 * 
 * @module tests/unit/layer-a-analysis/analyses/tier1/hotspots
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { findHotspots } from '#layer-a/analyses/tier1/hotspots.js';

createAnalysisTestSuite({
  module: 'analyses/tier1/hotspots',
  exports: { findHotspots },
  analyzeFn: findHotspots,
  expectedFields: {
    total: 'number',
    functions: 'array',
    criticalCount: 'number'
  },
  contractOptions: {
    async: false,
    exportNames: ['findHotspots'],
    expectedSafeResult: { total: 0, functions: [], criticalCount: 0 }
  },
  specificTests: [
    {
      name: 'returns empty report when function_links is missing',
      fn: () => {
        const out = findHotspots({});
        expect(out.total).toBe(0);
        expect(out.functions).toEqual([]);
      }
    },
    {
      name: 'detects hotspots from repeated inbound callers',
      fn: () => {
        const links = Array.from({ length: 6 }, (_, i) => ({
          from: `caller${i}`,
          to: 'targetFn'
        }));
        const out = findHotspots({ function_links: links });
        expect(out.total).toBe(1);
        expect(out.functions[0].functionId).toBe('targetFn');
        expect(out.functions[0].severity).toBe('MEDIUM');
      }
    }
  ]
});
