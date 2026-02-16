/**
 * @fileoverview Tier 1 Analyses - Meta-Factory
 * 
 * Agrupa todos los análisis de Tier 1
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { 
  findHotspots, 
  findOrphanFiles, 
  findUnusedExports,
  findCircularFunctionDeps,
  findDeepDependencyChains,
  classifyFunctionCycle
} from '#layer-a/analyses/tier1/index.js';

describe('Analyses Tier 1', () => {
  createAnalysisTestSuite({
    module: 'analyses/tier1/hotspots',
    exports: { findHotspots },
    analyzeFn: findHotspots,
    expectedFields: { total: 'number', files: 'array', maxHeat: 'number' },
    contractOptions: {
      async: false,
      exportNames: ['findHotspots'],
      expectedSafeResult: { total: 0, files: [], maxHeat: 0, criticalCount: 0 }
    }
  });

  createAnalysisTestSuite({
    module: 'analyses/tier1/orphan-files',
    exports: { findOrphanFiles },
    analyzeFn: findOrphanFiles,
    expectedFields: { total: 'number', files: 'array' },
    contractOptions: {
      async: false,
      exportNames: ['findOrphanFiles'],
      expectedSafeResult: { total: 0, files: [] }
    }
  });

  createAnalysisTestSuite({
    module: 'analyses/tier1/unused-exports',
    exports: { findUnusedExports },
    analyzeFn: findUnusedExports,
    expectedFields: { totalUnused: 'number', byFile: 'object' },
    contractOptions: {
      async: false,
      exportNames: ['findUnusedExports'],
      expectedSafeResult: { totalUnused: 0, byFile: {} }
    }
  });

  createAnalysisTestSuite({
    module: 'analyses/tier1/circular-function-deps',
    exports: { findCircularFunctionDeps },
    analyzeFn: findCircularFunctionDeps,
    expectedFields: { total: 'number', cycles: 'array' },
    contractOptions: {
      async: false,
      exportNames: ['findCircularFunctionDeps'],
      expectedSafeResult: { total: 0, cycles: [], validCount: 0, problematicCount: 0 }
    }
  });

  createAnalysisTestSuite({
    module: 'analyses/tier1/deep-chains',
    exports: { findDeepDependencyChains },
    analyzeFn: findDeepDependencyChains,
    expectedFields: { totalDeepChains: 'number', chains: 'array', maxDepth: 'number' },
    contractOptions: {
      async: false,
      exportNames: ['findDeepDependencyChains'],
      expectedSafeResult: { totalDeepChains: 0, chains: [], maxDepth: 0 }
    }
  });

  createAnalysisTestSuite({
    module: 'analyses/tier1/function-cycle-classifier',
    exports: { classifyFunctionCycle },
    analyzeFn: classifyFunctionCycle,
    expectedFields: { category: 'string', severity: 'string' },
    contractOptions: {
      async: false,
      exportNames: ['classifyFunctionCycle'],
      expectedSafeResult: { category: 'SIMPLE', severity: 'LOW' }
    }
  });
});
