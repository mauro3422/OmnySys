/**
 * @fileoverview Tests for extractors/comprehensive-extractor/extractors/class-extractor/utils/method-helpers - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/comprehensive-extractor/extractors/class-extractor/utils/method-helpers.js';

createAnalysisTestSuite({
  module: 'extractors/comprehensive-extractor/extractors/class-extractor/utils/method-helpers',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
