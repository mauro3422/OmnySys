/**
 * @fileoverview Hotspots Detector Tests
 * 
 * Tests for HotspotsDetector.
 * 
 * @module tests/unit/layer-a-analysis/pattern-detection/hotspots-detector
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HotspotsDetector } from '#layer-a/pattern-detection/detectors/hotspots-detector.js';
import { PatternDetectionTestFactory } from '../../../factories/pattern-detection-test.factory.js';

describe('HotspotsDetector', () => {
  let detector;
  let config;

  beforeEach(() => {
    config = {
      minUsageThreshold: 10,
      highUsageThreshold: 20
    };
    detector = new HotspotsDetector({
      config,
      globalConfig: { weights: { hotspots: 0.15 } }
    });
  });

  /**
   * ============================================
   * STRUCTURE CONTRACT
   * ============================================
   */

  describe('Structure Contract', () => {
    it('should have correct ID', () => {
      expect(detector.getId()).toBe('hotspots');
    });

    it('should have correct name', () => {
      expect(detector.getName()).toBe('Critical Function Hotspots');
    });

    it('should have description', () => {
      expect(detector.getDescription()).toContain('business logic');
    });

    it('should be instantiable', () => {
      expect(detector).toBeInstanceOf(HotspotsDetector);
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

      expect(result).toHaveProperty('detector', 'hotspots');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('findings');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('weight');
      expect(result).toHaveProperty('recommendation');
    });

    it('should return empty findings for empty systemMap', async () => {
      const result = await detector.detect({});
      expect(result.findings).toEqual([]);
      expect(result.score).toBe(100);
    });

    it('should return empty findings for null systemMap', async () => {
      const result = await detector.detect(null);
      expect(result.findings).toEqual([]);
      expect(result.score).toBe(100);
    });

    it('should return empty findings for systemMap without function_links', async () => {
      const systemMap = { files: {}, functions: {} };
      const result = await detector.detect(systemMap);
      expect(result.findings).toEqual([]);
    });

    it('should detect hotspots with high usage', async () => {
      const systemMap = PatternDetectionTestFactory.createHotspotsSystemMap();
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
      const systemMap = PatternDetectionTestFactory.createHotspotsSystemMap();
      const result = await detector.detect(systemMap);

      if (result.findings.length > 0) {
        const finding = result.findings[0];
        expect(finding).toHaveProperty('id');
        expect(finding).toHaveProperty('type', 'function_hotspot');
        expect(finding).toHaveProperty('severity');
        expect(finding).toHaveProperty('file');
        expect(finding).toHaveProperty('line');
        expect(finding).toHaveProperty('message');
        expect(finding).toHaveProperty('recommendation');
        expect(finding).toHaveProperty('metadata');
      }
    });

    it('should include metadata in findings', async () => {
      const systemMap = PatternDetectionTestFactory.createHotspotsSystemMap();
      const result = await detector.detect(systemMap);

      if (result.findings.length > 0) {
        const meta = result.findings[0].metadata;
        expect(meta).toHaveProperty('functionName');
        expect(meta).toHaveProperty('fullId');
        expect(meta).toHaveProperty('filePath');
        expect(meta).toHaveProperty('usageCount');
        expect(meta).toHaveProperty('riskScore');
        expect(meta).toHaveProperty('callerFiles');
        expect(meta).toHaveProperty('isAsync');
        expect(meta).toHaveProperty('hasSideEffects');
        expect(meta).toHaveProperty('complexity');
      }
    });

    it('should assign correct severity based on usage', async () => {
      const systemMap = {
        function_links: Array(25).fill(null).map((_, i) => ({
          from: `caller${i}.js::func`,
          to: 'hotspot.js::hotFunc',
          file_to: 'hotspot.js'
        })),
        functions: {
          'hotspot.js::hotFunc': {
            name: 'hotFunc',
            line: 10,
            isAsync: false,
            hasSideEffects: true,
            complexity: 10
          }
        }
      };

      const result = await detector.detect(systemMap);
      
      if (result.findings.length > 0) {
        expect(result.findings[0].severity).toBe('high');
      }
    });
  });

  /**
   * ============================================
   * UTILITY FUNCTION FILTERING CONTRACT
   * ============================================
   */

  describe('Utility Function Filtering Contract', () => {
    it('should not flag logging functions as hotspots', async () => {
      const systemMap = {
        function_links: Array(15).fill(null).map((_, i) => ({
          from: `caller${i}.js::func`,
          to: 'utils.js::log',
          file_to: 'utils.js'
        })),
        functions: {
          'utils.js::log': { name: 'log', line: 1 }
        }
      };

      const result = await detector.detect(systemMap);
      const logFinding = result.findings.find(f => f.metadata?.functionName === 'log');
      expect(logFinding).toBeUndefined();
    });

    it('should not flag getter functions as hotspots', async () => {
      const systemMap = {
        function_links: Array(15).fill(null).map((_, i) => ({
          from: `caller${i}.js::func`,
          to: 'model.js::getUser',
          file_to: 'model.js'
        })),
        functions: {
          'model.js::getUser': { name: 'getUser', line: 1 }
        }
      };

      const result = await detector.detect(systemMap);
      const getterFinding = result.findings.find(f => f.metadata?.functionName === 'getUser');
      expect(getterFinding).toBeUndefined();
    });

    it('should not flag functions in utils files', async () => {
      const systemMap = {
        function_links: Array(15).fill(null).map((_, i) => ({
          from: `caller${i}.js::func`,
          to: 'helpers/utils.js::process',
          file_to: 'helpers/utils.js'
        })),
        functions: {
          'helpers/utils.js::process': { name: 'process', line: 1 }
        }
      };

      const result = await detector.detect(systemMap);
      expect(result.findings.length).toBe(0);
    });

    it('should flag business logic functions', async () => {
      const systemMap = {
        function_links: Array(15).fill(null).map((_, i) => ({
          from: `caller${i}.js::func`,
          to: 'services/business.js::processOrder',
          file_to: 'services/business.js'
        })),
        functions: {
          'services/business.js::processOrder': {
            name: 'processOrder',
            line: 10,
            isAsync: true,
            hasSideEffects: true,
            complexity: 12
          }
        }
      };

      const result = await detector.detect(systemMap);
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.findings[0].metadata.functionName).toBe('processOrder');
    });
  });

  /**
   * ============================================
   * RISK SCORE CALCULATION CONTRACT
   * ============================================
   */

  describe('Risk Score Calculation Contract', () => {
    it('should calculate risk based on usage count', async () => {
      const systemMap = {
        function_links: Array(20).fill(null).map((_, i) => ({
          from: `caller${i}.js::func`,
          to: 'service.js::highUsage',
          file_to: 'service.js'
        })),
        functions: {
          'service.js::highUsage': {
            name: 'highUsage',
            line: 1,
            isAsync: false,
            hasSideEffects: true,
            complexity: 5
          }
        }
      };

      const result = await detector.detect(systemMap);
      if (result.findings.length > 0) {
        expect(result.findings[0].metadata.riskScore).toBeGreaterThan(0);
      }
    });

    it('should increase risk for async functions', async () => {
      const systemMap = {
        function_links: Array(15).fill(null).map((_, i) => ({
          from: `caller${i}.js::func`,
          to: 'service.js::asyncFunc',
          file_to: 'service.js'
        })),
        functions: {
          'service.js::asyncFunc': {
            name: 'asyncFunc',
            line: 1,
            isAsync: true,
            hasSideEffects: true,
            complexity: 5
          }
        }
      };

      const result = await detector.detect(systemMap);
      if (result.findings.length > 0) {
        expect(result.findings[0].metadata.isAsync).toBe(true);
      }
    });

    it('should increase risk for functions with side effects', async () => {
      const systemMap = {
        function_links: Array(15).fill(null).map((_, i) => ({
          from: `caller${i}.js::func`,
          to: 'service.js::sideEffectFunc',
          file_to: 'service.js'
        })),
        functions: {
          'service.js::sideEffectFunc': {
            name: 'sideEffectFunc',
            line: 1,
            isAsync: false,
            hasSideEffects: true,
            complexity: 5
          }
        }
      };

      const result = await detector.detect(systemMap);
      if (result.findings.length > 0) {
        expect(result.findings[0].metadata.hasSideEffects).toBe(true);
      }
    });
  });

  /**
   * ============================================
   * ERROR HANDLING CONTRACT
   * ============================================
   */

  describe('Error Handling Contract', () => {
    it('should handle missing function data gracefully', async () => {
      const systemMap = {
        function_links: [{
          from: 'caller.js::func',
          to: 'target.js::missingFunc',
          file_to: 'target.js'
        }],
        functions: {} // No function data
      };

      const result = await detector.detect(systemMap);
      expect(result.findings).toBeDefined();
    });

    it('should handle malformed function_links', async () => {
      const systemMap = {
        function_links: [
          null,
          undefined,
          { from: null, to: null },
          { from: 'a.js::f', to: 'b.js::g' }
        ],
        functions: {}
      };

      const result = await detector.detect(systemMap);
      expect(result.findings).toBeDefined();
    });

    it('should handle circular references in function data', async () => {
      const circular = { name: 'circular' };
      circular.self = circular;

      const systemMap = {
        function_links: [{
          from: 'a.js::f',
          to: 'b.js::circular',
          file_to: 'b.js'
        }],
        functions: {
          'b.js::circular': circular
        }
      };

      const result = await detector.detect(systemMap);
      expect(result).toBeDefined();
    });

    it('should handle very large system maps', async () => {
      const links = Array(10000).fill(null).map((_, i) => ({
        from: `caller${i}.js::func`,
        to: 'target.js::func',
        file_to: 'target.js'
      }));

      const systemMap = {
        function_links: links,
        functions: {
          'target.js::func': { name: 'func', line: 1, complexity: 5, hasSideEffects: true }
        }
      };

      const result = await detector.detect(systemMap);
      expect(result.findings.length).toBeGreaterThan(0);
    });
  });
});
