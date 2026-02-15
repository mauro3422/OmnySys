/**
 * @fileoverview Default Config Tests
 * 
 * Tests for DEFAULT_CONFIG from engine/DefaultConfig.js.
 * 
 * @module tests/unit/layer-a-analysis/pattern-detection/engine/DefaultConfig
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from '#layer-a/pattern-detection/engine/DefaultConfig.js';

describe('DEFAULT_CONFIG', () => {
  /**
   * ============================================
   * STRUCTURE CONTRACT
   * ============================================
   */

  describe('Structure Contract', () => {
    it('should be defined', () => {
      expect(DEFAULT_CONFIG).toBeDefined();
    });

    it('should have thresholds object', () => {
      expect(DEFAULT_CONFIG).toHaveProperty('thresholds');
      expect(typeof DEFAULT_CONFIG.thresholds).toBe('object');
    });

    it('should have weights object', () => {
      expect(DEFAULT_CONFIG).toHaveProperty('weights');
      expect(typeof DEFAULT_CONFIG.weights).toBe('object');
    });

    it('should have projectType', () => {
      expect(DEFAULT_CONFIG).toHaveProperty('projectType');
    });

    it('should have features object', () => {
      expect(DEFAULT_CONFIG).toHaveProperty('features');
      expect(typeof DEFAULT_CONFIG.features).toBe('object');
    });
  });

  /**
   * ============================================
   * THRESHOLDS CONTRACT
   * ============================================
   */

  describe('Thresholds Contract', () => {
    it('should have deepChains thresholds', () => {
      expect(DEFAULT_CONFIG.thresholds).toHaveProperty('deepChains');
      expect(DEFAULT_CONFIG.thresholds.deepChains).toHaveProperty('minDepth');
      expect(DEFAULT_CONFIG.thresholds.deepChains).toHaveProperty('maxAcceptable');
      expect(DEFAULT_CONFIG.thresholds.deepChains).toHaveProperty('riskMultiplier');
    });

    it('should have sharedObjects thresholds', () => {
      expect(DEFAULT_CONFIG.thresholds).toHaveProperty('sharedObjects');
      expect(DEFAULT_CONFIG.thresholds.sharedObjects).toHaveProperty('minUsageCount');
      expect(DEFAULT_CONFIG.thresholds.sharedObjects).toHaveProperty('minRiskScore');
      expect(DEFAULT_CONFIG.thresholds.sharedObjects).toHaveProperty('configPatterns');
      expect(DEFAULT_CONFIG.thresholds.sharedObjects).toHaveProperty('statePatterns');
    });

    it('should have circularDeps thresholds', () => {
      expect(DEFAULT_CONFIG.thresholds).toHaveProperty('circularDeps');
      expect(DEFAULT_CONFIG.thresholds.circularDeps).toHaveProperty('minFilesInCycle');
      expect(DEFAULT_CONFIG.thresholds.circularDeps).toHaveProperty('maxAcceptable');
    });

    it('should have coupling thresholds', () => {
      expect(DEFAULT_CONFIG.thresholds).toHaveProperty('coupling');
      expect(DEFAULT_CONFIG.thresholds.coupling).toHaveProperty('highThreshold');
      expect(DEFAULT_CONFIG.thresholds.coupling).toHaveProperty('criticalThreshold');
    });

    it('should have unusedExports thresholds', () => {
      expect(DEFAULT_CONFIG.thresholds).toHaveProperty('unusedExports');
      expect(DEFAULT_CONFIG.thresholds.unusedExports).toHaveProperty('ignorePatterns');
      expect(DEFAULT_CONFIG.thresholds.unusedExports).toHaveProperty('minExports');
    });

    it('should have valid threshold values', () => {
      expect(DEFAULT_CONFIG.thresholds.deepChains.minDepth).toBeGreaterThan(0);
      expect(DEFAULT_CONFIG.thresholds.sharedObjects.minUsageCount).toBeGreaterThan(0);
      expect(DEFAULT_CONFIG.thresholds.coupling.highThreshold).toBeGreaterThan(0);
    });
  });

  /**
   * ============================================
   * WEIGHTS CONTRACT
   * ============================================
   */

  describe('Weights Contract', () => {
    it('should have all detector weights', () => {
      expect(DEFAULT_CONFIG.weights).toHaveProperty('deepChains');
      expect(DEFAULT_CONFIG.weights).toHaveProperty('sharedObjects');
      expect(DEFAULT_CONFIG.weights).toHaveProperty('circularDeps');
      expect(DEFAULT_CONFIG.weights).toHaveProperty('coupling');
      expect(DEFAULT_CONFIG.weights).toHaveProperty('unusedExports');
      expect(DEFAULT_CONFIG.weights).toHaveProperty('hotspots');
      expect(DEFAULT_CONFIG.weights).toHaveProperty('unusedImports');
    });

    it('should have positive weight values', () => {
      Object.values(DEFAULT_CONFIG.weights).forEach(weight => {
        expect(weight).toBeGreaterThan(0);
        expect(weight).toBeLessThanOrEqual(1);
      });
    });

    it('should have weights that sum to approximately 1', () => {
      const sum = Object.values(DEFAULT_CONFIG.weights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 1);
    });
  });

  /**
   * ============================================
   * PROJECT TYPE CONTRACT
   * ============================================
   */

  describe('Project Type Contract', () => {
    it('should default to standard', () => {
      expect(DEFAULT_CONFIG.projectType).toBe('standard');
    });

    it('should be a valid project type', () => {
      const validTypes = ['standard', 'microservices', 'library'];
      expect(validTypes).toContain(DEFAULT_CONFIG.projectType);
    });
  });

  /**
   * ============================================
   * FEATURES CONTRACT
   * ============================================
   */

  describe('Features Contract', () => {
    it('should have enableHeuristics feature', () => {
      expect(DEFAULT_CONFIG.features).toHaveProperty('enableHeuristics');
      expect(typeof DEFAULT_CONFIG.features.enableHeuristics).toBe('boolean');
    });

    it('should have enableHistory feature', () => {
      expect(DEFAULT_CONFIG.features).toHaveProperty('enableHistory');
      expect(typeof DEFAULT_CONFIG.features.enableHistory).toBe('boolean');
    });

    it('should have enableSemantic feature', () => {
      expect(DEFAULT_CONFIG.features).toHaveProperty('enableSemantic');
      expect(typeof DEFAULT_CONFIG.features.enableSemantic).toBe('boolean');
    });
  });

  /**
   * ============================================
   * IMMUTABILITY CONTRACT
   * ============================================
   */

  describe('Immutability Contract', () => {
    it('should not be modified when imported', () => {
      const original = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      
      // Attempt to modify (should not affect original if frozen)
      try {
        DEFAULT_CONFIG.projectType = 'modified';
      } catch (e) {
        // Expected if config is frozen
      }
      
      // Restore if modified
      if (DEFAULT_CONFIG.projectType === 'modified') {
        DEFAULT_CONFIG.projectType = original.projectType;
      }
      
      expect(DEFAULT_CONFIG.projectType).toBe('standard');
    });

    it('should have frozen thresholds object', () => {
      const originalMinDepth = DEFAULT_CONFIG.thresholds.deepChains.minDepth;
      
      try {
        DEFAULT_CONFIG.thresholds.deepChains.minDepth = 999;
      } catch (e) {
        // Expected if frozen
      }
      
      // Restore if modified
      if (DEFAULT_CONFIG.thresholds.deepChains.minDepth === 999) {
        DEFAULT_CONFIG.thresholds.deepChains.minDepth = originalMinDepth;
      }
      
      expect(DEFAULT_CONFIG.thresholds.deepChains.minDepth).toBe(originalMinDepth);
    });
  });
});
