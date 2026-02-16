/**
 * @fileoverview Tests for extractors/typescript/connections/breaking-changes - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/typescript/connections/breaking-changes.js';

createAnalysisTestSuite({
  module: 'extractors/typescript/connections/breaking-changes',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
