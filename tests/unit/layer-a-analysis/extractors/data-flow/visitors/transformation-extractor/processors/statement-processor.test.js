/**
 * @fileoverview Tests for extractors/data-flow/visitors/transformation-extractor/processors/statement-processor - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/data-flow/visitors/transformation-extractor/processors/statement-processor.js';

createAnalysisTestSuite({
  module: 'extractors/data-flow/visitors/transformation-extractor/processors/statement-processor',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
