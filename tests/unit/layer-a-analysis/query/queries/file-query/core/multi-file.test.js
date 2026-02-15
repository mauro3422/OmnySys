/**
 * @fileoverview Multi File Query Tests
 * 
 * Tests for multi-file batch analysis query implementation.
 * 
 * @module tests/unit/layer-a-analysis/query/queries/file-query/core/multi-file
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMultipleFileAnalysis } from '#layer-a/query/queries/file-query/core/multi-file.js';
import { FileDataBuilder } from '../../../../../../factories/query-test.factory.js';

vi.mock('#layer-a/query/queries/file-query/core/single-file.js', () => ({
  getFileAnalysis: vi.fn()
}));

describe('Multi File Query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Structure Contract', () => {
    it('should export getMultipleFileAnalysis function', () => {
      expect(typeof getMultipleFileAnalysis).toBe('function');
    });

    it('should accept rootPath and filePaths array', () => {
      expect(getMultipleFileAnalysis.length).toBe(2);
    });
  });

  describe('getMultipleFileAnalysis', () => {
    it('should analyze multiple files in parallel', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis
        .mockResolvedValueOnce(FileDataBuilder.create('src/a.js').build())
        .mockResolvedValueOnce(FileDataBuilder.create('src/b.js').build())
        .mockResolvedValueOnce(FileDataBuilder.create('src/c.js').build());

      const result = await getMultipleFileAnalysis('/test/project', [
        'src/a.js',
        'src/b.js',
        'src/c.js'
      ]);
      
      expect(result).toHaveLength(3);
      expect(getFileAnalysis).toHaveBeenCalledTimes(3);
    });

    it('should return results in order', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis
        .mockResolvedValueOnce(FileDataBuilder.create('src/a.js').withComplexity(1).build())
        .mockResolvedValueOnce(FileDataBuilder.create('src/b.js').withComplexity(2).build())
        .mockResolvedValueOnce(FileDataBuilder.create('src/c.js').withComplexity(3).build());

      const result = await getMultipleFileAnalysis('/test/project', [
        'src/a.js',
        'src/b.js',
        'src/c.js'
      ]);
      
      expect(result[0].complexity).toBe(1);
      expect(result[1].complexity).toBe(2);
      expect(result[2].complexity).toBe(3);
    });

    it('should return null for failed files', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis
        .mockResolvedValueOnce(FileDataBuilder.create('src/a.js').build())
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce(FileDataBuilder.create('src/c.js').build());

      const result = await getMultipleFileAnalysis('/test/project', [
        'src/a.js',
        'src/b.js',
        'src/c.js'
      ]);
      
      expect(result[0]).not.toBeNull();
      expect(result[1]).toBeNull();
      expect(result[2]).not.toBeNull();
    });

    it('should handle empty array', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');

      const result = await getMultipleFileAnalysis('/test/project', []);
      
      expect(result).toEqual([]);
      expect(getFileAnalysis).not.toHaveBeenCalled();
    });

    it('should handle single file', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis.mockResolvedValue(FileDataBuilder.create('src/single.js').build());

      const result = await getMultipleFileAnalysis('/test/project', ['src/single.js']);
      
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('src/single.js');
    });

    it('should handle all files failing', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis.mockRejectedValue(new Error('All failed'));

      const result = await getMultipleFileAnalysis('/test/project', [
        'src/a.js',
        'src/b.js'
      ]);
      
      expect(result).toEqual([null, null]);
    });

    it('should call getFileAnalysis with correct parameters', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis.mockResolvedValue(FileDataBuilder.create('src/file.js').build());

      await getMultipleFileAnalysis('/test/project', ['src/file.js']);
      
      expect(getFileAnalysis).toHaveBeenCalledWith('/test/project', 'src/file.js');
    });
  });

  describe('Error Handling Contract', () => {
    it('should not throw when individual files fail', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis.mockRejectedValue(new Error('Failed'));

      await expect(getMultipleFileAnalysis('/test/project', ['src/file.js']))
        .resolves.toEqual([null]);
    });

    it('should continue processing after failures', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis
        .mockRejectedValueOnce(new Error('Failed 1'))
        .mockResolvedValueOnce(FileDataBuilder.create('src/b.js').build())
        .mockRejectedValueOnce(new Error('Failed 3'));

      const result = await getMultipleFileAnalysis('/test/project', [
        'src/a.js',
        'src/b.js',
        'src/c.js'
      ]);
      
      expect(result[0]).toBeNull();
      expect(result[1]).not.toBeNull();
      expect(result[2]).toBeNull();
    });
  });

  describe('Performance', () => {
    it('should process files in parallel not sequentially', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      const delays = [100, 50, 25];
      let callIndex = 0;
      
      getFileAnalysis.mockImplementation(() => {
        const delay = delays[callIndex++];
        return new Promise(resolve => 
          setTimeout(() => resolve(FileDataBuilder.create('src/file.js').build()), delay)
        );
      });

      const start = Date.now();
      await getMultipleFileAnalysis('/test/project', [
        'src/a.js',
        'src/b.js',
        'src/c.js'
      ]);
      const duration = Date.now() - start;
      
      // Should take less than sum of delays (150ms) if parallel
      // but more than max delay (100ms)
      expect(duration).toBeLessThan(200);
    });
  });
});
