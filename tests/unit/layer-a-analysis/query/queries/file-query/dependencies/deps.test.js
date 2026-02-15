/**
 * @fileoverview Dependencies Query Tests
 * 
 * Tests for file dependency query implementations.
 * 
 * @module tests/unit/layer-a-analysis/query/queries/file-query/dependencies/deps
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getFileDependencies,
  getFileDependents
} from '#layer-a/query/queries/file-query/dependencies/deps.js';
import { FileDataBuilder } from '../../../../../../factories/query-test.factory.js';

vi.mock('#layer-a/query/queries/file-query/core/single-file.js', () => ({
  getFileAnalysis: vi.fn()
}));

describe('Dependencies Query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Structure Contract', () => {
    it('should export getFileDependencies function', () => {
      expect(typeof getFileDependencies).toBe('function');
    });

    it('should export getFileDependents function', () => {
      expect(typeof getFileDependents).toBe('function');
    });

    it('should accept rootPath and filePath parameters', () => {
      expect(getFileDependencies.length).toBe(2);
      expect(getFileDependents.length).toBe(2);
    });
  });

  describe('getFileDependencies', () => {
    it('should return array of import sources', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis.mockResolvedValue(FileDataBuilder.create('src/main.js')
        .withImport('./utils.js')
        .withImport('./helpers.js')
        .build());

      const result = await getFileDependencies('/test/project', 'src/main.js');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain('./utils.js');
      expect(result).toContain('./helpers.js');
    });

    it('should extract source from import objects', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis.mockResolvedValue(FileDataBuilder.create('src/main.js')
        .withImport('./a.js', { line: 1 })
        .withImport('./b.js', { line: 5 })
        .build());

      const result = await getFileDependencies('/test/project', 'src/main.js');
      
      expect(result).toEqual(['./a.js', './b.js']);
    });

    it('should return empty array when no imports', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis.mockResolvedValue(FileDataBuilder.create('src/main.js').build());

      const result = await getFileDependencies('/test/project', 'src/main.js');
      
      expect(result).toEqual([]);
    });

    it('should return empty array when imports is undefined', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis.mockResolvedValue({ path: 'src/main.js' });

      const result = await getFileDependencies('/test/project', 'src/main.js');
      
      expect(result).toEqual([]);
    });

    it('should handle empty imports array', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis.mockResolvedValue({
        path: 'src/main.js',
        imports: []
      });

      const result = await getFileDependencies('/test/project', 'src/main.js');
      
      expect(result).toEqual([]);
    });

    it('should propagate errors', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis.mockRejectedValue(new Error('Analysis failed'));

      await expect(getFileDependencies('/test/project', 'src/main.js'))
        .rejects.toThrow('Analysis failed');
    });
  });

  describe('getFileDependents', () => {
    it('should return usedBy array', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis.mockResolvedValue(FileDataBuilder.create('src/utils.js')
        .withUsedBy(['src/main.js', 'src/app.js'])
        .build());

      const result = await getFileDependents('/test/project', 'src/utils.js');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain('src/main.js');
      expect(result).toContain('src/app.js');
    });

    it('should return empty array when no dependents', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis.mockResolvedValue(FileDataBuilder.create('src/main.js').build());

      const result = await getFileDependents('/test/project', 'src/main.js');
      
      expect(result).toEqual([]);
    });

    it('should return empty array when usedBy is undefined', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis.mockResolvedValue({ path: 'src/main.js' });

      const result = await getFileDependents('/test/project', 'src/main.js');
      
      expect(result).toEqual([]);
    });

    it('should handle empty usedBy array', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis.mockResolvedValue({
        path: 'src/main.js',
        usedBy: []
      });

      const result = await getFileDependents('/test/project', 'src/main.js');
      
      expect(result).toEqual([]);
    });

    it('should propagate errors', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis.mockRejectedValue(new Error('Analysis failed'));

      await expect(getFileDependents('/test/project', 'src/main.js'))
        .rejects.toThrow('Analysis failed');
    });
  });

  describe('Integration', () => {
    it('dependencies and dependents should be independent', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis.mockResolvedValue(FileDataBuilder.create('src/main.js')
        .withImport('./utils.js')
        .withUsedBy(['src/app.js'])
        .build());

      const deps = await getFileDependencies('/test/project', 'src/main.js');
      const dependents = await getFileDependents('/test/project', 'src/main.js');
      
      expect(deps).toContain('./utils.js');
      expect(dependents).toContain('src/app.js');
    });
  });
});
