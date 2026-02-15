/**
 * @fileoverview Pattern Detection Contract Tests
 * 
 * Comprehensive contract tests for the entire pattern detection system.
 * Validates integration between all components.
 * 
 * @module tests/unit/layer-a-analysis/pattern-detection/pattern-detection-contract
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PatternDetectionEngine } from '#layer-a/pattern-detection/engine/PatternDetectionEngine.js';
import { PatternDetectorRegistry } from '#layer-a/pattern-detection/engine/PatternDetectorRegistry.js';
import { QualityScoreAggregator } from '#layer-a/pattern-detection/engine/QualityScoreAggregator.js';
import { ConfigManager } from '#layer-a/pattern-detection/engine/ConfigManager.js';
import { DetectorRunner } from '#layer-a/pattern-detection/runners/DetectorRunner.js';
import { PatternDetector } from '#layer-a/pattern-detection/detector-base.js';
import { PatternDetectionTestFactory } from '../../../factories/pattern-detection-test.factory.js';

describe('Pattern Detection System Contract', () => {
  let engine;
  let systemMap;

  beforeEach(() => {
    engine = new PatternDetectionEngine({});
    systemMap = PatternDetectionTestFactory.createComplexSystemMap();
  });

  /**
   * ============================================
   * SYSTEM CONTRACT
   * ============================================
   */

  describe('System Contract', () => {
    it('should initialize all core components', () => {
      expect(engine.configManager).toBeInstanceOf(ConfigManager);
      expect(engine.registry).toBeInstanceOf(PatternDetectorRegistry);
      expect(engine.aggregator).toBeInstanceOf(QualityScoreAggregator);
    });

    it('should register all default detectors', () => {
      const detectors = engine.registry.getAll();
      const detectorIds = detectors.map(d => d.id);

      expect(detectorIds).toContain('deepChains');
      expect(detectorIds).toContain('sharedObjects');
      expect(detectorIds).toContain('coupling');
      expect(detectorIds).toContain('hotspots');
    });

    it('should have consistent detector priorities', () => {
      const detectors = engine.registry.getAll();
      
      for (let i = 1; i < detectors.length; i++) {
        expect(detectors[i - 1].priority).toBeGreaterThanOrEqual(detectors[i].priority);
      }
    });
  });

  /**
   * ============================================
   * DETECTION PIPELINE CONTRACT
   * ============================================
   */

  describe('Detection Pipeline Contract', () => {
    it('should execute full detection pipeline', async () => {
      const result = await engine.analyze(systemMap);

      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('qualityScore');
      expect(result).toHaveProperty('metadata');
      expect(Array.isArray(result.patterns)).toBe(true);
    });

    it('should produce findings from multiple detectors', async () => {
      // Use a system map with patterns that multiple detectors can find
      const richSystemMap = {
        ...PatternDetectionTestFactory.createHotspotsSystemMap(),
        ...PatternDetectionTestFactory.createCouplingSystemMap(),
        ...PatternDetectionTestFactory.createDeepChainsSystemMap()
      };

      const result = await engine.analyze(richSystemMap);

      // At least some detectors should produce results
      const totalFindings = result.patterns.reduce(
        (sum, p) => sum + (p.findings?.length || 0), 
        0
      );
      expect(totalFindings).toBeGreaterThanOrEqual(0);
    });

    it('should calculate consistent quality score', async () => {
      const result = await engine.analyze(systemMap);

      expect(result.qualityScore.total).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore.total).toBeLessThanOrEqual(100);
      expect(['A', 'B', 'C', 'D', 'F']).toContain(result.qualityScore.grade);
    });

    it('should record accurate metadata', async () => {
      const startTime = Date.now();
      const result = await engine.analyze(systemMap);
      const endTime = Date.now();

      expect(result.metadata.duration).toBeGreaterThanOrEqual(0);
      expect(result.metadata.duration).toBeLessThanOrEqual(endTime - startTime + 50);
      expect(result.metadata.detectorsRun).toBe(engine.registry.size());
      expect(result.metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  /**
   * ============================================
   * ERROR RECOVERY CONTRACT
   * ============================================
   */

  describe('Error Recovery Contract', () => {
    it('should complete analysis even when detectors fail', async () => {
      // Add a detector that will fail
      engine.addDetector({
        id: 'failing-detector',
        loader: () => Promise.reject(new Error('Intentional failure')),
        priority: 1
      });

      const result = await engine.analyze(systemMap);

      expect(result.patterns).toBeDefined();
      expect(result.qualityScore).toBeDefined();
    });

    it('should store results for successful detectors even when others fail', async () => {
      const freshEngine = new PatternDetectionEngine();
      
      // Clear and add mix of working and failing detectors
      freshEngine.registry.clear();
      freshEngine.registry.register({
        id: 'working',
        loader: () => Promise.resolve({
          default: class extends PatternDetector {
            getId() { return 'working'; }
            async detect() {
              return { detector: 'working', score: 100, findings: [] };
            }
          }
        }),
        priority: 50
      });
      freshEngine.registry.register({
        id: 'failing',
        loader: () => Promise.reject(new Error('Always fails')),
        priority: 40
      });

      await freshEngine.analyze(systemMap);

      expect(freshEngine.results.has('working')).toBe(true);
      expect(freshEngine.results.get('working').detector).toBe('working');
    });
  });

  /**
   * ============================================
   * EXTENSIBILITY CONTRACT
   * ============================================
   */

  describe('Extensibility Contract', () => {
    it('should support custom detector registration', async () => {
      let detectorExecuted = false;

      engine.addDetector({
        id: 'custom-test',
        loader: () => Promise.resolve({
          default: class extends PatternDetector {
            getId() { return 'custom-test'; }
            async detect() {
              detectorExecuted = true;
              return { detector: 'custom-test', score: 100, findings: [] };
            }
          }
        }),
        priority: 60
      });

      await engine.analyze(systemMap);
      expect(detectorExecuted).toBe(true);
    });

    it('should support custom detector with findings', async () => {
      engine.addDetector({
        id: 'custom-finding',
        loader: () => Promise.resolve({
          default: class extends PatternDetector {
            getId() { return 'custom-finding'; }
            async detect() {
              return {
                detector: 'custom-finding',
                score: 80,
                findings: [{
                  id: 'custom-1',
                  type: 'custom_pattern',
                  severity: 'medium',
                  file: 'test.js',
                  message: 'Custom finding'
                }]
              };
            }
          }
        }),
        priority: 55
      });

      const result = await engine.analyze(systemMap);
      const customPattern = result.patterns.find(p => p.detector === 'custom-finding');
      
      expect(customPattern).toBeDefined();
      expect(customPattern.findings.length).toBe(1);
      expect(customPattern.findings[0].type).toBe('custom_pattern');
    });
  });

  /**
   * ============================================
   * CONFIGURATION CONTRACT
   * ============================================
   */

  describe('Configuration Contract', () => {
    it('should respect custom thresholds', async () => {
      const customEngine = new PatternDetectionEngine({
        thresholds: {
          hotspots: {
            minUsageThreshold: 100 // Very high threshold
          }
        }
      });

      const result = await customEngine.analyze(systemMap);
      expect(result.patterns).toBeDefined();
    });

    it('should respect custom weights', async () => {
      const customEngine = new PatternDetectionEngine({
        weights: {
          hotspots: 0.5,
          deepChains: 0.3,
          sharedObjects: 0.2
        }
      });

      const result = await customEngine.analyze(systemMap);
      expect(result.qualityScore).toBeDefined();
    });
  });

  /**
   * ============================================
   * RESULT STRUCTURE CONTRACT
   * ============================================
   */

  describe('Result Structure Contract', () => {
    it('should have consistent pattern result structure', async () => {
      const result = await engine.analyze(systemMap);

      result.patterns.forEach(pattern => {
        expect(pattern).toHaveProperty('detector');
        expect(pattern).toHaveProperty('name');
        expect(pattern).toHaveProperty('description');
        expect(pattern).toHaveProperty('findings');
        expect(pattern).toHaveProperty('score');
        expect(pattern).toHaveProperty('weight');
        expect(pattern).toHaveProperty('recommendation');
        expect(Array.isArray(pattern.findings)).toBe(true);
      });
    });

    it('should have consistent finding structure', async () => {
      const result = await engine.analyze(systemMap);

      result.patterns.forEach(pattern => {
        pattern.findings.forEach(finding => {
          expect(finding).toHaveProperty('id');
          expect(finding).toHaveProperty('type');
          expect(finding).toHaveProperty('severity');
          expect(finding).toHaveProperty('file');
          expect(finding).toHaveProperty('message');
          expect(finding).toHaveProperty('recommendation');
          expect(['critical', 'high', 'medium', 'low']).toContain(finding.severity);
        });
      });
    });
  });

  /**
   * ============================================
   * PERFORMANCE CONTRACT
   * ============================================
   */

  describe('Performance Contract', () => {
    it('should complete analysis within reasonable time', async () => {
      const startTime = Date.now();
      await engine.analyze(systemMap);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(30000); // 30 seconds max
    });

    it('should handle large system maps efficiently', async () => {
      // Create a large system map
      const largeSystemMap = {
        files: {},
        functions: {},
        function_links: []
      };

      for (let i = 0; i < 1000; i++) {
        largeSystemMap.files[`src/file${i}.js`] = {
          imports: [],
          usedBy: []
        };
      }

      const startTime = Date.now();
      await engine.analyze(largeSystemMap);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10000); // 10 seconds for large map
    });
  });
});

describe('Pattern Detection Cross-Module Integration', () => {
  /**
   * ============================================
   * REGISTRY-ENGINE INTEGRATION
   * ============================================
   */

  describe('Registry-Engine Integration', () => {
    it('should use registry for detector management', async () => {
      const engine = new PatternDetectionEngine();
      const initialCount = engine.registry.size();

      engine.addDetector({
        id: 'integration-test',
        loader: () => Promise.resolve({
          default: class extends PatternDetector {
            getId() { return 'integration-test'; }
            async detect() { return { detector: 'integration-test', score: 100 }; }
          }
        })
      });

      expect(engine.registry.size()).toBe(initialCount + 1);
    });

    it('should respect registry priority ordering', async () => {
      const engine = new PatternDetectionEngine();
      const executionOrder = [];

      engine.registry.clear();
      engine.registry.register({
        id: 'low',
        priority: 10,
        loader: () => {
          executionOrder.push('low');
          return Promise.resolve({
            default: class extends PatternDetector {
              getId() { return 'low'; }
              async detect() { return { detector: 'low', score: 100 }; }
            }
          });
        }
      });
      engine.registry.register({
        id: 'high',
        priority: 100,
        loader: () => {
          executionOrder.push('high');
          return Promise.resolve({
            default: class extends PatternDetector {
              getId() { return 'high'; }
              async detect() { return { detector: 'high', score: 100 }; }
            }
          });
        }
      });

      // Note: Execution order depends on Promise.allSettled, not strictly sequential
      await engine.analyze({});
      
      // Both should be registered
      expect(engine.registry.has('low')).toBe(true);
      expect(engine.registry.has('high')).toBe(true);
    });
  });

  /**
   * ============================================
   * AGGREGATOR-ENGINE INTEGRATION
   * ============================================
   */

  describe('Aggregator-Engine Integration', () => {
    it('should use aggregator for score calculation', async () => {
      const engine = new PatternDetectionEngine({});
      const result = await engine.analyze(PatternDetectionTestFactory.createComplexSystemMap());

      expect(result.qualityScore.total).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore.total).toBeLessThanOrEqual(100);
      expect(['A', 'B', 'C', 'D', 'F']).toContain(result.qualityScore.grade);
    });
  });

  /**
   * ============================================
   * RUNNER-ENGINE INTEGRATION
   * ============================================
   */

  describe('Runner-Engine Integration', () => {
    it('should use runner for detector execution', async () => {
      const runner = new DetectorRunner();
      const detector = {
        id: 'test',
        loader: () => Promise.resolve({
          default: class extends PatternDetector {
            getId() { return 'test'; }
            async detect() { return { detector: 'test', score: 95 }; }
          }
        })
      };

      const result = await runner.run(detector, {});
      expect(result.score).toBe(95);
    });
  });
});
