/**
 * @fileoverview Tests for extractors/data-flow/utils/managers/PatternDirectoryManager - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/data-flow/utils/managers/PatternDirectoryManager.js';

createAnalysisTestSuite({
  module: 'extractors/data-flow/utils/managers/PatternDirectoryManager',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
