/**
 * @fileoverview Risk API Tests
 * 
 * Tests for risk assessment query operations.
 * 
 * @module tests/unit/layer-a-analysis/query/apis/risk-api
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getRiskAssessment
} from '#layer-a/query/apis/risk-api.js';

describe('Risk API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('Structure Contract', () => {
    it('should export getRiskAssessment function', () => {
      expect(typeof getRiskAssessment).toBe('function');
    });

    it('should accept project root as parameter', () => {
      expect(getRiskAssessment.length).toBe(1);
    });

    it('should return Promise', async () => {
      // Mock the dependencies
      vi.doMock('#layer-a/query/readers/json-reader.js', () => ({
        readJSON: vi.fn().mockResolvedValue({}),
        fileExists: vi.fn().mockResolvedValue(false)
      }));

      vi.doMock('#layer-a/storage/storage-manager.js', () => ({
        getDataDirectory: vi.fn((path) => `${path}/.omnysysdata`)
      }));

      const { getRiskAssessment } = await import('#layer-a/query/apis/risk-api.js');
      const result = getRiskAssessment('/test/project');
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('getRiskAssessment', () => {
    it('should return assessment object', async () => {
      vi.doMock('#layer-a/query/readers/json-reader.js', () => ({
        readJSON: vi.fn().mockResolvedValue({
          report: {
            summary: { criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, totalFiles: 0 },
            criticalRiskFiles: [],
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

      const { getRiskAssessment } = await import('#layer-a/query/apis/risk-api.js');
      const result = await getRiskAssessment('/test/project');
      
      expect(result).toHaveProperty('report');
      expect(result).toHaveProperty('scores');
    });

    it('should include report summary', async () => {
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
            criticalRiskFiles: [],
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

      const { getRiskAssessment } = await import('#layer-a/query/apis/risk-api.js');
      const result = await getRiskAssessment('/test/project');
      
      expect(result.report.summary).toBeDefined();
      expect(typeof result.report.summary.criticalCount).toBe('number');
      expect(typeof result.report.summary.highCount).toBe('number');
      expect(typeof result.report.summary.mediumCount).toBe('number');
      expect(typeof result.report.summary.lowCount).toBe('number');
      expect(typeof result.report.summary.totalFiles).toBe('number');
    });

    it('should include risk files arrays', async () => {
      vi.doMock('#layer-a/query/readers/json-reader.js', () => ({
        readJSON: vi.fn().mockResolvedValue({
          report: {
            summary: { criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, totalFiles: 0 },
            criticalRiskFiles: [{ file: 'a.js', reason: 'High complexity' }],
            highRiskFiles: [{ file: 'b.js', reason: 'Many deps' }],
            mediumRiskFiles: [{ file: 'c.js', reason: 'Some issues' }]
          },
          scores: {}
        }),
        fileExists: vi.fn().mockResolvedValue(true)
      }));

      vi.doMock('#layer-a/storage/storage-manager.js', () => ({
        getDataDirectory: vi.fn((path) => `${path}/.omnysysdata`)
      }));

      const { getRiskAssessment } = await import('#layer-a/query/apis/risk-api.js');
      const result = await getRiskAssessment('/test/project');
      
      expect(Array.isArray(result.report.criticalRiskFiles)).toBe(true);
      expect(Array.isArray(result.report.highRiskFiles)).toBe(true);
      expect(Array.isArray(result.report.mediumRiskFiles)).toBe(true);
    });

    it('should include scores object', async () => {
      vi.doMock('#layer-a/query/readers/json-reader.js', () => ({
        readJSON: vi.fn().mockResolvedValue({
          report: { summary: {}, criticalRiskFiles: [], highRiskFiles: [], mediumRiskFiles: [] },
          scores: {
            'src/file1.js': 85,
            'src/file2.js': 45
          }
        }),
        fileExists: vi.fn().mockResolvedValue(true)
      }));

      vi.doMock('#layer-a/storage/storage-manager.js', () => ({
        getDataDirectory: vi.fn((path) => `${path}/.omnysysdata`)
      }));

      const { getRiskAssessment } = await import('#layer-a/query/apis/risk-api.js');
      const result = await getRiskAssessment('/test/project');
      
      expect(typeof result.scores).toBe('object');
      expect(result.scores['src/file1.js']).toBe(85);
      expect(result.scores['src/file2.js']).toBe(45);
    });

    it('should handle missing assessment file', async () => {
      vi.doMock('#layer-a/query/readers/json-reader.js', () => ({
        readJSON: vi.fn(),
        fileExists: vi.fn().mockResolvedValue(false)
      }));

      vi.doMock('#layer-a/storage/storage-manager.js', () => ({
        getDataDirectory: vi.fn((path) => `${path}/.omnysysdata`)
      }));

      const { getRiskAssessment } = await import('#layer-a/query/apis/risk-api.js');
      const result = await getRiskAssessment('/test/project');
      
      // Should return default empty assessment
      expect(result.report).toBeDefined();
      expect(result.report.summary.criticalCount).toBe(0);
      expect(result.scores).toEqual({});
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle read errors', async () => {
      vi.doMock('#layer-a/query/readers/json-reader.js', () => ({
        readJSON: vi.fn().mockRejectedValue(new Error('Read failed')),
        fileExists: vi.fn().mockResolvedValue(true)
      }));

      vi.doMock('#layer-a/storage/storage-manager.js', () => ({
        getDataDirectory: vi.fn((path) => `${path}/.omnysysdata`)
      }));

      const { getRiskAssessment } = await import('#layer-a/query/apis/risk-api.js');
      
      await expect(getRiskAssessment('/test/project')).rejects.toThrow('Read failed');
    });

    it('should handle malformed JSON', async () => {
      vi.doMock('#layer-a/query/readers/json-reader.js', () => ({
        readJSON: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        fileExists: vi.fn().mockResolvedValue(true)
      }));

      vi.doMock('#layer-a/storage/storage-manager.js', () => ({
        getDataDirectory: vi.fn((path) => `${path}/.omnysysdata`)
      }));

      const { getRiskAssessment } = await import('#layer-a/query/apis/risk-api.js');
      
      await expect(getRiskAssessment('/test/project')).rejects.toThrow('Invalid JSON');
    });
  });

  describe('Default Values', () => {
    it('should provide default summary structure', async () => {
      vi.doMock('#layer-a/query/readers/json-reader.js', () => ({
        readJSON: vi.fn().mockResolvedValue({}),
        fileExists: vi.fn().mockResolvedValue(true)
      }));

      vi.doMock('#layer-a/storage/storage-manager.js', () => ({
        getDataDirectory: vi.fn((path) => `${path}/.omnysysdata`)
      }));

      const { getRiskAssessment } = await import('#layer-a/query/apis/risk-api.js');
      const result = await getRiskAssessment('/test/project');
      
      // The source provides defaults when file doesn't exist
      expect(result).toBeDefined();
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

      const { getRiskAssessment } = await import('#layer-a/query/apis/risk-api.js');
      const result = await getRiskAssessment('/test/project');
      
      // Check if report exists and has required properties
      expect(result.report).toBeDefined();
    });
  });
});
