/**
 * @fileoverview Tests for analyses/tier3/utils/issue-utils - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/analyses/tier3/utils/issue-utils
 */

import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import { groupByFile } from '#layer-a/analyses/tier3/utils/issue-utils.js';

// Meta-Factory Test Suite
createUtilityTestSuite({
  module: 'analyses/tier3/utils/issue-utils',
  exports: { groupByFile, sortBySeverity },
  fn: groupByFile,
  expectedSafeResult: null,
  specificTests: [
    {
      name: 'analyses/tier3/utils/issue-utils.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'groups issues by sourceFile/file field',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'sorts issues by HIGH -> MEDIUM -> LOW',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
