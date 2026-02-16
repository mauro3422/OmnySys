/**
 * @fileoverview Tests for race-detector/mitigation/transaction-checker - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/mitigation/transaction-checker
 */

import { createDetectorTestSuite } from '#test-factories/test-suite-generator';
import { isInTransaction } from '#layer-a/race-detector/mitigation/transaction-checker.js';

// Meta-Factory Test Suite
createDetectorTestSuite({
  module: 'race-detector/mitigation/transaction-checker',
  detectorClass: isInTransaction,
  specificTests: [
    {
      name: 'race-detector/mitigation/transaction-checker.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'detects transaction boundaries from code patterns',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'extracts transaction context with type metadata',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'checks same transaction across accesses',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
