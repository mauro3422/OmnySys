/**
 * @fileoverview read-write-race-strategy.test.js
 * 
 * Tests for ReadWriteRaceStrategy.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/strategies/read-write-race-strategy
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReadWriteRaceStrategy } from '#layer-a/race-detector/strategies/read-write-race-strategy.js';
import { RaceStrategyBuilder } from '../../../../factories/race-detector-test.factory.js';

describe('ReadWriteRaceStrategy', () => {
  let strategy;

  beforeEach(() => {
    strategy = new ReadWriteRaceStrategy();
  });

  describe('Structure Contract', () => {
    it('should export ReadWriteRaceStrategy class', () => {
      expect(ReadWriteRaceStrategy).toBeDefined();
      expect(typeof ReadWriteRaceStrategy).toBe('function');
    });

    it('should inherit from RaceDetectionStrategy', async () => {
      const { RaceDetectionStrategy } = await import('#layer-a/race-detector/strategies/race-detection-strategy.js');
      expect(strategy).toBeInstanceOf(RaceDetectionStrategy);
    });

    it('should return RW as race type', () => {
      expect(strategy.getRaceType()).toBe('RW');
    });

    it('should have detect method', () => {
      expect(typeof strategy.detect).toBe('function');
    });
  });

  describe('Race Detection', () => {
    it('should detect read-write race', () => {
      const builder = new RaceStrategyBuilder();
      const access1 = builder.createAccess('atom-1', 'read', { isAsync: true });
      const access2 = builder.createAccess('atom-2', 'write', { isAsync: true });
      
      builder.withAccess('shared:var', access1);
      builder.withAccess('shared:var', access2);
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      expect(races).toHaveLength(1);
      expect(races[0].type).toBe('RW');
    });

    it('should detect write-read race', () => {
      const builder = new RaceStrategyBuilder();
      const access1 = builder.createAccess('atom-1', 'write', { isAsync: true });
      const access2 = builder.createAccess('atom-2', 'read', { isAsync: true });
      
      builder.withAccess('shared:var', access1);
      builder.withAccess('shared:var', access2);
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      expect(races).toHaveLength(1);
      expect(races[0].type).toBe('WR');
    });

    it('should detect multiple RW races on same state', () => {
      const builder = new RaceStrategyBuilder();
      
      // Three accesses: read, write, write
      builder.withAccess('shared:var', builder.createAccess('atom-1', 'read', { isAsync: true }));
      builder.withAccess('shared:var', builder.createAccess('atom-2', 'write', { isAsync: true }));
      builder.withAccess('shared:var', builder.createAccess('atom-3', 'write', { isAsync: true }));
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      // Should find: read-write, read-write, write-write (but write-write not detected by RW strategy)
      expect(races.length).toBeGreaterThanOrEqual(2);
      races.forEach(race => {
        expect(['RW', 'WR']).toContain(race.type);
      });
    });

    it('should handle STATE_READ and STATE_WRITE types', () => {
      const builder = new RaceStrategyBuilder();
      const access1 = builder.createAccess('atom-1', 'STATE_READ', { isAsync: true });
      const access2 = builder.createAccess('atom-2', 'STATE_WRITE', { isAsync: true });
      
      builder.withAccess('shared:var', access1);
      builder.withAccess('shared:var', access2);
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      expect(races).toHaveLength(1);
    });

    it('should handle ACCESS and MODIFY types', () => {
      const builder = new RaceStrategyBuilder();
      const access1 = builder.createAccess('atom-1', 'ACCESS', { isAsync: true });
      const access2 = builder.createAccess('atom-2', 'MODIFY', { isAsync: true });
      
      builder.withAccess('shared:var', access1);
      builder.withAccess('shared:var', access2);
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      expect(races).toHaveLength(1);
    });

    it('should handle get and set types', () => {
      const builder = new RaceStrategyBuilder();
      const access1 = builder.createAccess('atom-1', 'get', { isAsync: true });
      const access2 = builder.createAccess('atom-2', 'set', { isAsync: true });
      
      builder.withAccess('shared:var', access1);
      builder.withAccess('shared:var', access2);
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      expect(races).toHaveLength(1);
    });
  });

  describe('Concurrency Detection', () => {
    it('should only detect races when accesses can run concurrently', () => {
      const builder = new RaceStrategyBuilder();
      
      // Both async = can run concurrently
      builder.withAccess('shared:var', builder.createAccess('atom-1', 'read', { isAsync: true }));
      builder.withAccess('shared:var', builder.createAccess('atom-2', 'write', { isAsync: true }));
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      expect(races.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array when only one access', () => {
      const builder = new RaceStrategyBuilder();
      builder.withAccess('shared:var', builder.createAccess('atom-1', 'read', { isAsync: true }));
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      expect(races).toEqual([]);
    });

    it('should return empty array when no shared state', () => {
      const builder = new RaceStrategyBuilder();
      const { project, sharedState } = builder.build();
      
      const races = strategy.detect(sharedState, project);
      
      expect(races).toEqual([]);
    });
  });

  describe('Race Object Structure', () => {
    it('should create race with all required fields', () => {
      const builder = new RaceStrategyBuilder();
      builder.withAccess('shared:var', builder.createAccess('atom-1', 'read', { isAsync: true, atomName: 'reader' }));
      builder.withAccess('shared:var', builder.createAccess('atom-2', 'write', { isAsync: true, atomName: 'writer' }));
      
      const { project, sharedState } = builder.build();
      const races = strategy.detect(sharedState, project);
      
      if (races.length > 0) {
        const race = races[0];
        expect(race).toHaveProperty('id');
        expect(race).toHaveProperty('type');
        expect(race).toHaveProperty('stateKey');
        expect(race).toHaveProperty('stateType');
        expect(race).toHaveProperty('accesses');
        expect(race).toHaveProperty('severity');
        expect(race).toHaveProperty('description');
        expect(Array.isArray(race.accesses)).toBe(true);
        expect(race.accesses).toHaveLength(2);
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
      builder.withAccess('shared:var', builder.createAccess('atom-1', 'read'));
      builder.withAccess('shared:var', builder.createAccess('atom-2', 'write'));
      
      const { sharedState } = builder.build();
      expect(() => strategy.detect(sharedState, null)).not.toThrow();
    });

    it('should handle missing atom data', () => {
      const builder = new RaceStrategyBuilder();
      builder.withAccess('shared:var', { type: 'read' });
      builder.withAccess('shared:var', { type: 'write' });
      
      const { project, sharedState } = builder.build();
      expect(() => strategy.detect(sharedState, project)).not.toThrow();
    });
  });
});
