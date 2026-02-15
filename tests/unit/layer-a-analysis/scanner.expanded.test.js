/**
 * @fileoverview Expanded Tests for scanner.js - File Discovery
 * 
 * Additional comprehensive tests for edge cases and project detection.
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

describe('scanner.js - Expanded Tests', () => {
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

  describe('scanProject - Edge Cases', () => {
    it('should handle empty project directory', async () => {
      mockGlob.mockResolvedValue([]);
      
      const result = await scanProject('/empty-project');
      
      expect(result).toEqual([]);
    });

    it('should handle project with only node_modules', async () => {
      mockGlob.mockResolvedValue([]);
      
      const result = await scanProject('/node-only-project');
      
      expect(result).toEqual([]);
    });

    it('should handle deeply nested file structures', async () => {
      const deepFiles = [
        'src/components/ui/forms/inputs/TextInput.tsx',
        'src/features/user/profile/settings/SecuritySettings.tsx',
        'src/utils/helpers/string/formatters/capitalize.ts'
      ];
      mockGlob.mockResolvedValue(deepFiles);
      
      const result = await scanProject('/deep-project');
      
      expect(result).toHaveLength(3);
      expect(result[0]).toBe('src/components/ui/forms/inputs/TextInput.tsx');
    });

    it('should handle files with special characters in paths', async () => {
      const specialFiles = [
        'src/[id]/dynamic.ts',
        'src/(group)/layout.ts',
        'src/@types/global.ts'
      ];
      mockGlob.mockResolvedValue(specialFiles);
      
      const result = await scanProject('/special-project');
      
      expect(result).toHaveLength(3);
    });

    it('should handle very long file paths', async () => {
      const longPath = 'src/' + 'a/'.repeat(50) + 'file.js';
      mockGlob.mockResolvedValue([longPath]);
      
      const result = await scanProject('/long-path-project');
      
      expect(result).toHaveLength(1);
    });
  });

  describe('scanProject - Options Handling', () => {
    it('should handle all supported extensions', async () => {
      mockGlob.mockResolvedValue([
        'file.js', 'file.ts', 'file.jsx', 'file.tsx', 
        'file.mjs', 'file.cjs'
      ]);
      
      const result = await scanProject('/test');
      
      expect(result).toHaveLength(6);
    });

    it('should combine multiple include patterns', async () => {
      mockGlob.mockResolvedValue([]);
      
      await scanProject('/test', { 
        includePatterns: ['src/**/*.js', 'lib/**/*.js', 'tests/**/*.test.js'] 
      });
      
      const patterns = mockGlob.mock.calls[0][0];
      expect(patterns).toContain('src/**/*.js');
      expect(patterns).toContain('lib/**/*.js');
      expect(patterns).toContain('tests/**/*.test.js');
    });

    it('should handle negative exclude patterns', async () => {
      mockGlob.mockResolvedValue([]);
      
      await scanProject('/test', { 
        excludePatterns: ['!src/**/*.test.js']
      });
      
      const options = mockGlob.mock.calls[0][1];
      expect(options.ignore).toContain('!src/**/*.test.js');
    });
  });

  describe('scanProject - .averignore Handling', () => {
    it('should handle .averignore with comments', async () => {
      mockGlob.mockResolvedValue([]);
      mockFs.readFile.mockResolvedValue(`
# This is a comment
build
dist
# Another comment
temp
`);
      
      await scanProject('/test', { readAverIgnore: true });
      
      const options = mockGlob.mock.calls[0][1];
      expect(options.ignore).toContain('**/build/**');
      expect(options.ignore).toContain('**/dist/**');
      expect(options.ignore).toContain('**/temp/**');
    });

    it('should handle .averignore with empty lines', async () => {
      mockGlob.mockResolvedValue([]);
      mockFs.readFile.mockResolvedValue(`
build

dist


temp
`);
      
      await scanProject('/test', { readAverIgnore: true });
      
      const options = mockGlob.mock.calls[0][1];
      // Should not have empty string entries
      expect(options.ignore.every(i => i.length > 0)).toBe(true);
    });

    it('should handle .averignore with negation patterns', async () => {
      mockGlob.mockResolvedValue([]);
      mockFs.readFile.mockResolvedValue(`
build
!important.build.js
`);
      
      await scanProject('/test', { readAverIgnore: true });
      
      const options = mockGlob.mock.calls[0][1];
      expect(options.ignore).toContain('!important.build.js');
    });

    it('should skip reading .averignore when readAverIgnore is false', async () => {
      mockGlob.mockResolvedValue([]);
      
      await scanProject('/test', { readAverIgnore: false });
      
      expect(mockFs.readFile).not.toHaveBeenCalledWith(
        expect.stringContaining('.averignore'),
        expect.any(String)
      );
    });
  });

  describe('detectProjectInfo - Extended Cases', () => {
    it('should detect all config files present', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({ name: 'test', version: '1.0.0' }));
      mockFs.stat.mockResolvedValue({});
      
      const result = await detectProjectInfo('/full-project');
      
      expect(result.hasPackageJson).toBe(true);
      expect(result.hasTsConfig).toBe(true);
      expect(result.hasJsConfig).toBe(true);
      expect(result.useTypeScript).toBe(true);
    });

    it('should handle package.json with complex structure', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        name: 'complex-project',
        version: '2.0.0',
        type: 'module',
        imports: {
          '#utils/*': './src/utils/*'
        },
        dependencies: {
          react: '^18.0.0'
        }
      }));
      mockFs.stat.mockRejectedValue(new Error('Not found'));
      
      const result = await detectProjectInfo('/complex-project');
      
      expect(result.hasPackageJson).toBe(true);
      expect(result.packageJson.type).toBe('module');
      expect(result.packageJson.imports).toBeDefined();
    });

    it('should handle tsconfig.json with comments (invalid JSON)', async () => {
      mockFs.readFile
        .mockRejectedValueOnce(new Error('Not found'))  // package.json
        .mockResolvedValueOnce(`{
          // This is a comment
          "compilerOptions": {
            "target": "ES2020"
          }
        }`);  // tsconfig.json with comments
      mockFs.stat.mockRejectedValue(new Error('Not found'));
      
      const result = await detectProjectInfo('/ts-project');
      
      // JSON with comments will fail to parse
      expect(result.hasTsConfig).toBe(false);
    });

    it('should handle permission errors when reading files', async () => {
      mockFs.readFile.mockRejectedValue(new Error('EACCES: permission denied'));
      mockFs.stat.mockRejectedValue(new Error('EACCES: permission denied'));
      
      const result = await detectProjectInfo('/restricted-project');
      
      expect(result.hasPackageJson).toBe(false);
      expect(result.hasTsConfig).toBe(false);
    });

    it('should handle null/undefined package.json content gracefully', async () => {
      mockFs.readFile.mockResolvedValue('null');
      mockFs.stat.mockRejectedValue(new Error('Not found'));
      
      const result = await detectProjectInfo('/null-project');
      
      expect(result.hasPackageJson).toBe(false);
    });
  });
});
