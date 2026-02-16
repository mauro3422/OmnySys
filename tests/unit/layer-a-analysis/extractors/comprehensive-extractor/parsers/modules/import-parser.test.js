/**
 * @fileoverview Tests for extractors/comprehensive-extractor/parsers/modules/import-parser - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/comprehensive-extractor/parsers/modules/import-parser.js';

createAnalysisTestSuite({
  module: 'extractors/comprehensive-extractor/parsers/modules/import-parser',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
