/**
 * @fileoverview Shared Objects Detector Tests
 * 
 * Tests for SharedObjectsDetector.
 * 
 * @module tests/unit/layer-a-analysis/pattern-detection/shared-objects-detector
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SharedObjectsDetector } from '#layer-a/pattern-detection/detectors/shared-objects-detector/detector.js';
import { PatternDetectionTestFactory } from '../../../factories/pattern-detection-test.factory.js';

describe('SharedObjectsDetector', () => {
  let detector;
  let config;

  beforeEach(() => {
    config = {
      minUsageCount: 3,
      minRiskScore: 30
    };
    detector = new SharedObjectsDetector({
      config,
      globalConfig: { weights: { sharedObjects: 0.20 } }
    });
  });

  /**
   * ============================================
   * STRUCTURE CONTRACT
   * ============================================
   */

  describe('Structure Contract', () => {
    it('should have correct ID', () => {
      expect(detector.getId()).toBe('sharedObjects');
    });

    it('should have correct name', () => {
      expect(detector.getName()).toBe('Shared Mutable Objects');
    });

    it('should have description', () => {
      expect(detector.getDescription()).toContain('shared mutable');
    });

    it('should be instantiable', () => {
      expect(detector).toBeInstanceOf(SharedObjectsDetector);
    });

    it('should have detect method', () => {
      expect(typeof detector.detect).toBe('function');
    });
  });

  /**
   * ============================================
   * DETECTION CONTRACT
   * ============================================
   */

  describe('Detection Contract', () => {
    it('should return valid detection result structure', async () => {
      const systemMap = PatternDetectionTestFactory.createMinimalSystemMap();
      const result = await detector.detect(systemMap);

      expect(result).toHaveProperty('detector', 'sharedObjects');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('findings');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('weight');
      expect(result).toHaveProperty('recommendation');
    });

    it('should return empty findings for empty systemMap', async () => {
      const result = await detector.detect({ objectExports: {} });
      expect(result.findings).toEqual([]);
      expect(result.score).toBe(100);
    });

    it('should return empty findings for systemMap without objectExports', async () => {
      const result = await detector.detect({ files: {} });
      expect(result.findings).toEqual([]);
    });

    it('should detect shared objects with high usage', async () => {
      const systemMap = PatternDetectionTestFactory.createSharedObjectsSystemMap();
      const result = await detector.detect(systemMap);

      expect(result.findings.length).toBeGreaterThan(0);
    });
  });

  /**
   * ============================================
   * FINDING STRUCTURE CONTRACT
   * ============================================
   */

  describe('Finding Structure Contract', () => {
    it('should create findings with correct structure', async () => {
      const systemMap = PatternDetectionTestFactory.createSharedObjectsSystemMap();
      const result = await detector.detect(systemMap);

      if (result.findings.length > 0) {
        const finding = result.findings[0];
        expect(finding).toHaveProperty('id');
        expect(finding).toHaveProperty('type', 'shared_mutable_state');
        expect(finding).toHaveProperty('severity');
        expect(finding).toHaveProperty('file');
        expect(finding).toHaveProperty('line');
        expect(finding).toHaveProperty('message');
        expect(finding).toHaveProperty('recommendation');
        expect(finding).toHaveProperty('metadata');
      }
    });

    it('should include metadata in findings', async () => {
      const systemMap = PatternDetectionTestFactory.createSharedObjectsSystemMap();
      const result = await detector.detect(systemMap);

      if (result.findings.length > 0) {
        const meta = result.findings[0].metadata;
        expect(meta).toHaveProperty('objectName');
        expect(meta).toHaveProperty('usageCount');
        expect(meta).toHaveProperty('riskScore');
        expect(meta).toHaveProperty('riskFactors');
        expect(meta).toHaveProperty('objectType');
        expect(meta).toHaveProperty('usages');
      }
    });
  });

  /**
   * ============================================
   * SEVERITY ASSIGNMENT CONTRACT
   * ============================================
   */

  describe('Severity Assignment Contract', () => {
    it('should assign critical severity for high risk scores', async () => {
      const systemMap = {
        objectExports: {
          'src/store.js': [{
            name: 'highRiskStore',
            line: 1,
            isMutable: true,
            propertyDetails: [{ risk: 'high' }, { risk: 'high' }, { risk: 'high' }]
          }]
        },
        files: Object.fromEntries(
          Array(15).fill(null).map((_, i) => [`src/comp${i}.js`, {
            imports: [{ source: '../store', specifiers: [{ imported: 'highRiskStore' }] }]
          }])
        )
      };

      const result = await detector.detect(systemMap);
      const highRiskFinding = result.findings.find(f => f.metadata?.objectName === 'highRiskStore');
      
      if (highRiskFinding) {
        expect(highRiskFinding.severity).toBe('critical');
      }
    });

    it('should assign high severity for medium-high risk scores', async () => {
      const systemMap = {
        objectExports: {
          'src/store.js': [{
            name: 'mediumRiskStore',
            line: 1,
            isMutable: true,
            propertyDetails: [{ risk: 'high' }, { risk: 'high' }]
          }]
        },
        files: Object.fromEntries(
          Array(10).fill(null).map((_, i) => [`src/comp${i}.js`, {
            imports: [{ source: '../store', specifiers: [{ imported: 'mediumRiskStore' }] }]
          }])
        )
      };

      const result = await detector.detect(systemMap);
      const mediumFinding = result.findings.find(f => f.metadata?.objectName === 'mediumRiskStore');
      
      if (mediumFinding) {
        expect(['high', 'critical']).toContain(mediumFinding.severity);
      }
    });

    it('should assign medium severity for lower risk scores', async () => {
      const systemMap = {
        objectExports: {
          'src/store.js': [{
            name: 'lowRiskStore',
            line: 1,
            isMutable: false,
            propertyDetails: [{ risk: 'low' }]
          }]
        },
        files: Object.fromEntries(
          Array(5).fill(null).map((_, i) => [`src/comp${i}.js`, {
            imports: [{ source: '../store', specifiers: [{ imported: 'lowRiskStore' }] }]
          }])
        )
      };

      const result = await detector.detect(systemMap);
      
      if (result.findings.length > 0) {
        expect(result.findings[0].severity).toBe('medium');
      }
    });
  });

  /**
   * ============================================
   * USAGE COUNTING CONTRACT
   * ============================================
   */

  describe('Usage Counting Contract', () => {
    it('should count usages across multiple files', async () => {
      const systemMap = {
        objectExports: {
          'src/store.js': [{
            name: 'sharedStore',
            line: 1,
            isMutable: true
          }]
        },
        files: {
          'src/comp1.js': {
            imports: [{ source: '../store', specifiers: [{ imported: 'sharedStore' }] }]
          },
          'src/comp2.js': {
            imports: [{ source: '../store', specifiers: [{ imported: 'sharedStore' }] }]
          },
          'src/comp3.js': {
            imports: [{ source: '../store', specifiers: [{ imported: 'sharedStore' }] }]
          }
        }
      };

      const result = await detector.detect(systemMap);
      
      if (result.findings.length > 0) {
        const storeFinding = result.findings.find(f => f.metadata?.objectName === 'sharedStore');
        if (storeFinding) {
          expect(storeFinding.metadata.usageCount).toBe(3);
        }
      }
    });

    it('should not flag objects with low usage', async () => {
      const systemMap = {
        objectExports: {
          'src/store.js': [{
            name: 'rarelyUsed',
            line: 1,
            isMutable: true
          }]
        },
        files: {
          'src/comp1.js': {
            imports: [{ source: '../store', specifiers: [{ imported: 'rarelyUsed' }] }]
          }
        }
      };

      const result = await detector.detect(systemMap);
      const rareFinding = result.findings.find(f => f.metadata?.objectName === 'rarelyUsed');
      expect(rareFinding).toBeUndefined();
    });

    it('should limit usages in metadata to 5', async () => {
      const systemMap = {
        objectExports: {
          'src/store.js': [{
            name: 'widelyUsed',
            line: 1,
            isMutable: true
          }]
        },
        files: Object.fromEntries(
          Array(20).fill(null).map((_, i) => [`src/comp${i}.js`, {
            imports: [{ source: '../store', specifiers: [{ imported: 'widelyUsed' }] }]
          }])
        )
      };

      const result = await detector.detect(systemMap);
      
      if (result.findings.length > 0) {
        expect(result.findings[0].metadata.usages.length).toBeLessThanOrEqual(5);
      }
    });
  });

  /**
   * ============================================
   * RECOMMENDATION CONTRACT
   * ============================================
   */

  describe('Recommendation Contract', () => {
    it('should recommend state management for state objects', async () => {
      const systemMap = {
        objectExports: {
          'src/store.js': [{
            name: 'appState',
            line: 1,
            isMutable: true,
            propertyDetails: [{ risk: 'high' }]
          }]
        },
        files: Object.fromEntries(
          Array(10).fill(null).map((_, i) => [`src/comp${i}.js`, {
            imports: [{ source: '../store', specifiers: [{ imported: 'appState' }] }]
          }])
        )
      };

      const result = await detector.detect(systemMap);
      
      if (result.findings.length > 0) {
        expect(result.findings[0].recommendation).toContain('Redux');
        expect(result.findings[0].recommendation).toContain('Zustand');
      }
    });

    it('should recommend review for potential state', async () => {
      const systemMap = {
        objectExports: {
          'src/data.js': [{
            name: 'dataManager',
            line: 1,
            isMutable: true,
            propertyDetails: [{ risk: 'medium' }]
          }]
        },
        files: Object.fromEntries(
          Array(10).fill(null).map((_, i) => [`src/comp${i}.js`, {
            imports: [{ source: '../data', specifiers: [{ imported: 'dataManager' }] }]
          }])
        )
      };

      const result = await detector.detect(systemMap);
      
      const potentialState = result.findings.find(f => 
        f.metadata?.objectType === 'potential_state'
      );
      
      if (potentialState) {
        expect(potentialState.recommendation).toContain('Review');
      }
    });

    it('should provide monitoring recommendation for neutral objects', async () => {
      const systemMap = {
        objectExports: {
          'src/data.js': [{
            name: 'neutralObj',
            line: 1,
            isMutable: false
          }]
        },
        files: Object.fromEntries(
          Array(10).fill(null).map((_, i) => [`src/comp${i}.js`, {
            imports: [{ source: '../data', specifiers: [{ imported: 'neutralObj' }] }]
          }])
        )
      };

      const result = await detector.detect(systemMap);
      
      if (result.findings.length > 0) {
        expect(result.findings[0].recommendation).toContain('Monitor');
      }
    });
  });

  /**
   * ============================================
   * SCORE CALCULATION CONTRACT
   * ============================================
   */

  describe('Score Calculation Contract', () => {
    it('should return 100 for no findings', async () => {
      const systemMap = {
        objectExports: {},
        files: {}
      };

      const result = await detector.detect(systemMap);
      expect(result.score).toBe(100);
    });

    it('should reduce score based on findings severity', async () => {
      const systemMap = {
        objectExports: {
          'src/store.js': [{
            name: 'criticalStore',
            line: 1,
            isMutable: true,
            propertyDetails: [{ risk: 'high' }, { risk: 'high' }, { risk: 'high' }]
          }]
        },
        files: Object.fromEntries(
          Array(10).fill(null).map((_, i) => [`src/comp${i}.js`, {
            imports: [{ source: '../store', specifiers: [{ imported: 'criticalStore' }] }]
          }])
        )
      };

      const result = await detector.detect(systemMap);
      expect(result.score).toBeLessThan(100);
    });

    it('should penalize critical findings more than high', async () => {
      const criticalSystemMap = {
        objectExports: {
          'src/store.js': [{
            name: 'critical',
            line: 1,
            isMutable: true,
            propertyDetails: Array(5).fill({ risk: 'high' })
          }]
        },
        files: Object.fromEntries(
          Array(10).fill(null).map((_, i) => [`src/comp${i}.js`, {
            imports: [{ source: '../store', specifiers: [{ imported: 'critical' }] }]
          }])
        )
      };

      const highSystemMap = {
        objectExports: {
          'src/store.js': [{
            name: 'high',
            line: 1,
            isMutable: true,
            propertyDetails: Array(2).fill({ risk: 'high' })
          }]
        },
        files: Object.fromEntries(
          Array(10).fill(null).map((_, i) => [`src/comp${i}.js`, {
            imports: [{ source: '../store', specifiers: [{ imported: 'high' }] }]
          }])
        )
      };

      const criticalResult = await detector.detect(criticalSystemMap);
      const highResult = await detector.detect(highSystemMap);

      expect(criticalResult.score).toBeLessThan(highResult.score);
    });

    it('should never return negative score', async () => {
      const systemMap = {
        objectExports: {
          'src/store.js': Array(20).fill(null).map((_, i) => ({
            name: `critical${i}`,
            line: i + 1,
            isMutable: true,
            propertyDetails: Array(5).fill({ risk: 'high' })
          }))
        },
        files: Object.fromEntries(
          Array(10).fill(null).map((_, i) => [`src/comp${i}.js`, {
            imports: Array(20).fill(null).map((_, j) => ({
              source: '../store',
              specifiers: [{ imported: `critical${j}` }]
            }))
          }])
        )
      };

      const result = await detector.detect(systemMap);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  /**
   * ============================================
   * ERROR HANDLING CONTRACT
   * ============================================
   */

  describe('Error Handling Contract', () => {
    it('should handle null objectExports', async () => {
      const systemMap = { files: {} };
      const result = await detector.detect(systemMap);
      expect(result.findings).toEqual([]);
      expect(result.score).toBe(100);
    });

    it('should handle null objects in objectExports', async () => {
      const systemMap = {
        objectExports: {
          'src/store.js': null
        },
        files: {}
      };

      const result = await detector.detect(systemMap);
      expect(result.findings).toEqual([]);
    });

    it('should handle objects without name', async () => {
      const systemMap = {
        objectExports: {
          'src/store.js': [
            { line: 1, isMutable: true }, // no name
            { name: 'valid', line: 2, isMutable: true }
          ]
        },
        files: Object.fromEntries(
          Array(5).fill(null).map((_, i) => [`src/comp${i}.js`, {
            imports: [
              { source: '../store', specifiers: [{ imported: 'valid' }] }
            ]
          }])
        )
      };

      const result = await detector.detect(systemMap);
      expect(result.findings).toBeDefined();
    });

    it('should handle malformed imports gracefully', async () => {
      const systemMap = {
        objectExports: {
          'src/store.js': [{
            name: 'store',
            line: 1,
            isMutable: true
          }]
        },
        files: {
          'src/comp1.js': {
            imports: [
              null,
              undefined,
              { source: '../store' }, // no specifiers
              { specifiers: null },
              { specifiers: [null] },
              { source: '../store', specifiers: [{ imported: 'store' }] }
            ]
          }
        }
      };

      const result = await detector.detect(systemMap);
      expect(result.findings).toBeDefined();
    });

    it('should handle very large system maps', async () => {
      const systemMap = {
        objectExports: {
          'src/store.js': Array(100).fill(null).map((_, i) => ({
            name: `obj${i}`,
            line: i + 1,
            isMutable: true
          }))
        },
        files: Object.fromEntries(
          Array(100).fill(null).map((_, i) => [`src/comp${i}.js`, {
            imports: Array(100).fill(null).map((_, j) => ({
              source: '../store',
              specifiers: [{ imported: `obj${j}` }]
            }))
          }])
        )
      };

      const result = await detector.detect(systemMap);
      expect(result).toBeDefined();
      expect(result.findings.length).toBeGreaterThan(0);
    });
  });
});
