/**
 * @fileoverview Tests for extractors/data-flow/visitors/input-extractor/analyzers/usage-analyzer - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/data-flow/visitors/input-extractor/analyzers/usage-analyzer.js';

createAnalysisTestSuite({
  module: 'extractors/data-flow/visitors/input-extractor/analyzers/usage-analyzer',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
