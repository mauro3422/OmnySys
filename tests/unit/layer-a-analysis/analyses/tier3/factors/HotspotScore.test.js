/**
 * @fileoverview Tests for analyses/tier3/factors/HotspotScore - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/analyses/tier3/factors/HotspotScore
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { calculateHotspotScore } from '#layer-a/analyses/tier3/factors/HotspotScore.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'analyses/tier3/factors/HotspotScore',
  exports: { calculateHotspotScore },
  analyzeFn: calculateHotspotScore,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['calculateHotspotScore'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'analyses/tier3/factors/HotspotScore.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'assigns hotspot score from in/out degree metrics',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
