/**
 * @fileoverview Tests for extractors/typescript/extractors/file-extractor - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/typescript/extractors/file-extractor.js';

createAnalysisTestSuite({
  module: 'extractors/typescript/extractors/file-extractor',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
