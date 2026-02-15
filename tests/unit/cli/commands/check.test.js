/**
 * @fileoverview Tests for CLI check command (Meta-Factory Pattern)
 * 
 * @module tests/unit/cli/commands/check
 */

import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import { check } from '#cli/commands/check.js';

createUtilityTestSuite({
  module: 'cli/commands/check',
  exports: { check },
  fn: check,
  expectedSafeResult: undefined,
  specificTests: [
    {
      name: 'exports check function',
      fn: () => {
        expect(typeof check).toBe('function');
        expect(check.length).toBe(1); // filePath
      }
    }
  ]
});
