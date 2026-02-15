/**
 * @fileoverview Tests for scanner.js - File Discovery
 * 
 * Tests the scanProject and detectProjectInfo functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scanProject, detectProjectInfo } from '../../../src/layer-a-static/scanner.js';

// Mock dependencies
vi.mock('fast-glob', () => ({
  default: vi.fn()
}));

vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    stat: vi.fn()
  }
}));

describe('scanner.js', () => {
  let mockGlob;
  let mockFs;

  beforeEach(async () => {
    const glob = await import('fast-glob');
    mockGlob = glob.default;
    mockGlob.mockReset();
    
    const fs = await import('fs/promises');
    mockFs = fs.default;
    mockFs.readFile.mockReset();
    mockFs.stat.mockReset();
  });

  describe('scanProject', () => {
    it('should return array of file paths', async () => {
      mockGlob.mockResolvedValue(['src/index.js', 'src/utils.js']);
      
      const result = await scanProject('/test-project');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should normalize paths to forward slashes', async () => {
      mockGlob.mockResolvedValue(['src\\\\index.js', 'src\\\\utils.js']);
      
      const result = await scanProject('/test-project');
      
      expect(result[0]).toBe('src/index.js');
      expect(result[1]).toBe('src/utils.js');
    });

    it('should sort results alphabetically', async () => {
      mockGlob.mockResolvedValue(['z.js', 'a.js', 'm.js']);
      
      const result = await scanProject('/test-project');
      
      expect(result).toEqual(['a.js', 'm.js', 'z.js']);
    });

    it('should use supported extensions in glob pattern', async () => {
      mockGlob.mockResolvedValue([]);
      
      await scanProject('/test-project');
      
      const patterns = mockGlob.mock.calls[0][0];
      expect(patterns).toContain('**/*.js');
      expect(patterns).toContain('**/*.ts');
      expect(patterns).toContain('**/*.jsx');
      expect(patterns).toContain('**/*.tsx');
      expect(patterns).toContain('**/*.mjs');
      expect(patterns).toContain('**/*.cjs');
    });

    it('should ignore specified directories', async () => {
      mockGlob.mockResolvedValue([]);
      
      await scanProject('/test-project');
      
      const options = mockGlob.mock.calls[0][1];
      expect(options.ignore).toContain('**/node_modules/**');
      expect(options.ignore).toContain('**/dist/**');
      expect(options.ignore).toContain('**/.git/**');
    });

    it('should handle custom include patterns', async () => {
      mockGlob.mockResolvedValue([]);
      
      await scanProject('/test-project', { includePatterns: ['custom/**/*.js'] });
      
      const patterns = mockGlob.mock.calls[0][0];
      expect(patterns).toContain('custom/**/*.js');
    });

    it('should handle custom exclude patterns', async () => {
      mockGlob.mockResolvedValue([]);
      
      await scanProject('/test-project', { excludePatterns: ['test/**'] });
      
      const options = mockGlob.mock.calls[0][1];
      expect(options.ignore).toContain('test/**');
    });

    it('should return absolute paths when returnAbsolute is true', async () => {
      mockGlob.mockResolvedValue(['src/index.js']);
      
      const result = await scanProject('/test-project', { returnAbsolute: true });
      
      expect(result[0].includes('/test-project') || /^[A-Z]:\\/.test(result[0])).toBe(true);
    });

    it('should read .averignore when readAverIgnore is true', async () => {
      mockGlob.mockResolvedValue([]);
      mockFs.readFile.mockResolvedValue('build\\ndist\\ntemp');
      
      await scanProject('/test-project', { readAverIgnore: true });
      
      const options = mockGlob.mock.calls[0][1];
      expect(options.ignore).toContain('**/build/**');
      expect(options.ignore).toContain('**/dist/**');
    });

    it('should handle missing .averignore gracefully', async () => {
      mockGlob.mockResolvedValue([]);
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      
      const result = await scanProject('/test-project');
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array on error', async () => {
      mockGlob.mockRejectedValue(new Error('Glob error'));
      
      const result = await scanProject('/test-project');
      
      expect(result).toEqual([]);
    });
  });

  describe('detectProjectInfo', () => {
    it('should detect package.json', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({ name: 'test', version: '1.0.0' }));
      mockFs.stat.mockRejectedValue(new Error('Not found'));
      
      const result = await detectProjectInfo('/test-project');
      
      expect(result.hasPackageJson).toBe(true);
      expect(result.packageJson.name).toBe('test');
    });

    it('should detect tsconfig.json', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Not found'));
      mockFs.stat
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce({});
      
      const result = await detectProjectInfo('/test-project');
      
      expect(result.hasTsConfig).toBe(true);
      expect(result.useTypeScript).toBe(true);
    });

    it('should detect jsconfig.json', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Not found'));
      mockFs.stat
        .mockRejectedValueOnce(new Error('Not found'))
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce({});
      
      const result = await detectProjectInfo('/test-project');
      
      expect(result.hasJsConfig).toBe(true);
    });

    it('should handle missing all config files', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Not found'));
      mockFs.stat.mockRejectedValue(new Error('Not found'));
      
      const result = await detectProjectInfo('/test-project');
      
      expect(result.hasPackageJson).toBe(false);
      expect(result.hasTsConfig).toBe(false);
      expect(result.hasJsConfig).toBe(false);
      expect(result.useTypeScript).toBe(false);
    });

    it('should handle invalid JSON in package.json', async () => {
      mockFs.readFile.mockResolvedValue('invalid json');
      mockFs.stat.mockRejectedValue(new Error('Not found'));
      
      const result = await detectProjectInfo('/test-project');
      
      expect(result.hasPackageJson).toBe(false);
      expect(result.packageJson).toBeNull();
    });
  });
});
