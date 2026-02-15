/**
 * @fileoverview Tests for Tier 1 Unused Exports Analysis
 * 
 * Detects exports that are not used by other modules.
 * Uses Meta-Factory pattern for standardized contracts.
 * 
 * @module tests/unit/layer-a-analysis/analyses/tier1/unused-exports
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { findUnusedExports } from '#layer-a/analyses/tier1/unused-exports.js';

createAnalysisTestSuite({
  module: 'analyses/tier1/unused-exports',
  exports: { findUnusedExports },
  analyzeFn: findUnusedExports,
  expectedFields: {
    totalUnused: 'number',
    byFile: 'object'
  },
  specificTests: [
    {
      name: 'reports unused exports when they are not used/public/script exports',
      fn: () => {
        const filePath = 'src/layer-a-static/internal-module.js';
        const systemMap = {
          function_links: [],
          exportIndex: {},
          files: {
            [filePath]: { imports: [] }
          },
          functions: {
            [filePath]: [{ id: `${filePath}::hiddenFn`, name: 'hiddenFn', line: 1, isExported: true }]
          }
        };
        const out = findUnusedExports(systemMap);
        expect(out.totalUnused).toBe(1);
        expect(out.byFile[filePath][0].name).toBe('hiddenFn');
      }
    }
  ]
});
