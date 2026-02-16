/**
 * @fileoverview Tests for extractors/comprehensive-extractor/extractors/export-extractor/extractors/details - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/comprehensive-extractor/extractors/export-extractor/extractors/details.js';

createAnalysisTestSuite({
  module: 'extractors/comprehensive-extractor/extractors/export-extractor/extractors/details',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
