/**
 * @fileoverview Tests for extractors/data-flow/utils/managers/PatternIndexManager - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/data-flow/utils/managers/PatternIndexManager.js';

createAnalysisTestSuite({
  module: 'extractors/data-flow/utils/managers/PatternIndexManager',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
