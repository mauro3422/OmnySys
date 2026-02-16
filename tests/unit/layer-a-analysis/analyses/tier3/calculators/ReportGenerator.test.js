/**
 * @fileoverview Tests for analyses/tier3/calculators/ReportGenerator - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/analyses/tier3/calculators/ReportGenerator
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { ReportGenerator } from '#layer-a/analyses/tier3/calculators/ReportGenerator.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'analyses/tier3/calculators/ReportGenerator',
  exports: { ReportGenerator },
  analyzeFn: ReportGenerator,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['ReportGenerator'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'analyses/tier3/calculators/ReportGenerator.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
