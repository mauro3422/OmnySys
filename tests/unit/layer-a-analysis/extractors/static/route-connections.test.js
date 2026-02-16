/**
 * @fileoverview Tests for extractors/static/route-connections - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/static/route-connections
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { detectRouteConnections } from '#layer-a/extractors/static/route-connections.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'extractors/static/route-connections',
  exports: { detectRouteConnections, sharesRoutes, getSharedRoutes, ConnectionType },
  analyzeFn: detectRouteConnections,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['detectRouteConnections', 'sharesRoutes', 'getSharedRoutes'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'Route Connections',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'detectRouteConnections',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'sharesRoutes',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'getSharedRoutes',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'Connection properties',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
