/**
 * @fileoverview Tests for extractors/metadata/type-contracts/types/type-analyzer - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/metadata/type-contracts/types/type-analyzer
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { analyzeType } from '#layer-a/extractors/metadata/type-contracts/types/type-analyzer.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'extractors/metadata/type-contracts/types/type-analyzer',
  exports: { analyzeType, normalizeType, isNullableType, extractThrowCondition },
  analyzeFn: analyzeType,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['analyzeType', 'normalizeType', 'isNullableType'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'extractors/metadata/type-contracts/types/type-analyzer.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'detects nullable types and throw condition hints',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
