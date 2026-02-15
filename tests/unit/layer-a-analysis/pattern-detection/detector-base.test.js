/**
 * @fileoverview Detector Base Tests
 * 
 * Tests for PatternDetector base class.
 * 
 * @module tests/unit/layer-a-analysis/pattern-detection/detector-base
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PatternDetector } from '#layer-a/pattern-detection/detector-base.js';
import { PatternDetectionTestFactory } from '../../../factories/pattern-detection-test.factory.js';

describe('PatternDetector Base Class', () => {
  let detector;

  beforeEach(() => {
    detector = new PatternDetector({
      config: { test: true },
      globalConfig: { weights: { test: 0.5 } }
    });
  });

  /**
   * ============================================
   * STRUCTURE CONTRACT
   * ============================================
   */

  describe('Structure Contract', () => {
    it('should be a class that can be instantiated', () => {
      expect(detector).toBeInstanceOf(PatternDetector);
    });

    it('should store config in constructor', () => {
      expect(detector.config).toEqual({ test: true });
    });

    it('should store globalConfig in constructor', () => {
      expect(detector.globalConfig).toEqual({ weights: { test: 0.5 } });
    });

    it('should create logger with detector ID', () => {
      expect(detector.logger).toBeDefined();
      expect(typeof detector.logger.info).toBe('function');
      expect(typeof detector.logger.warn).toBe('function');
      expect(typeof detector.logger.error).toBe('function');
      expect(typeof detector.logger.debug).toBe('function');
    });

    it('should have getId method that throws by default', () => {
      expect(() => detector.getId()).toThrow('Detector must implement getId()');
    });

    it('should have getName method that returns getId by default', () => {
      const mockDetector = new PatternDetector({});
      mockDetector.getId = () => 'test-id';
      expect(mockDetector.getName()).toBe('test-id');
    });

    it('should have getDescription method that returns empty string by default', () => {
      expect(detector.getDescription()).toBe('');
    });

    it('should have detect method that throws by default', async () => {
      await expect(detector.detect({})).rejects.toThrow('Detector must implement detect()');
    });

    it('should accept empty options object', () => {
      const emptyDetector = new PatternDetector();
      expect(emptyDetector.config).toEqual({});
      expect(emptyDetector.globalConfig).toEqual({});
    });
  });

  /**
   * ============================================
   * SCORE CALCULATION CONTRACT
   * ============================================
   */

  describe('Score Calculation Contract', () => {
    it('should return 100 for empty findings', () => {
      expect(detector.calculateScore([])).toBe(100);
    });

    it('should return 100 for null findings', () => {
      expect(detector.calculateScore(null)).toBe(100);
    });

    it('should return 100 for undefined findings', () => {
      expect(detector.calculateScore(undefined)).toBe(100);
    });

    it('should calculate score with critical severity findings', () => {
      const findings = [
        PatternDetectionTestFactory.createMockFinding({ severity: 'critical' }),
        PatternDetectionTestFactory.createMockFinding({ severity: 'critical' })
      ];
      // 2 * 20 = 40 penalty
      expect(detector.calculateScore(findings)).toBe(60);
    });

    it('should calculate score with high severity findings', () => {
      const findings = [
        PatternDetectionTestFactory.createMockFinding({ severity: 'high' }),
        PatternDetectionTestFactory.createMockFinding({ severity: 'high' })
      ];
      // 2 * 10 = 20 penalty
      expect(detector.calculateScore(findings)).toBe(80);
    });

    it('should calculate score with medium severity findings', () => {
      const findings = [
        PatternDetectionTestFactory.createMockFinding({ severity: 'medium' }),
        PatternDetectionTestFactory.createMockFinding({ severity: 'medium' })
      ];
      // 2 * 5 = 10 penalty
      expect(detector.calculateScore(findings)).toBe(90);
    });

    it('should calculate score with low severity findings', () => {
      const findings = [
        PatternDetectionTestFactory.createMockFinding({ severity: 'low' }),
        PatternDetectionTestFactory.createMockFinding({ severity: 'low' })
      ];
      // 2 * 2 = 4 penalty
      expect(detector.calculateScore(findings)).toBe(96);
    });

    it('should calculate score with mixed severity findings', () => {
      const findings = [
        PatternDetectionTestFactory.createMockFinding({ severity: 'critical' }), // 20
        PatternDetectionTestFactory.createMockFinding({ severity: 'high' }),     // 10
        PatternDetectionTestFactory.createMockFinding({ severity: 'medium' }),   // 5
        PatternDetectionTestFactory.createMockFinding({ severity: 'low' })       // 2
      ];
      // Total penalty: 37
      expect(detector.calculateScore(findings)).toBe(63);
    });

    it('should never return negative score', () => {
      const findings = Array(10).fill(null).map(() => 
        PatternDetectionTestFactory.createMockFinding({ severity: 'critical' })
      );
      // 10 * 20 = 200 penalty, but capped at 0
      expect(detector.calculateScore(findings)).toBe(0);
    });

    it('should handle findings without severity', () => {
      const findings = [
        PatternDetectionTestFactory.createMockFinding({ severity: undefined }),
        PatternDetectionTestFactory.createMockFinding({}) // no severity
      ];
      // Both default to low (2 penalty each)
      expect(detector.calculateScore(findings)).toBe(96);
    });
  });

  /**
   * ============================================
   * ERROR HANDLING CONTRACT
   * ============================================
   */

  describe('Error Handling Contract', () => {
    it('should handle missing config gracefully', () => {
      const noConfigDetector = new PatternDetector();
      expect(noConfigDetector.config).toEqual({});
      expect(noConfigDetector.globalConfig).toEqual({});
    });

    it('should handle null config values', () => {
      const nullConfigDetector = new PatternDetector({
        config: null,
        globalConfig: null
      });
      expect(nullConfigDetector.config).toBeNull();
      expect(nullConfigDetector.globalConfig).toBeNull();
    });

    it('should handle complex nested config', () => {
      const complexConfig = {
        config: {
          nested: {
            deep: {
              value: 'test'
            }
          }
        },
        globalConfig: {
          weights: {
            a: 0.5,
            b: 0.3,
            c: 0.2
          }
        }
      };
      const complexDetector = new PatternDetector(complexConfig);
      expect(complexDetector.config.nested.deep.value).toBe('test');
      expect(complexDetector.globalConfig.weights).toEqual({ a: 0.5, b: 0.3, c: 0.2 });
    });
  });
});

describe('PatternDetector Subclass Implementation', () => {
  /**
   * ============================================
   * STRUCTURE CONTRACT
   * ============================================
   */

  describe('Structure Contract', () => {
    it('should allow creating custom detector subclass', () => {
      class CustomDetector extends PatternDetector {
        getId() { return 'custom'; }
        getName() { return 'Custom Detector'; }
        getDescription() { return 'A custom detector'; }
        async detect(systemMap) {
          return {
            detector: this.getId(),
            name: this.getName(),
            description: this.getDescription(),
            findings: [],
            score: 100,
            weight: 0.1
          };
        }
      }

      const custom = new CustomDetector({});
      expect(custom.getId()).toBe('custom');
      expect(custom.getName()).toBe('Custom Detector');
      expect(custom.getDescription()).toBe('A custom detector');
    });

    it('should inherit calculateScore method', () => {
      class CustomDetector extends PatternDetector {
        getId() { return 'custom'; }
        async detect() { return {}; }
      }

      const custom = new CustomDetector({});
      expect(custom.calculateScore([])).toBe(100);
    });

    it('should have access to logger in subclass', () => {
      class CustomDetector extends PatternDetector {
        getId() { return 'custom-detector'; }
        async detect() { return {}; }
      }

      const custom = new CustomDetector({});
      expect(custom.logger).toBeDefined();
      expect(typeof custom.logger.info).toBe('function');
    });
  });

  /**
   * ============================================
   * DETECTION CONTRACT
   * ============================================
   */

  describe('Detection Contract', () => {
    it('should return valid detection result structure', async () => {
      class CustomDetector extends PatternDetector {
        getId() { return 'custom'; }
        getName() { return 'Custom'; }
        getDescription() { return 'Custom detector'; }
        async detect(systemMap) {
          return {
            detector: this.getId(),
            name: this.getName(),
            description: this.getDescription(),
            findings: [],
            score: 100,
            weight: 0.1,
            recommendation: 'All good'
          };
        }
      }

      const custom = new CustomDetector({});
      const result = await custom.detect({});
      
      expect(result).toHaveProperty('detector');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('findings');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('weight');
      expect(result).toHaveProperty('recommendation');
    });

    it('should pass systemMap to detect method', async () => {
      const mockSystemMap = { test: 'data' };
      let receivedSystemMap;

      class CustomDetector extends PatternDetector {
        getId() { return 'custom'; }
        async detect(systemMap) {
          receivedSystemMap = systemMap;
          return {};
        }
      }

      const custom = new CustomDetector({});
      await custom.detect(mockSystemMap);
      
      expect(receivedSystemMap).toBe(mockSystemMap);
    });

    it('should handle async detection', async () => {
      class AsyncDetector extends PatternDetector {
        getId() { return 'async'; }
        async detect() {
          await new Promise(resolve => setTimeout(resolve, 10));
          return { detector: 'async', score: 100 };
        }
      }

      const async = new AsyncDetector({});
      const result = await async.detect({});
      expect(result.score).toBe(100);
    });
  });
});
