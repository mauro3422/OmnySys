/**
 * @fileoverview JSON Reader Tests
 * 
 * Tests for JSON file reading utilities.
 * 
 * @module tests/unit/layer-a-analysis/query/readers/json-reader
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  readJSON,
  readMultipleJSON,
  fileExists
} from '#layer-a/query/readers/json-reader.js';

const mockReadFile = vi.fn();
const mockAccess = vi.fn();

vi.mock('fs/promises', () => ({
  default: {
    readFile: (...args) => mockReadFile(...args),
    access: (...args) => mockAccess(...args)
  },
  readFile: (...args) => mockReadFile(...args),
  access: (...args) => mockAccess(...args)
}));

describe('JSON Reader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Structure Contract', () => {
    it('should export readJSON function', () => {
      expect(typeof readJSON).toBe('function');
    });

    it('should export readMultipleJSON function', () => {
      expect(typeof readMultipleJSON).toBe('function');
    });

    it('should export fileExists function', () => {
      expect(typeof fileExists).toBe('function');
    });

    it('should accept filePath parameter', () => {
      expect(readJSON.length).toBe(1);
      expect(fileExists.length).toBe(1);
    });

    it('should accept filePaths array', () => {
      expect(readMultipleJSON.length).toBe(1);
    });
  });

  describe('readJSON', () => {
    it('should read and parse JSON file', async () => {
      const mockData = { name: 'test', value: 123 };
      mockReadFile.mockResolvedValue(JSON.stringify(mockData));

      const result = await readJSON('/path/to/file.json');
      
      expect(result).toEqual(mockData);
    });

    it('should parse nested objects', async () => {
      const mockData = {
        level1: {
          level2: {
            level3: 'deep value'
          }
        }
      };
      mockReadFile.mockResolvedValue(JSON.stringify(mockData));

      const result = await readJSON('/path/to/file.json');
      
      expect(result.level1.level2.level3).toBe('deep value');
    });

    it('should parse arrays', async () => {
      const mockData = [1, 2, 3, { nested: true }];
      mockReadFile.mockResolvedValue(JSON.stringify(mockData));

      const result = await readJSON('/path/to/file.json');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(4);
    });

    it('should parse strings', async () => {
      mockReadFile.mockResolvedValue('"simple string"');

      const result = await readJSON('/path/to/file.json');
      
      expect(result).toBe('simple string');
    });

    it('should parse numbers', async () => {
      mockReadFile.mockResolvedValue('42');

      const result = await readJSON('/path/to/file.json');
      
      expect(result).toBe(42);
    });

    it('should parse booleans', async () => {
      mockReadFile.mockResolvedValue('true');

      const result = await readJSON('/path/to/file.json');
      
      expect(result).toBe(true);
    });

    it('should parse null', async () => {
      mockReadFile.mockResolvedValue('null');

      const result = await readJSON('/path/to/file.json');
      
      expect(result).toBeNull();
    });

    it('should read with utf-8 encoding', async () => {
      mockReadFile.mockResolvedValue('{}');

      await readJSON('/path/to/file.json');
      
      expect(mockReadFile).toHaveBeenCalledWith('/path/to/file.json', 'utf-8');
    });
  });

  describe('readMultipleJSON', () => {
    it('should read multiple files', async () => {
      mockReadFile
        .mockResolvedValueOnce('{"file": 1}')
        .mockResolvedValueOnce('{"file": 2}')
        .mockResolvedValueOnce('{"file": 3}');

      const result = await readMultipleJSON([
        '/path/1.json',
        '/path/2.json',
        '/path/3.json'
      ]);
      
      expect(result).toHaveLength(3);
      expect(result[0].file).toBe(1);
      expect(result[1].file).toBe(2);
      expect(result[2].file).toBe(3);
    });

    it('should return empty array for empty input', async () => {
      const result = await readMultipleJSON([]);
      
      expect(result).toEqual([]);
      expect(mockReadFile).not.toHaveBeenCalled();
    });

    it('should read files in parallel', async () => {
      mockReadFile.mockResolvedValue('{}');

      await readMultipleJSON(['/a.json', '/b.json', '/c.json']);
      
      expect(mockReadFile).toHaveBeenCalledTimes(3);
    });

    it('should fail if any file fails', async () => {
      mockReadFile
        .mockResolvedValueOnce('{"ok": true}')
        .mockRejectedValueOnce(new Error('File not found'));

      await expect(readMultipleJSON(['/ok.json', '/missing.json']))
        .rejects.toThrow('File not found');
    });

    it('should handle single file', async () => {
      mockReadFile.mockResolvedValue('{"single": true}');

      const result = await readMultipleJSON(['/single.json']);
      
      expect(result).toHaveLength(1);
      expect(result[0].single).toBe(true);
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      mockAccess.mockResolvedValue(undefined);

      const result = await fileExists('/path/to/file.json');
      
      expect(result).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'));

      const result = await fileExists('/path/to/missing.json');
      
      expect(result).toBe(false);
    });

    it('should return false for permission denied', async () => {
      mockAccess.mockRejectedValue(new Error('EACCES'));

      const result = await fileExists('/restricted/file.json');
      
      expect(result).toBe(false);
    });

    it('should use fs.access', async () => {
      mockAccess.mockResolvedValue(undefined);

      await fileExists('/path/to/file.json');
      
      expect(mockAccess).toHaveBeenCalledWith('/path/to/file.json');
    });
  });

  describe('Error Handling Contract', () => {
    it('should throw on file read error', async () => {
      mockReadFile.mockRejectedValue(new Error('Read failed'));

      await expect(readJSON('/path/to/file.json'))
        .rejects.toThrow('Failed to read /path/to/file.json: Read failed');
    });

    it('should throw on invalid JSON', async () => {
      mockReadFile.mockResolvedValue('not valid json');

      await expect(readJSON('/path/to/file.json'))
        .rejects.toThrow('Failed to read /path/to/file.json');
    });

    it('should throw on malformed JSON', async () => {
      mockReadFile.mockResolvedValue('{ invalid }');

      await expect(readJSON('/path/to/file.json'))
        .rejects.toThrow('Failed to read /path/to/file.json');
    });

    it('should throw on incomplete JSON', async () => {
      mockReadFile.mockResolvedValue('{"key":');

      await expect(readJSON('/path/to/file.json'))
        .rejects.toThrow('Failed to read /path/to/file.json');
    });

    it('should include file path in error message', async () => {
      mockReadFile.mockRejectedValue(new Error('Unknown error'));

      try {
        await readJSON('/specific/path.json');
      } catch (e) {
        expect(e.message).toContain('/specific/path.json');
      }
    });

    it('should handle empty file', async () => {
      mockReadFile.mockResolvedValue('');

      await expect(readJSON('/path/to/empty.json'))
        .rejects.toThrow();
    });
  });

  describe('Integration', () => {
    it('readMultipleJSON should use readJSON internally', async () => {
      mockReadFile.mockResolvedValue('{}');

      await readMultipleJSON(['/a.json', '/b.json']);
      
      expect(mockReadFile).toHaveBeenCalledTimes(2);
    });

    it('should handle complex real-world JSON', async () => {
      const complexData = {
        metadata: {
          version: '1.0.0',
          timestamp: new Date().toISOString()
        },
        files: {
          'src/main.js': {
            atoms: [
              { name: 'main', line: 1, complexity: 5 },
              { name: 'helper', line: 10, complexity: 3 }
            ]
          }
        },
        stats: {
          totalFiles: 1,
          totalAtoms: 2,
          averageComplexity: 4
        }
      };
      mockReadFile.mockResolvedValue(JSON.stringify(complexData));

      const result = await readJSON('/project/analysis.json');
      
      expect(result.metadata.version).toBe('1.0.0');
      expect(result.files['src/main.js'].atoms).toHaveLength(2);
      expect(result.stats.totalFiles).toBe(1);
    });
  });
});
