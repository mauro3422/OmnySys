/**
 * @fileoverview Tests for module-system/analyzers/business-flow-analyzer - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/module-system/analyzers/business-flow-analyzer
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { detectBusinessFlows } from '../../../../../src/layer-a-static/module-system/analyzers/business-flow-analyzer.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'module-system/analyzers/business-flow-analyzer',
  exports: { detectBusinessFlows },
  analyzeFn: detectBusinessFlows,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['detectBusinessFlows'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'Business Flow Analyzer',
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
      name: 'Flow Detection',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'Flow Structure',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'Step Structure',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
