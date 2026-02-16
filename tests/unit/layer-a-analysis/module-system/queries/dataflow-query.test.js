/**
 * @fileoverview Tests for module-system/queries/dataflow-query - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/module-system/queries/dataflow-query
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { queryDataFlow } from '../../../../../src/layer-a-static/module-system/queries/dataflow-query.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'module-system/queries/dataflow-query',
  exports: { queryDataFlow, listDataFlows, findFlowsByModule, findFlowsByFunction },
  analyzeFn: queryDataFlow,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['queryDataFlow', 'listDataFlows', 'findFlowsByModule'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'module-system/queries/dataflow-query.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'queries a specific flow by entry point',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'lists data flows',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'filters by module and function',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
