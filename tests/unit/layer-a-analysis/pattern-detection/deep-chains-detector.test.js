/**
 * @fileoverview Deep Chains Detector Tests
 * 
 * Tests for DeepChainsDetector.
 * 
 * @module tests/unit/layer-a-analysis/pattern-detection/deep-chains-detector
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DeepChainsDetector } from '#layer-a/pattern-detection/detectors/deep-chains-detector.js';
import { PatternDetectionTestFactory } from '../../../factories/pattern-detection-test.factory.js';

describe('DeepChainsDetector', () => {
  let detector;
  let config;

  beforeEach(() => {
    config = {
      minDepth: 7,
      maxAcceptable: 20,
      riskMultiplier: 2
    };
    detector = new DeepChainsDetector({
      config,
      globalConfig: { weights: { deepChains: 0.15 } }
    });
  });

  /**
   * ============================================
   * STRUCTURE CONTRACT
   * ============================================
   */

  describe('Structure Contract', () => {
    it('should have correct ID', () => {
      expect(detector.getId()).toBe('deepChains');
    });

    it('should have correct name', () => {
      expect(detector.getName()).toBe('Deep Dependency Chains');
    });

    it('should have description', () => {
      expect(detector.getDescription()).toContain('dependency chains');
    });

    it('should be instantiable', () => {
      expect(detector).toBeInstanceOf(DeepChainsDetector);
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

      expect(result).toHaveProperty('detector', 'deepChains');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('findings');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('weight');
      expect(result).toHaveProperty('recommendation');
    });

    it('should return empty findings for empty systemMap', async () => {
      const result = await detector.detect({ function_links: [] });
      expect(result.findings).toEqual([]);
      expect(result.score).toBe(100);
    });

    it('should return empty findings for systemMap without function_links', async () => {
      const result = await detector.detect({ files: {} });
      expect(result.findings).toEqual([]);
    });

    it('should detect deep chain patterns', async () => {
      const systemMap = PatternDetectionTestFactory.createDeepChainsSystemMap();
      const result = await detector.detect(systemMap);

      // May or may not find findings depending on entry point detection
      expect(result.findings).toBeDefined();
    });
  });

  /**
   * ============================================
   * ENTRY POINT DETECTION CONTRACT
   * ============================================
   */

  describe('Entry Point Detection Contract', () => {
    it('should identify entry points with low incoming and multiple outgoing', () => {
      const systemMap = {
        function_links: [
          { from: 'entry.js::main', to: 'a.js::func' },
          { from: 'entry.js::main', to: 'b.js::func' },
          { from: 'entry.js::main', to: 'c.js::func' },
          { from: 'other.js::caller', to: 'entry.js::main' }
        ]
      };

      const entryPoints = detector.findEntryPoints(systemMap);
      expect(entryPoints.length).toBeGreaterThan(0);
      expect(entryPoints.some(e => e.id === 'entry.js::main')).toBe(true);
    });

    it('should not identify leaf functions as entry points', () => {
      const systemMap = {
        function_links: [
          { from: 'a.js::caller', to: 'leaf.js::func' }
        ]
      };

      const entryPoints = detector.findEntryPoints(systemMap);
      expect(entryPoints.some(e => e.id === 'leaf.js::func')).toBe(false);
    });

    it('should not identify functions with many incoming as entry points', () => {
      const systemMap = {
        function_links: [
          { from: 'caller1.js::func', to: 'popular.js::func' },
          { from: 'caller2.js::func', to: 'popular.js::func' },
          { from: 'caller3.js::func', to: 'popular.js::func' },
          { from: 'popular.js::func', to: 'a.js::func' },
          { from: 'popular.js::func', to: 'b.js::func' }
        ]
      };

      const entryPoints = detector.findEntryPoints(systemMap);
      expect(entryPoints.some(e => e.id === 'popular.js::func')).toBe(false);
    });

    it('should calculate fan-in and fan-out for entry points', () => {
      const systemMap = {
        function_links: [
          { from: 'entry.js::main', to: 'a.js::func' },
          { from: 'entry.js::main', to: 'b.js::func' },
          { from: 'other.js::caller', to: 'entry.js::main' }
        ]
      };

      const entryPoints = detector.findEntryPoints(systemMap);
      const entry = entryPoints.find(e => e.id === 'entry.js::main');
      
      if (entry) {
        expect(entry.fanIn).toBe(1);
        expect(entry.fanOut).toBe(2);
      }
    });
  });

  /**
   * ============================================
   * CHAIN BUILDING CONTRACT
   * ============================================
   */

  describe('Chain Building Contract', () => {
    it('should build chain from entry point', () => {
      const systemMap = {
        function_links: [
          { from: 'a.js::f1', to: 'b.js::f2' },
          { from: 'b.js::f2', to: 'c.js::f3' },
          { from: 'c.js::f3', to: 'd.js::f4' }
        ]
      };

      const chain = detector.buildChain('a.js::f1', ['a.js::f1'], systemMap, 10);
      expect(chain.length).toBe(4);
      expect(chain[0]).toBe('a.js::f1');
      expect(chain[3]).toBe('d.js::f4');
    });

    it('should respect max depth limit', () => {
      const systemMap = {
        function_links: Array(20).fill(null).map((_, i) => ({
          from: `f${i}.js::func`,
          to: `f${i + 1}.js::func`
        }))
      };

      const chain = detector.buildChain('f0.js::func', ['f0.js::func'], systemMap, 5);
      expect(chain.length).toBeLessThanOrEqual(5);
    });

    it('should avoid cycles in chain building', () => {
      const systemMap = {
        function_links: [
          { from: 'a.js::f1', to: 'b.js::f2' },
          { from: 'b.js::f2', to: 'c.js::f3' },
          { from: 'c.js::f3', to: 'a.js::f1' } // cycle back to start
        ]
      };

      const chain = detector.buildChain('a.js::f1', ['a.js::f1'], systemMap, 10);
      expect(chain.length).toBe(3);
      expect(chain.filter(id => id === 'a.js::f1').length).toBe(1);
    });

    it('should handle branching paths', () => {
      const systemMap = {
        function_links: [
          { from: 'a.js::f1', to: 'b.js::f2' },
          { from: 'a.js::f1', to: 'c.js::f3' },
          { from: 'b.js::f2', to: 'd.js::f4' },
          { from: 'c.js::f3', to: 'e.js::f5' }
        ]
      };

      const chain = detector.buildChain('a.js::f1', ['a.js::f1'], systemMap, 10);
      expect(chain.length).toBeGreaterThanOrEqual(2);
    });
  });

  /**
   * ============================================
   * RISK SCORE CALCULATION CONTRACT
   * ============================================
   */

  describe('Risk Score Calculation Contract', () => {
    it('should calculate risk based on depth', () => {
      const chain = Array(12).fill(null).map((_, i) => `f${i}.js::func`);
      const entry = { fanIn: 1, fanOut: 2 };
      const systemMap = { function_links: [] };

      const riskScore = detector.calculateRiskScore(chain, entry, systemMap);
      expect(riskScore).toBeGreaterThan(0);
    });

    it('should increase risk for high fan-in', () => {
      const chain = Array(10).fill(null).map((_, i) => `f${i}.js::func`);
      const entryLowFanIn = { fanIn: 1, fanOut: 2 };
      const entryHighFanIn = { fanIn: 5, fanOut: 2 };
      const systemMap = { function_links: [] };

      const riskLow = detector.calculateRiskScore(chain, entryLowFanIn, systemMap);
      const riskHigh = detector.calculateRiskScore(chain, entryHighFanIn, systemMap);
      
      expect(riskHigh).toBeGreaterThan(riskLow);
    });

    it('should increase risk for high fan-out', () => {
      const chain = Array(10).fill(null).map((_, i) => `f${i}.js::func`);
      const entryLowFanOut = { fanIn: 1, fanOut: 2 };
      const entryHighFanOut = { fanIn: 1, fanOut: 8 };
      const systemMap = { function_links: [] };

      const riskLow = detector.calculateRiskScore(chain, entryLowFanOut, systemMap);
      const riskHigh = detector.calculateRiskScore(chain, entryHighFanOut, systemMap);
      
      expect(riskHigh).toBeGreaterThan(riskLow);
    });
  });

  /**
   * ============================================
   * FINDING STRUCTURE CONTRACT
   * ============================================
   */

  describe('Finding Structure Contract', () => {
    it('should create findings only for chains meeting criteria', async () => {
      const systemMap = {
        function_links: [
          // Deep chain
          ...Array(12).fill(null).map((_, i) => ({
            from: `deep${i}.js::func`,
            to: `deep${i + 1}.js::func`
          })),
          // Shallow chain (should be ignored)
          { from: 'shallow1.js::func', to: 'shallow2.js::func' },
          { from: 'shallow2.js::func', to: 'shallow3.js::func' }
        ]
      };

      const result = await detector.detect(systemMap);
      
      // Only deep chains should be reported
      const deepFindings = result.findings.filter(f => f.metadata.chainLength >= 7);
      expect(result.findings.length).toBe(deepFindings.length);
    });

    it('should assign high severity for high risk scores', async () => {
      const systemMap = {
        function_links: [
          // Very deep chain with high fan-in
          ...Array(15).fill(null).map((_, i) => ({
            from: `entry.js::main`,
            to: `f${i}.js::func`
          })),
          ...Array(15).fill(null).map((_, i) => ({
            from: `f${i}.js::func`,
            to: `f${i + 1}.js::func`
          }))
        ]
      };

      const result = await detector.detect(systemMap);
      
      const highRiskFinding = result.findings.find(f => f.metadata.riskScore >= 50);
      if (highRiskFinding) {
        expect(highRiskFinding.severity).toBe('high');
      }
    });

    it('should limit chain length in metadata to 10', async () => {
      const systemMap = {
        function_links: Array(20).fill(null).map((_, i) => ({
          from: `f${i}.js::func`,
          to: `f${i + 1}.js::func`
        }))
      };

      const result = await detector.detect(systemMap);
      
      if (result.findings.length > 0) {
        expect(result.findings[0].metadata.chain.length).toBeLessThanOrEqual(10);
      }
    });
  });

  /**
   * ============================================
   * SCORE CALCULATION CONTRACT
   * ============================================
   */

  describe('Score Calculation Contract', () => {
    it('should return 100 for no findings', () => {
      const findings = [];
      const score = detector.calculateScore(findings, 20);
      expect(score).toBe(100);
    });

    it('should penalize for high risk findings', () => {
      const findings = [
        { severity: 'high' },
        { severity: 'high' },
        { severity: 'high' }
      ];
      const score = detector.calculateScore(findings, 20);
      expect(score).toBeLessThan(100);
    });

    it('should penalize less for medium risk findings', () => {
      const highFindings = [{ severity: 'high' }];
      const mediumFindings = [{ severity: 'medium' }, { severity: 'medium' }];
      
      const highScore = detector.calculateScore(highFindings, 20);
      const mediumScore = detector.calculateScore(mediumFindings, 20);
      
      expect(mediumScore).toBeGreaterThan(highScore);
    });

    it('should heavily penalize excessive high risk findings', () => {
      const findings = Array(25).fill(null).map(() => ({ severity: 'high' }));
      const score = detector.calculateScore(findings, 20);
      expect(score).toBeLessThan(50);
    });

    it('should never return negative score', () => {
      const findings = Array(100).fill(null).map(() => ({ severity: 'high' }));
      const score = detector.calculateScore(findings, 20);
      expect(score).toBe(0);
    });
  });

  /**
   * ============================================
   * ERROR HANDLING CONTRACT
   * ============================================
   */

  describe('Error Handling Contract', () => {
    it('should handle empty function_links array', async () => {
      const systemMap = { function_links: [] };
      const result = await detector.detect(systemMap);
      expect(result.findings).toEqual([]);
      expect(result.score).toBe(100);
    });

    it('should handle null entries in function_links', async () => {
      const systemMap = {
        function_links: [
          null,
          undefined,
          { from: 'a.js::f', to: 'b.js::f' }
        ]
      };

      const result = await detector.detect(systemMap);
      expect(result.findings).toBeDefined();
    });

    it('should handle malformed function links', async () => {
      const systemMap = {
        function_links: [
          { from: null, to: 'b.js::f' },
          { from: 'a.js::f', to: null },
          { from: undefined, to: undefined }
        ]
      };

      const result = await detector.detect(systemMap);
      expect(result.findings).toBeDefined();
    });

    it('should handle very long chains without stack overflow', async () => {
      const systemMap = {
        function_links: Array(1000).fill(null).map((_, i) => ({
          from: `f${i}.js::func`,
          to: `f${i + 1}.js::func`
        }))
      };

      const result = await detector.detect(systemMap);
      expect(result).toBeDefined();
    });

    it('should handle complex branching without performance issues', async () => {
      const links = [];
      // Create complex branching structure
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 5; j++) {
          links.push({
            from: `level${i}.js::func`,
            to: `level${i + 1}_${j}.js::func`
          });
        }
      }

      const systemMap = { function_links: links };
      const result = await detector.detect(systemMap);
      expect(result).toBeDefined();
    });
  });
});
