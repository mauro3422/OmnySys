/**
 * @fileoverview Tests for extractors/data-flow/visitors/output-extractor/extractors/side-effect-extractor - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/data-flow/visitors/output-extractor/extractors/side-effect-extractor.js';

createAnalysisTestSuite({
  module: 'extractors/data-flow/visitors/output-extractor/extractors/side-effect-extractor',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
