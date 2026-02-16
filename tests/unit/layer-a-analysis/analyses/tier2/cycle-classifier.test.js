/**
 * @fileoverview Tests for cycle-classifier.js - Meta-Factory Pattern
 * 
 * Cycle Classifier - Clasifica ciclos de imports
 * 
 * @module tests/unit/layer-a-analysis/analyses/tier2/cycle-classifier
 */

import { describe } from 'vitest';
import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { classifyCycle, findCircularImports } from '#layer-a/analyses/tier2/cycle-classifier.js';

createAnalysisTestSuite({
  module: 'analyses/tier2/cycle-classifier',
  exports: { classifyCycle, findCircularImports },
  analyzeFn: classifyCycle,
  expectedFields: {
    severity: 'string',
    category: 'string',
    explanation: 'string',
    autoIgnore: 'boolean'
  },
  contractOptions: {
    async: false,
    exportNames: ['classifyCycle', 'findCircularImports'],
    expectedSafeResult: {
      severity: 'LOW',
      category: 'UNKNOWN',
      explanation: 'No cycle detected',
      autoIgnore: false
    }
  },
  specificTests: [
    {
      name: 'handles empty cycle gracefully',
      fn: () => {
        const result = classifyCycle([]);
        expect(result).toBeDefined();
        expect(result.category).toBe('UNKNOWN');
      }
    }
  ]
});
