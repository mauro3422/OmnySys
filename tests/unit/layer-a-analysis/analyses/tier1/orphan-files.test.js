/**
 * @fileoverview Tests for Tier 1 Orphan Files Analysis
 * 
 * Detects files that are not connected to the main codebase.
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
  specificTests: [
    {
      name: 'flags isolated files as dead code when they are not entry points',
      fn: () => {
        const systemMap = {
          files: {
            'src/feature/utils.js': { usedBy: [], dependsOn: [] }
          },
          exportIndex: {},
          functions: {
            'src/feature/utils.js': [{ name: 'helper' }]
          }
        };
        const out = findOrphanFiles(systemMap);
        expect(out.total).toBe(1);
        expect(out.files[0].type).toBe('DEAD_CODE');
      }
    }
  ]
});
