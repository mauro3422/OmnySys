/**
 * @fileoverview analyses-contract.test.js - ANALYSES CONTRACT TEST
 * 
 * Contract tests for ALL analysis functions to ensure consistent behavior
 * across Tier 1, Tier 2, and Tier 3 analyses.
 */

import { describe, it, expect } from 'vitest';

// Tier 1 Analyses
import * as tier1Index from '#layer-a/analyses/tier1/index.js';
import { findUnusedExports } from '#layer-a/analyses/tier1/unused-exports.js';
import { findOrphanFiles } from '#layer-a/analyses/tier1/orphan-files.js';
import { findHotspots } from '#layer-a/analyses/tier1/hotspots.js';
import { findCircularFunctionDeps } from '#layer-a/analyses/tier1/circular-function-deps.js';
import { findDeepDependencyChains } from '#layer-a/analyses/tier1/deep-chains.js';

// Tier 2 Analyses
import * as tier2Index from '#layer-a/analyses/tier2/index.js';
import { detectSideEffectMarkers } from '#layer-a/analyses/tier2/side-effects.js';
import { analyzeReachability } from '#layer-a/analyses/tier2/reachability.js';
import { analyzeCoupling } from '#layer-a/analyses/tier2/coupling.js';
import { findCircularImports } from '#layer-a/analyses/tier2/cycle-classifier.js';
import { findUnusedImports } from '#layer-a/analyses/tier2/unused-imports.js';
import { analyzeReexportChains } from '#layer-a/analyses/tier2/reexport-chains.js';

// Tier 3 Analyses
import * as tier3Index from '#layer-a/analyses/tier3/index.js';
import { analyzeConstantUsage } from '#layer-a/analyses/tier3/constant-usage.js';
import { analyzeTypeUsage } from '#layer-a/analyses/tier3/type-usage.js';
import { analyzeEnumUsage } from '#layer-a/analyses/tier3/enum-usage.js';
import { analyzeSharedObjects } from '#layer-a/analyses/tier3/object-tracking.js';

// Helpers
import { calculateQualityMetrics } from '#layer-a/analyses/metrics.js';
import { generateRecommendations } from '#layer-a/analyses/recommendations.js';

import {
  createMockSystemMap,
  ANALYSIS_TEST_CONSTANTS
} from '../../../../tests/factories/analysis.factory.js';

describe('ANALYSES CONTRACT - All Tiers', () => {
  const validSystemMap = createMockSystemMap({
    files: {
      'src/index.js': {
        path: 'src/index.js',
        imports: [{ source: './utils', specifiers: [{ imported: 'helper', type: 'named' }] }],
        exports: [{ name: 'main', type: 'named' }],
        usedBy: [],
        dependsOn: ['src/utils.js']
      },
      'src/utils.js': {
        path: 'src/utils.js',
        imports: [],
        exports: [{ name: 'helper', type: 'named' }],
        usedBy: ['src/index.js'],
        dependsOn: []
      }
    },
    functions: {
      'src/index.js': [{ id: 'src/index.js:main', name: 'main', isExported: true }],
      'src/utils.js': [{ id: 'src/utils.js:helper', name: 'helper', isExported: true }]
    },
    function_links: [
      { from: 'src/index.js:main', to: 'src/utils.js:helper' }
    ],
    metadata: {
      totalFiles: 2,
      totalFunctions: 2,
      cyclesDetected: []
    }
  });

  describe('Universal Contract - All Analysis Functions', () => {
    const allAnalyses = [
      { name: 'findUnusedExports', fn: findUnusedExports },
      { name: 'findOrphanFiles', fn: findOrphanFiles },
      { name: 'findHotspots', fn: findHotspots },
      { name: 'findCircularFunctionDeps', fn: findCircularFunctionDeps },
      { name: 'findDeepDependencyChains', fn: findDeepDependencyChains },
      { name: 'detectSideEffectMarkers', fn: detectSideEffectMarkers },
      { name: 'analyzeReachability', fn: analyzeReachability },
      { name: 'analyzeCoupling', fn: analyzeCoupling },
      { name: 'findCircularImports', fn: findCircularImports },
      { name: 'findUnusedImports', fn: findUnusedImports },
      { name: 'analyzeReexportChains', fn: analyzeReexportChains },
      { name: 'analyzeConstantUsage', fn: analyzeConstantUsage },
      { name: 'analyzeTypeUsage', fn: analyzeTypeUsage },
      { name: 'analyzeEnumUsage', fn: analyzeEnumUsage },
      { name: 'analyzeSharedObjects', fn: analyzeSharedObjects }
    ];

    for (const { name, fn } of allAnalyses) {
      describe(`${name}`, () => {
        it('MUST be exported and be a function', () => {
          expect(fn).toBeDefined();
          expect(typeof fn).toBe('function');
        });

        it('MUST return an object', async () => {
          const result = await fn(validSystemMap);
          expect(result).toBeTypeOf('object');
        });

        it('MUST NOT throw on valid systemMap', async () => {
          await expect(fn(validSystemMap)).resolves.not.toThrow();
        });

        it('MUST handle null/undefined input gracefully', async () => {
          await expect(fn(null)).resolves.not.toThrow();
          await expect(fn(undefined)).resolves.not.toThrow();
        });

        it('MUST handle empty systemMap gracefully', async () => {
          const emptyMap = createMockSystemMap();
          await expect(fn(emptyMap)).resolves.not.toThrow();
        });
      });
    }
  });

  describe('Tier 1 Barrel Export Contract', () => {
    it('MUST export all Tier 1 functions', () => {
      expect(tier1Index.findUnusedExports).toBeDefined();
      expect(tier1Index.findOrphanFiles).toBeDefined();
      expect(tier1Index.findHotspots).toBeDefined();
      expect(tier1Index.findCircularFunctionDeps).toBeDefined();
      expect(tier1Index.classifyFunctionCycle).toBeDefined();
      expect(tier1Index.classifyAllFunctionCycles).toBeDefined();
      expect(tier1Index.findDeepDependencyChains).toBeDefined();
    });
  });

  describe('Tier 2 Barrel Export Contract', () => {
    it('MUST export all Tier 2 functions', () => {
      expect(tier2Index.detectSideEffectMarkers).toBeDefined();
      expect(tier2Index.analyzeReachability).toBeDefined();
      expect(tier2Index.analyzeCoupling).toBeDefined();
      expect(tier2Index.findUnresolvedImports).toBeDefined();
      expect(tier2Index.findCircularImports).toBeDefined();
      expect(tier2Index.classifyCycle).toBeDefined();
      expect(tier2Index.CYCLE_RULES).toBeDefined();
      expect(tier2Index.findUnusedImports).toBeDefined();
      expect(tier2Index.analyzeReexportChains).toBeDefined();
    });
  });

  describe('Tier 3 Barrel Export Contract', () => {
    it('MUST export all Tier 3 functions and classes', () => {
      expect(tier3Index.RiskScorer).toBeDefined();
      expect(typeof tier3Index.calculateRiskScore).toBe('function');
      expect(typeof tier3Index.calculateScoreSeverity).toBe('function');
      expect(typeof tier3Index.calculateAllRiskScores).toBe('function');
      expect(typeof tier3Index.identifyHighRiskFiles).toBe('function');
      expect(typeof tier3Index.generateRiskReport).toBe('function');
    });
  });

  describe('Analysis Result Structure Contract', () => {
    it('detection analyses MUST have total/count field', async () => {
      const hotspots = findHotspots(validSystemMap);
      expect(hotspots).toHaveProperty('total');
      
      const orphans = findOrphanFiles(validSystemMap);
      expect(orphans).toHaveProperty('total');
      
      const unused = findUnusedExports(validSystemMap);
      expect(unused).toHaveProperty('totalUnused');
    });

    it('analyses MUST have recommendation field', async () => {
      const hotspots = findHotspots(validSystemMap);
      expect(hotspots).toHaveProperty('recommendation');
      
      const orphans = findOrphanFiles(validSystemMap);
      expect(orphans).toHaveProperty('recommendation');
      
      const chains = findDeepDependencyChains(validSystemMap);
      expect(chains).toHaveProperty('recommendation');
    });
  });

  describe('Metrics and Recommendations Contract', () => {
    it('calculateQualityMetrics MUST be a function', () => {
      expect(calculateQualityMetrics).toBeDefined();
      expect(typeof calculateQualityMetrics).toBe('function');
    });

    it('calculateQualityMetrics MUST return quality metrics', () => {
      const mockAnalyses = {
        unusedExports: { totalUnused: 0 },
        orphanFiles: { deadCodeCount: 0 },
        hotspots: { criticalCount: 0 },
        circularFunctionDeps: { problematicCount: 0 },
        deepDependencyChains: { totalDeepChains: 0 },
        couplingAnalysis: { concern: 'LOW', total: 0 },
        unresolvedImports: { total: 0 },
        circularImports: { problematicCount: 0 },
        unusedImports: { total: 0 },
        reexportChains: { total: 0 }
      };

      const metrics = calculateQualityMetrics(mockAnalyses);
      expect(metrics).toHaveProperty('score');
      expect(metrics).toHaveProperty('grade');
      expect(metrics).toHaveProperty('totalIssues');
      expect(metrics).toHaveProperty('breakdown');
    });

    it('generateRecommendations MUST be a function', () => {
      expect(generateRecommendations).toBeDefined();
      expect(typeof generateRecommendations).toBe('function');
    });

    it('generateRecommendations MUST return recommendations', () => {
      const mockAnalyses = {
        unusedExports: { totalUnused: 0 },
        orphanFiles: { deadCodeCount: 0 },
        hotspots: { criticalCount: 0 },
        circularFunctionDeps: { total: 0 },
        deepDependencyChains: { totalDeepChains: 0 },
        couplingAnalysis: { concern: 'LOW' },
        reachabilityAnalysis: { reachablePercent: '100.0' },
        unresolvedImports: { total: 0 },
        circularImports: { problematicCount: 0, validCount: 0 },
        unusedImports: { total: 0 },
        reexportChains: { total: 0 }
      };

      const recs = generateRecommendations(mockAnalyses);
      expect(recs).toHaveProperty('total');
      expect(recs).toHaveProperty('byPriority');
      expect(recs).toHaveProperty('recommendations');
      expect(Array.isArray(recs.recommendations)).toBe(true);
    });
  });

  describe('Severity Level Constants Contract', () => {
    it('MUST define all severity levels', () => {
      expect(ANALYSIS_TEST_CONSTANTS.SEVERITY_LEVELS).toContain('CRITICAL');
      expect(ANALYSIS_TEST_CONSTANTS.SEVERITY_LEVELS).toContain('HIGH');
      expect(ANALYSIS_TEST_CONSTANTS.SEVERITY_LEVELS).toContain('MEDIUM');
      expect(ANALYSIS_TEST_CONSTANTS.SEVERITY_LEVELS).toContain('LOW');
      expect(ANALYSIS_TEST_CONSTANTS.SEVERITY_LEVELS).toContain('INFO');
    });

    it('MUST define cycle categories', () => {
      expect(ANALYSIS_TEST_CONSTANTS.CYCLE_CATEGORIES).toContain('VALID_PATTERN');
      expect(ANALYSIS_TEST_CONSTANTS.CYCLE_CATEGORIES).toContain('CRITICAL_ISSUE');
      expect(ANALYSIS_TEST_CONSTANTS.CYCLE_CATEGORIES).toContain('REQUIRES_REVIEW');
      expect(ANALYSIS_TEST_CONSTANTS.CYCLE_CATEGORIES).toContain('COUPLING_ISSUE');
    });

    it('MUST define orphan types', () => {
      expect(ANALYSIS_TEST_CONSTANTS.ORPHAN_TYPES).toContain('ENTRY_POINT');
      expect(ANALYSIS_TEST_CONSTANTS.ORPHAN_TYPES).toContain('DEAD_CODE');
    });
  });
});
