/**
 * @fileoverview Tests for extractors/comprehensive-extractor/extractors/class-extractor/parsers/class-body - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/comprehensive-extractor/extractors/class-extractor/parsers/class-body.js';

createAnalysisTestSuite({
  module: 'extractors/comprehensive-extractor/extractors/class-extractor/parsers/class-body',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
