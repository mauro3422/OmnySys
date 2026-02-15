/**
 * @fileoverview Dependency Query Tests
 * 
 * Tests for dependency graph query implementations.
 * 
 * @module tests/unit/layer-a-analysis/query/queries/dependency-query
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getDependencyGraph,
  getTransitiveDependents
} from '#layer-a/query/queries/dependency-query.js';
import { FileDataBuilder } from '../../../../factories/query-test.factory.js';

vi.mock('#layer-a/query/queries/file-query/core/single-file.js', () => ({
  getFileAnalysis: vi.fn()
}));

vi.mock('#layer-a/query/queries/project-query.js', () => ({
  getProjectMetadata: vi.fn()
}));

describe('Dependency Query', () => {
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

    it('should have correct parameter count for getDependencyGraph', () => {
      expect(getDependencyGraph.length).toBe(3); // rootPath, filePath, depth
    });

    it('should have correct parameter count for getTransitiveDependents', () => {
      expect(getTransitiveDependents.length).toBe(2); // rootPath, filePath
    });
  });

  describe('getDependencyGraph', () => {
    it('should traverse dependencies', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis
        .mockResolvedValueOnce(FileDataBuilder.create('src/main.js')
          .withImport('./utils.js', { resolvedPath: 'src/utils.js' })
          .build())
        .mockResolvedValueOnce(FileDataBuilder.create('src/utils.js').build());

      const result = await getDependencyGraph('/test', 'src/main.js');
      
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes.some(n => n.id === 'src/main.js')).toBe(true);
      expect(result.nodes.some(n => n.id === 'src/utils.js')).toBe(true);
    });

    it('should create edges for imports', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis
        .mockResolvedValueOnce(FileDataBuilder.create('src/main.js')
          .withImport('./a.js', { resolvedPath: 'src/a.js' })
          .withImport('./b.js', { resolvedPath: 'src/b.js' })
          .build())
        .mockResolvedValueOnce(FileDataBuilder.create('src/a.js').build())
        .mockResolvedValueOnce(FileDataBuilder.create('src/b.js').build());

      const result = await getDependencyGraph('/test', 'src/main.js');
      
      expect(result.edges).toHaveLength(2);
      expect(result.edges.some(e => e.to === 'src/a.js')).toBe(true);
      expect(result.edges.some(e => e.to === 'src/b.js')).toBe(true);
    });

    it('should respect depth limit', async () => {
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

      const result = await getDependencyGraph('/test', 'src/level0.js', 1);
      
      expect(result.nodes.some(n => n.id === 'src/level2.js')).toBe(false);
    });

    it('should handle circular dependencies', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis.mockImplementation((root, path) => {
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

      const result = await getDependencyGraph('/test', 'src/a.js', 5);
      
      // Should not infinite loop
      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(2);
    });

    it('should handle missing files gracefully', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis
        .mockResolvedValueOnce(FileDataBuilder.create('src/main.js')
          .withImport('./missing.js', { resolvedPath: 'src/missing.js' })
          .build())
        .mockRejectedValueOnce(new Error('File not found'));

      const result = await getDependencyGraph('/test', 'src/main.js');
      
      expect(result.nodes).toHaveLength(1);
      expect(result.edges).toHaveLength(0);
    });

    it('should use resolvedPath or source for edge target', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis
        .mockResolvedValueOnce(FileDataBuilder.create('src/main.js')
          .withImport('./lib.js', { resolvedPath: 'src/lib.js' })
          .build())
        .mockResolvedValueOnce(FileDataBuilder.create('src/lib.js').build());

      const result = await getDependencyGraph('/test', 'src/main.js');
      
      const edge = result.edges[0];
      expect(edge.from).toBe('src/main.js');
      expect(edge.to).toBe('src/lib.js');
    });
  });

  describe('getTransitiveDependents', () => {
    it('should find files that import target', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      const { getProjectMetadata } = await import('#layer-a/query/queries/project-query.js');
      
      getProjectMetadata.mockResolvedValue({ files: ['src/a.js', 'src/b.js'] });
      getFileAnalysis
        .mockResolvedValueOnce(FileDataBuilder.create('src/a.js')
          .withImport('./utils.js', { resolvedPath: 'src/utils.js' })
          .build())
        .mockResolvedValueOnce(FileDataBuilder.create('src/b.js')
          .withImport('./utils.js', { resolvedPath: 'src/utils.js' })
          .build());

      const result = await getTransitiveDependents('/test', 'src/utils.js');
      
      expect(result).toContain('src/a.js');
      expect(result).toContain('src/b.js');
    });

    it('should not include files that do not import target', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      const { getProjectMetadata } = await import('#layer-a/query/queries/project-query.js');
      
      getProjectMetadata.mockResolvedValue({ files: ['src/a.js', 'src/b.js'] });
      getFileAnalysis
        .mockResolvedValueOnce(FileDataBuilder.create('src/a.js')
          .withImport('./other.js')
          .build())
        .mockResolvedValueOnce(FileDataBuilder.create('src/b.js').build());

      const result = await getTransitiveDependents('/test', 'src/utils.js');
      
      expect(result).not.toContain('src/a.js');
      expect(result).not.toContain('src/b.js');
    });

    it('should match by source when resolvedPath missing', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      const { getProjectMetadata } = await import('#layer-a/query/queries/project-query.js');
      
      getProjectMetadata.mockResolvedValue({ files: ['src/main.js'] });
      getFileAnalysis.mockResolvedValue(FileDataBuilder.create('src/main.js')
        .withImport('external-package')
        .build());

      const result = await getTransitiveDependents('/test', 'external-package');
      
      expect(result).toContain('src/main.js');
    });

    it('should return empty array for no dependents', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      const { getProjectMetadata } = await import('#layer-a/query/queries/project-query.js');
      
      getProjectMetadata.mockResolvedValue({ files: [] });

      const result = await getTransitiveDependents('/test', 'src/utils.js');
      
      expect(result).toEqual([]);
    });

    it('should handle files without imports property', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      const { getProjectMetadata } = await import('#layer-a/query/queries/project-query.js');
      
      getProjectMetadata.mockResolvedValue({ files: ['src/a.js'] });
      getFileAnalysis.mockResolvedValue({ path: 'src/a.js' }); // no imports

      const result = await getTransitiveDependents('/test', 'src/utils.js');
      
      expect(result).toEqual([]);
    });

    it('should skip files that throw errors', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      const { getProjectMetadata } = await import('#layer-a/query/queries/project-query.js');
      
      getProjectMetadata.mockResolvedValue({ files: ['src/a.js', 'src/b.js'] });
      getFileAnalysis
        .mockRejectedValueOnce(new Error('Read failed'))
        .mockResolvedValueOnce(FileDataBuilder.create('src/b.js')
          .withImport('./utils.js', { resolvedPath: 'src/utils.js' })
          .build());

      const result = await getTransitiveDependents('/test', 'src/utils.js');
      
      expect(result).toContain('src/b.js');
      expect(result).not.toContain('src/a.js');
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle errors in getDependencyGraph traversal', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis.mockRejectedValue(new Error('Read failed'));

      const result = await getDependencyGraph('/test', 'src/main.js');
      
      // Should return graph with just root
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe('src/main.js');
    });
  });
});
