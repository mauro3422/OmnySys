/**
 * @fileoverview Pattern Detection Engine (engine folder) Tests
 * 
 * Tests for PatternDetectionEngine from engine/ folder.
 * 
 * @module tests/unit/layer-a-analysis/pattern-detection/engine/PatternDetectionEngine
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PatternDetectionEngine } from '#layer-a/pattern-detection/engine/PatternDetectionEngine.js';
import { PatternDetectionTestFactory } from '../../../../factories/pattern-detection-test.factory.js';

describe('PatternDetectionEngine (engine folder)', () => {
  let engine;

  beforeEach(() => {
    engine = new PatternDetectionEngine({});
  });

  /**
   * ============================================
   * STRUCTURE CONTRACT
   * ============================================
   */

  describe('Structure Contract', () => {
    it('should have configManager', () => {
      expect(engine.configManager).toBeDefined();
    });

    it('should have registry', () => {
      expect(engine.registry).toBeDefined();
    });

    it('should have aggregator', () => {
      expect(engine.aggregator).toBeDefined();
    });

    it('should have results map', () => {
      expect(engine.results).toBeInstanceOf(Map);
    });

    it('should have analyze method', () => {
      expect(typeof engine.analyze).toBe('function');
    });

    it('should have runDetector method', () => {
      expect(typeof engine.runDetector).toBe('function');
    });

    it('should have addDetector method', () => {
      expect(typeof engine.addDetector).toBe('function');
    });

    it('should have getResults method', () => {
      expect(typeof engine.getResults).toBe('function');
    });

    it('should have registerDefaultDetectors method', () => {
      expect(typeof engine.registerDefaultDetectors).toBe('function');
    });
  });

  /**
   * ============================================
   * INITIALIZATION CONTRACT
   * ============================================
   */

  describe('Initialization Contract', () => {
    it('should register default detectors on construction', () => {
      expect(engine.registry.size()).toBeGreaterThan(0);
    });

    it('should register deepChains detector', () => {
      expect(engine.registry.has('deepChains')).toBe(true);
    });

    it('should register sharedObjects detector', () => {
      expect(engine.registry.has('sharedObjects')).toBe(true);
    });

    it('should register coupling detector', () => {
      expect(engine.registry.has('coupling')).toBe(true);
    });

    it('should register hotspots detector', () => {
      expect(engine.registry.has('hotspots')).toBe(true);
    });

    it('should initialize aggregator with config', () => {
      expect(engine.aggregator.config).toBeDefined();
    });
  });

  /**
   * ============================================
   * ANALYSIS CONTRACT
   * ============================================
   */

  describe('Analysis Contract', () => {
    it('should return complete analysis result', async () => {
      const systemMap = PatternDetectionTestFactory.createComplexSystemMap();
      const result = await engine.analyze(systemMap);

      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('qualityScore');
      expect(result).toHaveProperty('metadata');
    });

    it('should detect project type during analysis', async () => {
      const systemMap = PatternDetectionTestFactory.createComplexSystemMap();
      await engine.analyze(systemMap);

      expect(engine.configManager.getProjectType()).toBeDefined();
    });

    it('should run all registered detectors', async () => {
      const systemMap = PatternDetectionTestFactory.createComplexSystemMap();
      const detectorCount = engine.registry.size();
      
      const result = await engine.analyze(systemMap);
      expect(result.metadata.detectorsRun).toBe(detectorCount);
    });

    it('should store results for each detector', async () => {
      const systemMap = PatternDetectionTestFactory.createComplexSystemMap();
      await engine.analyze(systemMap);

      const detectorIds = engine.registry.getAll().map(d => d.id);
      detectorIds.forEach(id => {
        expect(engine.results.has(id)).toBe(true);
      });
    });

    it('should calculate quality score from patterns', async () => {
      const systemMap = PatternDetectionTestFactory.createComplexSystemMap();
      const result = await engine.analyze(systemMap);

      expect(result.qualityScore).toHaveProperty('total');
      expect(result.qualityScore).toHaveProperty('grade');
      expect(result.qualityScore).toHaveProperty('components');
    });
  });

  /**
   * ============================================
   * DETECTOR EXECUTION CONTRACT
   * ============================================
   */

  describe('Detector Execution Contract', () => {
    it('should run individual detector', async () => {
      const detector = engine.registry.get('hotspots');
      const systemMap = PatternDetectionTestFactory.createComplexSystemMap();
      
      const result = await engine.runDetector(detector, systemMap);
      expect(result).toBeDefined();
    });

    it('should handle detector errors gracefully', async () => {
      const badDetector = {
        id: 'bad',
        loader: () => Promise.reject(new Error('Loader error'))
      };

      const systemMap = PatternDetectionTestFactory.createComplexSystemMap();
      const result = await engine.runDetector(badDetector, systemMap);
      
      expect(result.detector).toBe('bad');
      expect(result.error).toBe('Loader error');
      expect(result.findings).toEqual([]);
      expect(result.score).toBe(100);
    });

    it('should handle detector loading errors', async () => {
      const errorDetector = {
        id: 'error-det',
        loader: () => { throw new Error('Sync error'); }
      };

      const systemMap = PatternDetectionTestFactory.createComplexSystemMap();
      const result = await engine.runDetector(errorDetector, systemMap);
      
      expect(result.detector).toBe('error-det');
      expect(result.error).toBeDefined();
    });
  });

  /**
   * ============================================
   * DETECTOR REGISTRATION CONTRACT
   * ============================================
   */

  describe('Detector Registration Contract', () => {
    it('should add custom detector', () => {
      const customDetector = {
        id: 'custom',
        loader: () => Promise.resolve({}),
        priority: 50
      };

      engine.addDetector(customDetector);
      expect(engine.registry.has('custom')).toBe(true);
    });

    it('should throw when adding duplicate detector', () => {
      const detector = {
        id: 'duplicate',
        loader: () => Promise.resolve({})
      };

      engine.addDetector(detector);
      expect(() => engine.addDetector(detector)).toThrow();
    });
  });

  /**
   * ============================================
   * RESULTS RETRIEVAL CONTRACT
   * ============================================
   */

  describe('Results Retrieval Contract', () => {
    it('should get results for specific detector', async () => {
      const systemMap = PatternDetectionTestFactory.createComplexSystemMap();
      await engine.analyze(systemMap);

      const result = engine.getResults('hotspots');
      expect(result).toBeDefined();
    });

    it('should return undefined for non-existent detector', () => {
      const result = engine.getResults('non-existent');
      expect(result).toBeUndefined();
    });

    it('should return undefined before analysis', () => {
      const freshEngine = new PatternDetectionEngine();
      const result = freshEngine.getResults('hotspots');
      expect(result).toBeUndefined();
    });
  });

  /**
   * ============================================
   * ERROR HANDLING CONTRACT
   * ============================================
   */

  describe('Error Handling Contract', () => {
    it('should continue analysis when detector fails', async () => {
      // Add a failing detector
      engine.addDetector({
        id: 'failing-detector',
        loader: () => Promise.reject(new Error('Always fails')),
        priority: 1
      });

      const systemMap = PatternDetectionTestFactory.createComplexSystemMap();
      const result = await engine.analyze(systemMap);

      expect(result.patterns).toBeDefined();
      expect(result.qualityScore).toBeDefined();
    });

    it('should handle null systemMap', async () => {
      const result = await engine.analyze(null);
      expect(result.patterns).toBeDefined();
    });

    it('should handle empty systemMap', async () => {
      const result = await engine.analyze({});
      expect(result.patterns).toBeDefined();
    });

    it('should record duration even with failures', async () => {
      engine.addDetector({
        id: 'always-fails',
        loader: () => Promise.reject(new Error('Fail'))
      });

      const systemMap = PatternDetectionTestFactory.createComplexSystemMap();
      const result = await engine.analyze(systemMap);

      expect(result.metadata.duration).toBeGreaterThanOrEqual(0);
    });
  });
});
