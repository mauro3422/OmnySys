/**
 * @fileoverview Tests for Orphan Files Analysis - Meta-Factory Pattern
 * 
 * Detects files without dependencies (entry points or dead code).
 * Uses Meta-Factory pattern for standardized contracts.
 * 
 * @module tests/unit/layer-a-analysis/analyses/tier1/orphan-files
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { findOrphanFiles } from '#layer-a/analyses/tier1/orphan-files.js';

createAnalysisTestSuite({
  module: 'analyses/tier1/orphan-files',
  exports: { findOrphanFiles },
  analyzeFn: findOrphanFiles,
  expectedFields: {
    total: 'number',
    files: 'array',
    deadCodeCount: 'number'
  },
  contractOptions: {
    async: false,
    exportNames: ['findOrphanFiles'],
    expectedSafeResult: { total: 0, files: [], deadCodeCount: 0 }
  },
  specificTests: [
    {
      name: 'returns empty report when systemMap is empty',
      fn: () => {
        const out = findOrphanFiles({ files: {}, functions: {}, exportIndex: {} });
        expect(out.total).toBe(0);
        expect(out.files).toEqual([]);
      }
    },
    {
      name: 'detects orphan files without dependencies',
      fn: () => {
        const systemMap = {
          files: {
            'src/orphan.js': { usedBy: [], dependsOn: [] }
          },
          functions: { 'src/orphan.js': [] },
          exportIndex: {}
        };
        const out = findOrphanFiles(systemMap);
        expect(out.total).toBe(1);
        expect(out.files[0].file).toBe('src/orphan.js');
      }
    },
    {
      name: 'ignores test files',
      fn: () => {
        const systemMap = {
          files: {
            'src/test.spec.js': { usedBy: [], dependsOn: [] }
          },
          functions: { 'src/test.spec.js': [] },
          exportIndex: {}
        };
        const out = findOrphanFiles(systemMap);
        expect(out.total).toBe(0);
      }
    },
    {
      name: 'ignores files with dependencies',
      fn: () => {
        const systemMap = {
          files: {
            'src/used.js': { usedBy: ['src/main.js'], dependsOn: [] }
          },
          functions: { 'src/used.js': [] },
          exportIndex: {}
        };
        const out = findOrphanFiles(systemMap);
        expect(out.total).toBe(0);
      }
    }
  ]
});
