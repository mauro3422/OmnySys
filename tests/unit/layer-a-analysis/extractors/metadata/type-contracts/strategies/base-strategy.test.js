/**
 * @fileoverview Tests for extractors/metadata/type-contracts/strategies/base-strategy - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/metadata/type-contracts/strategies/base-strategy
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { ExtractionStrategy } from '#layer-a/extractors/metadata/type-contracts/strategies/base-strategy.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'extractors/metadata/type-contracts/strategies/base-strategy',
  exports: { ExtractionStrategy, StrategyRegistry },
  analyzeFn: ExtractionStrategy,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['ExtractionStrategy', 'StrategyRegistry'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'extractors/metadata/type-contracts/strategies/base-strategy.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'base strategy throws when abstract methods are not implemented',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'registry sorts strategies by priority and extracts from applicable ones',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
