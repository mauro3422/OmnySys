/**
 * @fileoverview Dependency API Tests
 * 
 * Tests for dependency graph query operations.
 * 
 * @module tests/unit/layer-a-analysis/query/apis/dependency-api
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getDependencyGraph,
  getTransitiveDependents
} from '#layer-a/query/apis/dependency-api.js';
import { FileDataBuilder, QueryScenarios } from '../../../../factories/query-test.factory.js';

vi.mock('#layer-a/query/queries/file-query/core/single-file.js', () => ({
  getFileAnalysis: vi.fn()
}));

vi.mock('#layer-a/query/queries/project-query.js', () => ({
  getProjectMetadata: vi.fn()
}));

describe('Dependency API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Structure Contract', () => {
    it('should export getDependencyGraph function', () => {
      expect(typeof getDependencyGraph).toBe('function');
    });

    it('should export getTransitiveDependents function', () => {
      expect(typeof getTransitiveDependents).toBe('function');
    });

    it('getDependencyGraph should accept rootPath, filePath, and depth', () => {
      expect(getDependencyGraph.length).toBeGreaterThanOrEqual(2);
    });

    it('getTransitiveDependents should accept rootPath and filePath', () => {
      expect(getTransitiveDependents.length).toBe(2);
    });
  });

  describe('getDependencyGraph', () => {
    it('should return graph with nodes and edges', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis.mockResolvedValue(FileDataBuilder.create('src/main.js')
        .withImport('./utils.js', { resolvedPath: 'src/utils.js' })
        .build());

      const result = await getDependencyGraph('/test/project', 'src/main.js');
      
      expect(result).toHaveProperty('nodes');
      expect(result).toHaveProperty('edges');
      expect(Array.isArray(result.nodes)).toBe(true);
      expect(Array.isArray(result.edges)).toBe(true);
    });

    it('should include starting file as node', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis.mockResolvedValue(FileDataBuilder.create('src/main.js').build());

      const result = await getDependencyGraph('/test/project', 'src/main.js');
      
      const mainNode = result.nodes.find(n => n.id === 'src/main.js');
      expect(mainNode).toBeDefined();
      expect(mainNode.depth).toBe(0);
    });

    it('should include dependencies as nodes', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis
        .mockResolvedValueOnce(FileDataBuilder.create('src/main.js')
          .withImport('./utils.js', { resolvedPath: 'src/utils.js' })
          .build())
        .mockResolvedValueOnce(FileDataBuilder.create('src/utils.js').build());

      const result = await getDependencyGraph('/test/project', 'src/main.js');
      
      const utilsNode = result.nodes.find(n => n.id === 'src/utils.js');
      expect(utilsNode).toBeDefined();
    });

    it('should create edges between files', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis
        .mockResolvedValueOnce(FileDataBuilder.create('src/main.js')
          .withImport('./utils.js', { resolvedPath: 'src/utils.js' })
          .build())
        .mockResolvedValueOnce(FileDataBuilder.create('src/utils.js').build());

      const result = await getDependencyGraph('/test/project', 'src/main.js');
      
      const edge = result.edges.find(e => e.from === 'src/main.js' && e.to === 'src/utils.js');
      expect(edge).toBeDefined();
    });

    it('should respect depth parameter', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis.mockImplementation((root, path) => {
        if (path === 'src/level0.js') {
          return Promise.resolve(FileDataBuilder.create('src/level0.js')
            .withImport('./level1.js', { resolvedPath: 'src/level1.js' })
            .build());
        }
        if (path === 'src/level1.js') {
          return Promise.resolve(FileDataBuilder.create('src/level1.js')
            .withImport('./level2.js', { resolvedPath: 'src/level2.js' })
            .build());
        }
        return Promise.resolve(FileDataBuilder.create(path).build());
      });

      const result = await getDependencyGraph('/test/project', 'src/level0.js', 1);
      
      const level2Node = result.nodes.find(n => n.id === 'src/level2.js');
      expect(level2Node).toBeUndefined();
    });

    it('should handle circular dependencies', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      let callCount = 0;
      getFileAnalysis.mockImplementation((root, path) => {
        callCount++;
        if (path === 'src/a.js') {
          return Promise.resolve(FileDataBuilder.create('src/a.js')
            .withImport('./b.js', { resolvedPath: 'src/b.js' })
            .build());
        }
        if (path === 'src/b.js') {
          return Promise.resolve(FileDataBuilder.create('src/b.js')
            .withImport('./a.js', { resolvedPath: 'src/a.js' })
            .build());
        }
        return Promise.resolve(FileDataBuilder.create(path).build());
      });

      const result = await getDependencyGraph('/test/project', 'src/a.js', 3);
      
      // Should not infinite loop
      expect(callCount).toBeLessThanOrEqual(4);
      expect(result.nodes).toHaveLength(2);
    });

    it('should handle missing dependencies gracefully', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis
        .mockResolvedValueOnce(FileDataBuilder.create('src/main.js')
          .withImport('./missing.js', { resolvedPath: 'src/missing.js' })
          .build())
        .mockRejectedValueOnce(new Error('File not found'));

      const result = await getDependencyGraph('/test/project', 'src/main.js');
      
      expect(result.nodes).toHaveLength(1);
    });
  });

  describe('getTransitiveDependents', () => {
    it('should return array of dependent files', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      const { getProjectMetadata } = await import('#layer-a/query/queries/project-query.js');
      
      getProjectMetadata.mockResolvedValue({ files: ['src/main.js', 'src/app.js'] });
      getFileAnalysis
        .mockResolvedValueOnce(FileDataBuilder.create('src/main.js')
          .withImport('./utils.js', { resolvedPath: 'src/utils.js' })
          .build())
        .mockResolvedValueOnce(FileDataBuilder.create('src/app.js')
          .withImport('./utils.js', { resolvedPath: 'src/utils.js' })
          .build());

      const result = await getTransitiveDependents('/test/project', 'src/utils.js');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain('src/main.js');
      expect(result).toContain('src/app.js');
    });

    it('should return empty array when no dependents', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      const { getProjectMetadata } = await import('#layer-a/query/queries/project-query.js');
      
      getProjectMetadata.mockResolvedValue({ files: ['src/main.js'] });
      getFileAnalysis.mockResolvedValue(FileDataBuilder.create('src/main.js')
        .withImport('./other.js')
        .build());

      const result = await getTransitiveDependents('/test/project', 'src/utils.js');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should handle empty project', async () => {
      const { getProjectMetadata } = await import('#layer-a/query/queries/project-query.js');
      getProjectMetadata.mockResolvedValue({ files: [] });

      const result = await getTransitiveDependents('/test/project', 'src/utils.js');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle errors in getDependencyGraph', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis.mockRejectedValue(new Error('Read failed'));

      const result = await getDependencyGraph('/test/project', 'src/main.js');
      
      // Should return graph with just the root node
      expect(result.nodes).toHaveLength(1);
      expect(result.edges).toHaveLength(0);
    });
  });
});
