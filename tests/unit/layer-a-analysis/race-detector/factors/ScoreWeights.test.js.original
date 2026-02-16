/**
 * @fileoverview ScoreWeights.test.js
 * 
 * Tests for ScoreWeights class.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/factors/ScoreWeights
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ScoreWeights } from '#layer-a/race-detector/factors/ScoreWeights.js';

describe('ScoreWeights', () => {
  describe('Structure Contract', () => {
    it('should export ScoreWeights class', () => {
      expect(ScoreWeights).toBeDefined();
      expect(typeof ScoreWeights).toBe('function');
    });

    it('should create instance with weights object', () => {
      const weights = new ScoreWeights();
      expect(weights.weights).toBeDefined();
      expect(typeof weights.weights).toBe('object');
    });

    it('should have required methods', () => {
      const weights = new ScoreWeights();
      expect(typeof weights.getTypeWeight).toBe('function');
      expect(typeof weights.getAsyncWeight).toBe('function');
      expect(typeof weights.getDataIntegrityWeight).toBe('function');
      expect(typeof weights.getScopeWeight).toBe('function');
      expect(typeof weights.update).toBe('function');
    });
  });

  describe('Default Weights', () => {
    let weights;

    beforeEach(() => {
      weights = new ScoreWeights();
    });

    it('should have default type weights', () => {
      expect(weights.weights.type).toBeDefined();
      expect(weights.weights.type.WW).toBe(1.0);
      expect(weights.weights.type.RW).toBe(0.8);
      expect(weights.weights.type.IE).toBe(0.9);
      expect(weights.weights.type.EH).toBe(0.7);
      expect(weights.weights.type.OTHER).toBe(0.5);
    });

    it('should have default async weights', () => {
      expect(weights.weights.async).toBeDefined();
      expect(weights.weights.async.both).toBe(1.0);
      expect(weights.weights.async.one).toBe(0.8);
      expect(weights.weights.async.none).toBe(0.3);
    });

    it('should have default data integrity weights', () => {
      expect(weights.weights.dataIntegrity).toBeDefined();
      expect(weights.weights.dataIntegrity.critical).toBe(1.0);
      expect(weights.weights.dataIntegrity.high).toBe(0.8);
      expect(weights.weights.dataIntegrity.medium).toBe(0.5);
      expect(weights.weights.dataIntegrity.low).toBe(0.2);
    });

    it('should have default scope weights', () => {
      expect(weights.weights.scope).toBeDefined();
      expect(weights.weights.scope.global).toBe(1.0);
      expect(weights.weights.scope.module).toBe(0.7);
      expect(weights.weights.scope.external).toBe(0.9);
      expect(weights.weights.scope.singleton).toBe(0.8);
      expect(weights.weights.scope.closure).toBe(0.4);
    });
  });

  describe('getTypeWeight', () => {
    let weights;

    beforeEach(() => {
      weights = new ScoreWeights();
    });

    it('should return correct weight for WW type', () => {
      expect(weights.getTypeWeight('WW')).toBe(1.0);
    });

    it('should return correct weight for RW type', () => {
      expect(weights.getTypeWeight('RW')).toBe(0.8);
    });

    it('should return correct weight for IE type', () => {
      expect(weights.getTypeWeight('IE')).toBe(0.9);
    });

    it('should return correct weight for EH type', () => {
      expect(weights.getTypeWeight('EH')).toBe(0.7);
    });

    it('should return default weight for unknown type', () => {
      expect(weights.getTypeWeight('UNKNOWN')).toBe(0.5);
    });

    it('should return default weight for empty string', () => {
      expect(weights.getTypeWeight('')).toBe(0.5);
    });

    it('should return default weight for null', () => {
      expect(weights.getTypeWeight(null)).toBe(0.5);
    });

    it('should return default weight for undefined', () => {
      expect(weights.getTypeWeight(undefined)).toBe(0.5);
    });
  });

  describe('getAsyncWeight', () => {
    let weights;

    beforeEach(() => {
      weights = new ScoreWeights();
    });

    it('should return correct weight for both async', () => {
      expect(weights.getAsyncWeight('both')).toBe(1.0);
    });

    it('should return correct weight for one async', () => {
      expect(weights.getAsyncWeight('one')).toBe(0.8);
    });

    it('should return correct weight for none async', () => {
      expect(weights.getAsyncWeight('none')).toBe(0.3);
    });

    it('should return default weight for unknown', () => {
      expect(weights.getAsyncWeight('unknown')).toBe(0.5);
    });

    it('should return default weight for null', () => {
      expect(weights.getAsyncWeight(null)).toBe(0.5);
    });

    it('should return default weight for undefined', () => {
      expect(weights.getAsyncWeight(undefined)).toBe(0.5);
    });
  });

  describe('getDataIntegrityWeight', () => {
    let weights;

    beforeEach(() => {
      weights = new ScoreWeights();
    });

    it('should return correct weight for critical', () => {
      expect(weights.getDataIntegrityWeight('critical')).toBe(1.0);
    });

    it('should return correct weight for high', () => {
      expect(weights.getDataIntegrityWeight('high')).toBe(0.8);
    });

    it('should return correct weight for medium', () => {
      expect(weights.getDataIntegrityWeight('medium')).toBe(0.5);
    });

    it('should return correct weight for low', () => {
      expect(weights.getDataIntegrityWeight('low')).toBe(0.2);
    });

    it('should return default weight for unknown', () => {
      expect(weights.getDataIntegrityWeight('unknown')).toBe(0.5);
    });

    it('should return default weight for null', () => {
      expect(weights.getDataIntegrityWeight(null)).toBe(0.5);
    });
  });

  describe('getScopeWeight', () => {
    let weights;

    beforeEach(() => {
      weights = new ScoreWeights();
    });

    it('should return correct weight for global', () => {
      expect(weights.getScopeWeight('global')).toBe(1.0);
    });

    it('should return correct weight for module', () => {
      expect(weights.getScopeWeight('module')).toBe(0.7);
    });

    it('should return correct weight for external', () => {
      expect(weights.getScopeWeight('external')).toBe(0.9);
    });

    it('should return correct weight for singleton', () => {
      expect(weights.getScopeWeight('singleton')).toBe(0.8);
    });

    it('should return correct weight for closure', () => {
      expect(weights.getScopeWeight('closure')).toBe(0.4);
    });

    it('should return default weight for unknown', () => {
      expect(weights.getScopeWeight('unknown')).toBe(0.5);
    });

    it('should return default weight for null', () => {
      expect(weights.getScopeWeight(null)).toBe(0.5);
    });
  });

  describe('update', () => {
    let weights;

    beforeEach(() => {
      weights = new ScoreWeights();
    });

    it('should update type weights', () => {
      weights.update({
        type: { WW: 1.5, RW: 1.2 }
      });

      expect(weights.getTypeWeight('WW')).toBe(1.5);
      expect(weights.getTypeWeight('RW')).toBe(1.2);
    });

    it('should update async weights', () => {
      weights.update({
        async: { both: 1.5, one: 1.2 }
      });

      expect(weights.getAsyncWeight('both')).toBe(1.5);
      expect(weights.getAsyncWeight('one')).toBe(1.2);
    });

    it('should merge updates without affecting other categories', () => {
      weights.update({
        type: { WW: 1.5 }
      });

      expect(weights.getTypeWeight('WW')).toBe(1.5);
      expect(weights.getTypeWeight('RW')).toBe(0.8);
      expect(weights.getAsyncWeight('both')).toBe(1.0);
    });

    it('should handle empty update object', () => {
      const originalWeights = { ...weights.weights };
      weights.update({});

      expect(weights.getTypeWeight('WW')).toBe(1.0);
    });

    it('should handle nested updates', () => {
      weights.update({
        type: { NEW_TYPE: 0.6 }
      });

      expect(weights.getTypeWeight('NEW_TYPE')).toBe(0.6);
    });
  });

  describe('Error Handling Contract', () => {
    let weights;

    beforeEach(() => {
      weights = new ScoreWeights();
    });

    it('should handle update with null', () => {
      expect(() => weights.update(null)).not.toThrow();
    });

    it('should handle update with undefined', () => {
      expect(() => weights.update(undefined)).not.toThrow();
    });

    it('should handle update with non-object', () => {
      expect(() => weights.update('string')).not.toThrow();
    });

    it('should maintain valid state after invalid update', () => {
      weights.update(null);
      expect(weights.getTypeWeight('WW')).toBe(1.0);
    });
  });
});
