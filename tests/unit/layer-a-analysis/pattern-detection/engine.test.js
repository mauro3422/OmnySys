/**
 * @fileoverview Pattern Detection Engine Tests
 * 
 * Tests for PatternDetectionEngine (engine.js and engine/PatternDetectionEngine.js).
 * 
 * @module tests/unit/layer-a-analysis/pattern-detection/engine
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PatternDetectionEngine } from '#layer-a/pattern-detection/engine.js';
import { PatternDetectionTestFactory } from '../../../factories/pattern-detection-test.factory.js';

describe('PatternDetectionEngine', () => {
  let engine;
  let systemMap;

  beforeEach(() => {
    engine = new PatternDetectionEngine({});
    systemMap = PatternDetectionTestFactory.createComplexSystemMap();
  });

  /**
   * ============================================
   * STRUCTURE CONTRACT
   * ============================================
   */

  describe('Structure Contract', () => {
    it('should create engine with default config', () => {
      const defaultEngine = new PatternDetectionEngine();
      expect(defaultEngine).toBeInstanceOf(PatternDetectionEngine);
    });

    it('should create engine with custom config', () => {
      const customEngine = new PatternDetectionEngine({ projectType: 'microservices' });
      expect(customEngine.configManager.getConfig().projectType).toBe('microservices');
    });

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

    it('should have addDetector method', () => {
      expect(typeof engine.addDetector).toBe('function');
    });

    it('should have getResults method', () => {
      expect(typeof engine.getResults).toBe('function');
    });

    it('should register default detectors on construction', () => {
      expect(engine.registry.size()).toBeGreaterThan(0);
    });
  });

  /**
   * ============================================
   * ANALYSIS CONTRACT
   * ============================================
   */

  describe('Analysis Contract', () => {
    it('should return patterns array in result', async () => {
      const result = await engine.analyze(systemMap);
      expect(result).toHaveProperty('patterns');
      expect(Array.isArray(result.patterns)).toBe(true);
    });

    it('should return qualityScore in result', async () => {
      const result = await engine.analyze(systemMap);
      expect(result).toHaveProperty('qualityScore');
      expect(result.qualityScore).toHaveProperty('score');
      expect(result.qualityScore).toHaveProperty('grade');
    });

    it('should return metadata in result', async () => {
      const result = await engine.analyze(systemMap);
      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('duration');
      expect(result.metadata).toHaveProperty('detectorsRun');
      expect(result.metadata).toHaveProperty('projectType');
      expect(result.metadata).toHaveProperty('timestamp');
    });

    it('should record duration in metadata', async () => {
      const start = Date.now();
      const result = await engine.analyze(systemMap);
      const end = Date.now();
      
      expect(result.metadata.duration).toBeGreaterThanOrEqual(0);
      expect(result.metadata.duration).toBeLessThanOrEqual(end - start + 100);
    });

    it('should record ISO timestamp', async () => {
      const result = await engine.analyze(systemMap);
      expect(new Date(result.metadata.timestamp).toISOString()).toBe(result.metadata.timestamp);
    });

    it('should count detectors run in metadata', async () => {
      const result = await engine.analyze(systemMap);
      expect(result.metadata.detectorsRun).toBe(engine.registry.size());
    });

    it('should store results for each detector', async () => {
      await engine.analyze(systemMap);
      
      const detectorIds = engine.registry.getAll().map(d => d.id);
      detectorIds.forEach(id => {
        expect(engine.results.has(id)).toBe(true);
      });
    });
  });

  /**
   * ============================================
   * DETECTOR REGISTRATION CONTRACT
   * ============================================
   */

  describe('Detector Registration Contract', () => {
    it('should register default detectors', () => {
      const detectors = engine.registry.getAll();
      const detectorIds = detectors.map(d => d.id);
      
      expect(detectorIds).toContain('deepChains');
      expect(detectorIds).toContain('sharedObjects');
      expect(detectorIds).toContain('coupling');
      expect(detectorIds).toContain('hotspots');
    });

    it('should register detectors with correct priorities', () => {
      const detectors = engine.registry.getAll();
      
      // Should be sorted by priority descending
      expect(detectors[0].priority).toBeGreaterThanOrEqual(detectors[1].priority);
    });

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
      await engine.analyze(systemMap);
      
      const result = engine.getResults('hotspots');
      expect(result).toBeDefined();
      expect(result.detector).toBe('hotspots');
    });

    it('should return undefined for non-existent detector results', () => {
      const result = engine.getResults('non-existent');
      expect(result).toBeUndefined();
    });

    it('should return undefined for detector that has not run', () => {
      const freshEngine = new PatternDetectionEngine();
      const result = freshEngine.getResults('hotspots');
      expect(result).toBeUndefined();
    });
  });

  /**
   * ============================================
   * PROJECT TYPE DETECTION CONTRACT
   * ============================================
   */

  describe('Project Type Detection Contract', () => {
    it('should detect microservices project type', async () => {
      const microservicesMap = {
        files: {
          'src/services/userService.js': {},
          'src/gateway/apiGateway.js': {},
          'src/broker/messageBroker.js': {}
        }
      };

      await engine.analyze(microservicesMap);
      expect(engine.configManager.getProjectType()).toBe('microservices');
    });

    it('should detect library project type', async () => {
      const libraryMap = {
        files: {
          'src/index.js': {},
          'src/utils.js': {},
          'src/helpers.js': {}
        }
      };

      await engine.analyze(libraryMap);
      expect(engine.configManager.getProjectType()).toBe('library');
    });

    it('should default to standard project type', async () => {
      const standardMap = {
        files: {
          'src/app.js': {},
          'src/components/Button.js': {},
          'src/components/Input.js': {},
          'src/test/Button.test.js': {},
          'src/test/Input.test.js': {}
        }
      };

      await engine.analyze(standardMap);
      expect(engine.configManager.getProjectType()).toBe('standard');
    });
  });

  /**
   * ============================================
   * ERROR HANDLING CONTRACT
   * ============================================
   */

  describe('Error Handling Contract', () => {
    it('should handle null systemMap gracefully', async () => {
      const result = await engine.analyze(null);
      expect(result.patterns).toBeDefined();
      expect(result.qualityScore).toBeDefined();
    });

    it('should handle empty systemMap', async () => {
      const result = await engine.analyze({});
      expect(result.patterns).toBeDefined();
      expect(Array.isArray(result.patterns)).toBe(true);
    });

    it('should handle detector errors gracefully', async () => {
      // Add a detector that will throw
      engine.addDetector({
        id: 'failing-detector',
        loader: () => Promise.reject(new Error('Loader failed')),
        priority: 1
      });

      const result = await engine.analyze(systemMap);
      expect(result.patterns).toBeDefined();
    });

    it('should continue analysis when individual detector fails', async () => {
      let callCount = 0;
      engine.addDetector({
        id: 'partial-fail',
        loader: () => {
          callCount++;
          if (callCount === 1) {
            return Promise.reject(new Error('First call failed'));
          }
          return Promise.resolve({
            default: class {
              getId() { return 'partial-fail'; }
              async detect() { return { detector: 'partial-fail', score: 100 }; }
            }
          });
        },
        priority: 1
      });

      const result = await engine.analyze(systemMap);
      expect(result.metadata.detectorsRun).toBeGreaterThan(0);
    });

    it('should handle detector returning invalid result', async () => {
      engine.addDetector({
        id: 'invalid-result',
        loader: () => Promise.resolve({
          default: class {
            getId() { return 'invalid'; }
            async detect() { return null; }
          }
        }),
        priority: 1
      });

      const result = await engine.analyze(systemMap);
      expect(result).toBeDefined();
    });
  });
});

describe('PatternDetectionEngine - Concurrency', () => {
  it('should run detectors concurrently', async () => {
    const engine = new PatternDetectionEngine();
    const systemMap = PatternDetectionTestFactory.createComplexSystemMap();

    const start = Date.now();
    await engine.analyze(systemMap);
    const duration = Date.now() - start;

    // Should complete in reasonable time (not sequential sum)
    expect(duration).toBeLessThan(5000);
  });

  it('should handle multiple analyze calls', async () => {
    const engine = new PatternDetectionEngine();
    const systemMap = PatternDetectionTestFactory.createComplexSystemMap();

    const [result1, result2] = await Promise.all([
      engine.analyze(systemMap),
      engine.analyze(systemMap)
    ]);

    expect(result1.qualityScore).toBeDefined();
    expect(result2.qualityScore).toBeDefined();
  });
});
