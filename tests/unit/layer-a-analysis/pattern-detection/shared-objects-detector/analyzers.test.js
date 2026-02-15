/**
 * @fileoverview Shared Objects Detector Analyzers Tests
 * 
 * Tests for shared-objects-detector analyzers.
 * 
 * @module tests/unit/layer-a-analysis/pattern-detection/shared-objects-detector/analyzers
 */

import { describe, it, expect } from 'vitest';
import { analyzeRiskProfile } from '#layer-a/pattern-detection/detectors/shared-objects-detector/analyzers/risk-analyzer.js';
import { countUsages } from '#layer-a/pattern-detection/detectors/shared-objects-detector/analyzers/usage-counter.js';
import { generateRecommendation, calculateScore } from '#layer-a/pattern-detection/detectors/shared-objects-detector/analyzers/recommendation-generator.js';

describe('Shared Objects Analyzers', () => {
  /**
   * ============================================
   * RISK ANALYZER CONTRACT
   * ============================================
   */

  describe('Risk Analyzer Contract', () => {
    it('should return risk profile with score, type, and factors', () => {
      const obj = { name: 'testStore' };
      const usages = [{ file: 'a.js' }, { file: 'b.js' }];
      const filePath = 'src/store.js';

      const profile = analyzeRiskProfile(obj, usages, filePath);

      expect(profile).toHaveProperty('score');
      expect(profile).toHaveProperty('type');
      expect(profile).toHaveProperty('factors');
      expect(typeof profile.score).toBe('number');
      expect(Array.isArray(profile.factors)).toBe(true);
    });

    it('should identify state objects with high risk', () => {
      const obj = { name: 'appStore', isMutable: true };
      const usages = Array(15).fill({ file: 'x.js' });

      const profile = analyzeRiskProfile(obj, usages, 'src/store.js');

      expect(profile.type).toBe('state');
      expect(profile.score).toBeGreaterThan(0);
    });

    it('should identify config objects with low risk', () => {
      const obj = { name: 'CONFIG', isMutable: false };
      const usages = Array(20).fill({ file: 'x.js' });

      const profile = analyzeRiskProfile(obj, usages, 'src/config.js');

      expect(profile.score).toBeLessThan(30);
    });

    it('should identify enum objects with very low risk', () => {
      const obj = { name: 'STATUS', objectType: 'enum', riskLevel: 'low' };
      const usages = Array(10).fill({ file: 'x.js' });

      const profile = analyzeRiskProfile(obj, usages, 'src/types.js');

      expect(profile.type).toBe('enum');
      expect(profile.score).toBeLessThanOrEqual(10);
    });

    it('should increase risk for mutable objects', () => {
      const mutableObj = { name: 'data', isMutable: true };
      const immutableObj = { name: 'data', isMutable: false };
      const usages = [{ file: 'a.js' }];

      const mutableProfile = analyzeRiskProfile(mutableObj, usages, '');
      const immutableProfile = analyzeRiskProfile(immutableObj, usages, '');

      expect(mutableProfile.score).toBeGreaterThan(immutableProfile.score);
    });

    it('should increase risk for high usage non-enum/config', () => {
      const obj = { name: 'sharedData' };
      const lowUsage = Array(3).fill({ file: 'x.js' });
      const highUsage = Array(15).fill({ file: 'x.js' });

      const lowProfile = analyzeRiskProfile(obj, lowUsage, '');
      const highProfile = analyzeRiskProfile(obj, highUsage, '');

      expect(highProfile.score).toBeGreaterThan(lowProfile.score);
    });

    it('should consider property details in risk calculation', () => {
      const obj = {
        name: 'complexObj',
        propertyDetails: [
          { risk: 'high' },
          { risk: 'high' },
          { risk: 'low' }
        ]
      };
      const usages = [{ file: 'a.js' }];

      const profile = analyzeRiskProfile(obj, usages, '');
      expect(profile.score).toBeGreaterThan(0);
    });

    it('should use extractor metadata when available', () => {
      const obj = {
        name: 'extractedState',
        objectType: 'state',
        riskLevel: 'high'
      };
      const usages = [{ file: 'a.js' }];

      const profile = analyzeRiskProfile(obj, usages, '');
      expect(profile.score).toBeGreaterThanOrEqual(40);
    });

    it('should reduce score for config file location', () => {
      const obj = { name: 'someData' };
      const usages = [{ file: 'a.js' }];

      const normalProfile = analyzeRiskProfile(obj, usages, 'src/data.js');
      const configProfile = analyzeRiskProfile(obj, usages, 'src/config/constants.js');

      expect(configProfile.score).toBeLessThanOrEqual(normalProfile.score);
    });

    it('should never return negative score', () => {
      const obj = { name: 'CONFIG', isMutable: false, objectType: 'enum' };
      const usages = [];

      const profile = analyzeRiskProfile(obj, usages, 'src/config/types.js');
      expect(profile.score).toBeGreaterThanOrEqual(0);
    });
  });

  /**
   * ============================================
   * USAGE COUNTER CONTRACT
   * ============================================
   */

  describe('Usage Counter Contract', () => {
    it('should count usages correctly', () => {
      const systemMap = {
        files: {
          'a.js': {
            imports: [{ specifiers: [{ imported: 'store' }] }]
          },
          'b.js': {
            imports: [{ specifiers: [{ imported: 'store' }] }]
          },
          'c.js': {
            imports: [{ specifiers: [{ imported: 'other' }] }]
          }
        }
      };

      const usages = countUsages('store', systemMap);
      expect(usages.length).toBe(2);
    });

    it('should return empty array for no usages', () => {
      const systemMap = {
        files: {
          'a.js': {
            imports: [{ specifiers: [{ imported: 'other' }] }]
          }
        }
      };

      const usages = countUsages('unused', systemMap);
      expect(usages).toEqual([]);
    });

    it('should handle files without imports', () => {
      const systemMap = {
        files: {
          'a.js': {},
          'b.js': { imports: [{ specifiers: [{ imported: 'store' }] }] }
        }
      };

      const usages = countUsages('store', systemMap);
      expect(usages.length).toBe(1);
    });

    it('should handle imports without specifiers', () => {
      const systemMap = {
        files: {
          'a.js': {
            imports: [
              { source: './module' }, // no specifiers
              { specifiers: null },
              { specifiers: [{ imported: 'store' }] }
            ]
          }
        }
      };

      const usages = countUsages('store', systemMap);
      expect(usages.length).toBe(1);
    });

    it('should handle empty systemMap', () => {
      const usages = countUsages('store', {});
      expect(usages).toEqual([]);
    });

    it('should include file, source, and line in usage records', () => {
      const systemMap = {
        files: {
          'src/app.js': {
            imports: [{
              source: '../store',
              specifiers: [{ imported: 'store' }],
              line: 5
            }]
          }
        }
      };

      const usages = countUsages('store', systemMap);
      expect(usages[0]).toHaveProperty('file', 'src/app.js');
      expect(usages[0]).toHaveProperty('source', '../store');
      expect(usages[0]).toHaveProperty('line', 5);
    });
  });

  /**
   * ============================================
   * RECOMMENDATION GENERATOR CONTRACT
   * ============================================
   */

  describe('Recommendation Generator Contract', () => {
    it('should recommend state management for state objects', () => {
      const obj = {
        name: 'appStore',
        riskProfile: { type: 'state' }
      };

      const recommendation = generateRecommendation(obj);
      expect(recommendation).toContain('Redux');
      expect(recommendation).toContain('Zustand');
    });

    it('should recommend review for potential state', () => {
      const obj = {
        name: 'sharedData',
        riskProfile: { type: 'potential_state' }
      };

      const recommendation = generateRecommendation(obj);
      expect(recommendation).toContain('Review');
    });

    it('should suggest monitoring for neutral objects', () => {
      const obj = {
        name: 'data',
        riskProfile: { type: 'neutral' }
      };

      const recommendation = generateRecommendation(obj);
      expect(recommendation).toContain('Monitor');
    });

    it('should include object name in recommendation', () => {
      const obj = {
        name: 'myStore',
        riskProfile: { type: 'neutral' }
      };

      const recommendation = generateRecommendation(obj);
      expect(recommendation).toContain('myStore');
    });
  });

  /**
   * ============================================
   * SCORE CALCULATION CONTRACT
   * ============================================
   */

  describe('Score Calculation Contract', () => {
    it('should return 100 for no findings', () => {
      const score = calculateScore([]);
      expect(score).toBe(100);
    });

    it('should reduce score for critical findings', () => {
      const findings = [
        { severity: 'critical' },
        { severity: 'critical' }
      ];
      const score = calculateScore(findings);
      expect(score).toBeLessThan(100);
    });

    it('should reduce score for high findings', () => {
      const findings = [{ severity: 'high' }];
      const score = calculateScore(findings);
      expect(score).toBeLessThan(100);
    });

    it('should penalize critical more than high', () => {
      const criticalFindings = [{ severity: 'critical' }];
      const highFindings = [{ severity: 'high' }];

      const criticalScore = calculateScore(criticalFindings);
      const highScore = calculateScore(highFindings);

      expect(criticalScore).toBeLessThan(highScore);
    });

    it('should penalize high more than medium', () => {
      const highFindings = [{ severity: 'high' }];
      const mediumFindings = [{ severity: 'medium' }];

      const highScore = calculateScore(highFindings);
      const mediumScore = calculateScore(mediumFindings);

      expect(highScore).toBeLessThan(mediumScore);
    });

    it('should never return negative score', () => {
      const findings = Array(100).fill({ severity: 'critical' });
      const score = calculateScore(findings);
      expect(score).toBe(0);
    });

    it('should handle mixed severity findings', () => {
      const findings = [
        { severity: 'critical' },
        { severity: 'high' },
        { severity: 'medium' },
        { severity: 'low' }
      ];
      const score = calculateScore(findings);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThan(100);
    });
  });
});
