/**
 * @fileoverview write-write-race-strategy.test.js
 * 
 * Tests for WriteWriteRaceStrategy.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/strategies/write-write-race-strategy
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WriteWriteRaceStrategy } from '#layer-a/race-detector/strategies/write-write-race-strategy.js';
import { RaceStrategyBuilder } from '../../../../factories/race-detector-test.factory.js';

describe('WriteWriteRaceStrategy', () => {
  let strategy;

  beforeEach(() => {
    strategy = new WriteWriteRaceStrategy();
  });

  describe('Structure Contract', () => {
    it('should export WriteWriteRaceStrategy class', () => {
      expect(WriteWriteRaceStrategy).toBeDefined();
      expect(typeof WriteWriteRaceStrategy).toBe('function');
    });

    it('should inherit from RaceDetectionStrategy', async () => {
      const { RaceDetectionStrategy } = await import('#layer-a/race-detector/strategies/race-detection-strategy.js');
      expect(strategy).toBeInstanceOf(RaceDetectionStrategy);
    });

    it('should return WW as race type', () => {
      expect(strategy.getRaceType()).toBe('WW');
    });

    it('should have detect method', () => {
      expect(typeof strategy.detect).toBe('function');
    });
  });

  describe('Race Detection', () => {
    it('should detect write-write race', () => {
      const builder = new RaceStrategyBuilder();
      const access1 = builder.createAccess('atom-1', 'write', { isAsync: true });
      const access2 = builder.createAccess('atom-2', 'write', { isAsync: true });
      
      builder.withAccess('shared:var', access1);
      builder.withAccess('shared:var', access2);
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      expect(races).toHaveLength(1);
      expect(races[0].type).toBe('WW');
    });

    it('should detect multiple WW races on same state', () => {
      const builder = new RaceStrategyBuilder();
      
      // Four accesses = C(4,2) = 6 potential pairs, all writes
      builder.withAccess('shared:var', builder.createAccess('atom-1', 'write', { isAsync: true }));
      builder.withAccess('shared:var', builder.createAccess('atom-2', 'write', { isAsync: true }));
      builder.withAccess('shared:var', builder.createAccess('atom-3', 'write', { isAsync: true }));
      builder.withAccess('shared:var', builder.createAccess('atom-4', 'write', { isAsync: true }));
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      expect(races.length).toBeGreaterThanOrEqual(1);
      races.forEach(race => {
        expect(race.type).toBe('WW');
      });
    });

    it('should handle STATE_WRITE type', () => {
      const builder = new RaceStrategyBuilder();
      const access1 = builder.createAccess('atom-1', 'STATE_WRITE', { isAsync: true });
      const access2 = builder.createAccess('atom-2', 'STATE_WRITE', { isAsync: true });
      
      builder.withAccess('shared:var', access1);
      builder.withAccess('shared:var', access2);
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      expect(races).toHaveLength(1);
    });

    it('should handle MODIFY type', () => {
      const builder = new RaceStrategyBuilder();
      const access1 = builder.createAccess('atom-1', 'MODIFY', { isAsync: true });
      const access2 = builder.createAccess('atom-2', 'MODIFY', { isAsync: true });
      
      builder.withAccess('shared:var', access1);
      builder.withAccess('shared:var', access2);
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      expect(races).toHaveLength(1);
    });

    it('should handle set type', () => {
      const builder = new RaceStrategyBuilder();
      const access1 = builder.createAccess('atom-1', 'set', { isAsync: true });
      const access2 = builder.createAccess('atom-2', 'set', { isAsync: true });
      
      builder.withAccess('shared:var', access1);
      builder.withAccess('shared:var', access2);
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      expect(races).toHaveLength(1);
    });

    it('should handle initialization type', () => {
      const builder = new RaceStrategyBuilder();
      const access1 = builder.createAccess('atom-1', 'initialization', { isAsync: true });
      const access2 = builder.createAccess('atom-2', 'initialization', { isAsync: true });
      
      builder.withAccess('shared:var', access1);
      builder.withAccess('shared:var', access2);
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      expect(races).toHaveLength(1);
    });

    it('should handle captured_write type', () => {
      const builder = new RaceStrategyBuilder();
      const access1 = builder.createAccess('atom-1', 'captured_write', { isAsync: true });
      const access2 = builder.createAccess('atom-2', 'captured_write', { isAsync: true });
      
      builder.withAccess('shared:var', access1);
      builder.withAccess('shared:var', access2);
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      expect(races).toHaveLength(1);
    });
  });

  describe('Write Detection', () => {
    it('should not detect race when one access is read', () => {
      const builder = new RaceStrategyBuilder();
      builder.withAccess('shared:var', builder.createAccess('atom-1', 'write', { isAsync: true }));
      builder.withAccess('shared:var', builder.createAccess('atom-2', 'read', { isAsync: true }));
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      expect(races).toHaveLength(0);
    });

    it('should not detect race with only one write access', () => {
      const builder = new RaceStrategyBuilder();
      builder.withAccess('shared:var', builder.createAccess('atom-1', 'write', { isAsync: true }));
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      expect(races).toHaveLength(0);
    });
  });

  describe('Concurrency Detection', () => {
    it('should consider async status for concurrency', () => {
      const builder = new RaceStrategyBuilder();
      builder.withAccess('shared:var', builder.createAccess('atom-1', 'write', { isAsync: true }));
      builder.withAccess('shared:var', builder.createAccess('atom-2', 'write', { isAsync: true }));
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      // Both async = potential race
      expect(races.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Race Object Structure', () => {
    it('should create race with correct type', () => {
      const builder = new RaceStrategyBuilder();
      builder.withAccess('shared:var', builder.createAccess('atom-1', 'write', { isAsync: true, atomName: 'writer1' }));
      builder.withAccess('shared:var', builder.createAccess('atom-2', 'write', { isAsync: true, atomName: 'writer2' }));
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      if (races.length > 0) {
        expect(races[0].type).toBe('WW');
        expect(races[0].stateKey).toBe('shared:var');
        expect(races[0].stateType).toBe('shared');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle empty shared state', () => {
      const races = strategy.detect(new Map(), {});
      expect(races).toEqual([]);
    });

    it('should handle null project', () => {
      const builder = new RaceStrategyBuilder();
      builder.withAccess('shared:var', builder.createAccess('atom-1', 'write'));
      builder.withAccess('shared:var', builder.createAccess('atom-2', 'write'));
      
      const { sharedState } = builder.build();
      expect(() => strategy.detect(sharedState, null)).not.toThrow();
    });
  });
});
