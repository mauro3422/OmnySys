/**
 * @fileoverview Tests for extractors/data-flow/utils/scope-manager - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/data-flow/utils/scope-manager.js';

createAnalysisTestSuite({
  module: 'extractors/data-flow/utils/scope-manager',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
