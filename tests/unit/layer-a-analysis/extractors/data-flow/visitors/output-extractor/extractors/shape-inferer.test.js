/**
 * @fileoverview Tests for extractors/data-flow/visitors/output-extractor/extractors/shape-inferer - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/data-flow/visitors/output-extractor/extractors/shape-inferer.js';

createAnalysisTestSuite({
  module: 'extractors/data-flow/visitors/output-extractor/extractors/shape-inferer',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
