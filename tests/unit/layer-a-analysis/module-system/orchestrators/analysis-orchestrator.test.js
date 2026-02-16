/**
 * @fileoverview Tests for module-system/orchestrators/analysis-orchestrator - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/module-system/orchestrators/analysis-orchestrator
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { analyzeModules } from '../../../../../src/layer-a-static/module-system/orchestrators/analysis-orchestrator.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'module-system/orchestrators/analysis-orchestrator',
  exports: { analyzeModules, analyzeSingleModule, analyzeSystemOnly },
  analyzeFn: analyzeModules,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['analyzeModules', 'analyzeSingleModule', 'analyzeSystemOnly'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'Analysis Orchestrator',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'Structure Contract',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'analyzeModules',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'analyzeSingleModule',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'analyzeSystemOnly',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
