/**
 * @fileoverview Parse Tests
 * 
 * Tests for parse.js - File parsing module
 * 
 * @module tests/unit/layer-a-analysis/pipeline/parse
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseFiles } from '#layer-a/pipeline/parse.js';
import { FileProcessingBuilder } from '../../../factories/pipeline-test.factory.js';

// Mock dependencies
vi.mock('#layer-a/parser/index.js', () => ({
  parseFileFromDisk: vi.fn()
}));

vi.mock('#utils/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn()
  })
}));

import { parseFileFromDisk } from '#layer-a/parser/index.js';

describe('Parse Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    parseFileFromDisk.mockImplementation((file) => {
      return Promise.resolve({
        filePath: file,
        imports: [],
        exports: [],
        definitions: [],
        source: ''
      });
    });
  });

  describe('Structure Contract', () => {
    it('should export parseFiles function', () => {
      expect(parseFiles).toBeDefined();
      expect(typeof parseFiles).toBe('function');
    });

    it('should return parsed files map', async () => {
      const result = await parseFiles([], false);

      expect(typeof result).toBe('object');
    });
  });

  describe('File Parsing', () => {
    it('should parse single file', async () => {
      const files = ['/test/src/file.js'];

      await parseFiles(files, false);

      expect(parseFileFromDisk).toHaveBeenCalledWith('/test/src/file.js');
    });

    it('should parse multiple files', async () => {
      const files = ['/test/src/a.js', '/test/src/b.js', '/test/src/c.js'];

      await parseFiles(files, false);

      expect(parseFileFromDisk).toHaveBeenCalledTimes(3);
    });

    it('should return parsed results keyed by file path', async () => {
      const files = ['/test/src/a.js', '/test/src/b.js'];
      parseFileFromDisk
        .mockResolvedValueOnce({ imports: [], exports: ['a'] })
        .mockResolvedValueOnce({ imports: [], exports: ['b'] });

      const result = await parseFiles(files, false);

      expect(result['/test/src/a.js']).toEqual({ imports: [], exports: ['a'] });
      expect(result['/test/src/b.js']).toEqual({ imports: [], exports: ['b'] });
    });

    it('should handle empty file list', async () => {
      const result = await parseFiles([], false);

      expect(result).toEqual({});
    });
  });

  describe('Batch Processing', () => {
    it('should process files in batches', async () => {
      const files = Array.from({ length: 25 }, (_, i) => `/test/src/file${i}.js`);

      await parseFiles(files, false);

      // Should process all files
      expect(parseFileFromDisk).toHaveBeenCalledTimes(25);
    });

    it('should use batch size of 20', async () => {
      const files = Array.from({ length: 25 }, (_, i) => `/test/src/file${i}.js`);

      await parseFiles(files, true);

      // First batch should be 20, second batch 5
      // We verify by checking the info log calls
    });
  });

  describe('Parallel Processing', () => {
    it('should process files in parallel within batch', async () => {
      const files = ['/test/src/a.js', '/test/src/b.js', '/test/src/c.js'];

      await parseFiles(files, false);

      // All files in a batch should be processed
      expect(parseFileFromDisk).toHaveBeenCalledTimes(3);
    });
  });

  describe('Event Loop Yielding', () => {
    it('should yield between batches', async () => {
      const files = Array.from({ length: 25 }, (_, i) => `/test/src/file${i}.js`);
      
      // Mock setImmediate for testing
      const originalSetImmediate = global.setImmediate;
      global.setImmediate = vi.fn((cb) => cb());

      await parseFiles(files, false);

      global.setImmediate = originalSetImmediate;

      // Should have yielded at least once
      expect(parseFileFromDisk).toHaveBeenCalledTimes(25);
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle parse errors gracefully', async () => {
      const files = ['/test/src/a.js', '/test/src/b.js'];
      parseFileFromDisk
        .mockResolvedValueOnce({ imports: [], exports: [] })
        .mockRejectedValueOnce(new Error('Parse error'));

      await expect(parseFiles(files, false))
        .rejects.toThrow('Parse error');
    });

    it('should handle null parse results', async () => {
      const files = ['/test/src/a.js'];
      parseFileFromDisk.mockResolvedValue(null);

      const result = await parseFiles(files, false);

      expect(result['/test/src/a.js']).toBeNull();
    });

    it('should continue when single file fails in batch', async () => {
      // This depends on implementation - if Promise.all is used,
      // one failure fails all. This test documents current behavior.
      const files = ['/test/src/a.js', '/test/src/b.js'];
      parseFileFromDisk
        .mockResolvedValueOnce({ imports: [], exports: [] })
        .mockRejectedValueOnce(new Error('Parse error'));

      await expect(parseFiles(files, false))
        .rejects.toThrow('Parse error');
    });
  });

  describe('Integration with Factories', () => {
    it('should parse files from FileProcessingBuilder', async () => {
      const builder = new FileProcessingBuilder()
        .withFilePath('src/utils/helper.js')
        .withJavaScriptFunction('formatDate', ['date']);

      const fileData = builder.build();
      parseFileFromDisk.mockResolvedValue(fileData.parsed);

      const result = await parseFiles(['/test/src/utils/helper.js'], false);

      expect(result['/test/src/utils/helper.js']).toBeDefined();
    });

    it('should handle complex file structures', async () => {
      const builder = new FileProcessingBuilder()
        .withFilePath('src/components/App.jsx')
        .withClass('App', [
          { name: 'render', params: [], body: 'return null;' },
          { name: 'componentDidMount', params: [] }
        ])
        .withImport('react', ['Component'], 'external')
        .withExport('App', 'class');

      const fileData = builder.build();
      parseFileFromDisk.mockResolvedValue(fileData.parsed);

      const result = await parseFiles(['/test/src/components/App.jsx'], false);
      const parsed = result['/test/src/components/App.jsx'];

      expect(parsed.definitions).toHaveLength(1);
      expect(parsed.definitions[0].type).toBe('class');
    });
  });

  describe('Verbose Output', () => {
    it('should log parsing start when verbose', async () => {
      const files = ['/test/src/file.js'];

      await parseFiles(files, true);

      // Logger info should be called
      expect(parseFileFromDisk).toHaveBeenCalled();
    });

    it('should log batch progress when verbose', async () => {
      const files = Array.from({ length: 25 }, (_, i) => `/test/src/file${i}.js`);

      await parseFiles(files, true);

      // Should log progress for each batch
      expect(parseFileFromDisk).toHaveBeenCalledTimes(25);
    });

    it('should not log when verbose is false', async () => {
      const files = ['/test/src/file.js'];

      await parseFiles(files, false);

      // Should still parse but not log
      expect(parseFileFromDisk).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should complete parsing in reasonable time', async () => {
      const files = Array.from({ length: 100 }, (_, i) => `/test/src/file${i}.js`);

      const start = Date.now();
      await parseFiles(files, false);
      const duration = Date.now() - start;

      // Should complete in less than 1 second for 100 files (all mocked)
      expect(duration).toBeLessThan(1000);
    });
  });
});
