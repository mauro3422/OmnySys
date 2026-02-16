/**
 * @fileoverview Tests for extractors/typescript/parsers/generics - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/typescript/parsers/generics.js';

createAnalysisTestSuite({
  module: 'extractors/typescript/parsers/generics',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
