/**
 * @fileoverview Tests for extractors/typescript/extractors/connection-detector - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/typescript/extractors/connection-detector.js';

createAnalysisTestSuite({
  module: 'extractors/typescript/extractors/connection-detector',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
