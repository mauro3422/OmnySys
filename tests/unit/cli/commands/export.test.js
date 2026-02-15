/**
 * @fileoverview Tests for CLI export command (Meta-Factory Pattern)
 * 
 * @module tests/unit/cli/commands/export
 */

import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import { exportMap } from '#cli/commands/export.js';

createUtilityTestSuite({
  module: 'cli/commands/export',
  exports: { exportMap },
  fn: exportMap,
  expectedSafeResult: undefined,
  specificTests: [
    {
      name: 'exports exportMap function',
      fn: () => {
        expect(typeof exportMap).toBe('function');
        expect(exportMap.length).toBe(1); // projectPath
      }
    }
  ]
});
