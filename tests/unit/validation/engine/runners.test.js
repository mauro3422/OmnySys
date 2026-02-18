/**
 * @fileoverview Validation Runners Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BaseValidationRunner, SequentialRunner, ParallelRunner } from '../../../../src/validation/validation-engine/runners/index.js';
import { ValidationResult } from '../../../../src/validation/core/results/index.js';

describe('BaseValidationRunner', () => {
  it('cannot be instantiated directly', () => {
    expect(() => new BaseValidationRunner()).toThrow('Cannot instantiate abstract class');
  });

  it('requires run implementation', () => {
    class TestRunner extends BaseValidationRunner {
      constructor() {
        super();
      }
    }
    
    const runner = new TestRunner();
    
    return expect(runner.run([], {}, {}, new Map())).rejects.toThrow('must be implemented');
  });

  it('sets default options', () => {
    class TestRunner extends BaseValidationRunner {
      constructor() {
        super();
      }
      async run() { return { results: [], duration: 0 }; }
    }
    
    const runner = new TestRunner();
    
    expect(runner.options.maxConcurrency).toBe(10);
  });

  it('merges custom options', () => {
    class TestRunner extends BaseValidationRunner {
      constructor() {
        super({ maxConcurrency: 5 });
      }
      async run() { return { results: [], duration: 0 }; }
    }
    
    const runner = new TestRunner();
    
    expect(runner.options.maxConcurrency).toBe(5);
  });
});

describe('SequentialRunner', () => {
  let runner;
  let strategies;
  let context;
  let registry;
  let cache;

  beforeEach(() => {
    runner = new SequentialRunner();
    strategies = [
      {
        name: 'strategy1',
        execute: async () => [ValidationResult.valid('e1', 'f1')]
      },
      {
        name: 'strategy2',
        execute: async () => [ValidationResult.valid('e2', 'f2')]
      }
    ];
    context = {};
    registry = {};
    cache = new Map();
  });

  describe('constructor', () => {
    it('sets name', () => {
      expect(runner.name).toBe('sequential');
    });
  });

  describe('run', () => {
    it('executes strategies in order', async () => {
      const executionOrder = [];
      strategies = [
        {
          name: 'first',
          execute: async () => {
            executionOrder.push('first');
            return [];
          }
        },
        {
          name: 'second',
          execute: async () => {
            executionOrder.push('second');
            return [];
          }
        }
      ];
      
      await runner.run(strategies, context, registry, cache);
      
      expect(executionOrder).toEqual(['first', 'second']);
    });

    it('collects all results', async () => {
      const { results } = await runner.run(strategies, context, registry, cache);
      
      expect(results).toHaveLength(2);
    });

    it('returns duration', async () => {
      const { duration } = await runner.run(strategies, context, registry, cache);
      
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('handles empty strategies', async () => {
      const { results } = await runner.run([], context, registry, cache);
      
      expect(results).toEqual([]);
    });
  });

  describe('runWithEarlyStop', () => {
    it('stops when shouldStop returns true', async () => {
      strategies = [
        {
          name: 'first',
          execute: async () => [ValidationResult.critical('e1', 'f1', 'exp', 'act')]
        },
        {
          name: 'second',
          execute: async () => {
            throw new Error('Should not be called');
          }
        }
      ];
      
      const { results, stopped } = await runner.runWithEarlyStop(
        strategies,
        context,
        registry,
        cache,
        (results) => results.some(r => r.severity === 'critical')
      );
      
      expect(stopped).toBe(true);
      expect(results).toHaveLength(1);
    });

    it('continues when shouldStop returns false', async () => {
      const { stopped } = await runner.runWithEarlyStop(
        strategies,
        context,
        registry,
        cache,
        () => false
      );
      
      expect(stopped).toBe(false);
    });
  });
});

describe('ParallelRunner', () => {
  let runner;
  let strategies;
  let context;
  let registry;
  let cache;

  beforeEach(() => {
    runner = new ParallelRunner();
    strategies = [
      {
        name: 'strategy1',
        execute: async () => [ValidationResult.valid('e1', 'f1')]
      },
      {
        name: 'strategy2',
        execute: async () => [ValidationResult.valid('e2', 'f2')]
      }
    ];
    context = {};
    registry = {};
    cache = new Map();
  });

  describe('constructor', () => {
    it('sets name', () => {
      expect(runner.name).toBe('parallel');
    });
  });

  describe('run', () => {
    it('executes strategies in parallel', async () => {
      const startTimes = [];
      strategies = [
        {
          name: 's1',
          execute: async () => {
            startTimes.push(Date.now());
            await new Promise(r => setTimeout(r, 10));
            return [ValidationResult.valid('e1', 'f1')];
          }
        },
        {
          name: 's2',
          execute: async () => {
            startTimes.push(Date.now());
            await new Promise(r => setTimeout(r, 10));
            return [ValidationResult.valid('e2', 'f2')];
          }
        }
      ];
      
      await runner.run(strategies, context, registry, cache);
      
      const timeDiff = Math.abs(startTimes[0] - startTimes[1]);
      expect(timeDiff).toBeLessThan(20);
    });

    it('collects all results', async () => {
      const { results } = await runner.run(strategies, context, registry, cache);
      
      expect(results).toHaveLength(2);
    });

    it('returns duration', async () => {
      const { duration } = await runner.run(strategies, context, registry, cache);
      
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('handles empty strategies', async () => {
      const { results } = await runner.run([], context, registry, cache);
      
      expect(results).toEqual([]);
    });

    it('handles strategy errors', async () => {
      strategies = [
        {
          name: 'failing',
          execute: async () => {
            throw new Error('Strategy failed');
          }
        }
      ];
      
      await expect(runner.run(strategies, context, registry, cache)).rejects.toThrow('Strategy failed');
    });
  });

  describe('runBatched', () => {
    it('processes in batches', async () => {
      runner = new ParallelRunner({ maxConcurrency: 2 });
      const executionBatches = [];
      
      strategies = [1, 2, 3, 4, 5].map(i => ({
        name: `s${i}`,
        execute: async () => {
          executionBatches.push(i);
          return [ValidationResult.valid(`e${i}`, `f${i}`)];
        }
      }));
      
      const { results } = await runner.runBatched(strategies, context, registry, cache);
      
      expect(results).toHaveLength(5);
    });
  });
});
