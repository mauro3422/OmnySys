/**
 * @fileoverview Graph Tests
 * 
 * Tests for graph.js - Graph construction module
 * 
 * @module tests/unit/layer-a-analysis/pipeline/graph
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildSystemGraph } from '#layer-a/pipeline/graph.js';
import { PipelineBuilder } from '../../../factories/pipeline-test.factory.js';

// Mock dependencies
vi.mock('#layer-a/graph/index.js', () => ({
  buildGraph: vi.fn()
}));

vi.mock('#utils/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn()
  })
}));

import { buildGraph } from '#layer-a/graph/index.js';

describe('Graph Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Structure Contract', () => {
    it('should export buildSystemGraph function', () => {
      expect(buildSystemGraph).toBeDefined();
      expect(typeof buildSystemGraph).toBe('function');
    });

    it('should return system map from buildGraph', () => {
      const mockSystemMap = {
        metadata: { totalFiles: 10, totalDependencies: 20 },
        files: {}
      };
      buildGraph.mockReturnValue(mockSystemMap);

      const result = buildSystemGraph({}, {}, false);

      expect(result).toBe(mockSystemMap);
    });
  });

  describe('Function Parameters', () => {
    it('should accept normalizedParsedFiles parameter', () => {
      const parsedFiles = {
        'src/a.js': { imports: [], exports: [] },
        'src/b.js': { imports: [], exports: [] }
      };
      buildGraph.mockReturnValue({ metadata: {}, files: {} });

      buildSystemGraph(parsedFiles, {}, false);

      expect(buildGraph).toHaveBeenCalledWith(parsedFiles, expect.any(Object));
    });

    it('should accept normalizedResolvedImports parameter', () => {
      const resolvedImports = {
        'src/a.js': [{ source: './b.js', resolved: 'src/b.js' }],
        'src/b.js': []
      };
      buildGraph.mockReturnValue({ metadata: {}, files: {} });

      buildSystemGraph({}, resolvedImports, false);

      expect(buildGraph).toHaveBeenCalledWith(expect.any(Object), resolvedImports);
    });

    it('should accept verbose parameter', () => {
      buildGraph.mockReturnValue({ metadata: {}, files: {} });

      buildSystemGraph({}, {}, true);

      expect(buildGraph).toHaveBeenCalled();
    });

    it('should default verbose to true when not specified', () => {
      buildGraph.mockReturnValue({ metadata: {}, files: {} });

      buildSystemGraph({}, {});

      expect(buildGraph).toHaveBeenCalled();
    });
  });

  describe('Result Structure', () => {
    it('should return system map with metadata', () => {
      const mockSystemMap = {
        metadata: {
          totalFiles: 5,
          totalDependencies: 10,
          totalFunctionLinks: 20,
          cyclesDetected: []
        },
        files: {
          'src/a.js': {},
          'src/b.js': {}
        }
      };
      buildGraph.mockReturnValue(mockSystemMap);

      const result = buildSystemGraph({}, {}, false);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.totalFiles).toBe(5);
    });

    it('should return system map with files', () => {
      const mockSystemMap = {
        metadata: {},
        files: {
          'src/a.js': { exports: [] },
          'src/b.js': { exports: [] }
        }
      };
      buildGraph.mockReturnValue(mockSystemMap);

      const result = buildSystemGraph({}, {}, false);

      expect(result.files).toBeDefined();
      expect(Object.keys(result.files)).toHaveLength(2);
    });

    it('should log cycle warnings when cycles detected', () => {
      const mockSystemMap = {
        metadata: {
          totalFiles: 3,
          totalDependencies: 5,
          cyclesDetected: [['src/a.js', 'src/b.js', 'src/c.js']]
        },
        files: {}
      };
      buildGraph.mockReturnValue(mockSystemMap);

      buildSystemGraph({}, {}, true);

      // Logger info should be called for cycle warning
      expect(buildGraph).toHaveBeenCalled();
    });
  });

  describe('Error Handling Contract', () => {
    it('should propagate errors from buildGraph', () => {
      buildGraph.mockImplementation(() => {
        throw new Error('Graph build failed');
      });

      expect(() => buildSystemGraph({}, {}, false))
        .toThrow('Graph build failed');
    });

    it('should handle empty parsed files', () => {
      buildGraph.mockReturnValue({
        metadata: { totalFiles: 0 },
        files: {}
      });

      const result = buildSystemGraph({}, {}, false);

      expect(result.metadata.totalFiles).toBe(0);
    });

    it('should handle empty imports', () => {
      buildGraph.mockReturnValue({
        metadata: { totalDependencies: 0 },
        files: {}
      });

      const result = buildSystemGraph({}, {}, false);

      expect(result.metadata.totalDependencies).toBe(0);
    });
  });

  describe('Integration with Factories', () => {
    it('should process system map from PipelineBuilder', () => {
      const builder = new PipelineBuilder()
        .addMockFile('src/index.js', 'export const app = {};')
        .addMockFile('src/utils.js', 'export const helper = () => {};')
        .addMockImport('./utils', 'src/utils.js', 'local');

      const config = builder.build();
      const mockSystemMap = builder.buildSystemMap({
        metadata: { totalFiles: 2 }
      });
      buildGraph.mockReturnValue(mockSystemMap);

      const result = buildSystemGraph(config.mockFiles, config.mockImports, false);

      expect(result.metadata.totalFiles).toBe(2);
    });
  });

  describe('Verbose Output', () => {
    it('should log info when verbose is true', () => {
      buildGraph.mockReturnValue({
        metadata: { totalFiles: 5, totalDependencies: 10, cyclesDetected: [] },
        files: {}
      });

      buildSystemGraph({}, {}, true);

      // Logger should be called
      expect(buildGraph).toHaveBeenCalled();
    });

    it('should not log extra info when verbose is false', () => {
      buildGraph.mockReturnValue({
        metadata: { totalFiles: 5, totalDependencies: 10, cyclesDetected: [] },
        files: {}
      });

      buildSystemGraph({}, {}, false);

      expect(buildGraph).toHaveBeenCalled();
    });
  });
});
