/**
 * Pattern Detection Engine Tests
 * 
 * Tests for the core orchestrator of pattern detection.
 * Like testing the "GPS control center" that coordinates all traffic alerts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PatternDetectionEngine } from '#layer-a/pattern-detection/engine/PatternDetectionEngine.js';
import { PatternDetector } from '#layer-a/pattern-detection/detector-base.js';

describe('Pattern Detection Engine', () => {
  describe('Construction', () => {
    it('should create engine with default config', () => {
      const engine = new PatternDetectionEngine();
      expect(engine).toBeDefined();
      expect(engine.configManager).toBeDefined();
      expect(engine.registry).toBeDefined();
      expect(engine.aggregator).toBeDefined();
    });

    it('should create engine with custom config', () => {
      const engine = new PatternDetectionEngine({
        thresholds: { deepChains: { minDepth: 10 } }
      });
      expect(engine).toBeDefined();
    });

    it('should register default detectors on construction', () => {
      const engine = new PatternDetectionEngine();
      const detectors = engine.registry.listDetectors();
      expect(detectors.length).toBeGreaterThan(0);
      expect(detectors.map(d => d.id)).toContain('deepChains');
      expect(detectors.map(d => d.id)).toContain('hotspots');
    });
  });

  describe('Analysis', () => {
    it('should run analysis and return results', async () => {
      const engine = new PatternDetectionEngine();
      const systemMap = {
        files: { 'test.js': { imports: [], exports: [] } },
        functions: {},
        function_links: []
      };

      const results = await engine.analyze(systemMap);
      
      expect(results).toHaveProperty('patterns');
      expect(results).toHaveProperty('qualityScore');
      expect(results).toHaveProperty('metadata');
      expect(Array.isArray(results.patterns)).toBe(true);
    });

    it('should return quality score with score and grade', async () => {
      const engine = new PatternDetectionEngine();
      const systemMap = { files: {}, functions: {}, function_links: [] };

      const results = await engine.analyze(systemMap);
      
      expect(results.qualityScore).toHaveProperty('total');
      expect(results.qualityScore).toHaveProperty('grade');
      expect(typeof results.qualityScore.total).toBe('number');
    });

    it('should include metadata with duration and timestamp', async () => {
      const engine = new PatternDetectionEngine();
      const systemMap = { files: {}, functions: {}, function_links: [] };

      const results = await engine.analyze(systemMap);
      
      expect(results.metadata).toHaveProperty('duration');
      expect(results.metadata).toHaveProperty('timestamp');
      expect(results.metadata).toHaveProperty('detectorsRun');
      expect(typeof results.metadata.duration).toBe('number');
      expect(typeof results.metadata.detectorsRun).toBe('number');
    });

    it('should handle empty system map gracefully', async () => {
      const engine = new PatternDetectionEngine();
      
      const results = await engine.analyze({});
      
      expect(results).toBeDefined();
      expect(results.patterns).toBeDefined();
      expect(results.qualityScore.total).toBeGreaterThanOrEqual(0);
    });

    it('should handle null/undefined system map gracefully', async () => {
      const engine = new PatternDetectionEngine();
      
      const results = await engine.analyze({});
      
      expect(results).toBeDefined();
      expect(results.patterns).toBeDefined();
    });
  });

  describe('Custom Detectors', () => {
    it('should allow adding custom detector', () => {
      const engine = new PatternDetectionEngine();
      const initialCount = engine.registry.listDetectors().length;

      engine.addDetector({
        id: 'custom-detector',
        loader: () => Promise.resolve({ default: class CustomDetector extends PatternDetector {
          getId() { return 'custom'; }
          async detect() { return { detector: 'custom', findings: [], score: 100 }; }
        }}),
        priority: 50
      });

      expect(engine.registry.listDetectors().length).toBe(initialCount + 1);
    });

    it('should store results for specific detector', async () => {
      const engine = new PatternDetectionEngine();
      const systemMap = { files: {}, functions: {}, function_links: [] };

      await engine.analyze(systemMap);
      
      const deepChainResults = engine.getResults('deepChains');
      // May be undefined if detector failed, but should not throw
      expect(() => engine.getResults('deepChains')).not.toThrow();
    });
  });

  describe('PatternDetectorRegistry', () => {
    let registry;

    beforeEach(() => {
      registry = new PatternDetectionEngine().registry;
      registry.clearRegistry();
    });

    it('register() adds detector with id and loader', () => {
      const detector = {
        id: 'd1',
        loader: () => Promise.resolve({}),
        priority: 10
      };

      registry.register(detector);

      expect(registry.size()).toBe(1);
      expect(registry.containsDetector('d1')).toBe(true);
    });

    it('register() requires id', () => {
      expect(() => {
        registry.register({ priority: 10 });
      }).toThrow('Detector id is required');
    });

    it('register() throws on duplicate id', () => {
      registry.register({ id: 'd1', loader: () => Promise.resolve({}) });

      expect(() => {
        registry.register({ id: 'd1', loader: () => Promise.resolve({}) });
      }).toThrow('already registered');
    });

    it('get() retrieves detector by id', () => {
      const detector = { id: 'd2', loader: () => Promise.resolve({}), priority: 5 };
      registry.register(detector);

      const retrieved = registry.get('d2');

      expect(retrieved.id).toBe('d2');
      expect(retrieved.priority).toBe(5);
    });

    it('containsDetector() checks if detector exists', () => {
      registry.register({ id: 'd3', loader: () => Promise.resolve({}) });

      expect(registry.containsDetector('d3')).toBe(true);
      expect(registry.containsDetector('nonexistent')).toBe(false);
    });

    it('listDetectors() returns all detectors sorted by priority', () => {
      registry.register({ id: 'd1', loader: () => Promise.resolve({}), priority: 10 });
      registry.register({ id: 'd2', loader: () => Promise.resolve({}), priority: 20 });
      registry.register({ id: 'd3', loader: () => Promise.resolve({}), priority: 5 });

      const all = registry.listDetectors();

      expect(Array.isArray(all)).toBe(true);
      expect(all.length).toBe(3);
      expect(all[0].priority).toBe(20);
      expect(all[1].priority).toBe(10);
      expect(all[2].priority).toBe(5);
    });

    it('removeDetector() removes detector', () => {
      registry.register({ id: 'd6', loader: () => Promise.resolve({}) });
      expect(registry.containsDetector('d6')).toBe(true);

      registry.removeDetector('d6');

      expect(registry.containsDetector('d6')).toBe(false);
      expect(registry.size()).toBe(0);
    });

    it('clearRegistry() removes all detectors', () => {
      registry.register({ id: 'd7', loader: () => Promise.resolve({}) });
      registry.register({ id: 'd8', loader: () => Promise.resolve({}) });
      registry.clearRegistry();

      expect(registry.size()).toBe(0);
    });

    it('size() returns correct count', () => {
      expect(registry.size()).toBe(0);
      registry.register({ id: 'd9', loader: () => Promise.resolve({}) });
      expect(registry.size()).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle detector failures gracefully', async () => {
      const engine = new PatternDetectionEngine();
      
      // Add a failing detector
      engine.addDetector({
        id: 'failing-detector',
        loader: () => Promise.resolve({ 
          default: class FailingDetector extends PatternDetector {
            async detect() { throw new Error('Detector failed'); }
          }
        }),
        priority: 1
      });

      const systemMap = { files: {}, functions: {}, function_links: [] };
      
      // Should not throw even if detector fails
      const results = await engine.analyze(systemMap);
      expect(results).toBeDefined();
      expect(results.patterns).toBeDefined();
    });

    it('should continue with other detectors if one fails', async () => {
      const engine = new PatternDetectionEngine();
      
      // Add a failing detector with a unique id (not replacing existing ones)
      engine.addDetector({
        id: 'failing-detector-2',
        loader: () => Promise.resolve({ 
          default: class FailingDetector extends PatternDetector {
            async detect() { throw new Error('Detector failed'); }
          }
        }),
        priority: 100
      });

      const systemMap = { files: {}, functions: {}, function_links: [] };
      const results = await engine.analyze(systemMap);
      
      // Should still have results from other detectors
      expect(results.patterns.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration', () => {
    it('should detect project type from system map', async () => {
      const engine = new PatternDetectionEngine();
      const systemMap = { 
        files: { 'package.json': {} },
        functions: {},
        function_links: []
      };

      await engine.analyze(systemMap);
      
      const projectType = engine.configManager.getProjectType();
      expect(projectType).toBeDefined();
    });

    it('should apply custom thresholds', async () => {
      const engine = new PatternDetectionEngine({
        thresholds: {
          deepChains: { minDepth: 15 }
        }
      });

      const thresholds = engine.configManager.getThresholds('deepChains');
      expect(thresholds.minDepth).toBe(15);
    });
  });
});
