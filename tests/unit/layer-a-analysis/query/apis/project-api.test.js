/**
 * @fileoverview Project API Tests
 * 
 * Tests for project-level query operations.
 * 
 * @module tests/unit/layer-a-analysis/query/apis/project-api
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getProjectMetadata,
  getAnalyzedFiles,
  getProjectStats,
  findFiles
} from '#layer-a/query/apis/project-api.js';
import { ProjectDataBuilder } from '../../../../factories/query-test.factory.js';

vi.mock('#layer-a/query/readers/json-reader.js', () => ({
  readJSON: vi.fn()
}));

vi.mock('#layer-a/storage/storage-manager.js', () => ({
  getDataDirectory: vi.fn((projectPath) => `${projectPath}/.omnysysdata`)
}));

describe('Project API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Structure Contract', () => {
    it('should export getProjectMetadata function', () => {
      expect(typeof getProjectMetadata).toBe('function');
    });

    it('should export getAnalyzedFiles function', () => {
      expect(typeof getAnalyzedFiles).toBe('function');
    });

    it('should export getProjectStats function', () => {
      expect(typeof getProjectStats).toBe('function');
    });

    it('should export findFiles function', () => {
      expect(typeof findFiles).toBe('function');
    });

    it('all functions should return Promises', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockResolvedValue({});

      expect(getProjectMetadata('/test')).toBeInstanceOf(Promise);
      expect(getAnalyzedFiles('/test')).toBeInstanceOf(Promise);
      expect(getProjectStats('/test')).toBeInstanceOf(Promise);
    });
  });

  describe('getProjectMetadata', () => {
    it('should return metadata object', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      const mockData = ProjectDataBuilder.create()
        .withVersion('1.0.0')
        .withFile('src/main.js')
        .build();
      
      readJSON.mockResolvedValue(mockData);

      const result = await getProjectMetadata('/test/project');
      
      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.files).toBeDefined();
    });

    it('should include version in metadata', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      const mockData = ProjectDataBuilder.create()
        .withVersion('2.0.0')
        .build();
      
      readJSON.mockResolvedValue(mockData);

      const result = await getProjectMetadata('/test/project');
      
      expect(result.metadata.version).toBe('2.0.0');
    });

    it('should include project root', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      const mockData = ProjectDataBuilder.create()
        .withProjectRoot('/custom/path')
        .build();
      
      readJSON.mockResolvedValue(mockData);

      const result = await getProjectMetadata('/test/project');
      
      expect(result.metadata.projectRoot).toBe('/custom/path');
    });

    it('should include analyzed timestamp', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      const timestamp = new Date().toISOString();
      const mockData = ProjectDataBuilder.create()
        .withAnalyzedAt(timestamp)
        .build();
      
      readJSON.mockResolvedValue(mockData);

      const result = await getProjectMetadata('/test/project');
      
      expect(result.metadata.analyzedAt).toBe(timestamp);
    });
  });

  describe('getAnalyzedFiles', () => {
    it('should return array of file paths', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      const mockData = ProjectDataBuilder.create()
        .withFiles(['src/a.js', 'src/b.js', 'src/c.js'])
        .build();
      
      readJSON.mockResolvedValue(mockData);

      const result = await getAnalyzedFiles('/test/project');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
    });

    it('should return empty array when no files', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockResolvedValue({ files: [] });

      const result = await getAnalyzedFiles('/test/project');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should handle missing files property', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockResolvedValue({});

      const result = await getAnalyzedFiles('/test/project');
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getProjectStats', () => {
    it('should return stats object', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      const mockData = ProjectDataBuilder.create()
        .withStats({ totalFiles: 10, totalAtoms: 50 })
        .build();
      
      readJSON.mockResolvedValue(mockData);

      const result = await getProjectStats('/test/project');
      
      expect(typeof result).toBe('object');
    });

    it('should include file count', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      const mockData = ProjectDataBuilder.create()
        .withStats({ totalFiles: 42 })
        .build();
      
      readJSON.mockResolvedValue(mockData);

      const result = await getProjectStats('/test/project');
      
      expect(result.totalFiles).toBe(42);
    });

    it('should return empty object when no stats', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockResolvedValue({});

      const result = await getProjectStats('/test/project');
      
      expect(typeof result).toBe('object');
    });
  });

  describe('findFiles', () => {
    it('should accept pattern parameter', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      const mockData = ProjectDataBuilder.create()
        .withFiles(['src/main.js', 'src/utils.js', 'lib/helper.js'])
        .build();
      
      readJSON.mockResolvedValue(mockData);

      const result = await findFiles('/test/project', 'src/*.js');
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter files by pattern', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      const mockData = ProjectDataBuilder.create()
        .withFiles(['src/main.js', 'src/utils.js', 'lib/helper.js', 'test/spec.js'])
        .build();
      
      readJSON.mockResolvedValue(mockData);

      const result = await findFiles('/test/project', 'src/*.js');
      
      expect(result.every(f => f.startsWith('src/'))).toBe(true);
    });

    it('should support glob patterns', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      const mockData = ProjectDataBuilder.create()
        .withFiles(['src/a/b/c.js', 'src/x/y.js', 'lib/z.js'])
        .build();
      
      readJSON.mockResolvedValue(mockData);

      const result = await findFiles('/test/project', 'src/**/*.js');
      
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array for non-matching pattern', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      const mockData = ProjectDataBuilder.create()
        .withFiles(['src/main.js'])
        .build();
      
      readJSON.mockResolvedValue(mockData);

      const result = await findFiles('/test/project', '*.css');
      
      expect(result).toHaveLength(0);
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle read errors for getProjectMetadata', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockRejectedValue(new Error('Read failed'));

      await expect(getProjectMetadata('/test/project')).rejects.toThrow('Read failed');
    });

    it('should handle read errors for getAnalyzedFiles', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockRejectedValue(new Error('Read failed'));

      await expect(getAnalyzedFiles('/test/project')).rejects.toThrow('Read failed');
    });

    it('should handle read errors for getProjectStats', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockRejectedValue(new Error('Read failed'));

      await expect(getProjectStats('/test/project')).rejects.toThrow('Read failed');
    });

    it('should handle read errors for findFiles', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockRejectedValue(new Error('Read failed'));

      await expect(findFiles('/test/project', '*.js')).rejects.toThrow('Read failed');
    });
  });
});
