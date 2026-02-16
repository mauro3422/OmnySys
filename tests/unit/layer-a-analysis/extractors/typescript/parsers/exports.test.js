/**
 * @fileoverview Tests for extractors/typescript/parsers/exports - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/typescript/parsers/exports.js';

createAnalysisTestSuite({
  module: 'extractors/typescript/parsers/exports',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
