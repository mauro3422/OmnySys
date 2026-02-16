/**
 * @fileoverview ChainSummaryBuilder.test.js
 * 
 * Tests for ChainSummaryBuilder - Building and updating chain summaries
 * 
 * @module tests/unit/molecular-chains/builders/ChainSummaryBuilder
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChainSummaryBuilder } from '#molecular-chains/builders/ChainSummaryBuilder.js';
import { ChainBuilderFactory } from '../molecular-chains-test.factory.js';

describe('ChainSummaryBuilder', () => {
  let builder;
  let factory;

  beforeEach(() => {
    builder = new ChainSummaryBuilder();
    factory = new ChainBuilderFactory();
  });

  // ============================================================================
  // Constructor
  // ============================================================================
  describe('constructor', () => {
    it('should create ChainSummaryBuilder', () => {
      expect(builder).toBeDefined();
    });
  });

  // ============================================================================
  // Build Summary
  // ============================================================================
  describe('build', () => {
    it('should return zero stats for empty chains array', () => {
      const summary = builder.build([]);
      
      expect(summary.totalChains).toBe(0);
      expect(summary.totalFunctions).toBe(0);
      expect(summary.avgChainLength).toBe(0);
      expect(summary.maxComplexity).toBe(0);
      expect(summary.chainsWithSideEffects).toBe(0);
    });

    it('should calculate totalChains correctly', () => {
      const chains = [
        { steps: [], complexity: 0, hasSideEffects: false },
        { steps: [], complexity: 0, hasSideEffects: false }
      ];
      
      const summary = builder.build(chains);
      
      expect(summary.totalChains).toBe(2);
    });

    it('should calculate total unique functions', () => {
      const chains = [
        { steps: [{ function: 'fn1' }, { function: 'fn2' }] },
        { steps: [{ function: 'fn2' }, { function: 'fn3' }] }
      ];
      
      const summary = builder.build(chains);
      
      expect(summary.totalFunctions).toBe(3);
    });

    it('should calculate average chain length', () => {
      const chains = [
        { steps: [{ function: 'a' }] },
        { steps: [{ function: 'a' }, { function: 'b' }] },
        { steps: [{ function: 'a' }, { function: 'b' }, { function: 'c' }] }
      ];
      
      const summary = builder.build(chains);
      
      expect(summary.avgChainLength).toBe(2); // (1 + 2 + 3) / 3
    });

    it('should calculate max complexity', () => {
      const chains = [
        { steps: [], complexity: 5 },
        { steps: [], complexity: 10 },
        { steps: [], complexity: 3 }
      ];
      
      const summary = builder.build(chains);
      
      expect(summary.maxComplexity).toBe(10);
    });

    it('should count chains with side effects', () => {
      const chains = [
        { steps: [], complexity: 0, hasSideEffects: true },
        { steps: [], complexity: 0, hasSideEffects: false },
        { steps: [], complexity: 0, hasSideEffects: true }
      ];
      
      const summary = builder.build(chains);
      
      expect(summary.chainsWithSideEffects).toBe(2);
    });

    it('should handle single chain', () => {
      const chains = [
        { steps: [{ function: 'fn1' }], complexity: 5, hasSideEffects: false }
      ];
      
      const summary = builder.build(chains);
      
      expect(summary.totalChains).toBe(1);
      expect(summary.totalFunctions).toBe(1);
      expect(summary.avgChainLength).toBe(1);
    });

    it('should handle chains with empty steps', () => {
      const chains = [
        { steps: [], complexity: 0, hasSideEffects: false },
        { steps: [], complexity: 0, hasSideEffects: false }
      ];
      
      const summary = builder.build(chains);
      
      expect(summary.totalChains).toBe(2);
      expect(summary.avgChainLength).toBe(0);
    });

    it('should handle zero complexity values', () => {
      const chains = [
        { steps: [], complexity: 0, hasSideEffects: false },
        { steps: [], complexity: 0, hasSideEffects: false }
      ];
      
      const summary = builder.build(chains);
      
      expect(summary.maxComplexity).toBe(0);
    });

    it('should handle negative complexity gracefully', () => {
      const chains = [
        { steps: [], complexity: -5, hasSideEffects: false },
        { steps: [], complexity: 10, hasSideEffects: false }
      ];
      
      const summary = builder.build(chains);
      
      expect(summary.maxComplexity).toBe(10);
    });
  });

  // ============================================================================
  // Recalculate Metrics
  // ============================================================================
  describe('recalculateMetrics', () => {
    it('should recalculate totalFunctions from steps', () => {
      const chain = {
        steps: [
          { function: 'fn1', internalTransforms: [], output: { type: 'pure' } },
          { function: 'fn2', internalTransforms: [], output: { type: 'pure' } },
          { function: 'fn1', internalTransforms: [], output: { type: 'pure' } } // duplicate
        ],
        totalFunctions: 0,
        totalTransforms: 0,
        hasSideEffects: false,
        complexity: 0
      };
      
      builder.recalculateMetrics(chain);
      
      expect(chain.totalFunctions).toBe(2); // unique functions
    });

    it('should recalculate totalTransforms from internalTransforms', () => {
      const chain = {
        steps: [
          { function: 'fn1', internalTransforms: [{}, {}], output: { type: 'pure' } },
          { function: 'fn2', internalTransforms: [{}], output: { type: 'pure' } }
        ],
        totalFunctions: 0,
        totalTransforms: 0,
        hasSideEffects: false,
        complexity: 0
      };
      
      builder.recalculateMetrics(chain);
      
      expect(chain.totalTransforms).toBe(3);
    });

    it('should detect side effects from output type', () => {
      const chain = {
        steps: [
          { function: 'fn1', internalTransforms: [], output: { type: 'pure' } },
          { function: 'fn2', internalTransforms: [], output: { type: 'mixed' } }
        ],
        totalFunctions: 0,
        totalTransforms: 0,
        hasSideEffects: false,
        complexity: 0
      };
      
      builder.recalculateMetrics(chain);
      
      expect(chain.hasSideEffects).toBe(true);
    });

    it('should detect side_effects output type', () => {
      const chain = {
        steps: [
          { function: 'fn1', internalTransforms: [], output: { type: 'side_effect' } }
        ],
        totalFunctions: 0,
        totalTransforms: 0,
        hasSideEffects: false,
        complexity: 0
      };
      
      builder.recalculateMetrics(chain);
      
      expect(chain.hasSideEffects).toBe(true);
    });

    it('should not flag pure functions as having side effects', () => {
      const chain = {
        steps: [
          { function: 'fn1', internalTransforms: [], output: { type: 'pure' } },
          { function: 'fn2', internalTransforms: [], output: { type: 'pure' } }
        ],
        totalFunctions: 0,
        totalTransforms: 0,
        hasSideEffects: true,
        complexity: 0
      };
      
      builder.recalculateMetrics(chain);
      
      expect(chain.hasSideEffects).toBe(false);
    });

    it('should calculate complexity based on transforms', () => {
      const chain = {
        steps: [
          { function: 'fn1', internalTransforms: [{}], output: { type: 'pure' } },
          { function: 'fn2', internalTransforms: [{}, {}, {}], output: { type: 'pure' } }
        ],
        totalFunctions: 0,
        totalTransforms: 0,
        hasSideEffects: false,
        complexity: 0
      };
      
      builder.recalculateMetrics(chain);
      
      // Each transform contributes 2 to complexity
      expect(chain.complexity).toBe(8); // (1 + 3) * 2
    });

    it('should handle chain with no steps', () => {
      const chain = {
        steps: [],
        totalFunctions: 5,
        totalTransforms: 5,
        hasSideEffects: true,
        complexity: 100
      };
      
      builder.recalculateMetrics(chain);
      
      expect(chain.totalFunctions).toBe(0);
      expect(chain.totalTransforms).toBe(0);
      expect(chain.hasSideEffects).toBe(false);
      expect(chain.complexity).toBe(0);
    });

    it('should handle steps with no internalTransforms', () => {
      const chain = {
        steps: [
          { function: 'fn1', output: { type: 'pure' } },
          { function: 'fn2', output: { type: 'pure' } }
        ],
        totalFunctions: 0,
        totalTransforms: 0,
        hasSideEffects: false,
        complexity: 0
      };
      
      builder.recalculateMetrics(chain);
      
      expect(chain.totalTransforms).toBe(0);
      expect(chain.complexity).toBe(0);
    });
  });

  // ============================================================================
  // Integration with ChainBuilder
  // ============================================================================
  describe('integration with chains', () => {
    it('should build accurate summary for complex chains', async () => {
      const { atoms } = factory.createMultiStepChain(['A', 'B', 'C', 'D'], {
        entryOverrides: { complexity: 2, hasSideEffects: false },
        stepOverrides: [
          { complexity: 3, hasSideEffects: true },
          { complexity: 2, hasSideEffects: false },
          { complexity: 1, hasSideEffects: false }
        ]
      });

      // Add another chain
      factory.createMultiStepChain(['X', 'Y'], {
        entryOverrides: { complexity: 5, hasSideEffects: false },
        stepOverrides: [{ complexity: 3, hasSideEffects: true }]
      });
      
      const { ChainBuilder } = await import('#molecular-chains/builders/ChainBuilder.js');
      const chainBuilder = new ChainBuilder(factory.getAtoms());
      const result = chainBuilder.build();
      
      expect(result.summary.totalChains).toBe(2);
      expect(result.summary.totalFunctions).toBe(6); // A, B, C, D, X, Y
      expect(result.summary.avgChainLength).toBe(3); // (4 + 2) / 2
      expect(result.summary.chainsWithSideEffects).toBe(2);
    });
  });

  // ============================================================================
  // Default Export
  // ============================================================================
  describe('default export', () => {
    it('should export ChainSummaryBuilder as default', async () => {
      const module = await import('#molecular-chains/builders/ChainSummaryBuilder.js');
      
      expect(module.default).toBe(ChainSummaryBuilder);
    });
  });
});
