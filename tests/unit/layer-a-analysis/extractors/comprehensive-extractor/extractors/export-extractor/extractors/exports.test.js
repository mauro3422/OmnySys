/**
 * @fileoverview Tests for extractors/comprehensive-extractor/extractors/export-extractor/extractors/exports - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/comprehensive-extractor/extractors/export-extractor/extractors/exports.js';

createAnalysisTestSuite({
  module: 'extractors/comprehensive-extractor/extractors/export-extractor/extractors/exports',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
