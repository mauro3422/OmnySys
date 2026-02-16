/**
 * @fileoverview Tests for Unused Exports Analysis - Meta-Factory Pattern
 * 
 * Detects exports that are never imported (dead code).
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
    byFile: 'object',
    impact: 'string'
  },
  contractOptions: {
    async: false,
    exportNames: ['findUnusedExports'],
    expectedSafeResult: { totalUnused: 0, byFile: {}, impact: 'No unused exports detected' }
  },
  specificTests: [
    {
      name: 'returns empty report when systemMap is empty',
      fn: () => {
        const out = findUnusedExports({ files: {}, functions: {}, function_links: [], exportIndex: {} });
        expect(out.totalUnused).toBe(0);
        expect(out.byFile).toEqual({});
      }
    },
    {
      name: 'detects unused exports',
      fn: () => {
        const systemMap = {
          files: {
            'src/module.js': { imports: [] }
          },
          functions: {
            'src/module.js': [
              { name: 'usedFunction', isExported: true, id: 'src/module.js::usedFunction' },
              { name: 'unusedFunction', isExported: true, id: 'src/module.js::unusedFunction' }
            ]
          },
          function_links: [
            { from: 'src/main.js::init', to: 'src/module.js::usedFunction' }
          ],
          exportIndex: {}
        };
        const out = findUnusedExports(systemMap);
        expect(out.totalUnused).toBe(1);
        expect(out.byFile['src/module.js']).toBeDefined();
        expect(out.byFile['src/module.js'][0].name).toBe('unusedFunction');
      }
    },
    {
      name: 'ignores test files',
      fn: () => {
        const systemMap = {
          files: {
            'src/test.spec.js': { imports: [] }
          },
          functions: {
            'src/test.spec.js': [{ name: 'testHelper', isExported: true, id: 'src/test.spec.js::testHelper' }]
          },
          function_links: [],
          exportIndex: {}
        };
        const out = findUnusedExports(systemMap);
        expect(out.totalUnused).toBe(0);
      }
    },
    {
      name: 'considers re-exports as used',
      fn: () => {
        const systemMap = {
          files: {
            'src/index.js': { imports: [] },
            'src/module.js': { imports: [] }
          },
          functions: {
            'src/module.js': [{ name: 'helper', isExported: true, id: 'src/module.js::helper' }]
          },
          function_links: [],
          exportIndex: {
            'src/index.js': {
              'helper': { type: 'reexport', sourceFile: 'src/module.js', sourceName: 'helper' }
            }
          }
        };
        const out = findUnusedExports(systemMap);
        expect(out.totalUnused).toBe(0);
      }
    }
  ]
});
