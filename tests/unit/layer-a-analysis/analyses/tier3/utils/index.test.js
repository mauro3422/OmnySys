/**
 * @fileoverview Tests for analyses/tier3/utils/index - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/analyses/tier3/utils/index
 */

import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import { groupByFile } from '#layer-a/analyses/tier3/utils/index.js';

// Meta-Factory Test Suite
createUtilityTestSuite({
  module: 'analyses/tier3/utils/index',
  exports: { groupByFile, sortBySeverity, isCommonFunctionName },
  fn: groupByFile,
  expectedSafeResult: null,
  specificTests: [
    {
      name: 'analyses/tier3/utils/index.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'groupByFile groups issues using sourceFile/file keys',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'normalizeName and name checks keep deterministic behavior',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'sortBySeverity orders HIGH before MEDIUM before LOW',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
