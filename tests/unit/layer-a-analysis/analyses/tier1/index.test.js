/**
 * @fileoverview Tests for tier1/index.js - Barrel Export - Meta-Factory Pattern
 */

import { describe, it, expect } from 'vitest';
import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import * as tier1Index from '#layer-a/analyses/tier1/index.js';

// Contract-based test suite
const suite = createUtilityTestSuite({
  module: 'analyses/tier1/index',
  exports: tier1Index,
  contractOptions: {
    exportNames: ['findUnusedExports', 'findOrphanFiles', 'findHotspots', 'findCircularFunctionDeps', 'findDeepDependencyChains', 'classifyFunctionCycle', 'classifyAllFunctionCycles']
  },
  specificTests: [
    {
      name: 'should export all tier1 analysis functions',
      fn: async () => {
        const tier1 = await import('#layer-a/analyses/tier1/index.js');
        
        expect(tier1).toHaveProperty('findUnusedExports');
        expect(tier1).toHaveProperty('findOrphanFiles');
        expect(tier1).toHaveProperty('findHotspots');
        expect(tier1).toHaveProperty('findCircularFunctionDeps');
        expect(tier1).toHaveProperty('classifyFunctionCycle');
        expect(tier1).toHaveProperty('classifyAllFunctionCycles');
        expect(tier1).toHaveProperty('findDeepDependencyChains');
      }
    },
    {
      name: 'should have findUnusedExports as a function',
      fn: async () => {
        const { findUnusedExports } = await import('#layer-a/analyses/tier1/index.js');
        expect(typeof findUnusedExports).toBe('function');
      }
    },
    {
      name: 'should have findOrphanFiles as a function',
      fn: async () => {
        const { findOrphanFiles } = await import('#layer-a/analyses/tier1/index.js');
        expect(typeof findOrphanFiles).toBe('function');
      }
    },
    {
      name: 'should have findHotspots as a function',
      fn: async () => {
        const { findHotspots } = await import('#layer-a/analyses/tier1/index.js');
        expect(typeof findHotspots).toBe('function');
      }
    },
    {
      name: 'should have findCircularFunctionDeps as a function',
      fn: async () => {
        const { findCircularFunctionDeps } = await import('#layer-a/analyses/tier1/index.js');
        expect(typeof findCircularFunctionDeps).toBe('function');
      }
    },
    {
      name: 'should have classifyFunctionCycle as a function',
      fn: async () => {
        const { classifyFunctionCycle } = await import('#layer-a/analyses/tier1/index.js');
        expect(typeof classifyFunctionCycle).toBe('function');
      }
    },
    {
      name: 'should have classifyAllFunctionCycles as a function',
      fn: async () => {
        const { classifyAllFunctionCycles } = await import('#layer-a/analyses/tier1/index.js');
        expect(typeof classifyAllFunctionCycles).toBe('function');
      }
    },
    {
      name: 'should have findDeepDependencyChains as a function',
      fn: async () => {
        const { findDeepDependencyChains } = await import('#layer-a/analyses/tier1/index.js');
        expect(typeof findDeepDependencyChains).toBe('function');
      }
    }
  ]
});

// Run the suite
describe('tier1/index.js', suite);
