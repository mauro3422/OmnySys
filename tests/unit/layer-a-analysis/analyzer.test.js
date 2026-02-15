/**
 * @fileoverview Tests for analyzer.js - Root Orchestrator
 * 
 * Tests the generateAnalysisReport function which orchestrates
 * all analyses using the Pattern Detection Engine V2.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

describe('analyzer.js', () => {
  describe('generateAnalysisReport', () => {
    it('should return a valid analysis report structure', async () => {
      const { systemMap } = InfrastructureScenarios.simpleProject();
      
      const report = await generateAnalysisReport(systemMap);
      
      expect(report).toBeDefined();
      expect(report).toHaveProperty('metadata');
      expect(report).toHaveProperty('patternDetection');
      expect(report).toHaveProperty('qualityMetrics');
      expect(report).toHaveProperty('recommendations');
    });

    it('should include metadata from systemMap', async () => {
      const { systemMap } = InfrastructureScenarios.simpleProject();
      
      const report = await generateAnalysisReport(systemMap);
      
      expect(report.metadata).toEqual(systemMap.metadata);
    });

    it('should include pattern detection results', async () => {
      const { systemMap } = InfrastructureScenarios.simpleProject();
      
      const report = await generateAnalysisReport(systemMap);
      
      expect(report.patternDetection).toBeDefined();
    });

    it('should handle empty systemMap gracefully', async () => {
      const systemMap = SystemMapBuilder.create().build();
      
      const report = await generateAnalysisReport(systemMap);
      
      expect(report).toBeDefined();
      expect(report.metadata).toEqual(systemMap.metadata);
    });

    it('should handle systemMap with cycles', async () => {
      const { systemMap } = InfrastructureScenarios.projectWithCycles();
      
      const report = await generateAnalysisReport(systemMap);
      
      expect(report).toBeDefined();
      expect(report.metadata.cyclesDetected).toHaveLength(1);
    });

    it('should pass projectType option to PatternDetectionEngine', async () => {
      const { PatternDetectionEngine } = await import('../../../src/layer-a-static/pattern-detection/index.js');
      const { systemMap } = InfrastructureScenarios.simpleProject();
      
      await generateAnalysisReport(systemMap);
      
      expect(PatternDetectionEngine).toHaveBeenCalledWith({
        projectType: 'standard'
      });
    });
  });

  describe('Analysis Report Structure Contract', () => {
    it('should have metadata field', async () => {
      const { systemMap } = InfrastructureScenarios.simpleProject();
      const report = await generateAnalysisReport(systemMap);
      
      expect(report).toHaveProperty('metadata');
      expect(typeof report.metadata).toBe('object');
    });

    it('should have patternDetection field', async () => {
      const { systemMap } = InfrastructureScenarios.simpleProject();
      const report = await generateAnalysisReport(systemMap);
      
      expect(report).toHaveProperty('patternDetection');
      expect(typeof report.patternDetection).toBe('object');
    });

    it('should have qualityMetrics field', async () => {
      const { systemMap } = InfrastructureScenarios.simpleProject();
      const report = await generateAnalysisReport(systemMap);
      
      expect(report).toHaveProperty('qualityMetrics');
      expect(typeof report.qualityMetrics).toBe('object');
    });

    it('should have recommendations field as array', async () => {
      const { systemMap } = InfrastructureScenarios.simpleProject();
      const report = await generateAnalysisReport(systemMap);
      
      expect(report).toHaveProperty('recommendations');
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle null systemMap', async () => {
      const { PatternDetectionEngine } = await import('../../../src/layer-a-static/pattern-detection/index.js');
      PatternDetectionEngine.mockImplementation(() => ({
        analyze: vi.fn().mockRejectedValue(new Error('Invalid systemMap'))
      }));
      
      await expect(generateAnalysisReport(null)).rejects.toThrow();
    });

    it('should handle systemMap without metadata', async () => {
      const systemMap = { files: {}, functions: {} };
      
      const report = await generateAnalysisReport(systemMap);
      
      expect(report).toBeDefined();
      expect(report.metadata).toBeUndefined();
    });
  });
});
