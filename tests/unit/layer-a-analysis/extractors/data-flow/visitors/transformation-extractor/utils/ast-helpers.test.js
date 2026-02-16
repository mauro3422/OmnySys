/**
 * @fileoverview Tests for extractors/data-flow/visitors/transformation-extractor/utils/ast-helpers - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/data-flow/visitors/transformation-extractor/utils/ast-helpers.js';

createAnalysisTestSuite({
  module: 'extractors/data-flow/visitors/transformation-extractor/utils/ast-helpers',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
