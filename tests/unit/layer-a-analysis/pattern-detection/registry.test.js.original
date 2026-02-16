/**
 * @fileoverview Pattern Detector Registry Tests
 * 
 * Tests for PatternDetectorRegistry (registry.js).
 * 
 * @module tests/unit/layer-a-analysis/pattern-detection/registry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PatternDetectorRegistry } from '#layer-a/pattern-detection/registry.js';
import { PatternDetectionTestFactory } from '../../../factories/pattern-detection-test.factory.js';

describe('PatternDetectorRegistry (registry.js)', () => {
  let registry;

  beforeEach(() => {
    registry = new PatternDetectorRegistry();
  });

  /**
   * ============================================
   * STRUCTURE CONTRACT
   * ============================================
   */

  describe('Structure Contract', () => () => {
    it('should create registry with empty detectors map', () => {
      expect(registry.detectors).toBeInstanceOf(Map);
      expect(registry.detectors.size).toBe(0);
    });

    it('should have register method', () => {
      expect(typeof registry.register).toBe('function');
    });

    it('should have unregister method', () => {
      expect(typeof registry.unregister).toBe('function');
    });

    it('should have get method', () => {
      expect(typeof registry.get).toBe('function');
    });

    it('should have getAll method', () => {
      expect(typeof registry.getAll).toBe('function');
    });

    it('should have has method', () => {
      expect(typeof registry.has).toBe('function');
    });

    it('should have clear method', () => {
      expect(typeof registry.clear).toBe('function');
    });

    it('should have size method', () => {
      expect(typeof registry.size).toBe('function');
    });
  });

  /**
   * ============================================
   * REGISTRATION CONTRACT
   * ============================================
   */

  describe('Registration Contract', () => {
    it('should register a detector with minimal config', () => {
      registry.register({
        id: 'test-detector',
        loader: () => Promise.resolve({})
      });

      expect(registry.has('test-detector')).toBe(true);
      expect(registry.size()).toBe(1);
    });

    it('should register a detector with full config', () => {
      registry.register({
        id: 'full-detector',
        loader: () => Promise.resolve({}),
        priority: 100,
        dependencies: ['dep1', 'dep2']
      });

      const detector = registry.get('full-detector');
      expect(detector).toBeDefined();
      expect(detector.id).toBe('full-detector');
      expect(detector.priority).toBe(100);
      expect(detector.dependencies).toEqual(['dep1', 'dep2']);
      expect(detector.registeredAt).toBeDefined();
    });

    it('should throw when registering duplicate detector', () => {
      registry.register({
        id: 'duplicate',
        loader: () => Promise.resolve({})
      });

      expect(() => {
        registry.register({
          id: 'duplicate',
          loader: () => Promise.resolve({})
        });
      }).toThrow('Detector duplicate already registered');
    });

    it('should store registration timestamp', () => {
      const before = new Date().toISOString();
      registry.register({
        id: 'timed-detector',
        loader: () => Promise.resolve({})
      });
      const after = new Date().toISOString();

      const detector = registry.get('timed-detector');
      expect(detector.registeredAt).toBeDefined();
      expect(detector.registeredAt >= before).toBe(true);
      expect(detector.registeredAt <= after).toBe(true);
    });
  });

  /**
   * ============================================
   * UNREGISTRATION CONTRACT
   * ============================================
   */

  describe('Unregistration Contract', () => {
    beforeEach(() => {
      registry.register({ id: 'det1', loader: () => {} });
      registry.register({ id: 'det2', loader: () => {} });
    });

    it('should unregister existing detector', () => {
      const result = registry.unregister('det1');
      expect(result).toBe(true);
      expect(registry.has('det1')).toBe(false);
      expect(registry.size()).toBe(1);
    });

    it('should return false when unregistering non-existent detector', () => {
      const result = registry.unregister('non-existent');
      expect(result).toBe(false);
    });

    it('should handle unregistering from empty registry', () => {
      const emptyRegistry = new PatternDetectorRegistry();
      const result = emptyRegistry.unregister('anything');
      expect(result).toBe(false);
    });
  });

  /**
   * ============================================
   * RETRIEVAL CONTRACT
   * ============================================
   */

  describe('Retrieval Contract', () => {
    beforeEach(() => {
      registry.register({ id: 'low-priority', loader: () => {}, priority: 10 });
      registry.register({ id: 'high-priority', loader: () => {}, priority: 100 });
      registry.register({ id: 'mid-priority', loader: () => {}, priority: 50 });
    });

    it('should get detector by ID', () => {
      const detector = registry.get('low-priority');
      expect(detector).toBeDefined();
      expect(detector.id).toBe('low-priority');
    });

    it('should return undefined for non-existent detector', () => {
      const detector = registry.get('non-existent');
      expect(detector).toBeUndefined();
    });

    it('should check if detector exists', () => {
      expect(registry.has('low-priority')).toBe(true);
      expect(registry.has('non-existent')).toBe(false);
    });

    it('should get all detectors sorted by priority (descending)', () => {
      const all = registry.getAll();
      expect(all).toHaveLength(3);
      expect(all[0].id).toBe('high-priority');
      expect(all[1].id).toBe('mid-priority');
      expect(all[2].id).toBe('low-priority');
    });

    it('should handle detectors with same priority', () => {
      registry.register({ id: 'same-1', loader: () => {}, priority: 50 });
      registry.register({ id: 'same-2', loader: () => {}, priority: 50 });
      
      const all = registry.getAll();
      const priority50 = all.filter(d => d.priority === 50);
      expect(priority50).toHaveLength(2);
    });

    it('should handle detectors without priority (defaults to 0)', () => {
      registry.register({ id: 'no-priority', loader: () => {} });
      const all = registry.getAll();
      expect(all[all.length - 1].id).toBe('no-priority');
    });

    it('should return empty array when no detectors registered', () => {
      const emptyRegistry = new PatternDetectorRegistry();
      expect(emptyRegistry.getAll()).toEqual([]);
    });
  });

  /**
   * ============================================
   * CLEAR CONTRACT
   * ============================================
   */

  describe('Clear Contract', () => {
    it('should clear all detectors', () => {
      registry.register({ id: 'det1', loader: () => {} });
      registry.register({ id: 'det2', loader: () => {} });
      
      registry.clear();
      
      expect(registry.size()).toBe(0);
      expect(registry.has('det1')).toBe(false);
      expect(registry.has('det2')).toBe(false);
    });

    it('should handle clearing empty registry', () => {
      expect(() => registry.clear()).not.toThrow();
      expect(registry.size()).toBe(0);
    });
  });

  /**
   * ============================================
   * SIZE CONTRACT
   * ============================================
   */

  describe('Size Contract', () => {
    it('should return 0 for empty registry', () => {
      expect(registry.size()).toBe(0);
    });

    it('should return correct count after registrations', () => {
      registry.register({ id: 'det1', loader: () => {} });
      expect(registry.size()).toBe(1);
      
      registry.register({ id: 'det2', loader: () => {} });
      expect(registry.size()).toBe(2);
    });

    it('should return correct count after unregistration', () => {
      registry.register({ id: 'det1', loader: () => {} });
      registry.register({ id: 'det2', loader: () => {} });
      
      registry.unregister('det1');
      expect(registry.size()).toBe(1);
    });
  });

  /**
   * ============================================
   * ERROR HANDLING CONTRACT
   * ============================================
   */

  describe('Error Handling Contract', () => {
    it('should throw when registering without id', () => {
      expect(() => {
        registry.register({ loader: () => {} });
      }).toThrow();
    });

    it('should throw when registering with empty id', () => {
      expect(() => {
        registry.register({ id: '', loader: () => {} });
      }).toThrow();
    });

    it('should handle negative priority', () => {
      registry.register({
        id: 'negative-priority',
        loader: () => {},
        priority: -10
      });

      const all = registry.getAll();
      expect(all[all.length - 1].id).toBe('negative-priority');
    });

    it('should handle very large priority', () => {
      registry.register({
        id: 'huge-priority',
        loader: () => {},
        priority: 999999
      });

      const all = registry.getAll();
      expect(all[0].id).toBe('huge-priority');
    });

    it('should preserve detector config properties', () => {
      const customConfig = {
        id: 'custom',
        loader: () => {},
        customField1: 'value1',
        customField2: { nested: true },
        customField3: [1, 2, 3]
      };

      registry.register(customConfig);
      const detector = registry.get('custom');

      expect(detector.customField1).toBe('value1');
      expect(detector.customField2).toEqual({ nested: true });
      expect(detector.customField3).toEqual([1, 2, 3]);
    });
  });
});
