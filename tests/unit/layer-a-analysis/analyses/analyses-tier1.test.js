/**
 * @fileoverview Tier 1 Analyses - Meta-Factory
 * 
 * Agrupa todos los análisis de Tier 1 con contratos completos
 */

import { describe } from 'vitest';
import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { 
  findHotspots, 
  findOrphanFiles, 
  findUnusedExports,
  findCircularFunctionDeps,
  findDeepDependencyChains
} from '#layer-a/analyses/tier1/index.js';

describe('Analyses Tier 1', () => {
  createAnalysisTestSuite({
    module: 'analyses/tier1',
    exports: { 
      findHotspots, 
      findOrphanFiles, 
      findUnusedExports,
      findCircularFunctionDeps,
      findDeepDependencyChains
    },
    analyzeFn: findHotspots,
    expectedFields: { 
      total: 'number', 
      functions: 'array',
      criticalCount: 'number'
    },
    contractOptions: {
      async: false,
      exportNames: ['findHotspots', 'findOrphanFiles', 'findUnusedExports', 'findCircularFunctionDeps', 'findDeepDependencyChains'],
      expectedSafeResult: { total: 0, functions: [], criticalCount: 0 }
    },
    specificTests: [
      {
        name: 'all tier1 functions are exported',
        fn: () => {
          expect(typeof findHotspots).toBe('function');
          expect(typeof findOrphanFiles).toBe('function');
          expect(typeof findUnusedExports).toBe('function');
          expect(typeof findCircularFunctionDeps).toBe('function');
          expect(typeof findDeepDependencyChains).toBe('function');
        }
      }
    ]
  });
});
