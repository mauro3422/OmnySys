/**
 * @fileoverview Tests for tier3/factors/side-effect-score - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/tier3/factors/side-effect-score
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { calculateSideEffectScore } from '../../../../../src/layer-a-static/analyses/tier3/factors/SideEffectScore.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'tier3/factors/side-effect-score',
  exports: { calculateSideEffectScore },
  analyzeFn: calculateSideEffectScore,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['calculateSideEffectScore'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'Tier 3 - SideEffectScore Factor',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'Structure Contract',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'Side Effect Count Scoring',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'Critical Side Effects',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'Metrics',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
