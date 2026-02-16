/**
 * @fileoverview Pattern Detection Index Tests
 * 
 * Tests for pattern-detection module exports (index.js).
 * 
 * @module tests/unit/layer-a-analysis/pattern-detection/index
 */

import { describe, it, expect } from 'vitest';

describe('Pattern Detection Module Exports', () => {
  /**
   * ============================================
   * ENGINE EXPORTS CONTRACT
   * ============================================
   */

  describe('Engine Exports Contract', () => {
    it('should export PatternDetectionEngine', async () => {
      const { PatternDetectionEngine } = await import('#layer-a/pattern-detection/index.js');
      expect(PatternDetectionEngine).toBeDefined();
      expect(typeof PatternDetectionEngine).toBe('function');
    });

    it('should export PatternDetectorRegistry', async () => {
      const { PatternDetectorRegistry } = await import('#layer-a/pattern-detection/index.js');
      expect(PatternDetectorRegistry).toBeDefined();
      expect(typeof PatternDetectorRegistry).toBe('function');
    });

    it('should export QualityScoreAggregator', async () => {
      const { QualityScoreAggregator } = await import('#layer-a/pattern-detection/index.js');
      expect(QualityScoreAggregator).toBeDefined();
      expect(typeof QualityScoreAggregator).toBe('function');
    });

    it('should export ConfigManager', async () => {
      const { ConfigManager } = await import('#layer-a/pattern-detection/index.js');
      expect(ConfigManager).toBeDefined();
      expect(typeof ConfigManager).toBe('function');
    });

    it('should export DEFAULT_CONFIG', async () => {
      const { DEFAULT_CONFIG } = await import('#layer-a/pattern-detection/index.js');
      expect(DEFAULT_CONFIG).toBeDefined();
      expect(typeof DEFAULT_CONFIG).toBe('object');
    });
  });

  /**
   * ============================================
   * RUNNER EXPORTS CONTRACT
   * ============================================
   */

  describe('Runner Exports Contract', () => {
    it('should export DetectorRunner', async () => {
      const { DetectorRunner } = await import('#layer-a/pattern-detection/index.js');
      expect(DetectorRunner).toBeDefined();
      expect(typeof DetectorRunner).toBe('function');
    });
  });

  /**
   * ============================================
   * DETECTOR BASE EXPORTS CONTRACT
   * ============================================
   */

  describe('Detector Base Exports Contract', () => {
    it('should export PatternDetector', async () => {
      const { PatternDetector } = await import('#layer-a/pattern-detection/index.js');
      expect(PatternDetector).toBeDefined();
      expect(typeof PatternDetector).toBe('function');
    });
  });

  /**
   * ============================================
   * DEFAULT EXPORT CONTRACT
   * ============================================
   */

  describe('Default Export Contract', () => {
    it('should export PatternDetectionEngine as default', async () => {
      const module = await import('#layer-a/pattern-detection/index.js');
      expect(module.default).toBeDefined();
      expect(module.default).toBe(module.PatternDetectionEngine);
    });
  });

  /**
   * ============================================
   * INSTANTIATION CONTRACT
   * ============================================
   */

  describe('Instantiation Contract', () => {
    it('should be able to instantiate PatternDetectionEngine', async () => {
      const { PatternDetectionEngine } = await import('#layer-a/pattern-detection/index.js');
      const engine = new PatternDetectionEngine();
      expect(engine).toBeInstanceOf(PatternDetectionEngine);
    });

    it('should be able to instantiate PatternDetectorRegistry', async () => {
      const { PatternDetectorRegistry } = await import('#layer-a/pattern-detection/index.js');
      const registry = new PatternDetectorRegistry();
      expect(registry).toBeInstanceOf(PatternDetectorRegistry);
    });

    it('should be able to instantiate QualityScoreAggregator', async () => {
      const { QualityScoreAggregator } = await import('#layer-a/pattern-detection/index.js');
      const aggregator = new QualityScoreAggregator({ weights: {} });
      expect(aggregator).toBeInstanceOf(QualityScoreAggregator);
    });

    it('should be able to instantiate DetectorRunner', async () => {
      const { DetectorRunner } = await import('#layer-a/pattern-detection/index.js');
      const runner = new DetectorRunner();
      expect(runner).toBeInstanceOf(DetectorRunner);
    });
  });
});

describe('Pattern Detection Module Integration', () => {
  /**
   * ============================================
   * INTEGRATION CONTRACT
   * ============================================
   */

  describe('Integration Contract', () => {
    it('should work with all exported components together', async () => {
      const { 
        PatternDetectionEngine, 
        PatternDetectorRegistry, 
        QualityScoreAggregator,
        DetectorRunner,
        DEFAULT_CONFIG 
      } = await import('#layer-a/pattern-detection/index.js');

      // Create instances
      const registry = new PatternDetectorRegistry();
      const aggregator = new QualityScoreAggregator(DEFAULT_CONFIG);
      const runner = new DetectorRunner();
      const engine = new PatternDetectionEngine();

      // Verify they work together
      expect(registry).toBeDefined();
      expect(aggregator).toBeDefined();
      expect(runner).toBeDefined();
      expect(engine).toBeDefined();
    });
  });
});
