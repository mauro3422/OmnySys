/**
 * @fileoverview Tests for circular-function-deps.js
 * 
 * Detects circular dependencies between functions.
 * Uses Meta-Factory pattern for standardized contracts.
 * 
 * @module tests/unit/layer-a-analysis/analyses/tier1/circular-function-deps
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { findCircularFunctionDeps } from '#layer-a/analyses/tier1/circular-function-deps.js';
import { SystemMapBuilder, AtomsIndexBuilder } from '#test-factories/root-infrastructure-test.factory.js';

createAnalysisTestSuite({
  module: 'analyses/tier1/circular-function-deps',
  exports: { findCircularFunctionDeps },
  analyzeFn: findCircularFunctionDeps,
  expectedFields: {
    total: 'number',
    cycles: 'array',
    validCount: 'number',
    problematicCount: 'number',
    recommendation: 'string'
  },
  specificTests: [
    {
      name: 'should return empty result for empty systemMap',
      fn: () => {
        const systemMap = SystemMapBuilder.create().build();
        const result = findCircularFunctionDeps(systemMap);
        expect(result.total).toBe(0);
        expect(result.cycles).toHaveLength(0);
      }
    },
    {
      name: 'should detect simple mutual recursion (A -> B -> A)',
      fn: () => {
        const systemMap = SystemMapBuilder.create()
          .withFile('src/mutual.js')
          .withFunction('src/mutual.js', 'funcA')
          .withFunction('src/mutual.js', 'funcB')
          .withFunctionLink('src/mutual.js:funcA', 'src/mutual.js:funcB')
          .withFunctionLink('src/mutual.js:funcB', 'src/mutual.js:funcA')
          .build();
        const result = findCircularFunctionDeps(systemMap);
        expect(result.total).toBeGreaterThan(0);
        expect(result.cycles.length).toBeGreaterThan(0);
      }
    },
    {
      name: 'should detect multi-function cycles',
      fn: () => {
        const systemMap = SystemMapBuilder.create()
          .withFile('src/cycle.js')
          .withFunction('src/cycle.js', 'a')
          .withFunction('src/cycle.js', 'b')
          .withFunction('src/cycle.js', 'c')
          .withFunctionLink('src/cycle.js:a', 'src/cycle.js:b')
          .withFunctionLink('src/cycle.js:b', 'src/cycle.js:c')
          .withFunctionLink('src/cycle.js:c', 'src/cycle.js:a')
          .build();
        const result = findCircularFunctionDeps(systemMap);
        expect(result.total).toBeGreaterThan(0);
      }
    },
    {
      name: 'should classify cycles with atomsIndex',
      fn: () => {
        const systemMap = SystemMapBuilder.create()
          .withFile('src/event.js')
          .withFunction('src/event.js', 'onEvent')
          .withFunction('src/event.js', 'emitEvent')
          .withFunctionLink('src/event.js:onEvent', 'src/event.js:emitEvent')
          .withFunctionLink('src/event.js:emitEvent', 'src/event.js:onEvent')
          .build();
        const atomsIndex = AtomsIndexBuilder.create()
          .withEventDrivenAtom('src/event.js', 'onEvent', { isListener: true })
          .withEventDrivenAtom('src/event.js', 'emitEvent', { isEmitter: true })
          .build();
        const result = findCircularFunctionDeps(systemMap, atomsIndex);
        expect(result.classifications).toBeDefined();
      }
    },
    {
      name: 'should not detect cycles in acyclic graphs',
      fn: () => {
        const systemMap = SystemMapBuilder.create()
          .withFile('src/a.js')
          .withFile('src/b.js')
          .withFunction('src/a.js', 'funcA')
          .withFunction('src/b.js', 'funcB')
          .withFunctionLink('src/a.js:funcA', 'src/b.js:funcB')
          .build();
        const result = findCircularFunctionDeps(systemMap);
        expect(result.total).toBe(0);
      }
    },
    {
      name: 'should separate valid and problematic cycles',
      fn: () => {
        const systemMap = SystemMapBuilder.create()
          .withFile('src/mixed.js')
          .withFunction('src/mixed.js', 'isEven')
          .withFunction('src/mixed.js', 'isOdd')
          .withFunctionLink('src/mixed.js:isEven', 'src/mixed.js:isOdd')
          .withFunctionLink('src/mixed.js:isOdd', 'src/mixed.js:isEven')
          .build();
        const result = findCircularFunctionDeps(systemMap);
        expect(typeof result.validCount).toBe('number');
        expect(typeof result.problematicCount).toBe('number');
      }
    }
  ]
});
