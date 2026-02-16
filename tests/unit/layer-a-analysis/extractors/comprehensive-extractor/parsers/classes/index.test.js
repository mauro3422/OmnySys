/**
 * @fileoverview Tests for extractors/comprehensive-extractor/parsers/classes/index - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/comprehensive-extractor/parsers/classes/index.js';

createAnalysisTestSuite({
  module: 'extractors/comprehensive-extractor/parsers/classes/index',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
