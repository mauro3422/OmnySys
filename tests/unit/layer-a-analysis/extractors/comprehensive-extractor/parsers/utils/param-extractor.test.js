/**
 * @fileoverview Tests for extractors/comprehensive-extractor/parsers/utils/param-extractor - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/comprehensive-extractor/parsers/utils/param-extractor.js';

createAnalysisTestSuite({
  module: 'extractors/comprehensive-extractor/parsers/utils/param-extractor',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
