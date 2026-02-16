/**
 * @fileoverview Tests for extractors/data-flow/core/data-flow-analyzer/index - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/data-flow/core/data-flow-analyzer/index.js';

createAnalysisTestSuite({
  module: 'extractors/data-flow/core/data-flow-analyzer/index',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
