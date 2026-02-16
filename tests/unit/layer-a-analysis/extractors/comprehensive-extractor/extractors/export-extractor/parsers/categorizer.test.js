/**
 * @fileoverview Tests for extractors/comprehensive-extractor/extractors/export-extractor/parsers/categorizer - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/comprehensive-extractor/extractors/export-extractor/parsers/categorizer.js';

createAnalysisTestSuite({
  module: 'extractors/comprehensive-extractor/extractors/export-extractor/parsers/categorizer',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
