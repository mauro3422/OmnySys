/**
 * @fileoverview project-analyzer-constants.test.js
 * 
 * Tests para constantes del project-analyzer
 * 
 * @module tests/unit/layer-b-semantic/project-analyzer/constants
 */

import { describe, it, expect } from 'vitest';
import {
  COHESION_WEIGHTS,
  COHESION_THRESHOLDS,
  Severity,
  DIRECTORY_CONFIG,
  REPORT_TEXTS,
  FORMAT_CONFIG
} from '#layer-b/project-analyzer/constants.js';

describe('project-analyzer/constants', () => {
  describe('COHESION_WEIGHTS', () => {
    it('should have DIRECT_IMPORTS weight', () => {
      expect(COHESION_WEIGHTS).toHaveProperty('DIRECT_IMPORTS');
      expect(typeof COHESION_WEIGHTS.DIRECT_IMPORTS).toBe('number');
    });

    it('should have SHARED_STATE weight', () => {
      expect(COHESION_WEIGHTS).toHaveProperty('SHARED_STATE');
      expect(typeof COHESION_WEIGHTS.SHARED_STATE).toBe('number');
    });

    it('should have SHARED_EVENTS weight', () => {
      expect(COHESION_WEIGHTS).toHaveProperty('SHARED_EVENTS');
    });

    it('should have SAME_DIRECTORY weight', () => {
      expect(COHESION_WEIGHTS).toHaveProperty('SAME_DIRECTORY');
    });

    it('should have NEARBY_DIRECTORY weight', () => {
      expect(COHESION_WEIGHTS).toHaveProperty('NEARBY_DIRECTORY');
    });

    it('should have correct weights hierarchy', () => {
      expect(COHESION_WEIGHTS.DIRECT_IMPORTS).toBeGreaterThan(COHESION_WEIGHTS.SAME_DIRECTORY);
      expect(COHESION_WEIGHTS.SAME_DIRECTORY).toBeGreaterThan(COHESION_WEIGHTS.NEARBY_DIRECTORY);
    });
  });

  describe('COHESION_THRESHOLDS', () => {
    it('should have MIN_FOR_CLUSTER', () => {
      expect(COHESION_THRESHOLDS).toHaveProperty('MIN_FOR_CLUSTER');
      expect(typeof COHESION_THRESHOLDS.MIN_FOR_CLUSTER).toBe('number');
    });

    it('should have HIGH_COHESION', () => {
      expect(COHESION_THRESHOLDS).toHaveProperty('HIGH_COHESION');
    });

    it('should have MAX_SCORE', () => {
      expect(COHESION_THRESHOLDS).toHaveProperty('MAX_SCORE');
    });

    it('should have correct threshold hierarchy', () => {
      expect(COHESION_THRESHOLDS.HIGH_COHESION).toBeGreaterThan(COHESION_THRESHOLDS.MIN_FOR_CLUSTER);
      expect(COHESION_THRESHOLDS.MAX_SCORE).toBeGreaterThan(COHESION_THRESHOLDS.HIGH_COHESION);
    });
  });

  describe('Severity', () => {
    it('should have HIGH severity', () => {
      expect(Severity).toHaveProperty('HIGH');
      expect(Severity.HIGH).toBe('high');
    });

    it('should have LOW severity', () => {
      expect(Severity).toHaveProperty('LOW');
      expect(Severity.LOW).toBe('low');
    });
  });

  describe('DIRECTORY_CONFIG', () => {
    it('should have SEPARATOR', () => {
      expect(DIRECTORY_CONFIG).toHaveProperty('SEPARATOR');
    });

    it('should have MIN_SHARED_LEVELS', () => {
      expect(DIRECTORY_CONFIG).toHaveProperty('MIN_SHARED_LEVELS');
      expect(typeof DIRECTORY_CONFIG.MIN_SHARED_LEVELS).toBe('number');
    });
  });

  describe('REPORT_TEXTS', () => {
    it('should have TITLE', () => {
      expect(REPORT_TEXTS).toHaveProperty('TITLE');
      expect(typeof REPORT_TEXTS.TITLE).toBe('string');
    });

    it('should have SUBSYSTEMS_TITLE', () => {
      expect(REPORT_TEXTS).toHaveProperty('SUBSYSTEMS_TITLE');
    });

    it('should have ORPHANS_TITLE', () => {
      expect(REPORT_TEXTS).toHaveProperty('ORPHANS_TITLE');
    });

    it('should have HIGH_SEVERITY', () => {
      expect(REPORT_TEXTS).toHaveProperty('HIGH_SEVERITY');
    });

    it('should have LOW_SEVERITY', () => {
      expect(REPORT_TEXTS).toHaveProperty('LOW_SEVERITY');
    });
  });

  describe('FORMAT_CONFIG', () => {
    it('should have COHESION_DECIMALS', () => {
      expect(FORMAT_CONFIG).toHaveProperty('COHESION_DECIMALS');
      expect(typeof FORMAT_CONFIG.COHESION_DECIMALS).toBe('number');
    });

    it('should have PERCENTAGE_DECIMALS', () => {
      expect(FORMAT_CONFIG).toHaveProperty('PERCENTAGE_DECIMALS');
    });

    it('should have MAX_FILES_TO_LIST', () => {
      expect(FORMAT_CONFIG).toHaveProperty('MAX_FILES_TO_LIST');
      expect(typeof FORMAT_CONFIG.MAX_FILES_TO_LIST).toBe('number');
    });
  });
});
