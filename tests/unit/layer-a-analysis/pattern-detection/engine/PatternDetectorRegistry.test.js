/**
 * @fileoverview Pattern Detector Registry (engine folder) Tests
 * 
 * Tests for PatternDetectorRegistry from engine/ folder.
 * 
 * @module tests/unit/layer-a-analysis/pattern-detection/engine/PatternDetectorRegistry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PatternDetectorRegistry } from '#layer-a/pattern-detection/engine/PatternDetectorRegistry.js';

describe('PatternDetectorRegistry (engine folder)', () => {
  let registry;

  beforeEach(() => {
    registry = new PatternDetectorRegistry();
  });

  /**
   * ============================================
   * STRUCTURE CONTRACT
   * ============================================
   */

  describe('Structure Contract', () => {
    it('should create registry with empty detectors map', () => {
      expect(registry.detectors).toBeInstanceOf(Map);
      expect(registry.detectors.size).toBe(0);
    });

    it('should have register method', () => {
      expect(typeof registry.register).toBe('function');
    });

    it('should have getAll method', () => {
      expect(typeof registry.getAll).toBe('function');
    });

    it('should have get method', () => {
      expect(typeof registry.get).toBe('function');
    });

    it('should have unregister method', () => {
      expect(typeof registry.unregister).toBe('function');
    });

    it('should have clear method', () => {
      expect(typeof registry.clear).toBe('function');
    });
  });

  /**
   * ============================================
   * REGISTRATION CONTRACT
   * ============================================
   */

  describe('Registration Contract', () => {
    it('should register detector with id', () => {
      registry.register({
        id: 'test-detector',
        priority: 50
      });

      expect(registry.detectors.has('test-detector')).toBe(true);
    });

    it('should use default priority of 50', () => {
      registry.register({
        id: 'default-priority'
      });

      const detector = registry.get('default-priority');
      expect(detector.priority).toBe(50);
    });

    it('should allow custom priority', () => {
      registry.register({
        id: 'high-priority',
        priority: 100
      });

      const detector = registry.get('high-priority');
      expect(detector.priority).toBe(100);
    });

    it('should overwrite existing detector (no throw)', () => {
      registry.register({ id: 'duplicate', priority: 50 });
      registry.register({ id: 'duplicate', priority: 100 });

      const detector = registry.get('duplicate');
      expect(detector.priority).toBe(100);
    });
  });

  /**
   * ============================================
   * RETRIEVAL CONTRACT
   * ============================================
   */

  describe('Retrieval Contract', () => {
    beforeEach(() => {
      registry.register({ id: 'low', priority: 10 });
      registry.register({ id: 'high', priority: 100 });
      registry.register({ id: 'mid', priority: 50 });
    });

    it('should get all detectors sorted by priority', () => {
      const all = registry.getAll();
      
      expect(all).toHaveLength(3);
      expect(all[0].id).toBe('high');
      expect(all[1].id).toBe('mid');
      expect(all[2].id).toBe('low');
    });

    it('should get detector by id', () => {
      const detector = registry.get('mid');
      expect(detector.id).toBe('mid');
      expect(detector.priority).toBe(50);
    });

    it('should return undefined for non-existent detector', () => {
      const detector = registry.get('non-existent');
      expect(detector).toBeUndefined();
    });

    it('should return empty array when no detectors', () => {
      const emptyRegistry = new PatternDetectorRegistry();
      expect(emptyRegistry.getAll()).toEqual([]);
    });
  });

  /**
   * ============================================
   * UNREGISTRATION CONTRACT
   * ============================================
   */

  describe('Unregistration Contract', () => {
    beforeEach(() => {
      registry.register({ id: 'det1' });
      registry.register({ id: 'det2' });
    });

    it('should unregister detector', () => {
      registry.unregister('det1');
      expect(registry.detectors.has('det1')).toBe(false);
      expect(registry.detectors.has('det2')).toBe(true);
    });

    it('should silently ignore unregistering non-existent detector', () => {
      expect(() => registry.unregister('non-existent')).not.toThrow();
    });
  });

  /**
   * ============================================
   * CLEAR CONTRACT
   * ============================================
   */

  describe('Clear Contract', () => {
    it('should clear all detectors', () => {
      registry.register({ id: 'det1' });
      registry.register({ id: 'det2' });
      
      registry.clear();
      
      expect(registry.detectors.size).toBe(0);
    });

    it('should handle clearing empty registry', () => {
      expect(() => registry.clear()).not.toThrow();
    });
  });

  /**
   * ============================================
   * ERROR HANDLING CONTRACT
   * ============================================
   */

  describe('Error Handling Contract', () => {
    it('should handle negative priority', () => {
      registry.register({ id: 'negative', priority: -10 });
      const detector = registry.get('negative');
      expect(detector.priority).toBe(-10);
    });

    it('should handle zero priority', () => {
      registry.register({ id: 'zero', priority: 0 });
      const all = registry.getAll();
      expect(all[all.length - 1].id).toBe('zero');
    });

    it('should handle very large priority', () => {
      registry.register({ id: 'huge', priority: 999999 });
      const all = registry.getAll();
      expect(all[0].id).toBe('huge');
    });
  });
});
