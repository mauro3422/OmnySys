/**
 * @fileoverview collect-phase.test.js
 * 
 * Tests for collect phase module.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/phases/collect-phase
 */

import { describe, it, expect } from 'vitest';
import { 
  collectSharedState, 
  CollectPhase 
} from '#layer-a/race-detector/phases/collect-phase.js';
import { RaceDetectorMocks } from '../../../../factories/race-detector-test.factory.js';

describe('Collect Phase', () => {
  describe('Structure Contract', () => {
    it('should export collectSharedState function', () => {
      expect(collectSharedState).toBeDefined();
      expect(typeof collectSharedState).toBe('function');
    });

    it('should export CollectPhase class', () => {
      expect(CollectPhase).toBeDefined();
      expect(typeof CollectPhase).toBe('function');
    });

    it('should create CollectPhase instance', () => {
      const phase = new CollectPhase([]);
      expect(phase).toBeInstanceOf(CollectPhase);
    });

    it('should have execute method on CollectPhase', () => {
      const phase = new CollectPhase([]);
      expect(typeof phase.execute).toBe('function');
    });
  });

  describe('collectSharedState', () => {
    it('should return Map', () => {
      const result = collectSharedState([]);
      expect(result).toBeInstanceOf(Map);
    });

    it('should return empty Map for empty trackers array', () => {
      const result = collectSharedState([]);
      expect(result.size).toBe(0);
    });

    it('should collect state from single tracker', () => {
      const state = new Map([['key1', [{ atom: 'atom-1', type: 'read' }]]]);
      const tracker = RaceDetectorMocks.createMockTracker(state);
      
      const result = collectSharedState([tracker]);
      
      expect(result.size).toBe(1);
      expect(result.has('key1')).toBe(true);
    });

    it('should merge state from multiple trackers', () => {
      const state1 = new Map([['key1', [{ atom: 'atom-1', type: 'read' }]]]);
      const state2 = new Map([['key2', [{ atom: 'atom-2', type: 'write' }]]]);
      
      const tracker1 = RaceDetectorMocks.createMockTracker(state1);
      const tracker2 = RaceDetectorMocks.createMockTracker(state2);
      
      const result = collectSharedState([tracker1, tracker2]);
      
      expect(result.size).toBe(2);
      expect(result.has('key1')).toBe(true);
      expect(result.has('key2')).toBe(true);
    });

    it('should merge accesses for same key from different trackers', () => {
      const state1 = new Map([['shared', [{ atom: 'atom-1', type: 'read' }]]]);
      const state2 = new Map([['shared', [{ atom: 'atom-2', type: 'write' }]]]);
      
      const tracker1 = RaceDetectorMocks.createMockTracker(state1);
      const tracker2 = RaceDetectorMocks.createMockTracker(state2);
      
      const result = collectSharedState([tracker1, tracker2]);
      
      expect(result.size).toBe(1);
      expect(result.get('shared')).toHaveLength(2);
    });

    it('should handle tracker returning empty Map', () => {
      const state = new Map([['key1', [{ atom: 'atom-1' }]]]);
      const tracker1 = RaceDetectorMocks.createMockTracker(state);
      const tracker2 = RaceDetectorMocks.createMockTracker(new Map());
      
      const result = collectSharedState([tracker1, tracker2]);
      
      expect(result.size).toBe(1);
    });

    it('should handle multiple trackers with overlapping keys', () => {
      const state1 = new Map([
        ['key1', [{ atom: 'a1' }]],
        ['key2', [{ atom: 'a2' }]]
      ]);
      const state2 = new Map([
        ['key2', [{ atom: 'a3' }]],
        ['key3', [{ atom: 'a4' }]]
      ]);
      
      const tracker1 = RaceDetectorMocks.createMockTracker(state1);
      const tracker2 = RaceDetectorMocks.createMockTracker(state2);
      
      const result = collectSharedState([tracker1, tracker2]);
      
      expect(result.size).toBe(3);
      expect(result.get('key1')).toHaveLength(1);
      expect(result.get('key2')).toHaveLength(2);
      expect(result.get('key3')).toHaveLength(1);
    });
  });

  describe('CollectPhase class', () => {
    it('should store trackers in constructor', () => {
      const trackers = ['tracker1', 'tracker2'];
      const phase = new CollectPhase(trackers);
      
      expect(phase.trackers).toEqual(trackers);
    });

    it('should execute and return Map', () => {
      const state = new Map([['key1', [{ atom: 'atom-1' }]]]);
      const tracker = RaceDetectorMocks.createMockTracker(state);
      const phase = new CollectPhase([tracker]);
      
      const result = phase.execute();
      
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(1);
    });

    it('should collect from all trackers on execute', () => {
      const state1 = new Map([['key1', [{ atom: 'atom-1' }]]]);
      const state2 = new Map([['key2', [{ atom: 'atom-2' }]]]);
      
      const tracker1 = RaceDetectorMocks.createMockTracker(state1);
      const tracker2 = RaceDetectorMocks.createMockTracker(state2);
      
      const phase = new CollectPhase([tracker1, tracker2]);
      const result = phase.execute();
      
      expect(result.size).toBe(2);
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle empty array', () => {
      expect(() => collectSharedState([])).not.toThrow();
    });

    it('should handle null array', () => {
      expect(() => collectSharedState(null)).not.toThrow();
    });

    it('should handle undefined array', () => {
      expect(() => collectSharedState(undefined)).not.toThrow();
    });

    it('should handle tracker with null track() result', () => {
      const tracker = { track: () => null };
      expect(() => collectSharedState([tracker])).not.toThrow();
    });

    it('should handle tracker with undefined track() result', () => {
      const tracker = { track: () => undefined };
      expect(() => collectSharedState([tracker])).not.toThrow();
    });

    it('should handle tracker throwing error', () => {
      const tracker = { 
        track: () => { throw new Error('Tracker error'); }
      };
      expect(() => collectSharedState([tracker])).toThrow('Tracker error');
    });

    it('should handle CollectPhase with null trackers', () => {
      const phase = new CollectPhase(null);
      expect(() => phase.execute()).not.toThrow();
    });

    it('should handle CollectPhase with undefined trackers', () => {
      const phase = new CollectPhase(undefined);
      expect(() => phase.execute()).not.toThrow();
    });
  });
});
