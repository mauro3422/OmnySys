/**
 * @fileoverview Tests for extractors/comprehensive-extractor/metrics/metrics-calculator - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/comprehensive-extractor/metrics/metrics-calculator.js';

createAnalysisTestSuite({
  module: 'extractors/comprehensive-extractor/metrics/metrics-calculator',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
