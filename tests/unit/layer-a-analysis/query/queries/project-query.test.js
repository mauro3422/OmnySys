/**
 * @fileoverview Project Query Tests
 * 
 * Tests for project-level query implementations.
 * 
 * @module tests/unit/layer-a-analysis/query/queries/project-query
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getProjectMetadata,
  getAnalyzedFiles,
  getProjectStats,
  findFiles
} from '#layer-a/query/queries/project-query.js';
import { ProjectDataBuilder } from '../../../../factories/query-test.factory.js';

vi.mock('#layer-a/query/readers/json-reader.js', () => ({
  readJSON: vi.fn()
}));

vi.mock('#layer-a/storage/storage-manager.js', () => ({
  getDataDirectory: vi.fn((projectPath) => `${projectPath}/.omnysysdata`)
}));

describe('Project Query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Structure Contract', () => {
    it('should export all query functions', () => {
      expect(typeof getProjectMetadata).toBe('function');
      expect(typeof getAnalyzedFiles).toBe('function');
      expect(typeof getProjectStats).toBe('function');
      expect(typeof findFiles).toBe('function');
    });
  });

  describe('getProjectMetadata', () => {
    it('should read from index.json', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      const mockData = ProjectDataBuilder.create()
        .withVersion('1.0.0')
        .build();
      readJSON.mockResolvedValue(mockData);

      await getProjectMetadata('/test/project');
      
      expect(readJSON).toHaveBeenCalledWith(
        expect.stringContaining('index.json')
      );
    });

    it('should return full metadata object', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      const mockData = ProjectDataBuilder.create()
        .withVersion('2.0.0')
        .withProjectRoot('/custom')
        .withFiles(['src/a.js', 'src/b.js'])
        .withStats({ totalFiles: 2 })
        .build();
      readJSON.mockResolvedValue(mockData);

      const result = await getProjectMetadata('/test/project');
      
      expect(result.metadata.version).toBe('2.0.0');
      expect(result.metadata.projectRoot).toBe('/custom');
      expect(result.files).toHaveLength(2);
    });
  });

  describe('getAnalyzedFiles', () => {
    it('should extract files array from metadata', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockResolvedValue({
        files: ['src/file1.js', 'src/file2.js']
      });

      const result = await getAnalyzedFiles('/test/project');
      
      expect(result).toEqual(['src/file1.js', 'src/file2.js']);
    });

    it('should return empty array when files missing', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockResolvedValue({});

      const result = await getAnalyzedFiles('/test/project');
      
      expect(result).toEqual([]);
    });
  });

  describe('getProjectStats', () => {
    it('should extract stats from metadata', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockResolvedValue({
        stats: { totalFiles: 100, totalAtoms: 500 }
      });

      const result = await getProjectStats('/test/project');
      
      expect(result.totalFiles).toBe(100);
      expect(result.totalAtoms).toBe(500);
    });

    it('should return empty object when stats missing', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockResolvedValue({});

      const result = await getProjectStats('/test/project');
      
      expect(result).toEqual({});
    });
  });

  describe('findFiles', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should filter by simple pattern', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockResolvedValue({
        fileIndex: {
          'src/main.js': {},
          'src/utils.js': {},
          'lib/helper.js': {}
        }
      });

      const result = await findFiles('/test/project', 'src/*.js');
      
      expect(result).toContain('src/main.js');
      expect(result).toContain('src/utils.js');
      expect(result).not.toContain('lib/helper.js');
    });

    it('should support ** glob pattern', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockResolvedValue({
        fileIndex: {
          'src/a/b/c.js': {},
          'src/x/y/z.js': {},
          'root.js': {}
        }
      });

      const result = await findFiles('/test/project', 'src/**/*.js');
      
      expect(result).toContain('src/a/b/c.js');
      expect(result).toContain('src/x/y/z.js');
      expect(result).not.toContain('root.js');
    });

    it('should match exact paths', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockResolvedValue({
        fileIndex: {
          'exact/path.js': {},
          'other/exact/path.js': {}
        }
      });

      const result = await findFiles('/test/project', 'exact/path.js');
      
      expect(result).toContain('exact/path.js');
      expect(result).not.toContain('other/exact/path.js');
    });

    it('should escape special regex characters', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockResolvedValue({
        fileIndex: {
          'file.test.js': {},
          'fileXtest.js': {}
        }
      });

      const result = await findFiles('/test/project', '*.test.js');
      
      expect(result).toContain('file.test.js');
      expect(result).not.toContain('fileXtest.js');
    });

    it('should return empty array for no matches', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockResolvedValue({
        fileIndex: { 'src/main.js': {} }
      });

      const result = await findFiles('/test/project', '*.css');
      
      expect(result).toHaveLength(0);
    });

    it('should handle empty fileIndex', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockResolvedValue({ fileIndex: {} });

      const result = await findFiles('/test/project', '*.js');
      
      expect(result).toHaveLength(0);
    });
  });

  describe('Error Handling Contract', () => {
    it('should propagate read errors', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockRejectedValue(new Error('Read failed'));

      await expect(getProjectMetadata('/test/project')).rejects.toThrow('Read failed');
    });
  });
});
