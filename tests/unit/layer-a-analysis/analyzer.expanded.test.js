/**
 * @fileoverview Expanded Tests for analyzer.js - Root Orchestrator
 * 
 * Additional comprehensive tests for edge cases and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAnalysisReport } from '../../../src/layer-a-static/analyzer.js';
import { SystemMapBuilder, InfrastructureScenarios } from '../../factories/root-infrastructure-test.factory.js';

// Mock PatternDetectionEngine
vi.mock('../../../src/layer-a-static/pattern-detection/index.js', () => ({
  PatternDetectionEngine: vi.fn().mockImplementation(() => ({
    analyze: vi.fn().mockResolvedValue({
      patterns: {
        detected: [],
        summary: { total: 0 }
      },
      qualityScore: {
        score: 85,
        grade: 'B',
        recommendations: []
      }
    })
  }))
}));

describe('analyzer.js - Expanded Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateAnalysisReport - Edge Cases', () => {
    it('should handle systemMap with no files', async () => {
      const systemMap = SystemMapBuilder.create().build();
      
      const report = await generateAnalysisReport(systemMap);
      
      expect(report).toBeDefined();
      expect(report.patternDetection).toBeDefined();
    });

    it('should handle systemMap with many files', async () => {
      const builder = SystemMapBuilder.create();
      for (let i = 0; i < 100; i++) {
        builder.withFile(`src/file${i}.js`);
      }
      const systemMap = builder.build();
      
      const report = await generateAnalysisReport(systemMap);
      
      expect(report).toBeDefined();
    });

    it('should preserve complex metadata', async () => {
      const systemMap = SystemMapBuilder.create()
        .withFile('src/index.js')
        .withEntryPoint('src/index.js')
        .withCycle(['src/a.js', 'src/b.js', 'src/c.js'])
        .build();
      
      const report = await generateAnalysisReport(systemMap);
      
      expect(report.metadata.entryPoints).toContain('src/index.js');
      expect(report.metadata.cyclesDetected).toHaveLength(1);
    });
  });

  describe('generateAnalysisReport - Report Structure', () => {
    it('should have consistent report structure across different inputs', async () => {
      const scenarios = [
        InfrastructureScenarios.emptyProject(),
        InfrastructureScenarios.simpleProject(),
        InfrastructureScenarios.projectWithCycles()
      ];
      
      for (const scenario of scenarios) {
        const report = await generateAnalysisReport(scenario.systemMap);
        
        expect(report).toHaveProperty('metadata');
        expect(report).toHaveProperty('patternDetection');
        expect(report).toHaveProperty('qualityMetrics');
        expect(report).toHaveProperty('recommendations');
      }
    });

    it('should include pattern detection summary', async () => {
      const { PatternDetectionEngine } = await import('../../../src/layer-a-static/pattern-detection/index.js');
      PatternDetectionEngine.mockImplementation(() => ({
        analyze: vi.fn().mockResolvedValue({
          patterns: {
            detected: [{ type: 'hotspot', severity: 'HIGH' }],
            summary: { total: 1, critical: 1 }
          },
          qualityScore: { score: 70, grade: 'C', recommendations: ['Fix hotspots'] }
        })
      }));
      
      const { systemMap } = InfrastructureScenarios.simpleProject();
      const report = await generateAnalysisReport(systemMap);
      
      expect(report.patternDetection.detected).toHaveLength(1);
      expect(report.patternDetection.summary.total).toBe(1);
    });

    it('should pass quality score through to report', async () => {
      const { PatternDetectionEngine } = await import('../../../src/layer-a-static/pattern-detection/index.js');
      const mockQualityScore = { score: 95, grade: 'A', recommendations: [] };
      PatternDetectionEngine.mockImplementation(() => ({
        analyze: vi.fn().mockResolvedValue({
          patterns: { detected: [], summary: { total: 0 } },
          qualityScore: mockQualityScore
        })
      }));
      
      const { systemMap } = InfrastructureScenarios.simpleProject();
      const report = await generateAnalysisReport(systemMap);
      
      expect(report.qualityMetrics).toEqual(mockQualityScore);
    });
  });

  describe('generateAnalysisReport - Integration', () => {
    it('should work with projectWithFunctionCycles scenario', async () => {
      const { systemMap } = InfrastructureScenarios.projectWithFunctionCycles();
      
      const report = await generateAnalysisReport(systemMap);
      
      expect(report).toBeDefined();
    });

    it('should work with projectWithDeepChains scenario', async () => {
      const { systemMap } = InfrastructureScenarios.projectWithDeepChains();
      
      const report = await generateAnalysisReport(systemMap);
      
      expect(report).toBeDefined();
    });

    it('should work with projectWithTypeScript scenario', async () => {
      const { systemMap } = InfrastructureScenarios.projectWithTypeScript();
      
      const report = await generateAnalysisReport(systemMap);
      
      expect(report).toBeDefined();
    });
  });
});
