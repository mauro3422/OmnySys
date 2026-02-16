/**
 * @fileoverview Tests for extractors/comprehensive-extractor/extractors/export-extractor/parsers/es6-parser - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/comprehensive-extractor/extractors/export-extractor/parsers/es6-parser.js';

createAnalysisTestSuite({
  module: 'extractors/comprehensive-extractor/extractors/export-extractor/parsers/es6-parser',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
