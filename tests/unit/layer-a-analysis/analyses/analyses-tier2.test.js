/**
 * @fileoverview Tier 2 Analyses - Meta-Factory
 * 
 * Agrupa todos los análisis de Tier 2
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { 
  analyzeCoupling,
  classifyCycle,
  extractCycleMetadata,
  deriveCycleProperties,
  evaluateRules,
  analyzeReachability,
  analyzeReexportChains,
  detectSideEffectMarkers,
  findUnresolvedImports,
  findUnusedImports
} from '#layer-a/analyses/tier2/index.js';

describe('Analyses Tier 2', () => {
  createAnalysisTestSuite({
    module: 'analyses/tier2/coupling',
    exports: { analyzeCoupling },
    analyzeFn: analyzeCoupling,
    expectedFields: { total: 'number', couplings: 'array' },
    contractOptions: {
      async: false,
      exportNames: ['analyzeCoupling'],
      expectedSafeResult: { total: 0, couplings: [], maxCoupling: 0 }
    }
  });

  createAnalysisTestSuite({
    module: 'analyses/tier2/cycle-classifier',
    exports: { classifyCycle },
    analyzeFn: classifyCycle,
    expectedFields: { severity: 'string', category: 'string' },
    contractOptions: {
      async: false,
      exportNames: ['classifyCycle'],
      expectedSafeResult: { severity: 'LOW', category: 'UNKNOWN', autoIgnore: false }
    }
  });

  createAnalysisTestSuite({
    module: 'analyses/tier2/reachability',
    exports: { analyzeReachability },
    analyzeFn: analyzeReachability,
    expectedFields: { reachable: 'array', unreachable: 'array' },
    contractOptions: {
      async: false,
      exportNames: ['analyzeReachability'],
      expectedSafeResult: { reachable: [], unreachable: [] }
    }
  });
});
