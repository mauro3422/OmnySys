/**
 * @fileoverview Tests for extractors/typescript/connections/extensions - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/typescript/connections/extensions.js';

createAnalysisTestSuite({
  module: 'extractors/typescript/connections/extensions',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
