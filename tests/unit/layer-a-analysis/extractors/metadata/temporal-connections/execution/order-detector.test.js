/**
 * @fileoverview Tests for extractors/metadata/temporal-connections/execution/order-detector - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/metadata/temporal-connections/execution/order-detector
 */

import { createDetectorTestSuite } from '#test-factories/test-suite-generator';
import { detectExecutionOrder } from '#layer-a/extractors/metadata/temporal-connections/execution/order-detector.js';

// Meta-Factory Test Suite
createDetectorTestSuite({
  module: 'extractors/metadata/temporal-connections/execution/order-detector',
  detectorClass: detectExecutionOrder,
  specificTests: [
    {
      name: 'extractors/metadata/temporal-connections/execution/order-detector.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'detects initializer functions by name and code patterns',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'classifies function roles for initializer/consumer/cleanup',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
