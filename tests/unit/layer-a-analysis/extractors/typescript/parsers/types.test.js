/**
 * @fileoverview Tests for extractors/typescript/parsers/types - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/typescript/parsers/types.js';

createAnalysisTestSuite({
  module: 'extractors/typescript/parsers/types',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
