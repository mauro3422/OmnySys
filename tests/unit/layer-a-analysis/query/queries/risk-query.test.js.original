/**
 * @fileoverview Risk Query Tests
 * 
 * Tests for risk assessment query implementations.
 * 
 * @module tests/unit/layer-a-analysis/query/queries/risk-query
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getRiskAssessment
} from '#layer-a/query/queries/risk-query.js';

describe('Risk Query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('Structure Contract', () => {
    it('should export getRiskAssessment function', () => {
      expect(typeof getRiskAssessment).toBe('function');
    });

    it('should accept rootPath parameter', () => {
      expect(getRiskAssessment.length).toBe(1);
    });

    it('should return Promise', async () => {
      vi.doMock('#layer-a/query/readers/json-reader.js', () => ({
        readJSON: vi.fn().mockResolvedValue({}),
        fileExists: vi.fn().mockResolvedValue(false)
      }));

      vi.doMock('#layer-a/storage/storage-manager.js', () => ({
        getDataDirectory: vi.fn((path) => `${path}/.omnysysdata`)
      }));

      const { getRiskAssessment } = await import('#layer-a/query/queries/risk-query.js');
      const result = getRiskAssessment('/test/project');
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('getRiskAssessment', () => {
    it('should read from risks directory', async () => {
      vi.doMock('#layer-a/query/readers/json-reader.js', () => ({
        readJSON: vi.fn().mockResolvedValue({
          report: { summary: {}, criticalRiskFiles: [], highRiskFiles: [], mediumRiskFiles: [] },
          scores: {}
        }),
        fileExists: vi.fn().mockResolvedValue(true)
      }));

      vi.doMock('#layer-a/storage/storage-manager.js', () => ({
        getDataDirectory: vi.fn((path) => `${path}/.omnysysdata`)
      }));

      const { getRiskAssessment } = await import('#layer-a/query/queries/risk-query.js');
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');

      await getRiskAssessment('/test/project');
      
      expect(readJSON).toHaveBeenCalledWith(
        expect.stringContaining('assessment.json')
      );
    });

    it('should return complete assessment structure', async () => {
      vi.doMock('#layer-a/query/readers/json-reader.js', () => ({
        readJSON: vi.fn().mockResolvedValue({
          report: {
            summary: {
              criticalCount: 1,
              highCount: 2,
              mediumCount: 3,
              lowCount: 4,
              totalFiles: 10
            },
            criticalRiskFiles: [{ file: 'a.js', reason: 'Complex' }],
            highRiskFiles: [{ file: 'b.js', reason: 'Many deps' }],
            mediumRiskFiles: [{ file: 'c.js', reason: 'Issues' }]
          },
          scores: { 'a.js': 95, 'b.js': 75 }
        }),
        fileExists: vi.fn().mockResolvedValue(true)
      }));

      vi.doMock('#layer-a/storage/storage-manager.js', () => ({
        getDataDirectory: vi.fn((path) => `${path}/.omnysysdata`)
      }));

      const { getRiskAssessment } = await import('#layer-a/query/queries/risk-query.js');
      const result = await getRiskAssessment('/test/project');
      
      expect(result.report).toBeDefined();
      expect(result.report.summary).toBeDefined();
      expect(result.scores).toBeDefined();
    });

    it('should return default structure when file missing', async () => {
      vi.doMock('#layer-a/query/readers/json-reader.js', () => ({
        readJSON: vi.fn(),
        fileExists: vi.fn().mockResolvedValue(false)
      }));

      vi.doMock('#layer-a/storage/storage-manager.js', () => ({
        getDataDirectory: vi.fn((path) => `${path}/.omnysysdata`)
      }));

      const { getRiskAssessment } = await import('#layer-a/query/queries/risk-query.js');
      const result = await getRiskAssessment('/test/project');
      
      expect(result.report.summary.criticalCount).toBe(0);
      expect(result.report.summary.highCount).toBe(0);
      expect(result.report.summary.mediumCount).toBe(0);
      expect(result.report.summary.lowCount).toBe(0);
      expect(result.report.summary.totalFiles).toBe(0);
      expect(result.report.criticalRiskFiles).toEqual([]);
      expect(result.report.highRiskFiles).toEqual([]);
      expect(result.report.mediumRiskFiles).toEqual([]);
      expect(result.scores).toEqual({});
    });

    it('should preserve risk file details', async () => {
      vi.doMock('#layer-a/query/readers/json-reader.js', () => ({
        readJSON: vi.fn().mockResolvedValue({
          report: {
            summary: { criticalCount: 1, highCount: 0, mediumCount: 0, lowCount: 0, totalFiles: 1 },
            criticalRiskFiles: [{
              file: 'src/complex.js',
              severity: 'CRITICAL',
              reason: 'Very high complexity',
              score: 95
            }],
            highRiskFiles: [],
            mediumRiskFiles: []
          },
          scores: {}
        }),
        fileExists: vi.fn().mockResolvedValue(true)
      }));

      vi.doMock('#layer-a/storage/storage-manager.js', () => ({
        getDataDirectory: vi.fn((path) => `${path}/.omnysysdata`)
      }));

      const { getRiskAssessment } = await import('#layer-a/query/queries/risk-query.js');
      const result = await getRiskAssessment('/test/project');
      
      const riskFile = result.report.criticalRiskFiles[0];
      expect(riskFile.file).toBe('src/complex.js');
      expect(riskFile.severity).toBe('CRITICAL');
      expect(riskFile.reason).toBe('Very high complexity');
    });
  });

  describe('Default Values', () => {
    it('should provide default summary counts', async () => {
      vi.doMock('#layer-a/query/readers/json-reader.js', () => ({
        readJSON: vi.fn().mockResolvedValue({
          report: {},
          scores: {}
        }),
        fileExists: vi.fn().mockResolvedValue(true)
      }));

      vi.doMock('#layer-a/storage/storage-manager.js', () => ({
        getDataDirectory: vi.fn((path) => `${path}/.omnysysdata`)
      }));

      const { getRiskAssessment } = await import('#layer-a/query/queries/risk-query.js');
      const result = await getRiskAssessment('/test/project');
      
      // Check defaults are provided
      expect(result.report.summary.criticalCount).toBeDefined();
      expect(result.report.summary.highCount).toBeDefined();
      expect(result.report.summary.mediumCount).toBeDefined();
      expect(result.report.summary.lowCount).toBeDefined();
      expect(result.report.summary.totalFiles).toBeDefined();
    });

    it('should provide default arrays for risk files', async () => {
      vi.doMock('#layer-a/query/readers/json-reader.js', () => ({
        readJSON: vi.fn().mockResolvedValue({
          report: { summary: {} },
          scores: {}
        }),
        fileExists: vi.fn().mockResolvedValue(true)
      }));

      vi.doMock('#layer-a/storage/storage-manager.js', () => ({
        getDataDirectory: vi.fn((path) => `${path}/.omnysysdata`)
      }));

      const { getRiskAssessment } = await import('#layer-a/query/queries/risk-query.js');
      const result = await getRiskAssessment('/test/project');
      
      expect(Array.isArray(result.report.criticalRiskFiles)).toBe(true);
      expect(Array.isArray(result.report.highRiskFiles)).toBe(true);
      expect(Array.isArray(result.report.mediumRiskFiles)).toBe(true);
    });
  });

  describe('Error Handling Contract', () => {
    it('should propagate read errors', async () => {
      vi.doMock('#layer-a/query/readers/json-reader.js', () => ({
        readJSON: vi.fn().mockRejectedValue(new Error('Read failed')),
        fileExists: vi.fn().mockResolvedValue(true)
      }));

      vi.doMock('#layer-a/storage/storage-manager.js', () => ({
        getDataDirectory: vi.fn((path) => `${path}/.omnysysdata`)
      }));

      const { getRiskAssessment } = await import('#layer-a/query/queries/risk-query.js');
      
      await expect(getRiskAssessment('/test/project')).rejects.toThrow('Read failed');
    });
  });
});
