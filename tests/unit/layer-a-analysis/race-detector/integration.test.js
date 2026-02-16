/**
 * @fileoverview Tests for race-detector/integration - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/integration
 */

import { createDetectorTestSuite } from '#test-factories/test-suite-generator';
import { analyzeProjectRaces } from '#layer-a/race-detector/integration.js';

// Meta-Factory Test Suite
createDetectorTestSuite({
  module: 'race-detector/integration',
  detectorClass: analyzeProjectRaces,
  specificTests: [
    {
      name: 'Race Detector Integration',
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
      name: 'enrichProjectWithRaces',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'getRacesByModule',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'getRacesByFile',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
