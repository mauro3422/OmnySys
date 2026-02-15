/**
 * @fileoverview detect-phase.test.js
 * 
 * Tests for detect phase module.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/phases/detect-phase
 */

import { describe, it, expect } from 'vitest';
import { 
  detectRaces, 
  DetectPhase 
} from '#layer-a/race-detector/phases/detect-phase.js';
import { RaceDetectorMocks } from '../../../../factories/race-detector-test.factory.js';

describe('Detect Phase', () => {
  describe('Structure Contract', () => {
    it('should export detectRaces function', () => {
      expect(detectRaces).toBeDefined();
      expect(typeof detectRaces).toBe('function');
    });

    it('should export DetectPhase class', () => {
      expect(DetectPhase).toBeDefined();
      expect(typeof DetectPhase).toBe('function');
    });

    it('should create DetectPhase instance', () => {
      const phase = new DetectPhase([], new Map(), {});
      expect(phase).toBeInstanceOf(DetectPhase);
    });

    it('should have execute method on DetectPhase', () => {
      const phase = new DetectPhase([], new Map(), {});
      expect(typeof phase.execute).toBe('function');
    });
  });

  describe('detectRaces', () => {
    it('should return array', () => {
      const result = detectRaces([], new Map(), {});
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array for empty strategies', () => {
      const result = detectRaces([], new Map(), {});
      expect(result).toEqual([]);
    });

    it('should collect races from single strategy', () => {
      const race = { id: 'race-1', type: 'WW' };
      const strategy = RaceDetectorMocks.createMockStrategy([race]);
      
      const result = detectRaces([strategy], new Map(), {});
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(race);
    });

    it('should collect races from multiple strategies', () => {
      const race1 = { id: 'race-1', type: 'WW' };
      const race2 = { id: 'race-2', type: 'RW' };
      
      const strategy1 = RaceDetectorMocks.createMockStrategy([race1]);
      const strategy2 = RaceDetectorMocks.createMockStrategy([race2]);
      
      const result = detectRaces([strategy1, strategy2], new Map(), {});
      
      expect(result).toHaveLength(2);
    });

    it('should flatten races from multiple strategies', () => {
      const races1 = [{ id: 'race-1' }, { id: 'race-2' }];
      const races2 = [{ id: 'race-3' }];
      
      const strategy1 = RaceDetectorMocks.createMockStrategy(races1);
      const strategy2 = RaceDetectorMocks.createMockStrategy(races2);
      
      const result = detectRaces([strategy1, strategy2], new Map(), {});
      
      expect(result).toHaveLength(3);
    });

    it('should handle strategy returning empty array', () => {
      const race = { id: 'race-1' };
      const strategy1 = RaceDetectorMocks.createMockStrategy([race]);
      const strategy2 = RaceDetectorMocks.createMockStrategy([]);
      
      const result = detectRaces([strategy1, strategy2], new Map(), {});
      
      expect(result).toHaveLength(1);
    });

    it('should pass sharedState and project to strategies', () => {
      const sharedState = new Map([['key', []]]);
      const project = { name: 'test' };
      
      let receivedSharedState, receivedProject;
      const strategy = {
        detect: (ss, p) => {
          receivedSharedState = ss;
          receivedProject = p;
          return [];
        }
      };
      
      detectRaces([strategy], sharedState, project);
      
      expect(receivedSharedState).toBe(sharedState);
      expect(receivedProject).toBe(project);
    });

    it('should handle many strategies', () => {
      const strategies = Array(10).fill(null).map((_, i) => 
        RaceDetectorMocks.createMockStrategy([{ id: `race-${i}` }])
      );
      
      const result = detectRaces(strategies, new Map(), {});
      
      expect(result).toHaveLength(10);
    });
  });

  describe('DetectPhase class', () => {
    it('should store parameters in constructor', () => {
      const strategies = ['strategy1'];
      const sharedState = new Map();
      const project = { name: 'test' };
      
      const phase = new DetectPhase(strategies, sharedState, project);
      
      expect(phase.strategies).toEqual(strategies);
      expect(phase.sharedState).toBe(sharedState);
      expect(phase.project).toBe(project);
    });

    it('should execute and return races', () => {
      const race = { id: 'race-1' };
      const strategy = RaceDetectorMocks.createMockStrategy([race]);
      const phase = new DetectPhase([strategy], new Map(), {});
      
      const result = phase.execute();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });

    it('should collect from all strategies on execute', () => {
      const race1 = { id: 'race-1' };
      const race2 = { id: 'race-2' };
      
      const strategy1 = RaceDetectorMocks.createMockStrategy([race1]);
      const strategy2 = RaceDetectorMocks.createMockStrategy([race2]);
      
      const phase = new DetectPhase([strategy1, strategy2], new Map(), {});
      const result = phase.execute();
      
      expect(result).toHaveLength(2);
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle empty strategies array', () => {
      expect(() => detectRaces([], new Map(), {})).not.toThrow();
    });

    it('should handle null strategies', () => {
      expect(() => detectRaces(null, new Map(), {})).toThrow();
    });

    it('should handle null sharedState', () => {
      const strategy = RaceDetectorMocks.createMockStrategy([]);
      expect(() => detectRaces([strategy], null, {})).not.toThrow();
    });

    it('should handle null project', () => {
      const strategy = RaceDetectorMocks.createMockStrategy([]);
      expect(() => detectRaces([strategy], new Map(), null)).not.toThrow();
    });

    it('should handle strategy returning null', () => {
      const strategy = { detect: () => null };
      expect(() => detectRaces([strategy], new Map(), {})).toThrow();
    });

    it('should handle strategy returning undefined', () => {
      const strategy = { detect: () => undefined };
      expect(() => detectRaces([strategy], new Map(), {})).toThrow();
    });

    it('should handle strategy throwing error', () => {
      const strategy = {
        detect: () => { throw new Error('Strategy error'); }
      };
      expect(() => detectRaces([strategy], new Map(), {})).toThrow('Strategy error');
    });

    it('should handle DetectPhase with null strategies', () => {
      const phase = new DetectPhase(null, new Map(), {});
      expect(() => phase.execute()).toThrow();
    });
  });
});
