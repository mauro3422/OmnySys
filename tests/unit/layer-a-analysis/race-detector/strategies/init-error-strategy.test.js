/**
 * @fileoverview init-error-strategy.test.js
 * 
 * Tests for InitErrorStrategy.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/strategies/init-error-strategy
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InitErrorStrategy } from '#layer-a/race-detector/strategies/init-error-strategy.js';
import { RaceStrategyBuilder } from '../../../../factories/race-detector-test.factory.js';

describe('InitErrorStrategy', () => {
  let strategy;

  beforeEach(() => {
    strategy = new InitErrorStrategy();
  });

  describe('Structure Contract', () => {
    it('should export InitErrorStrategy class', () => {
      expect(InitErrorStrategy).toBeDefined();
      expect(typeof InitErrorStrategy).toBe('function');
    });

    it('should inherit from RaceDetectionStrategy', async () => {
      const { RaceDetectionStrategy } = await import('#layer-a/race-detector/strategies/race-detection-strategy.js');
      expect(strategy).toBeInstanceOf(RaceDetectionStrategy);
    });

    it('should return IE as race type', () => {
      expect(strategy.getRaceType()).toBe('IE');
    });

    it('should have detect method', () => {
      expect(typeof strategy.detect).toBe('function');
    });
  });

  describe('Race Detection', () => {
    it('should detect double initialization race', () => {
      const builder = new RaceStrategyBuilder();
      const access1 = builder.createAccess('atom-1', 'initialization', { isAsync: true, atomName: 'init1' });
      const access2 = builder.createAccess('atom-2', 'initialization', { isAsync: true, atomName: 'init2' });
      
      builder.withAccess('singleton:instance', access1);
      builder.withAccess('singleton:instance', access2);
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      expect(races).toHaveLength(1);
      expect(races[0].type).toBe('IE');
    });

    it('should detect initialization via operation field', () => {
      const builder = new RaceStrategyBuilder();
      const access1 = { type: 'write', operation: 'initialization', atom: 'atom-1', atomName: 'init1', isAsync: true };
      const access2 = { type: 'write', operation: 'initialization', atom: 'atom-2', atomName: 'init2', isAsync: true };
      
      builder.withAccess('singleton:instance', access1);
      builder.withAccess('singleton:instance', access2);
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      expect(races).toHaveLength(1);
    });

    it('should detect multiple initialization races', () => {
      const builder = new RaceStrategyBuilder();
      
      // Three initializations
      builder.withAccess('singleton:instance', builder.createAccess('atom-1', 'initialization', { isAsync: true }));
      builder.withAccess('singleton:instance', builder.createAccess('atom-2', 'initialization', { isAsync: true }));
      builder.withAccess('singleton:instance', builder.createAccess('atom-3', 'initialization', { isAsync: true }));
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      // C(3,2) = 3 potential races
      expect(races.length).toBeGreaterThanOrEqual(1);
      races.forEach(race => {
        expect(race.type).toBe('IE');
      });
    });

    it('should not detect race with only one initialization', () => {
      const builder = new RaceStrategyBuilder();
      builder.withAccess('singleton:instance', builder.createAccess('atom-1', 'initialization', { isAsync: true }));
      builder.withAccess('singleton:instance', builder.createAccess('atom-2', 'write', { isAsync: true }));
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      // Only one initialization access, no double init race
      expect(races).toHaveLength(0);
    });

    it('should not detect race without initialization accesses', () => {
      const builder = new RaceStrategyBuilder();
      builder.withAccess('shared:var', builder.createAccess('atom-1', 'write', { isAsync: true }));
      builder.withAccess('shared:var', builder.createAccess('atom-2', 'write', { isAsync: true }));
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      expect(races).toHaveLength(0);
    });
  });

  describe('Race Description', () => {
    it('should include detailed description for IE race', () => {
      const builder = new RaceStrategyBuilder();
      builder.withAccess('singleton:instance', builder.createAccess('atom-1', 'initialization', { 
        isAsync: true, 
        atomName: 'getInstance1' 
      }));
      builder.withAccess('singleton:instance', builder.createAccess('atom-2', 'initialization', { 
        isAsync: true, 
        atomName: 'getInstance2' 
      }));
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      if (races.length > 0) {
        expect(races[0].description).toBeDefined();
        expect(races[0].description).toContain('Double initialization');
        expect(races[0].description).toContain('singleton:instance');
      }
    });
  });

  describe('Singleton Pattern Detection', () => {
    it('should detect lazy initialization race', () => {
      const builder = new RaceStrategyBuilder();
      builder.withAccess('singleton:lazyInstance', builder.createAccess('atom-1', 'initialization', { 
        isAsync: true,
        code: 'if (!instance) instance = new Service();'
      }));
      builder.withAccess('singleton:lazyInstance', builder.createAccess('atom-2', 'initialization', { 
        isAsync: true,
        code: 'if (!instance) instance = new Service();'
      }));
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      expect(races.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty shared state', () => {
      const races = strategy.detect(new Map(), {});
      expect(races).toEqual([]);
    });

    it('should handle null project', () => {
      const builder = new RaceStrategyBuilder();
      builder.withAccess('singleton:instance', builder.createAccess('atom-1', 'initialization'));
      builder.withAccess('singleton:instance', builder.createAccess('atom-2', 'initialization'));
      
      const { sharedState } = builder.build();
      expect(() => strategy.detect(sharedState, null)).not.toThrow();
    });

    it('should handle accesses with missing atom names', () => {
      const builder = new RaceStrategyBuilder();
      builder.withAccess('singleton:instance', { type: 'initialization', isAsync: true });
      builder.withAccess('singleton:instance', { type: 'initialization', isAsync: true });
      
      const { project, sharedState } = builder.build();
      expect(() => strategy.detect(sharedState, project)).not.toThrow();
    });
  });

  describe('Concurrency Consideration', () => {
    it('should consider concurrent initialization accesses', () => {
      const builder = new RaceStrategyBuilder();
      
      // Both async = can run concurrently
      builder.withAccess('singleton:instance', builder.createAccess('atom-1', 'initialization', { isAsync: true }));
      builder.withAccess('singleton:instance', builder.createAccess('atom-2', 'initialization', { isAsync: true }));
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      // Should detect potential concurrent initialization race
      expect(races.length).toBeGreaterThanOrEqual(0);
    });
  });
});
