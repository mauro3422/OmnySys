/**
 * @fileoverview Tests for extractors/data-flow/visitors/input-extractor/extractors/default-value-extractor - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/data-flow/visitors/input-extractor/extractors/default-value-extractor.js';

createAnalysisTestSuite({
  module: 'extractors/data-flow/visitors/input-extractor/extractors/default-value-extractor',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
