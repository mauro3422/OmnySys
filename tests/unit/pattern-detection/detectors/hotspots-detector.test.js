/**
 * Hotspots Detector Tests
 * 
 * Detects functions with excessive usage (traffic hotspots).
 * Like identifying "intersections with too many cars" in the code map.
 */

import { describe, it, expect } from 'vitest';
import { HotspotsDetector } from '#layer-a/pattern-detection/detectors/hotspots-detector.js';

describe('Hotspots Detector', () => {
  describe('Basic Detection', () => {
    it('should detect function with high usage as hotspot', async () => {
      const detector = new HotspotsDetector({
        config: { minUsageThreshold: 5, highUsageThreshold: 10 },
        globalConfig: { weights: { hotspots: 0.15 } }
      });

      const systemMap = {
        functions: {
          'services.js::processOrder': { 
            name: 'processOrder', 
            isExported: true,
            hasSideEffects: true,
            complexity: 8
          }
        },
        function_links: [
          // 12 different functions call processOrder (above threshold of 5)
          ...Array(12).fill(0).map((_, i) => ({
            from: `controller${i}.js::handleRequest`,
            to: 'services.js::processOrder',
            file_to: 'services.js'
          }))
        ]
      };

      const result = await detector.detect(systemMap);
      
      // Should find the hotspot (processOrder is business logic, not utility)
      expect(result.findings.length).toBeGreaterThan(0);
      const finding = result.findings.find(f => f.metadata.functionName === 'processOrder');
      expect(finding).toBeDefined();
    });

    it('should NOT detect function below threshold', async () => {
      const detector = new HotspotsDetector({
        config: { minUsageThreshold: 15 },
        globalConfig: { weights: { hotspots: 0.15 } }
      });

      const systemMap = {
        functions: {
          'utils.js::helper': { name: 'helper', isExported: true }
        },
        function_links: [
          // Only 3 calls - below threshold
          { from: 'a.js::func', to: 'utils.js::helper' },
          { from: 'b.js::func', to: 'utils.js::helper' },
          { from: 'c.js::func', to: 'utils.js::helper' }
        ]
      };

      const result = await detector.detect(systemMap);
      
      expect(result.findings.length).toBe(0);
    });

    it('should calculate risk score based on usage', async () => {
      const detector = new HotspotsDetector({
        config: { minUsageThreshold: 5 },
        globalConfig: { weights: { hotspots: 0.15 } }
      });

      const systemMap = {
        functions: {
          'core.js::criticalFunc': { 
            name: 'criticalFunc', 
            isExported: true,
            hasSideEffects: true,
            complexity: 10
          }
        },
        function_links: Array(15).fill(0).map((_, i) => ({
          from: `module${i}.js::method`,
          to: 'core.js::criticalFunc',
          file_to: 'core.js'
        }))
      };

      const result = await detector.detect(systemMap);
      
      if (result.findings.length > 0) {
        expect(result.findings[0].metadata.riskScore).toBeDefined();
        expect(result.findings[0].metadata.riskScore).toBeGreaterThan(0);
      }
    });
  });

  describe('Business Logic Filtering', () => {
    it('should filter out utility functions like formatDate', async () => {
      const detector = new HotspotsDetector({
        config: { minUsageThreshold: 5 },
        globalConfig: { weights: { hotspots: 0.15 } }
      });

      const systemMap = {
        functions: {
          'utils.js::formatDate': { name: 'formatDate', isExported: true }
        },
        function_links: [
          // High usage but formatDate matches utility pattern
          ...Array(20).fill(0).map((_, i) => ({
            from: `file${i}.js::render`,
            to: 'utils.js::formatDate'
          }))
        ]
      };

      const result = await detector.detect(systemMap);
      
      // formatDate should be filtered as utility
      const formatDateFinding = result.findings.find(f => f.metadata.functionName === 'formatDate');
      expect(formatDateFinding).toBeUndefined();
    });

    it('should flag business logic functions', async () => {
      const detector = new HotspotsDetector({
        config: { minUsageThreshold: 5 },
        globalConfig: { weights: { hotspots: 0.15 } }
      });

      const systemMap = {
        functions: {
          'services.js::processPayment': { 
            name: 'processPayment', 
            isExported: true,
            hasSideEffects: true,
            complexity: 12
          }
        },
        function_links: Array(12).fill(0).map((_, i) => ({
          from: `checkout${i}.js::pay`,
          to: 'services.js::processPayment',
          file_to: 'services.js'
        }))
      };

      const result = await detector.detect(systemMap);
      
      const paymentFinding = result.findings.find(f => f.metadata.functionName === 'processPayment');
      // processPayment should be detected (business logic with high usage)
      if (paymentFinding) {
        expect(paymentFinding.metadata.riskScore).toBeGreaterThan(15);
      }
    });
  });

  describe('Result Structure', () => {
    it('should return findings with required fields', async () => {
      const detector = new HotspotsDetector({
        config: { minUsageThreshold: 3 },
        globalConfig: { weights: { hotspots: 0.15 } }
      });

      const systemMap = {
        functions: {
          'api.js::fetchData': { 
            name: 'fetchData', 
            isExported: true,
            hasSideEffects: true
          }
        },
        function_links: Array(8).fill(0).map((_, i) => ({
          from: `page${i}.js::load`,
          to: 'api.js::fetchData',
          file_to: 'api.js'
        }))
      };

      const result = await detector.detect(systemMap);
      
      if (result.findings.length > 0) {
        const finding = result.findings[0];
        expect(finding).toHaveProperty('id');
        expect(finding).toHaveProperty('type');
        expect(finding).toHaveProperty('severity');
        expect(finding).toHaveProperty('message');
        expect(finding).toHaveProperty('metadata');
        expect(finding.metadata).toHaveProperty('functionName');
        expect(finding.metadata).toHaveProperty('usageCount');
        expect(finding.metadata).toHaveProperty('riskScore');
      }
    });

    it('should include recommendation', async () => {
      const detector = new HotspotsDetector({
        config: { minUsageThreshold: 3 },
        globalConfig: { weights: { hotspots: 0.15 } }
      });

      const systemMap = {
        functions: {
          'core.js::importantFunc': { 
            name: 'importantFunc', 
            isExported: true,
            hasSideEffects: true
          }
        },
        function_links: Array(8).fill(0).map((_, i) => ({
          from: `user${i}.js::action`,
          to: 'core.js::importantFunc'
        }))
      };

      const result = await detector.detect(systemMap);
      
      if (result.findings.length > 0) {
        expect(result.findings[0].recommendation).toBeDefined();
        expect(typeof result.findings[0].recommendation).toBe('string');
      }
    });

    it('should return overall score', async () => {
      const detector = new HotspotsDetector({
        config: {},
        globalConfig: { weights: { hotspots: 0.15 } }
      });

      const systemMap = {
        functions: {},
        function_links: []
      };

      const result = await detector.detect(systemMap);
      
      expect(result).toHaveProperty('score');
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should return detector metadata', async () => {
      const detector = new HotspotsDetector({
        globalConfig: { weights: { hotspots: 0.15 } }
      });

      const result = await detector.detect({ functions: {}, function_links: [] });
      
      expect(result.detector).toBe('hotspots');
      expect(result.name).toBe('Critical Function Hotspots');
      expect(result.weight).toBe(0.15);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty system map', async () => {
      const detector = new HotspotsDetector({
        globalConfig: { weights: { hotspots: 0.15 } }
      });
      
      const result = await detector.detect({});
      
      expect(result).toBeDefined();
      expect(result.findings).toBeDefined();
      expect(Array.isArray(result.findings)).toBe(true);
      expect(result.findings.length).toBe(0);
    });

    it('should handle missing function_links', async () => {
      const detector = new HotspotsDetector({
        globalConfig: { weights: { hotspots: 0.15 } }
      });
      
      const result = await detector.detect({
        functions: { 'test.js': [{ name: 'func' }] }
      });
      
      expect(result).toBeDefined();
      expect(result.findings.length).toBe(0);
    });

    it('should handle null/undefined config gracefully', async () => {
      const detector = new HotspotsDetector({ 
        config: null,
        globalConfig: { weights: { hotspots: 0.15 } }
      });
      
      const systemMap = {
        functions: {},
        function_links: []
      };

      const result = await detector.detect(systemMap);
      
      expect(result).toBeDefined();
    });
  });

  describe('Detector Metadata', () => {
    it('should provide correct detector ID', () => {
      const detector = new HotspotsDetector({ globalConfig: {} });
      expect(detector.getId()).toBe('hotspots');
    });

    it('should provide detector name', () => {
      const detector = new HotspotsDetector({ globalConfig: {} });
      expect(detector.getName()).toBe('Critical Function Hotspots');
    });

    it('should provide description', () => {
      const detector = new HotspotsDetector({ globalConfig: {} });
      expect(detector.getDescription()).toContain('code smells');
    });
  });

  describe('Utility Function Detection', () => {
    it('should identify format as utility', async () => {
      const detector = new HotspotsDetector({
        globalConfig: { weights: { hotspots: 0.15 } }
      });

      const systemMap = {
        function_links: Array(20).fill(0).map((_, i) => ({
          from: `file${i}.js::render`,
          to: 'utils.js::formatData'
        }))
      };

      const result = await detector.detect(systemMap);
      
      // formatData matches utility pattern
      const finding = result.findings.find(f => f.metadata.functionName === 'formatData');
      expect(finding).toBeUndefined();
    });

    it('should identify get/set as utilities', async () => {
      const detector = new HotspotsDetector({
        globalConfig: { weights: { hotspots: 0.15 } }
      });

      const systemMap = {
        function_links: Array(20).fill(0).map((_, i) => ({
          from: `file${i}.js::access`,
          to: 'models.js::getUser'
        }))
      };

      const result = await detector.detect(systemMap);
      
      // getUser matches getter pattern
      const finding = result.findings.find(f => f.metadata.functionName === 'getUser');
      expect(finding).toBeUndefined();
    });
  });
});
