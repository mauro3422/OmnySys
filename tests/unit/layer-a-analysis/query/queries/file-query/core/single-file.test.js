/**
 * @fileoverview Single File Query Tests
 * 
 * Tests for single file analysis query implementation.
 * 
 * @module tests/unit/layer-a-analysis/query/queries/file-query/core/single-file
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFileAnalysis } from '#layer-a/query/queries/file-query/core/single-file.js';
import { FileDataBuilder } from '../../../../../../factories/query-test.factory.js';

vi.mock('#layer-a/storage/storage-manager.js', () => ({
  getDataDirectory: vi.fn((projectPath) => `${projectPath}/.omnysysdata`)
}));

vi.mock('#layer-a/query/readers/json-reader.js', () => ({
  readJSON: vi.fn()
}));

describe('Single File Query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Structure Contract', () => {
    it('should export getFileAnalysis function', () => {
      expect(typeof getFileAnalysis).toBe('function');
    });

    it('should accept rootPath and filePath', () => {
      expect(getFileAnalysis.length).toBe(2);
    });
  });

  describe('getFileAnalysis', () => {
    it('should read from files directory', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      const mockData = FileDataBuilder.create('src/main.js').build();
      readJSON.mockResolvedValue(mockData);

      await getFileAnalysis('/test/project', 'src/main.js');
      
      expect(readJSON).toHaveBeenCalledWith(
        expect.stringContaining('files/src/main.js.json')
      );
    });

    it('should return file analysis data', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      const mockData = FileDataBuilder.create('src/main.js')
        .withAtom({ name: 'main', type: 'function' })
        .withComplexity(10)
        .withLines(100)
        .build();
      readJSON.mockResolvedValue(mockData);

      const result = await getFileAnalysis('/test/project', 'src/main.js');
      
      expect(result.path).toBe('src/main.js');
      expect(result.complexity).toBe(10);
      expect(result.lines).toBe(100);
    });

    it('should handle relative paths', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockResolvedValue(FileDataBuilder.create('src/main.js').build());

      await getFileAnalysis('/test/project', 'src/main.js');
      
      expect(readJSON).toHaveBeenCalledWith(
        expect.stringContaining('src/main.js')
      );
    });

    it('should normalize absolute paths', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockResolvedValue(FileDataBuilder.create('src/main.js').build());

      await getFileAnalysis('/test/project', '/test/project/src/main.js');
      
      // Should convert to relative
      expect(readJSON).toHaveBeenCalledWith(
        expect.not.stringContaining('/test/project/src/main.js.json')
      );
    });

    it('should handle nested file paths', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockResolvedValue(FileDataBuilder.create('src/deep/nested/file.js').build());

      await getFileAnalysis('/test/project', 'src/deep/nested/file.js');
      
      expect(readJSON).toHaveBeenCalledWith(
        expect.stringContaining('src/deep/nested/file.js.json')
      );
    });

    it('should handle file paths with dots', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockResolvedValue(FileDataBuilder.create('src/file.test.js').build());

      await getFileAnalysis('/test/project', 'src/file.test.js');
      
      expect(readJSON).toHaveBeenCalledWith(
        expect.stringContaining('src/file.test.js.json')
      );
    });

    it('should preserve backslash paths on Windows', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockResolvedValue(FileDataBuilder.create('src\\main.js').build());

      await getFileAnalysis('C:\\test\\project', 'src\\main.js');
      
      // Should normalize slashes
      expect(readJSON).toHaveBeenCalled();
    });
  });

  describe('Error Handling Contract', () => {
    it('should propagate read errors', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockRejectedValue(new Error('File not found'));

      await expect(getFileAnalysis('/test/project', 'src/main.js'))
        .rejects.toThrow('File not found');
    });

    it('should handle invalid JSON errors', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockRejectedValue(new Error('Invalid JSON'));

      await expect(getFileAnalysis('/test/project', 'src/main.js'))
        .rejects.toThrow('Invalid JSON');
    });
  });

  describe('Path Normalization', () => {
    it('should handle paths starting with ./', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockResolvedValue(FileDataBuilder.create('./src/main.js').build());

      await getFileAnalysis('/test/project', './src/main.js');
      
      expect(readJSON).toHaveBeenCalled();
    });

    it('should handle paths with multiple slashes', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockResolvedValue(FileDataBuilder.create('src//main.js').build());

      await getFileAnalysis('/test/project', 'src//main.js');
      
      expect(readJSON).toHaveBeenCalled();
    });
  });
});
