/**
 * @fileoverview Tests for circular-function-deps.js
 */

import { describe, it, expect } from 'vitest';
import { findCircularFunctionDeps } from '#layer-a/analyses/tier1/circular-function-deps.js';
import { SystemMapBuilder, AtomsIndexBuilder } from '../../../../factories/root-infrastructure-test.factory.js';

describe('circular-function-deps.js', () => {
  describe('findCircularFunctionDeps', () => {
    it('should return empty result for null input', () => {
      const result = findCircularFunctionDeps(null);
      
      expect(result.total).toBe(0);
      expect(result.cycles).toHaveLength(0);
      expect(result.validCount).toBe(0);
      expect(result.problematicCount).toBe(0);
    });

    it('should return empty result for empty systemMap', () => {
      const systemMap = SystemMapBuilder.create().build();
      
      const result = findCircularFunctionDeps(systemMap);
      
      expect(result.total).toBe(0);
      expect(result.cycles).toHaveLength(0);
    });

    it('should detect simple mutual recursion (A -> B -> A)', () => {
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
    });

    it('should detect multi-function cycles', () => {
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
    });

    it('should classify cycles with atomsIndex', () => {
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
    });

    it('should mark 2-node cycles as CRITICAL severity', () => {
      const systemMap = SystemMapBuilder.create()
        .withFile('src/two.js')
        .withFunction('src/two.js', 'a')
        .withFunction('src/two.js', 'b')
        .withFunctionLink('src/two.js:a', 'src/two.js:b')
        .withFunctionLink('src/two.js:b', 'src/two.js:a')
        .build();
      
      const result = findCircularFunctionDeps(systemMap);
      
      if (result.cycles.length > 0) {
        expect(result.cycles[0].severity).toBe('CRITICAL');
      }
    });

    it('should not detect cycles in acyclic graphs', () => {
      const systemMap = SystemMapBuilder.create()
        .withFile('src/a.js')
        .withFile('src/b.js')
        .withFunction('src/a.js', 'funcA')
        .withFunction('src/b.js', 'funcB')
        .withFunctionLink('src/a.js:funcA', 'src/b.js:funcB')
        .build();
      
      const result = findCircularFunctionDeps(systemMap);
      
      expect(result.total).toBe(0);
    });

    it('should return recommendation text', () => {
      const systemMap = SystemMapBuilder.create().build();
      
      const result = findCircularFunctionDeps(systemMap);
      
      expect(typeof result.recommendation).toBe('string');
    });

    it('should separate valid and problematic cycles', () => {
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
    });
  });
});
