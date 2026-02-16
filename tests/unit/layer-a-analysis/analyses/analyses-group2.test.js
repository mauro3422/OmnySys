/**
 * @fileoverview Analyses - Grupo 2: Retornan { total, byFile }
 */

import { describe } from 'vitest';
import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { findUnusedExports, findCircularFunctionDeps } from '#layer-a/analyses/tier1/index.js';
import { analyzeCoupling } from '#layer-a/analyses/tier2/coupling.js';

describe('Analyses - Estructura { total, byFile/coupledFiles }', () => {
  createAnalysisTestSuite({
    module: 'analyses/tier1/unused-exports',
    exports: { findUnusedExports },
    analyzeFn: findUnusedExports,
    expectedFields: { totalUnused: 'number', byFile: 'object', impact: 'string' },
    contractOptions: {
      async: false,
      exportNames: ['findUnusedExports'],
      expectedSafeResult: { totalUnused: 0, byFile: {}, impact: 'No unused exports detected' }
    }
  });

  createAnalysisTestSuite({
    module: 'analyses/tier2/coupling',
    exports: { analyzeCoupling },
    analyzeFn: analyzeCoupling,
    expectedFields: { total: 'number', coupledFiles: 'array' },
    contractOptions: {
      async: false,
      exportNames: ['analyzeCoupling'],
      expectedSafeResult: { total: 0, coupledFiles: [], maxCoupling: 0, concern: 'LOW' }
    }
  });
});
