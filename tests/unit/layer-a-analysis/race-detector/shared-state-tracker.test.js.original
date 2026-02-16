/**
 * @fileoverview shared-state-tracker.test.js
 * 
 * Tests for SharedStateTracker.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/shared-state-tracker
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SharedStateTracker } from '#layer-a/race-detector/shared-state-tracker.js';

describe('SharedStateTracker', () => {
  describe('Structure Contract', () => {
    it('should export SharedStateTracker class', () => {
      expect(SharedStateTracker).toBeDefined();
      expect(typeof SharedStateTracker).toBe('function');
    });

    it('should create instance with Map for state', () => {
      const tracker = new SharedStateTracker();
      expect(tracker.state).toBeInstanceOf(Map);
    });

    it('should create instance with empty access log', () => {
      const tracker = new SharedStateTracker();
      expect(tracker.accessLog).toEqual([]);
    });

    it('should have required methods', () => {
      const tracker = new SharedStateTracker();
      expect(typeof tracker.trackAccess).toBe('function');
      expect(typeof tracker.getState).toBe('function');
      expect(typeof tracker.getAllStates).toBe('function');
      expect(typeof tracker.getContendedStates).toBe('function');
      expect(typeof tracker.getHighRiskStates).toBe('function');
      expect(typeof tracker.getAccessHistory).toBe('function');
      expect(typeof tracker.analyzeAccessPatterns).toBe('function');
      expect(typeof tracker.clear).toBe('function');
      expect(typeof tracker.export).toBe('function');
    });
  });

  describe('trackAccess', () => {
    let tracker;

    beforeEach(() => {
      tracker = new SharedStateTracker();
    });

    it('should track new state access', () => {
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'read' });

      const state = tracker.getState('counter');
      expect(state).toBeDefined();
      expect(state.key).toBe('counter');
      expect(state.accesses).toHaveLength(1);
    });

    it('should track multiple accesses to same state', () => {
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'read' });
      tracker.trackAccess('counter', { atom: 'atom-2', type: 'write' });

      const state = tracker.getState('counter');
      expect(state.accesses).toHaveLength(2);
    });

    it('should add to readers set for read access', () => {
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'read' });

      const state = tracker.getState('counter');
      expect(state.readers.has('atom-1')).toBe(true);
      expect(state.writers.has('atom-1')).toBe(false);
    });

    it('should add to writers set for write access', () => {
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'write' });

      const state = tracker.getState('counter');
      expect(state.writers.has('atom-1')).toBe(true);
      expect(state.readers.has('atom-1')).toBe(false);
    });

    it('should handle STATE_READ type', () => {
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'STATE_READ' });

      const state = tracker.getState('counter');
      expect(state.readers.has('atom-1')).toBe(true);
    });

    it('should handle STATE_WRITE type', () => {
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'STATE_WRITE' });

      const state = tracker.getState('counter');
      expect(state.writers.has('atom-1')).toBe(true);
    });

    it('should set firstAccess on first track', () => {
      const access = { atom: 'atom-1', type: 'read' };
      tracker.trackAccess('counter', access);

      const state = tracker.getState('counter');
      expect(state.firstAccess).toEqual(access);
    });

    it('should update lastAccess on each track', () => {
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'read' });
      tracker.trackAccess('counter', { atom: 'atom-2', type: 'write' });

      const state = tracker.getState('counter');
      expect(state.lastAccess.atom).toBe('atom-2');
    });

    it('should add timestamp to access', () => {
      const before = Date.now();
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'read' });
      const after = Date.now();

      const state = tracker.getState('counter');
      expect(state.accesses[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(state.accesses[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('should log access to accessLog', () => {
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'read' });

      expect(tracker.accessLog).toHaveLength(1);
      expect(tracker.accessLog[0].key).toBe('counter');
      expect(tracker.accessLog[0].atom).toBe('atom-1');
    });
  });

  describe('getState', () => {
    let tracker;

    beforeEach(() => {
      tracker = new SharedStateTracker();
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'read' });
    });

    it('should return state for existing key', () => {
      const state = tracker.getState('counter');
      expect(state).toBeDefined();
      expect(state.key).toBe('counter');
    });

    it('should return undefined for non-existent key', () => {
      const state = tracker.getState('nonexistent');
      expect(state).toBeUndefined();
    });
  });

  describe('getAllStates', () => {
    let tracker;

    beforeEach(() => {
      tracker = new SharedStateTracker();
    });

    it('should return empty array when no states', () => {
      const states = tracker.getAllStates();
      expect(states).toEqual([]);
    });

    it('should return all tracked states', () => {
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'read' });
      tracker.trackAccess('array', { atom: 'atom-2', type: 'write' });

      const states = tracker.getAllStates();
      expect(states).toHaveLength(2);
    });

    it('should return array of state objects', () => {
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'read' });

      const states = tracker.getAllStates();
      expect(Array.isArray(states)).toBe(true);
      expect(states[0]).toHaveProperty('key');
      expect(states[0]).toHaveProperty('accesses');
    });
  });

  describe('getContendedStates', () => {
    let tracker;

    beforeEach(() => {
      tracker = new SharedStateTracker();
    });

    it('should return empty array when no contention', () => {
      tracker.trackAccess('var1', { atom: 'atom-1', type: 'read' });
      tracker.trackAccess('var1', { atom: 'atom-2', type: 'read' });

      const contended = tracker.getContendedStates();
      expect(contended).toEqual([]);
    });

    it('should detect multiple writers', () => {
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'write' });
      tracker.trackAccess('counter', { atom: 'atom-2', type: 'write' });

      const contended = tracker.getContendedStates();
      expect(contended).toHaveLength(1);
      expect(contended[0].key).toBe('counter');
    });

    it('should detect read-write contention', () => {
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'read' });
      tracker.trackAccess('counter', { atom: 'atom-2', type: 'write' });

      const contended = tracker.getContendedStates();
      expect(contended).toHaveLength(1);
    });

    it('should return multiple contended states', () => {
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'write' });
      tracker.trackAccess('counter', { atom: 'atom-2', type: 'write' });
      tracker.trackAccess('array', { atom: 'atom-3', type: 'write' });
      tracker.trackAccess('array', { atom: 'atom-4', type: 'write' });

      const contended = tracker.getContendedStates();
      expect(contended).toHaveLength(2);
    });
  });

  describe('getHighRiskStates', () => {
    let tracker;

    beforeEach(() => {
      tracker = new SharedStateTracker();
    });

    it('should return empty array for safe patterns', () => {
      tracker.trackAccess('var1', { atom: 'atom-1', type: 'read' });

      const highRisk = tracker.getHighRiskStates();
      expect(highRisk).toEqual([]);
    });

    it('should detect high risk with multiple async writes', () => {
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'write', isAsync: true });
      tracker.trackAccess('counter', { atom: 'atom-2', type: 'write', isAsync: true });

      const highRisk = tracker.getHighRiskStates();
      expect(highRisk).toHaveLength(1);
      expect(highRisk[0].key).toBe('counter');
    });

    it('should detect high risk with 3+ writes and multiple writers', () => {
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'write' });
      tracker.trackAccess('counter', { atom: 'atom-2', type: 'write' });
      tracker.trackAccess('counter', { atom: 'atom-3', type: 'write' });

      const highRisk = tracker.getHighRiskStates();
      expect(highRisk).toHaveLength(1);
    });

    it('should not flag single async write as high risk', () => {
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'write', isAsync: true });

      const highRisk = tracker.getHighRiskStates();
      expect(highRisk).toEqual([]);
    });
  });

  describe('getAccessHistory', () => {
    let tracker;

    beforeEach(() => {
      tracker = new SharedStateTracker();
    });

    it('should return access array for existing state', () => {
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'read' });
      tracker.trackAccess('counter', { atom: 'atom-2', type: 'write' });

      const history = tracker.getAccessHistory('counter');
      expect(history).toHaveLength(2);
    });

    it('should return empty array for non-existent state', () => {
      const history = tracker.getAccessHistory('nonexistent');
      expect(history).toEqual([]);
    });
  });

  describe('analyzeAccessPatterns', () => {
    let tracker;

    beforeEach(() => {
      tracker = new SharedStateTracker();
    });

    it('should return null for state with less than 2 accesses', () => {
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'read' });

      const patterns = tracker.analyzeAccessPatterns('counter');
      expect(patterns).toBeNull();
    });

    it('should return null for non-existent state', () => {
      const patterns = tracker.analyzeAccessPatterns('nonexistent');
      expect(patterns).toBeNull();
    });

    it('should detect read-heavy pattern', () => {
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'read' });
      tracker.trackAccess('counter', { atom: 'atom-2', type: 'read' });
      tracker.trackAccess('counter', { atom: 'atom-3', type: 'write' });

      const patterns = tracker.analyzeAccessPatterns('counter');
      expect(patterns.readHeavy).toBe(true);
      expect(patterns.writeHeavy).toBe(false);
    });

    it('should detect write-heavy pattern', () => {
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'write' });
      tracker.trackAccess('counter', { atom: 'atom-2', type: 'write' });
      tracker.trackAccess('counter', { atom: 'atom-3', type: 'read' });

      const patterns = tracker.analyzeAccessPatterns('counter');
      expect(patterns.writeHeavy).toBe(true);
      expect(patterns.readHeavy).toBe(false);
    });

    it('should detect alternating read-write pattern', () => {
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'read' });
      tracker.trackAccess('counter', { atom: 'atom-2', type: 'write' });
      tracker.trackAccess('counter', { atom: 'atom-3', type: 'read' });
      tracker.trackAccess('counter', { atom: 'atom-4', type: 'write' });

      const patterns = tracker.analyzeAccessPatterns('counter');
      expect(patterns.alternatingRW).toBe(true);
    });

    it('should detect burst access pattern', () => {
      const now = Date.now();
      for (let i = 0; i < 5; i++) {
        tracker.trackAccess('counter', { atom: `atom-${i}`, type: 'read' });
      }

      const patterns = tracker.analyzeAccessPatterns('counter');
      expect(patterns.burstAccess).toBe(true);
    });

    it('should return all pattern flags', () => {
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'read' });
      tracker.trackAccess('counter', { atom: 'atom-2', type: 'read' });

      const patterns = tracker.analyzeAccessPatterns('counter');
      expect(patterns).toHaveProperty('readHeavy');
      expect(patterns).toHaveProperty('writeHeavy');
      expect(patterns).toHaveProperty('alternatingRW');
      expect(patterns).toHaveProperty('burstAccess');
    });
  });

  describe('clear', () => {
    let tracker;

    beforeEach(() => {
      tracker = new SharedStateTracker();
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'read' });
    });

    it('should clear all states', () => {
      tracker.clear();
      expect(tracker.getAllStates()).toEqual([]);
    });

    it('should clear access log', () => {
      tracker.clear();
      expect(tracker.accessLog).toEqual([]);
    });

    it('should allow tracking after clear', () => {
      tracker.clear();
      tracker.trackAccess('newvar', { atom: 'atom-1', type: 'read' });

      expect(tracker.getState('newvar')).toBeDefined();
    });
  });

  describe('export', () => {
    let tracker;

    beforeEach(() => {
      tracker = new SharedStateTracker();
    });

    it('should export empty data when no states', () => {
      const exported = tracker.export();

      expect(exported).toHaveProperty('states', []);
      expect(exported).toHaveProperty('totalAccesses', 0);
      expect(exported).toHaveProperty('contendedStates', 0);
      expect(exported).toHaveProperty('highRiskStates', 0);
    });

    it('should export state summaries', () => {
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'read' });
      tracker.trackAccess('counter', { atom: 'atom-2', type: 'write' });

      const exported = tracker.export();
      expect(exported.states).toHaveLength(1);
      expect(exported.states[0]).toHaveProperty('key', 'counter');
      expect(exported.states[0]).toHaveProperty('accessCount', 2);
      expect(exported.states[0]).toHaveProperty('uniqueReaders', 1);
      expect(exported.states[0]).toHaveProperty('uniqueWriters', 1);
      expect(exported.states[0]).toHaveProperty('pattern');
    });

    it('should count total accesses', () => {
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'read' });
      tracker.trackAccess('array', { atom: 'atom-2', type: 'write' });

      const exported = tracker.export();
      expect(exported.totalAccesses).toBe(2);
    });

    it('should count contended states', () => {
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'write' });
      tracker.trackAccess('counter', { atom: 'atom-2', type: 'write' });

      const exported = tracker.export();
      expect(exported.contendedStates).toBe(1);
    });

    it('should count high risk states', () => {
      tracker.trackAccess('counter', { atom: 'atom-1', type: 'write', isAsync: true });
      tracker.trackAccess('counter', { atom: 'atom-2', type: 'write', isAsync: true });

      const exported = tracker.export();
      expect(exported.highRiskStates).toBe(1);
    });
  });

  describe('Error Handling Contract', () => {
    let tracker;

    beforeEach(() => {
      tracker = new SharedStateTracker();
    });

    it('should handle trackAccess with null access', () => {
      expect(() => tracker.trackAccess('key', null)).not.toThrow();
    });

    it('should handle trackAccess with undefined access', () => {
      expect(() => tracker.trackAccess('key', undefined)).not.toThrow();
    });

    it('should handle trackAccess with empty key', () => {
      expect(() => tracker.trackAccess('', { atom: 'atom-1', type: 'read' })).not.toThrow();
    });

    it('should handle trackAccess without atom property', () => {
      expect(() => tracker.trackAccess('key', { type: 'read' })).not.toThrow();
    });

    it('should handle trackAccess without type property', () => {
      expect(() => tracker.trackAccess('key', { atom: 'atom-1' })).not.toThrow();
    });

    it('should handle getState with null key', () => {
      expect(() => tracker.getState(null)).not.toThrow();
    });

    it('should handle analyzeAccessPatterns with null key', () => {
      expect(() => tracker.analyzeAccessPatterns(null)).not.toThrow();
    });

    it('should handle getAccessHistory with null key', () => {
      expect(() => tracker.getAccessHistory(null)).not.toThrow();
    });

    it('should handle multiple clears', () => {
      expect(() => {
        tracker.clear();
        tracker.clear();
        tracker.clear();
      }).not.toThrow();
    });
  });
});
