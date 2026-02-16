/**
 * @fileoverview Shared Objects Detector Index Tests
 * 
 * Tests for shared-objects-detector index.js exports.
 * 
 * @module tests/unit/layer-a-analysis/pattern-detection/shared-objects-detector/index
 */

import { describe, it, expect } from 'vitest';

describe('Shared Objects Detector Exports', () => {
  /**
   * ============================================
   * EXPORT CONTRACT
   * ============================================
   */

  describe('Export Contract', () => {
    it('should export SharedObjectsDetector', async () => {
      const { SharedObjectsDetector } = await import('#layer-a/pattern-detection/detectors/shared-objects-detector/index.js');
      expect(SharedObjectsDetector).toBeDefined();
      expect(typeof SharedObjectsDetector).toBe('function');
    });

    it('should export analyzeRiskProfile', async () => {
      const { analyzeRiskProfile } = await import('#layer-a/pattern-detection/detectors/shared-objects-detector/index.js');
      expect(analyzeRiskProfile).toBeDefined();
      expect(typeof analyzeRiskProfile).toBe('function');
    });

    it('should export countUsages', async () => {
      const { countUsages } = await import('#layer-a/pattern-detection/detectors/shared-objects-detector/index.js');
      expect(countUsages).toBeDefined();
      expect(typeof countUsages).toBe('function');
    });

    it('should export generateRecommendation', async () => {
      const { generateRecommendation } = await import('#layer-a/pattern-detection/detectors/shared-objects-detector/index.js');
      expect(generateRecommendation).toBeDefined();
      expect(typeof generateRecommendation).toBe('function');
    });

    it('should export calculateScore', async () => {
      const { calculateScore } = await import('#layer-a/pattern-detection/detectors/shared-objects-detector/index.js');
      expect(calculateScore).toBeDefined();
      expect(typeof calculateScore).toBe('function');
    });

    it('should export isConfigObject', async () => {
      const { isConfigObject } = await import('#layer-a/pattern-detection/detectors/shared-objects-detector/index.js');
      expect(isConfigObject).toBeDefined();
      expect(typeof isConfigObject).toBe('function');
    });

    it('should export isStateObject', async () => {
      const { isStateObject } = await import('#layer-a/pattern-detection/detectors/shared-objects-detector/index.js');
      expect(isStateObject).toBeDefined();
      expect(typeof isStateObject).toBe('function');
    });

    it('should export isUtilsObject', async () => {
      const { isUtilsObject } = await import('#layer-a/pattern-detection/detectors/shared-objects-detector/index.js');
      expect(isUtilsObject).toBeDefined();
      expect(typeof isUtilsObject).toBe('function');
    });
  });

  /**
   * ============================================
   * DEFAULT EXPORT CONTRACT
   * ============================================
   */

  describe('Default Export Contract', () => {
    it('should export SharedObjectsDetector as default', async () => {
      const module = await import('#layer-a/pattern-detection/detectors/shared-objects-detector/index.js');
      expect(module.default).toBeDefined();
      expect(module.default).toBe(module.SharedObjectsDetector);
    });
  });

  /**
   * ============================================
   * INTEGRATION CONTRACT
   * ============================================
   */

  describe('Integration Contract', () => {
    it('should be able to instantiate SharedObjectsDetector', async () => {
      const { SharedObjectsDetector } = await import('#layer-a/pattern-detection/detectors/shared-objects-detector/index.js');
      const detector = new SharedObjectsDetector({
        config: {},
        globalConfig: { weights: { sharedObjects: 0.2 } }
      });
      expect(detector).toBeInstanceOf(SharedObjectsDetector);
    });

    it('should be able to use analyzeRiskProfile', async () => {
      const { analyzeRiskProfile } = await import('#layer-a/pattern-detection/detectors/shared-objects-detector/index.js');
      const result = analyzeRiskProfile(
        { name: 'testStore' },
        [{ file: 'a.js' }],
        'src/store.js'
      );
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('factors');
    });

    it('should be able to use countUsages', async () => {
      const { countUsages } = await import('#layer-a/pattern-detection/detectors/shared-objects-detector/index.js');
      const systemMap = {
        files: {
          'a.js': { imports: [{ specifiers: [{ imported: 'test' }] }] }
        }
      };
      const usages = countUsages('test', systemMap);
      expect(Array.isArray(usages)).toBe(true);
    });

    it('should be able to use pattern functions', async () => {
      const { isConfigObject, isStateObject, isUtilsObject } = await import('#layer-a/pattern-detection/detectors/shared-objects-detector/index.js');
      
      expect(isConfigObject('CONFIG')).toBe(true);
      expect(isStateObject('appStore', {}, '')).toBe(true);
      expect(isUtilsObject('helpers')).toBe(true);
    });
  });
});
