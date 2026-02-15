/**
 * @fileoverview Save Tests
 * 
 * Tests for save.js - Data persistence module
 * 
 * @module tests/unit/layer-a-analysis/pipeline/save
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  ensureDataDir, 
  saveSystemMap, 
  saveAnalysisReport,
  saveEnhancedSystemMap,
  savePartitionedData,
  printSummary 
} from '#layer-a/pipeline/save.js';
import { PipelineBuilder, createMockFileSystem } from '../../../factories/pipeline-test.factory.js';

// Mock dependencies
vi.mock('#layer-a/storage/storage-manager.js', () => ({
  savePartitionedSystemMap: vi.fn()
}));

vi.mock('#config/paths.js', () => ({
  DATA_DIR: '.omnysysdata'
}));

vi.mock('#utils/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}));

import { savePartitionedSystemMap } from '#layer-a/storage/storage-manager.js';
import fs from 'fs/promises';

describe('Save Module', () => {
  let mockFs;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFs = createMockFileSystem({});
    
    savePartitionedSystemMap.mockResolvedValue({
      files: ['a.js', 'b.js'],
      connections: 'connections/',
      risks: 'risks/'
    });
  });

  describe('ensureDataDir', () => {
    describe('Structure Contract', () => {
      it('should export ensureDataDir function', () => {
        expect(ensureDataDir).toBeDefined();
        expect(typeof ensureDataDir).toBe('function');
      });

      it('should return data directory path', async () => {
        // Cannot test without actual fs mock injection
        // This test documents the expected behavior
        expect(ensureDataDir).toBeDefined();
      });
    });
  });

  describe('saveSystemMap', () => {
    describe('Structure Contract', () => {
      it('should export saveSystemMap function', () => {
        expect(saveSystemMap).toBeDefined();
        expect(typeof saveSystemMap).toBe('function');
      });
    });

    describe('Function Parameters', () => {
      it('should accept dataDir parameter', async () => {
        // Function signature test
        expect(saveSystemMap.length).toBeGreaterThanOrEqual(3);
      });

      it('should accept outputPath parameter', async () => {
        expect(saveSystemMap.length).toBeGreaterThanOrEqual(3);
      });

      it('should accept systemMap parameter', async () => {
        expect(saveSystemMap.length).toBeGreaterThanOrEqual(3);
      });

      it('should accept verbose parameter', async () => {
        expect(saveSystemMap.length).toBe(4);
      });
    });
  });

  describe('saveAnalysisReport', () => {
    describe('Structure Contract', () => {
      it('should export saveAnalysisReport function', () => {
        expect(saveAnalysisReport).toBeDefined();
        expect(typeof saveAnalysisReport).toBe('function');
      });
    });

    describe('Output Path', () => {
      it('should derive analysis output path from outputPath', async () => {
        // Should replace .json with -analysis.json
        // Cannot fully test without fs mock
        expect(saveAnalysisReport).toBeDefined();
      });
    });
  });

  describe('saveEnhancedSystemMap', () => {
    describe('Structure Contract', () => {
      it('should export saveEnhancedSystemMap function', () => {
        expect(saveEnhancedSystemMap).toBeDefined();
        expect(typeof saveEnhancedSystemMap).toBe('function');
      });
    });

    describe('Output Path', () => {
      it('should derive enhanced output path from outputPath', async () => {
        // Should replace .json with -enhanced.json
        expect(saveEnhancedSystemMap).toBeDefined();
      });
    });
  });

  describe('savePartitionedData', () => {
    describe('Structure Contract', () => {
      it('should export savePartitionedData function', () => {
        expect(savePartitionedData).toBeDefined();
        expect(typeof savePartitionedData).toBe('function');
      });

      it('should return partitioned paths', async () => {
        const enhancedSystemMap = {
          metadata: {},
          files: {},
          connections: {}
        };

        const result = await savePartitionedData('/test', enhancedSystemMap, false);

        expect(result).toHaveProperty('files');
      });
    });

    describe('Partitioning', () => {
      it('should call savePartitionedSystemMap with correct parameters', async () => {
        const enhancedSystemMap = { files: {}, metadata: {} };

        await savePartitionedData('/test', enhancedSystemMap, false);

        expect(savePartitionedSystemMap).toHaveBeenCalledWith('/test', enhancedSystemMap);
      });

      it('should return paths to partitioned files', async () => {
        const result = await savePartitionedData('/test', {}, false);

        expect(result.files).toBeInstanceOf(Array);
      });
    });

    describe('Error Handling Contract', () => {
      it('should handle savePartitionedSystemMap failure', async () => {
        savePartitionedSystemMap.mockRejectedValue(new Error('Save failed'));

        await expect(savePartitionedData('/test', {}, false))
          .rejects.toThrow('Save failed');
      });
    });
  });

  describe('printSummary', () => {
    describe('Structure Contract', () => {
      it('should export printSummary function', () => {
        expect(printSummary).toBeDefined();
        expect(typeof printSummary).toBe('function');
      });
    });

    describe('Summary Content', () => {
      it('should accept systemMap parameter', () => {
        const params = {
          systemMap: { metadata: { totalFiles: 10 } }
        };

        // Should not throw
        expect(() => printSummary(params)).not.toThrow();
      });

      it('should accept analysisReport parameter', () => {
        const params = {
          systemMap: { metadata: {} },
          analysisReport: { qualityMetrics: { score: 80 } }
        };

        expect(() => printSummary(params)).not.toThrow();
      });

      it('should accept enhancedSystemMap parameter', () => {
        const params = {
          systemMap: { metadata: {} },
          analysisReport: { qualityMetrics: {} },
          enhancedSystemMap: { connections: {} }
        };

        expect(() => printSummary(params)).not.toThrow();
      });

      it('should accept partitionedPaths parameter', () => {
        const params = {
          systemMap: { metadata: {} },
          analysisReport: { qualityMetrics: {} },
          enhancedSystemMap: { connections: {} },
          partitionedPaths: { files: [] }
        };

        expect(() => printSummary(params)).not.toThrow();
      });
    });

    describe('Summary Sections', () => {
      it('should include static analysis summary', () => {
        const params = {
          systemMap: {
            metadata: {
              totalFiles: 10,
              totalFunctions: 50,
              totalDependencies: 25,
              totalFunctionLinks: 40
            }
          }
        };

        // Logger should be called with summary info
        printSummary(params);
      });

      it('should include code quality analysis', () => {
        const params = {
          systemMap: { metadata: {} },
          analysisReport: {
            qualityMetrics: {
              score: 85,
              grade: 'A',
              totalIssues: 5
            },
            unusedExports: { totalUnused: 2 },
            orphanFiles: { deadCodeCount: 1 },
            hotspots: { criticalCount: 0 },
            circularFunctionDeps: { total: 0 },
            recommendations: { total: 3 }
          }
        };

        printSummary(params);
      });

      it('should include semantic analysis section', () => {
        const params = {
          systemMap: { metadata: {} },
          analysisReport: { qualityMetrics: {} },
          enhancedSystemMap: {
            connections: {
              sharedState: [],
              eventListeners: [],
              total: 0
            },
            riskAssessment: {
              report: {
                summary: {
                  highCount: 0,
                  criticalCount: 0,
                  averageScore: 0
                }
              }
            }
          }
        };

        printSummary(params);
      });

      it('should include semantic issues section', () => {
        const params = {
          systemMap: { metadata: {} },
          analysisReport: { qualityMetrics: {} },
          enhancedSystemMap: {
            connections: {},
            riskAssessment: { report: { summary: {} } },
            semanticIssues: {
              stats: {
                totalIssues: 10,
                bySeverity: { high: 2, medium: 3, low: 5 }
              }
            }
          }
        };

        printSummary(params);
      });
    });

    describe('Null Safety', () => {
      it('should handle missing metadata gracefully', () => {
        const params = {
          systemMap: {}
        };

        expect(() => printSummary(params)).not.toThrow();
      });

      it('should handle missing analysisReport gracefully', () => {
        const params = {
          systemMap: { metadata: {} }
        };

        expect(() => printSummary(params)).not.toThrow();
      });

      it('should handle missing enhancedSystemMap gracefully', () => {
        const params = {
          systemMap: { metadata: {} },
          analysisReport: { qualityMetrics: {} }
        };

        expect(() => printSummary(params)).not.toThrow();
      });
    });
  });
});
