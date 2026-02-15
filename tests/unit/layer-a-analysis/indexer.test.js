/**
 * @fileoverview Tests for indexer.js - Main Entry Point (Meta-Factory Pattern)
 * 
 * Tests the indexProject function using standardized contracts.
 * 
 * @module tests/unit/layer-a-analysis/indexer
 */

import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import { indexProject } from '#layer-a/indexer.js';

/**
 * Meta-Factory Test Suite for indexer.js
 * 
 * Automatically generates:
 * - Structure Contract (exports verification)
 * - Error Handling Contract (null/undefined handling)
 */
createUtilityTestSuite({
  module: 'indexer',
  exports: { indexProject },
  fn: indexProject,
  expectedSafeResult: null,
  specificTests: [
    {
      name: 'exports indexProject function',
      fn: async () => {
        expect(typeof indexProject).toBe('function');
        expect(indexProject.length).toBe(2); // rootPath, options
      }
    },
    {
      name: 'handles invalid path gracefully',
      fn: async () => {
        // Should not throw, return safe result
        const result = await indexProject(null);
        expect(result).toBeNull();
      }
    }
  ]
});
