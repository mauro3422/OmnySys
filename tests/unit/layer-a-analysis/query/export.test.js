/**
 * @fileoverview Export Module Tests
 * 
 * Tests for the export functionality including system map export.
 * 
 * @module tests/unit/layer-a-analysis/query/export
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportFullSystemMapToFile } from '#layer-a/query/export.js';
import { QueryScenarios, MockFileSystem } from '../../../factories/query-test.factory.js';

// Mock fs/promises
const mockWriteFile = vi.fn();
const mockMkdir = vi.fn();
const mockStat = vi.fn();

vi.mock('fs/promises', () => ({
  default: {
    writeFile: (...args) => mockWriteFile(...args),
    mkdir: (...args) => mockMkdir(...args),
    stat: (...args) => mockStat(...args)
  },
  writeFile: (...args) => mockWriteFile(...args),
  mkdir: (...args) => mockMkdir(...args),
  stat: (...args) => mockStat(...args)
}));

vi.mock('#layer-a/query/readers/json-reader.js', () => ({
  readJSON: vi.fn((path) => {
    if (path.includes('index.json')) {
      return Promise.resolve({
        metadata: { version: '1.0.0' },
        fileIndex: { 'src/main.js': {}, 'src/utils.js': {} }
      });
    }
    if (path.includes('shared-state.json')) {
      return Promise.resolve({ connections: [], total: 0 });
    }
    if (path.includes('event-listeners.json')) {
      return Promise.resolve({ connections: [], total: 0 });
    }
    if (path.includes('assessment.json')) {
      return Promise.resolve({});
    }
    if (path.includes('files/')) {
      return Promise.resolve({ path: 'test.js', atoms: [] });
    }
    return Promise.resolve({});
  }),
  fileExists: vi.fn(() => Promise.resolve(true))
}));

vi.mock('#layer-a/storage/storage-manager.js', () => ({
  getDataDirectory: vi.fn((projectPath) => `${projectPath}/.omnysysdata`)
}));

describe('Export Module', () => {
  beforeEach(() => {
    mockWriteFile.mockReset();
    mockMkdir.mockReset();
    mockStat.mockReset();
    
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockStat.mockResolvedValue({ size: 1024 });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Structure Contract', () => {
    it('should export exportFullSystemMapToFile function', () => {
      expect(typeof exportFullSystemMapToFile).toBe('function');
    });

    it('should accept projectPath and optional outputPath', () => {
      // The function signature is (projectPath, outputPath = null)
      // So length is 1 (only required params count)
      expect(exportFullSystemMapToFile.length).toBeLessThanOrEqual(2);
    });

    it('should return Promise with result object', async () => {
      const result = exportFullSystemMapToFile('/test/project');
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('Export Functionality', () => {
    it('should create output directory if not exists', async () => {
      await exportFullSystemMapToFile('/test/project');
      
      expect(mockMkdir).toHaveBeenCalled();
    });

    it('should write JSON file with system map', async () => {
      await exportFullSystemMapToFile('/test/project');
      
      expect(mockWriteFile).toHaveBeenCalled();
      const call = mockWriteFile.mock.calls[0];
      expect(typeof call[1]).toBe('string'); // JSON content
    });

    it('should include metadata in exported file', async () => {
      await exportFullSystemMapToFile('/test/project');
      
      const content = mockWriteFile.mock.calls[0][1];
      const data = JSON.parse(content);
      expect(data.metadata).toBeDefined();
    });

    it('should include files section', async () => {
      await exportFullSystemMapToFile('/test/project');
      
      const content = mockWriteFile.mock.calls[0][1];
      const data = JSON.parse(content);
      expect(data.files).toBeDefined();
      expect(typeof data.files).toBe('object');
    });

    it('should include connections section', async () => {
      await exportFullSystemMapToFile('/test/project');
      
      const content = mockWriteFile.mock.calls[0][1];
      const data = JSON.parse(content);
      expect(data.connections).toBeDefined();
      expect(Array.isArray(data.connections.sharedState)).toBe(true);
      expect(Array.isArray(data.connections.eventListeners)).toBe(true);
    });

    it('should include risks section', async () => {
      await exportFullSystemMapToFile('/test/project');
      
      const content = mockWriteFile.mock.calls[0][1];
      const data = JSON.parse(content);
      expect(data.risks).toBeDefined();
    });

    it('should include export timestamp', async () => {
      await exportFullSystemMapToFile('/test/project');
      
      const content = mockWriteFile.mock.calls[0][1];
      const data = JSON.parse(content);
      expect(data.exportedAt).toBeDefined();
      expect(new Date(data.exportedAt).toISOString()).toBe(data.exportedAt);
    });
  });

  describe('Return Value', () => {
    it('should return filePath', async () => {
      const result = await exportFullSystemMapToFile('/test/project');
      
      expect(result.filePath).toBeDefined();
      expect(typeof result.filePath).toBe('string');
    });

    it('should return sizeKB', async () => {
      const result = await exportFullSystemMapToFile('/test/project');
      
      expect(result.sizeKB).toBeDefined();
      expect(typeof result.sizeKB).toBe('string');
    });

    it('should return filesExported count', async () => {
      const result = await exportFullSystemMapToFile('/test/project');
      
      expect(result.filesExported).toBeDefined();
      expect(typeof result.filesExported).toBe('number');
    });
  });

  describe('Output Path Options', () => {
    it('should use default path when outputPath not provided', async () => {
      await exportFullSystemMapToFile('/test/project');
      
      const filePath = mockWriteFile.mock.calls[0][0];
      expect(filePath).toContain('debug');
      expect(filePath).toContain('system-map-full.json');
    });

    it('should use custom path when provided', async () => {
      const customPath = '/custom/output.json';
      await exportFullSystemMapToFile('/test/project', customPath);
      
      const filePath = mockWriteFile.mock.calls[0][0];
      expect(filePath).toBe(customPath);
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle missing index.json gracefully', async () => {
      // Reset mocks for this test
      vi.resetAllMocks();
      
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockRejectedValue(new Error('File not found'));
      
      await expect(exportFullSystemMapToFile('/test/project')).rejects.toThrow();
    });

    it('should handle write errors', async () => {
      mockWriteFile.mockRejectedValue(new Error('Write failed'));
      
      await expect(exportFullSystemMapToFile('/test/project')).rejects.toThrow();
    });
  });
});
