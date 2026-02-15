/**
 * @fileoverview Tests for CLI consolidate command (Meta-Factory Pattern)
 * 
 * @module tests/unit/cli/commands/consolidate
 */

import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import { consolidate } from '#cli/commands/consolidate.js';

createUtilityTestSuite({
  module: 'cli/commands/consolidate',
  exports: { consolidate },
  fn: consolidate,
  expectedSafeResult: undefined,
  specificTests: [
    {
      name: 'exports consolidate function',
      fn: () => {
        expect(typeof consolidate).toBe('function');
        expect(consolidate.length).toBe(1); // projectPath
      }
    }
  ]
});
