/**
 * @fileoverview Tests for V2_ALGORITHMS_PROPOSAL.js - Meta-Factory Pattern
 * 
 * V2 Algorithms for deep dependency chains and shared object analysis.
 * Uses Meta-Factory pattern for standardized contracts.
 * 
 * @module tests/unit/layer-a-analysis/analyses/V2_ALGORITHMS_PROPOSAL
 */

import { describe, it, expect } from 'vitest';
import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import {
  findDeepDependencyChainsV2,
  analyzeSharedObjectsV2
} from '#layer-a/analyses/V2_ALGORITHMS_PROPOSAL.js';
import { SystemMapBuilder } from '../../../factories/root-infrastructure-test.factory.js';

// Test suite for findDeepDependencyChainsV2
createAnalysisTestSuite({
  module: 'analyses/V2_ALGORITHMS_PROPOSAL/findDeepDependencyChainsV2',
  exports: { findDeepDependencyChainsV2 },
  analyzeFn: findDeepDependencyChainsV2,
  expectedFields: {
    totalDeepChains: 'number',
    chains: 'array',
    maxDepth: 'number'
  },
  contractOptions: {
    async: false,
    exportNames: ['findDeepDependencyChainsV2'],
    expectedSafeResult: { totalDeepChains: 0, chains: [], maxDepth: 0 }
  },
  createMockInput: () => SystemMapBuilder.create()
    .withFile('src/a.js')
    .withFile('src/b.js')
    .withFile('src/c.js')
    .withFunctionLink('src/a.js:func1', 'src/b.js:func2')
    .withFunctionLink('src/b.js:func2', 'src/c.js:func3')
    .build(),
  specificTests: [
    {
      name: 'returns structured result for empty maps',
      fn: () => {
        const out = findDeepDependencyChainsV2({ 
          function_links: [], 
          objectExports: {}, 
          files: {} 
        });
        expect(out.totalDeepChains).toBe(0);
        expect(Array.isArray(out.chains)).toBe(true);
      }
    },
    {
      name: 'detects deep dependency chains',
      fn: () => {
        const systemMap = SystemMapBuilder.create()
          .withFile('src/a.js')
          .withFile('src/b.js')
          .withFile('src/c.js')
          .withFile('src/d.js')
          .withFunctionLink('src/a.js:main', 'src/b.js:helper1')
          .withFunctionLink('src/b.js:helper1', 'src/c.js:helper2')
          .withFunctionLink('src/c.js:helper2', 'src/d.js:deepFunc')
          .build();
        
        const out = findDeepDependencyChainsV2(systemMap);
        expect(out.totalDeepChains).toBeGreaterThan(0);
        expect(out.maxDepth).toBeGreaterThanOrEqual(3);
      }
    }
  ]
});

// Test suite for analyzeSharedObjectsV2
createAnalysisTestSuite({
  module: 'analyses/V2_ALGORITHMS_PROPOSAL/analyzeSharedObjectsV2',
  exports: { analyzeSharedObjectsV2 },
  analyzeFn: analyzeSharedObjectsV2,
  expectedFields: {
    total: 'number',
    criticalObjects: 'array',
    sharedObjects: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['analyzeSharedObjectsV2'],
    expectedSafeResult: { total: 0, criticalObjects: [], sharedObjects: [] }
  },
  createMockInput: () => ({
    objectExports: {
      'src/store.js': [{ name: 'appStore', isMutable: true, properties: ['setUser'] }]
    },
    files: {
      'src/store.js': { imports: [] },
      'src/component.js': { imports: [{ specifiers: [{ imported: 'appStore' }], source: './store.js' }] }
    }
  }),
  specificTests: [
    {
      name: 'analyzes shared objects and returns structured output',
      fn: () => {
        const out = analyzeSharedObjectsV2({
          objectExports: {
            'src/store.js': [{ name: 'appStore', isMutable: true, properties: ['setUser'] }]
          },
          files: {
            'src/store.js': { imports: [] },
            'src/component.js': { imports: [{ specifiers: [{ imported: 'appStore' }], source: './store.js' }] }
          }
        });
        expect(out).toHaveProperty('total');
        expect(out).toHaveProperty('criticalObjects');
        expect(Array.isArray(out.criticalObjects)).toBe(true);
      }
    },
    {
      name: 'identifies critical mutable objects',
      fn: () => {
        const out = analyzeSharedObjectsV2({
          objectExports: {
            'src/store.js': [
              { name: 'mutableStore', isMutable: true, properties: ['setData', 'clear'] },
              { name: 'immutableStore', isMutable: false, properties: ['getData'] }
            ]
          },
          files: {
            'src/store.js': { imports: [] },
            'src/app.js': { imports: [{ specifiers: [{ imported: 'mutableStore' }] }] }
          }
        });
        expect(out.criticalObjects.length).toBeGreaterThan(0);
      }
    }
  ]
});
