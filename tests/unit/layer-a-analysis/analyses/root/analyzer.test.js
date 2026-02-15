/**
 * @fileoverview analyzer.test.js - ROOT INFRASTRUCTURE TEST
 * 
 * Tests for analyzer.js - MAIN ORCHESTRATOR
 * ⭐ CRITICAL - Entry point for all analysis generation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateAnalysisReport } from '#layer-a/analyzer.js';
import {
  SystemMapBuilder,
  assertValidAnalysisReport
} from '../../../../../tests/factories/root-infrastructure-test.factory.js';

// Mock Pattern Detection Engine
vi.mock('#layer-a/pattern-detection/index.js', () => ({
  PatternDetectionEngine: vi.fn().mockImplementation(() => ({
    analyze: vi.fn().mockResolvedValue({
      patterns: {
        hotspots: { total: 0, functions: [] },
        unusedExports: { totalUnused: 0 },
        orphanFiles: { total: 0 },
        circularDeps: { total: 0 }
      },
      qualityScore: {
        score: 85,
        grade: 'B',
        recommendations: ['Test recommendation']
      }
    })
  }))
}));

describe('ROOT INFRASTRUCTURE: analyzer.js', () => {
  describe('Structure Contract', () => {
    it('MUST export generateAnalysisReport function', () => {
      expect(generateAnalysisReport).toBeDefined();
      expect(typeof generateAnalysisReport).toBe('function');
    });

    it('MUST return a valid analysis report structure', async () => {
      const systemMap = SystemMapBuilder.create()
        .withFile('src/index.js')
        .build();

      const report = await generateAnalysisReport(systemMap);
      assertValidAnalysisReport(report);
    });

    it('MUST include metadata in report', async () => {
      const systemMap = SystemMapBuilder.create()
        .withFile('src/index.js')
        .withEntryPoint('src/index.js')
        .build();

      const report = await generateAnalysisReport(systemMap);
      expect(report.metadata).toBeDefined();
    });

    it('MUST include patternDetection in report', async () => {
      const systemMap = SystemMapBuilder.create().build();
      const report = await generateAnalysisReport(systemMap);
      expect(report.patternDetection).toBeDefined();
    });

    it('MUST include qualityMetrics in report', async () => {
      const systemMap = SystemMapBuilder.create().build();
      const report = await generateAnalysisReport(systemMap);
      expect(report.qualityMetrics).toBeDefined();
    });

    it('MUST include recommendations in report', async () => {
      const systemMap = SystemMapBuilder.create().build();
      const report = await generateAnalysisReport(systemMap);
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe('Error Handling Contract', () => {
    it('MUST handle null systemMap gracefully', async () => {
      // Should not throw, pattern detection engine handles this
      await expect(generateAnalysisReport(null)).resolves.not.toThrow();
    });

    it('MUST handle undefined systemMap gracefully', async () => {
      await expect(generateAnalysisReport(undefined)).resolves.not.toThrow();
    });

    it('MUST handle empty systemMap gracefully', async () => {
      const emptyMap = SystemMapBuilder.create().build();
      await expect(generateAnalysisReport(emptyMap)).resolves.not.toThrow();
    });

    it('MUST handle systemMap without metadata', async () => {
      const systemMap = { files: {}, functions: {} };
      await expect(generateAnalysisReport(systemMap)).resolves.not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('SHOULD process systemMap with multiple files', async () => {
      const systemMap = SystemMapBuilder.create()
        .withFile('src/utils.js', { exports: [{ name: 'helper' }] })
        .withFile('src/main.js', { imports: [{ source: './utils' }] })
        .withFunction('src/utils.js', 'helper', { isExported: true })
        .withFunction('src/main.js', 'main', { isExported: true })
        .build();

      const report = await generateAnalysisReport(systemMap);
      expect(report).toBeDefined();
      expect(report.metadata).toBeDefined();
    });

    it('SHOULD process systemMap with function links', async () => {
      const systemMap = SystemMapBuilder.create()
        .withFile('src/a.js')
        .withFile('src/b.js')
        .withFunction('src/a.js', 'funcA', { isExported: true })
        .withFunction('src/b.js', 'funcB', { isExported: true })
        .withFunctionLink('src/a.js:funcA', 'src/b.js:funcB')
        .build();

      const report = await generateAnalysisReport(systemMap);
      expect(report).toBeDefined();
    });

    it('SHOULD process systemMap with circular dependencies', async () => {
      const systemMap = SystemMapBuilder.create()
        .withFile('src/a.js')
        .withFile('src/b.js')
        .withFunction('src/a.js', 'funcA', { isExported: true })
        .withFunction('src/b.js', 'funcB', { isExported: true })
        .withFunctionLink('src/a.js:funcA', 'src/b.js:funcB')
        .withFunctionLink('src/b.js:funcB', 'src/a.js:funcA')
        .withCycle(['src/a.js', 'src/b.js'])
        .build();

      const report = await generateAnalysisReport(systemMap);
      expect(report).toBeDefined();
    });
  });

  describe('Pattern Detection Engine Integration', () => {
    it('SHOULD call PatternDetectionEngine with systemMap', async () => {
      const { PatternDetectionEngine } = await import('#layer-a/pattern-detection/index.js');
      const systemMap = SystemMapBuilder.create().build();
      
      await generateAnalysisReport(systemMap);
      
      expect(PatternDetectionEngine).toHaveBeenCalledWith({
        projectType: 'standard'
      });
    });

    it('SHOULD await pattern detection results', async () => {
      const systemMap = SystemMapBuilder.create().build();
      const report = await generateAnalysisReport(systemMap);
      
      expect(report.patternDetection).toBeDefined();
    });
  });

  describe('Performance Considerations', () => {
    it('SHOULD complete within reasonable time for small systemMap', async () => {
      const systemMap = SystemMapBuilder.create()
        .withFile('src/index.js')
        .withFile('src/utils.js')
        .build();

      const start = Date.now();
      await generateAnalysisReport(systemMap);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(5000); // 5 seconds max
    });
  });
});
