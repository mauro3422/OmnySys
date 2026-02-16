/**
 * @fileoverview Analyses - Grupo 1: Retornan { total, items }
 */

import { describe } from 'vitest';
import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { findHotspots, findOrphanFiles } from '#layer-a/analyses/tier1/index.js';

describe('Analyses - Estructura { total, items }', () => {
  // Grupo 1: Analyses que retornan { total, items/array }
  createAnalysisTestSuite({
    module: 'analyses/tier1/hotspots',
    exports: { findHotspots },
    analyzeFn: findHotspots,
    expectedFields: { total: 'number', functions: 'array' },
    contractOptions: {
      async: false,
      exportNames: ['findHotspots'],
      expectedSafeResult: { total: 0, functions: [], criticalCount: 0 }
    }
  });

  createAnalysisTestSuite({
    module: 'analyses/tier1/orphan-files',
    exports: { findOrphanFiles },
    analyzeFn: findOrphanFiles,
    expectedFields: { total: 'number', files: 'array', deadCodeCount: 'number' },
    contractOptions: {
      async: false,
      exportNames: ['findOrphanFiles'],
      expectedSafeResult: { total: 0, files: [], deadCodeCount: 0 }
    }
  });
});
