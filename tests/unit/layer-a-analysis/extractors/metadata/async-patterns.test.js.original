/**
 * @fileoverview Tests for async-patterns.js extractor
 * 
 * @module tests/async-patterns
 */

import { describe, it, expect } from 'vitest';
import { extractAsyncPatterns } from '#layer-a/extractors/metadata/async-patterns.js';
import { CodeSampleBuilder } from './metadata-test.factory.js';

describe('async-patterns', () => {
  describe('basic structure', () => {
    it('should export extractAsyncPatterns function', () => {
      expect(typeof extractAsyncPatterns).toBe('function');
    });

    it('should return object with all expected properties', () => {
      const result = extractAsyncPatterns('');
      expect(result).toHaveProperty('asyncFunctions');
      expect(result).toHaveProperty('promiseCreations');
      expect(result).toHaveProperty('promiseChains');
      expect(result).toHaveProperty('promiseAll');
      expect(result).toHaveProperty('promiseRace');
      expect(result).toHaveProperty('awaitExpressions');
      expect(result).toHaveProperty('timeouts');
      expect(result).toHaveProperty('raceConditions');
      expect(result).toHaveProperty('all');
    });
  });

  describe('async function detection', () => {
    it('should detect async function declarations', () => {
      const code = 'async function fetchData() { return await fetch("/api"); }';
      const result = extractAsyncPatterns(code);
      expect(result.asyncFunctions).toHaveLength(1);
      expect(result.asyncFunctions[0]).toMatchObject({
        type: 'async_function',
        name: 'fetchData'
      });
    });

    it('should detect async arrow functions', () => {
      const code = 'const fetchData = async () => { return await fetch("/api"); };';
      const result = extractAsyncPatterns(code);
      expect(result.asyncFunctions).toHaveLength(1);
      expect(result.asyncFunctions[0].type).toBe('async_function');
    });

    it('should detect async methods in objects', () => {
      const code = 'const obj = { async method() { return await fetch("/api"); } };';
      const result = extractAsyncPatterns(code);
      expect(result.asyncFunctions).toHaveLength(1);
      expect(result.asyncFunctions[0].name).toBe('method');
    });

    it('should mark anonymous async functions', () => {
      const code = 'const fn = async function() {};';
      const result = extractAsyncPatterns(code);
      expect(result.asyncFunctions[0].name).toBe('anonymous');
    });

    it('should detect multiple async functions', () => {
      const code = `
        async function a() {}
        async function b() {}
        async function c() {}
      `;
      const result = extractAsyncPatterns(code);
      expect(result.asyncFunctions).toHaveLength(3);
    });
  });

  describe('promise creation detection', () => {
    it('should detect new Promise constructions', () => {
      const code = 'const p = new Promise((resolve, reject) => {});';
      const result = extractAsyncPatterns(code);
      expect(result.promiseCreations).toHaveLength(1);
      expect(result.promiseCreations[0]).toMatchObject({
        type: 'new_promise',
        resolveParam: 'resolve',
        rejectParam: 'reject'
      });
    });

    it('should detect Promise with different param names', () => {
      const code = 'const p = new Promise((res, rej) => {});';
      const result = extractAsyncPatterns(code);
      expect(result.promiseCreations[0].resolveParam).toBe('res');
      expect(result.promiseCreations[0].rejectParam).toBe('rej');
    });

    it('should detect multiple Promise creations', () => {
      const code = `
        const p1 = new Promise((r) => {});
        const p2 = new Promise((r) => {});
      `;
      const result = extractAsyncPatterns(code);
      expect(result.promiseCreations).toHaveLength(2);
    });
  });

  describe('promise chain detection', () => {
    it('should detect .then() chains', () => {
      const code = 'promise.then(result => result);';
      const result = extractAsyncPatterns(code);
      expect(result.promiseChains).toHaveLength(1);
      expect(result.promiseChains[0].method).toBe('then');
    });

    it('should detect .catch() chains', () => {
      const code = 'promise.catch(err => console.error(err));';
      const result = extractAsyncPatterns(code);
      expect(result.promiseChains[0].method).toBe('catch');
    });

    it('should detect .finally() chains', () => {
      const code = 'promise.finally(() => cleanup());';
      const result = extractAsyncPatterns(code);
      expect(result.promiseChains[0].method).toBe('finally');
    });

    it('should detect chain targets', () => {
      const code = 'fetchData().then(r => r).catch(e => e);';
      const result = extractAsyncPatterns(code);
      expect(result.promiseChains[0].target).toBe('fetchData');
    });
  });

  describe('Promise.all detection', () => {
    it('should detect Promise.all calls', () => {
      const code = 'Promise.all([a(), b(), c()]);';
      const result = extractAsyncPatterns(code);
      expect(result.promiseAll).toHaveLength(1);
      expect(result.promiseAll[0].type).toBe('promise_all');
    });

    it('should detect Promise.allSettled calls', () => {
      const code = 'Promise.allSettled([a(), b()]);';
      const result = extractAsyncPatterns(code);
      expect(result.promiseAll[0].type).toBe('promise_allSettled');
    });

    it('should detect multiple Promise.all calls', () => {
      const code = `
        Promise.all([a(), b()]);
        Promise.all([c(), d()]);
      `;
      const result = extractAsyncPatterns(code);
      expect(result.promiseAll).toHaveLength(2);
    });
  });

  describe('Promise.race detection', () => {
    it('should detect Promise.race calls', () => {
      const code = 'Promise.race([a(), b()]);';
      const result = extractAsyncPatterns(code);
      expect(result.promiseRace).toHaveLength(1);
      expect(result.promiseRace[0].type).toBe('promise_race');
    });

    it('should detect Promise.any calls', () => {
      const code = 'Promise.any([a(), b()]);';
      const result = extractAsyncPatterns(code);
      expect(result.promiseAll[0].type).toBe('promise_any');
    });
  });

  describe('await expression detection', () => {
    it('should detect await expressions', () => {
      const code = 'const data = await fetchData();';
      const result = extractAsyncPatterns(code);
      expect(result.awaitExpressions).toHaveLength(1);
      expect(result.awaitExpressions[0]).toMatchObject({
        type: 'await',
        expression: 'fetchData()'
      });
    });

    it('should detect multiple await expressions', () => {
      const code = `
        const a = await fetchA();
        const b = await fetchB();
      `;
      const result = extractAsyncPatterns(code);
      expect(result.awaitExpressions).toHaveLength(2);
    });

    it('should detect complex await expressions', () => {
      const code = 'const data = await (await fetch(url)).json();';
      const result = extractAsyncPatterns(code);
      expect(result.awaitExpressions).toHaveLength(2);
    });
  });

  describe('timeout detection', () => {
    it('should detect setTimeout calls', () => {
      const code = 'setTimeout(() => {}, 1000);';
      const result = extractAsyncPatterns(code);
      expect(result.timeouts).toHaveLength(1);
      expect(result.timeouts[0]).toMatchObject({
        type: 'setTimeout',
        delay: 1000
      });
    });

    it('should detect setInterval calls', () => {
      const code = 'setInterval(() => {}, 5000);';
      const result = extractAsyncPatterns(code);
      expect(result.timeouts[0].type).toBe('setInterval');
    });

    it('should parse delay values correctly', () => {
      const code = 'setTimeout(fn, 5000);';
      const result = extractAsyncPatterns(code);
      expect(result.timeouts[0].delay).toBe(5000);
    });
  });

  describe('race condition detection', () => {
    it('should detect await in for loops', () => {
      const code = 'for (let i = 0; i < 10; i++) { await process(i); }';
      const result = extractAsyncPatterns(code);
      expect(result.raceConditions).toHaveLength(1);
      expect(result.raceConditions[0].type).toBe('await_in_loop');
      expect(result.raceConditions[0].severity).toBe('WARNING');
    });

    it('should detect await in while loops', () => {
      const code = 'while (condition) { await process(); }';
      const result = extractAsyncPatterns(code);
      expect(result.raceConditions).toHaveLength(1);
    });
  });

  describe('combined patterns', () => {
    it('should detect complex async patterns', () => {
      const code = new CodeSampleBuilder()
        .addAsyncFunction('complex', `  const data = await fetch(url);
  const processed = await Promise.all(data.map(async item => {
    return await transform(item);
  }));
  return processed;`)
        .build();

      const result = extractAsyncPatterns(code);
      expect(result.asyncFunctions).toHaveLength(1);
      expect(result.promiseAll).toHaveLength(1);
      expect(result.awaitExpressions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty code', () => {
      const result = extractAsyncPatterns('');
      expect(result.asyncFunctions).toHaveLength(0);
      expect(result.promiseCreations).toHaveLength(0);
      expect(result.all).toHaveLength(0);
    });

    it('should handle code without async patterns', () => {
      const code = 'function sync() { return 42; }';
      const result = extractAsyncPatterns(code);
      expect(result.all).toHaveLength(0);
    });

    it('should handle comments with async keywords', () => {
      const code = '// async function not implemented yet';
      const result = extractAsyncPatterns(code);
      expect(result.asyncFunctions).toHaveLength(1); // regex-based, might match comments
    });
  });
});
