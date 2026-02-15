/**
 * @fileoverview Tests for CLI analyze-file command (Meta-Factory Pattern)
 * 
 * @module tests/unit/cli/commands/analyze-file
 */

import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import { analyzeFile } from '#cli/commands/analyze-file.js';

createUtilityTestSuite({
  module: 'cli/commands/analyze-file',
  exports: { analyzeFile },
  fn: analyzeFile,
  expectedSafeResult: undefined,
  specificTests: [
    {
      name: 'exports analyzeFile function',
      fn: () => {
        expect(typeof analyzeFile).toBe('function');
        expect(analyzeFile.length).toBe(1); // filePath
      }
    }
  ]
});
