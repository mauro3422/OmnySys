/**
 * @fileoverview Analyses - Grupo 3: Detectores y clasificadores
 */

import { describe } from 'vitest';
import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { 
  findCircularFunctionDeps,
  findDeepDependencyChains 
} from '#layer-a/analyses/tier1/index.js';

describe('Analyses - Detectores', () => {
  createAnalysisTestSuite({
    module: 'analyses/tier1/circular-function-deps',
    exports: { findCircularFunctionDeps },
    analyzeFn: findCircularFunctionDeps,
    expectedFields: { 
      total: 'number', 
      cycles: 'array', 
      classifications: 'array',
      validCount: 'number',
      problematicCount: 'number',
      hasMutualRecursion: 'boolean'
    },
    contractOptions: {
      async: false,
      exportNames: ['findCircularFunctionDeps'],
      expectedSafeResult: { 
        total: 0, 
        cycles: [], 
        classifications: [],
        validCount: 0,
        problematicCount: 0,
        hasMutualRecursion: false,
        recommendation: 'No circular function dependencies detected'
      }
    }
  });

  createAnalysisTestSuite({
    module: 'analyses/tier1/deep-chains',
    exports: { findDeepDependencyChains },
    analyzeFn: findDeepDependencyChains,
    expectedFields: { 
      totalDeepChains: 'number', 
      chains: 'array',
      maxDepth: 'number',
      recommendation: 'string'
    },
    contractOptions: {
      async: false,
      exportNames: ['findDeepDependencyChains'],
      expectedSafeResult: { 
        totalDeepChains: 0, 
        chains: [], 
        maxDepth: 0,
        recommendation: 'No dependency data available'
      }
    }
  });
});
