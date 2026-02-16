/**
 * @fileoverview Tests for extractors/data-flow/core/data-flow-analyzer/validators/patterns - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/data-flow/core/data-flow-analyzer/validators/patterns.js';

createAnalysisTestSuite({
  module: 'extractors/data-flow/core/data-flow-analyzer/validators/patterns',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
