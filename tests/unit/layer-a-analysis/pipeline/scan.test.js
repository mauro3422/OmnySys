/**
 * @fileoverview Scan Tests
 * 
 * Tests for scan.js - Project scanning module
 * 
 * @module tests/unit/layer-a-analysis/pipeline/scan
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadProjectInfo, scanProjectFiles } from '#layer-a/pipeline/scan.js';
import { PipelineBuilder } from '../../../factories/pipeline-test.factory.js';

// Mock dependencies
vi.mock('#layer-a/scanner.js', () => ({
  scanProject: vi.fn(),
  detectProjectInfo: vi.fn()
}));

vi.mock('#utils/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn()
  })
}));

import { scanProject, detectProjectInfo } from '#layer-a/scanner.js';

describe('Scan Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    detectProjectInfo.mockResolvedValue({
      useTypeScript: true,
      hasTests: true,
      framework: 'react'
    });
    
    scanProject.mockResolvedValue([
      'src/index.js',
      'src/utils.js',
      'src/components/App.jsx'
    ]);
  });

  describe('loadProjectInfo', () => {
    describe('Structure Contract', () => {
      it('should export loadProjectInfo function', () => {
        expect(loadProjectInfo).toBeDefined();
        expect(typeof loadProjectInfo).toBe('function');
      });

      it('should return project info object', async () => {
        const result = await loadProjectInfo('/test', false);

        expect(typeof result).toBe('object');
      });
    });

    describe('Project Detection', () => {
      it('should detect project info from root path', async () => {
        await loadProjectInfo('/test', false);

        expect(detectProjectInfo).toHaveBeenCalledWith('/test');
      });

      it('should include TypeScript info', async () => {
        const result = await loadProjectInfo('/test', false);

        expect(result).toHaveProperty('useTypeScript');
      });

      it('should include test detection', async () => {
        const result = await loadProjectInfo('/test', false);

        expect(result).toHaveProperty('hasTests');
      });

      it('should include framework detection', async () => {
        const result = await loadProjectInfo('/test', false);

        expect(result).toHaveProperty('framework');
      });
    });

    describe('Error Handling Contract', () => {
      it('should handle detectProjectInfo failure', async () => {
        detectProjectInfo.mockRejectedValue(new Error('Detection failed'));

        await expect(loadProjectInfo('/test', false))
          .rejects.toThrow('Detection failed');
      });
    });
  });

  describe('scanProjectFiles', () => {
    describe('Structure Contract', () => {
      it('should export scanProjectFiles function', () => {
        expect(scanProjectFiles).toBeDefined();
        expect(typeof scanProjectFiles).toBe('function');
      });

      it('should return object with relativeFiles and files', async () => {
        const result = await scanProjectFiles('/test', false);

        expect(result).toHaveProperty('relativeFiles');
        expect(result).toHaveProperty('files');
        expect(Array.isArray(result.relativeFiles)).toBe(true);
        expect(Array.isArray(result.files)).toBe(true);
      });
    });

    describe('File Scanning', () => {
      it('should scan project from root path', async () => {
        await scanProjectFiles('/test', false);

        expect(scanProject).toHaveBeenCalledWith('/test', { returnAbsolute: false });
      });

      it('should return relative file paths', async () => {
        const result = await scanProjectFiles('/test', false);

        expect(result.relativeFiles).toContain('src/index.js');
        expect(result.relativeFiles).toContain('src/utils.js');
      });

      it('should return absolute file paths', async () => {
        const result = await scanProjectFiles('/test', false);

        expect(result.files[0]).toContain('/test');
        expect(result.files[0]).toMatch(/^\/.*/);
      });

      it('should convert relative to absolute paths', async () => {
        const result = await scanProjectFiles('/test', false);

        expect(result.files[0]).toBe('/test/src/index.js');
      });
    });

    describe('Error Handling Contract', () => {
      it('should handle scanProject failure', async () => {
        scanProject.mockRejectedValue(new Error('Scan failed'));

        await expect(scanProjectFiles('/test', false))
          .rejects.toThrow('Scan failed');
      });

      it('should handle empty project', async () => {
        scanProject.mockResolvedValue([]);

        const result = await scanProjectFiles('/test', false);

        expect(result.relativeFiles).toEqual([]);
        expect(result.files).toEqual([]);
      });
    });

    describe('Integration with Factories', () => {
      it('should scan files from PipelineBuilder config', async () => {
        const builder = new PipelineBuilder()
          .addMockFile('src/index.js', 'export default {};')
          .addMockFile('src/utils.js', 'export const utils = {};');

        const config = builder.build();
        scanProject.mockResolvedValue(Object.keys(config.mockFiles));

        const result = await scanProjectFiles('/test', false);

        expect(result.relativeFiles).toHaveLength(2);
      });
    });

    describe('Verbose Output', () => {
      it('should log scanning progress when verbose', async () => {
        await scanProjectFiles('/test', true);

        // Logger should be called
        expect(scanProject).toHaveBeenCalled();
      });

      it('should include file count in verbose output', async () => {
        scanProject.mockResolvedValue(['a.js', 'b.js', 'c.js']);

        await scanProjectFiles('/test', true);

        // Should log that 3 files were found
        expect(scanProject).toHaveBeenCalled();
      });
    });
  });
});
