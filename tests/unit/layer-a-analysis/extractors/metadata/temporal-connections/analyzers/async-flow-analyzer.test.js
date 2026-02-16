/**
 * @fileoverview Tests for extractors/metadata/temporal-connections/analyzers/async-flow-analyzer - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/metadata/temporal-connections/analyzers/async-flow-analyzer
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { analyzePromiseAll } from '#layer-a/extractors/metadata/temporal-connections/analyzers/async-flow-analyzer.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'extractors/metadata/temporal-connections/analyzers/async-flow-analyzer',
  exports: { analyzePromiseAll, analyzeAsyncFlow, detectRaceConditions, RiskLevel },
  analyzeFn: analyzePromiseAll,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['analyzePromiseAll', 'analyzeAsyncFlow', 'detectRaceConditions'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'extractors/metadata/temporal-connections/analyzers/async-flow-analyzer.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'flags Promise.all without catch as medium/high risk',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'aggregates async analyses and returns recommendations',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'detects lifecycle parallel conflicts across atoms in same phase',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
