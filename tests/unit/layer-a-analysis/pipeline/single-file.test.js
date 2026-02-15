/**
 * @fileoverview Tests for pipeline/single-file.js (Meta-Factory Pattern)
 * 
 * Tests the analyzeSingleFile function using standardized contracts.
 * 
 * @module tests/unit/layer-a-analysis/pipeline/single-file
 */

import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import { analyzeSingleFile } from '#layer-a/pipeline/single-file.js';

/**
 * Meta-Factory Test Suite for single-file.js
 * 
 * Automatically generates:
 * - Structure Contract (exports verification)
 * - Error Handling Contract (null/undefined handling)
 */
createUtilityTestSuite({
  module: 'pipeline/single-file',
  exports: { analyzeSingleFile },
  fn: analyzeSingleFile,
  expectedSafeResult: null,
  specificTests: [
    {
      name: 'exports analyzeSingleFile function',
      fn: () => {
        expect(typeof analyzeSingleFile).toBe('function');
        expect(analyzeSingleFile.length).toBe(3); // absoluteRootPath, singleFile, options
      }
    },
    {
      name: 'handles null parameters gracefully',
      fn: async () => {
        const result = await analyzeSingleFile(null, null);
        expect(result).toBeNull();
      }
    }
  ]
});
