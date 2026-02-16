/**
 * @fileoverview Orchestrators Index Tests
 * 
 * @module tests/unit/layer-a-analysis/module-system/orchestrators/index
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeModules,
  analyzeSingleModule,
  analyzeSystemOnly
} from '../../../../../src/layer-a-static/module-system/orchestrators/index.js';

describe('Orchestrators Index', () => {
  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export analyzeModules function', () => {
      expect(typeof analyzeModules).toBe('function');
    });

    it('should export analyzeSingleModule function', () => {
      expect(typeof analyzeSingleModule).toBe('function');
    });

    it('should export analyzeSystemOnly function', () => {
      expect(typeof analyzeSystemOnly).toBe('function');
    });
  });

  // ============================================================================
  // Function Availability
  // ============================================================================
  describe('Function Availability', () => {
    it('analyzeModules should be callable', () => {
      expect(() => analyzeModules('/project', [])).not.toThrow();
    });

    it('analyzeSingleModule should be callable', () => {
      expect(() => analyzeSingleModule('/project/src/test', [])).not.toThrow();
    });

    it('analyzeSystemOnly should be callable', () => {
      expect(() => analyzeSystemOnly('/project', [])).not.toThrow();
    });
  });

  // ============================================================================
  // Return Types
  // ============================================================================
  describe('Return Types', () => {
    it('analyzeModules should return object', () => {
      const result = analyzeModules('/project', []);
      expect(typeof result).toBe('object');
    });

    it('analyzeSingleModule should return object', () => {
      const result = analyzeSingleModule('/project/src/test', []);
      expect(typeof result).toBe('object');
    });

    it('analyzeSystemOnly should return object', () => {
      const result = analyzeSystemOnly('/project', []);
      expect(typeof result).toBe('object');
    });
  });
});
