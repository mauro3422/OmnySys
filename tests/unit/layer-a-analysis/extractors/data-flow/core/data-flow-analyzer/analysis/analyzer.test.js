/**
 * @fileoverview Tests for extractors/data-flow/core/data-flow-analyzer/analysis/analyzer - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/data-flow/core/data-flow-analyzer/analysis/analyzer.js';

createAnalysisTestSuite({
  module: 'extractors/data-flow/core/data-flow-analyzer/analysis/analyzer',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
