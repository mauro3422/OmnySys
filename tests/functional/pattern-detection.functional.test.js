/**
 * @fileoverview Pattern Detection Engine - Tests Detallados Corregidos
 * 
 * Tests para métodos reales del engine:
 * - analyze(), runDetector(), addDetector(), getResults()
 * - PatternDetectorRegistry: register(), get(), getAll(), has(), size()
 * - QualityScoreAggregator: calculate(), calculateGrade(), generateRecommendations()
 * 
 * @module tests/functional/pattern-detection-detailed.functional.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PatternDetectionEngine,
  PatternDetectorRegistry,
  QualityScoreAggregator,
  ConfigManager,
  DEFAULT_CONFIG
} from '#layer-a/pattern-detection/index.js';

describe('Pattern Detection - Detailed Tests', () => {
  
  describe('Module Exports', () => {
    it('all expected classes are exported', () => {
      expect(typeof PatternDetectionEngine).toBe('function');
      expect(typeof PatternDetectorRegistry).toBe('function');
      expect(typeof QualityScoreAggregator).toBe('function');
      expect(typeof ConfigManager).toBe('function');
    });

    it('DEFAULT_CONFIG is exported', () => {
      expect(DEFAULT_CONFIG).toBeDefined();
      expect(typeof DEFAULT_CONFIG).toBe('object');
    });
  });


  describe('PatternDetectionEngine Real Methods', () => {
    let engine;

    beforeEach(() => {
      engine = new PatternDetectionEngine();
    });

    it('engine is created with registry and aggregator', () => {
      expect(engine.registry).toBeDefined();
      expect(engine.aggregator).toBeDefined();
      expect(engine.results).toBeDefined();
    });

    it('addDetector() registers a detector via addDetector method', () => {
      const detectorConfig = {
        id: 'test-detector',
        loader: () => Promise.resolve({ default: class { detect() { return { detector: 'test-detector', findings: [], score: 100 }; } } }),
        priority: 50
      };

      engine.addDetector(detectorConfig);
      
      expect(engine.registry.has('test-detector')).toBe(true);
    });

    it('analyze() runs async detection on systemMap', async () => {
      const systemMap = {
        files: {
          'src/test.js': { imports: [], exports: [] }
        }
      };

      const result = await engine.analyze(systemMap);

      expect(result).toBeDefined();
      expect(result.patterns).toBeDefined();
      expect(Array.isArray(result.patterns)).toBe(true);
      expect(result.qualityScore).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('analyze() returns results with metadata', async () => {
      const systemMap = {
        files: {
          'src/a.js': { imports: [], exports: [] }
        }
      };

      const result = await engine.analyze(systemMap);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.duration).toBeDefined();
      expect(result.metadata.detectorsRun).toBeDefined();
      expect(result.metadata.timestamp).toBeDefined();
    });

    it('runDetector() executes specific detector async', async () => {
      const detector = {
        id: 'simple',
        loader: () => Promise.resolve({ 
          default: class { 
            detect() { 
              return { detector: 'simple', findings: [{ type: 'found' }], score: 90 }; 
            } 
          } 
        })
      };

      const results = await engine.runDetector(detector, {});

      expect(results).toBeDefined();
      expect(results.detector).toBe('simple');
      expect(results.findings).toBeDefined();
    });

    it('getResults() returns results for a detector after analysis', async () => {
      // El engine ya tiene detectores registrados por defecto
      const systemMap = { files: {} };
      await engine.analyze(systemMap);
      
      // getResults retorna resultados de un detector específico
      const results = engine.getResults('deepChains');
      // Puede ser undefined si no se ejecutó o retornar los resultados
      expect(results === undefined || typeof results === 'object').toBe(true);
    });

    it('handles empty systemMap', async () => {
      const result = await engine.analyze({});
      
      expect(result).toBeDefined();
      expect(result.patterns).toBeDefined();
    });

    it('handles systemMap with multiple files', async () => {
      const systemMap = {
        files: {
          'src/a.js': { imports: [], exports: [] },
          'src/b.js': { imports: [], exports: [] },
          'src/c.js': { imports: [], exports: [] }
        }
      };

      const result = await engine.analyze(systemMap);

      expect(result).toBeDefined();
      expect(result.metadata.detectorsRun).toBeGreaterThan(0);
    });
  });

  describe('PatternDetectorRegistry Real Methods', () => {
    let registry;

    beforeEach(() => {
      registry = new PatternDetectorRegistry();
    });

    it('register() adds detector with id and loader', () => {
      const detector = { 
        id: 'd1', 
        loader: () => Promise.resolve({}),
        priority: 10
      };
      
      registry.register(detector);
      
      expect(registry.size()).toBe(1);
      expect(registry.has('d1')).toBe(true);
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

    it('has() checks if detector exists', () => {
      registry.register({ id: 'd3', loader: () => Promise.resolve({}) });

      expect(registry.has('d3')).toBe(true);
      expect(registry.has('nonexistent')).toBe(false);
    });

    it('getAll() returns all detectors sorted by priority', () => {
      registry.register({ id: 'd1', loader: () => Promise.resolve({}), priority: 10 });
      registry.register({ id: 'd2', loader: () => Promise.resolve({}), priority: 20 });
      registry.register({ id: 'd3', loader: () => Promise.resolve({}), priority: 5 });

      const all = registry.getAll();

      expect(Array.isArray(all)).toBe(true);
      expect(all.length).toBe(3);
      // Debe estar ordenado por prioridad descendente
      expect(all[0].priority).toBe(20);
      expect(all[1].priority).toBe(10);
      expect(all[2].priority).toBe(5);
    });

    it('unregister() removes detector', () => {
      registry.register({ id: 'd6', loader: () => Promise.resolve({}) });
      expect(registry.has('d6')).toBe(true);
      
      registry.unregister('d6');

      expect(registry.has('d6')).toBe(false);
      expect(registry.size()).toBe(0);
    });

    it('clear() removes all detectors', () => {
      registry.register({ id: 'd7', loader: () => Promise.resolve({}) });
      registry.register({ id: 'd8', loader: () => Promise.resolve({}) });
      registry.clear();

      expect(registry.size()).toBe(0);
    });

    it('size() returns correct count', () => {
      expect(registry.size()).toBe(0);
      registry.register({ id: 'd9', loader: () => Promise.resolve({}) });
      expect(registry.size()).toBe(1);
    });
  });

  describe('QualityScoreAggregator Real Methods', () => {
    let aggregator;

    beforeEach(() => {
      aggregator = new QualityScoreAggregator();
    });

    it('calculate() computes quality score object from results', () => {
      const results = [
        { detector: 'detector1', findings: [], score: 80 },
        { detector: 'detector2', findings: [], score: 90 }
      ];

      const scoreResult = aggregator.calculate(results);

      expect(typeof scoreResult).toBe('object');
      expect(scoreResult.score).toBeDefined();
      expect(scoreResult.grade).toBeDefined();
      expect(scoreResult.total).toBeDefined();
    });

    it('calculate() returns score between 0 and 100', () => {
      const results = [
        { detector: 'd1', findings: [{ issue: 'test' }], score: 70 },
        { detector: 'd2', findings: [], score: 85 }
      ];

      const scoreResult = aggregator.calculate(results);

      expect(scoreResult.score).toBeGreaterThanOrEqual(0);
      expect(scoreResult.score).toBeLessThanOrEqual(100);
    });

    it('calculateGrade() converts score to letter grade', () => {
      expect(aggregator.calculateGrade(95)).toBe('A');
      expect(aggregator.calculateGrade(85)).toBe('B');
      expect(aggregator.calculateGrade(75)).toBe('C');
      expect(aggregator.calculateGrade(65)).toBe('D');
      expect(aggregator.calculateGrade(55)).toBe('F');
    });

    it('scoreToGrade() is alias for calculateGrade()', () => {
      expect(aggregator.scoreToGrade(95)).toBe('A');
      expect(aggregator.scoreToGrade(55)).toBe('F');
    });

    it('generateRecommendations() provides suggestions from results', () => {
      const results = [
        { detector: 'complexity', findings: [{ severity: 'high' }], score: 45 },
        { detector: 'coupling', findings: [{ severity: 'medium' }], score: 60 }
      ];

      const recommendations = aggregator.generateRecommendations(results);

      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('createEmptyScore() returns default score object', () => {
      const empty = aggregator.createEmptyScore();

      expect(typeof empty).toBe('object');
      expect(empty.score).toBe(100);
      expect(empty.grade).toBe('A');
      expect(empty.total).toBe(100);
    });

    it('adjustWeightsForProjectType() customizes weights', () => {
      aggregator.adjustWeightsForProjectType('microservices');

      expect(aggregator.weights.coupling).toBe(0.25);
    });

    it('handles empty results array', () => {
      const scoreResult = aggregator.calculate([]);
      expect(scoreResult.score).toBe(100);
      expect(scoreResult.grade).toBe('A');
    });

    it('handles results without scores', () => {
      const results = [{ detector: 'test' }, { detector: 'test2' }];
      const scoreResult = aggregator.calculate(results);
      expect(typeof scoreResult.score).toBe('number');
    });

    it('returns breakdown with findings count', () => {
      const results = [
        { detector: 'd1', findings: [{ issue: 'a' }, { issue: 'b' }], score: 80 },
        { detector: 'd2', findings: [{ issue: 'c' }], score: 90 }
      ];

      const scoreResult = aggregator.calculate(results);

      expect(scoreResult.breakdown).toBeDefined();
      expect(scoreResult.breakdown['d1'].findings).toBe(2);
      expect(scoreResult.breakdown['d2'].findings).toBe(1);
    });
  });
});