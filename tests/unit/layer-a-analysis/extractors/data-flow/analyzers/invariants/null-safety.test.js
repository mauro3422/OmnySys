/**
 * @fileoverview Tests for extractors/data-flow/analyzers/invariants/null-safety - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/data-flow/analyzers/invariants/null-safety.js';

createAnalysisTestSuite({
  module: 'extractors/data-flow/analyzers/invariants/null-safety',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
