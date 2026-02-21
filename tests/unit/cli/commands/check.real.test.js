/**
 * @fileoverview check.test.js - VERSION MIGRADA (Sin Mocks)
 * 
 * Este test usa factories reales en lugar de mocks.
 * Demuestra como migrar de mocks a implementaciones reales.
 * 
 * @module tests/unit/cli/commands/check.real.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { withSandbox } from '../../../factories/real/index.js';
import { checkLogic, check } from '#cli/commands/check.js';
import { hasExistingAnalysis } from '#layer-c/storage/setup/index.js';

describe('checkLogic (Real Factories)', () => {
  
  describe('validation', () => {
    it('returns error when no filePath provided', async () => {
      await withSandbox({}, async (sandbox) => {
        const result = await checkLogic(null, { silent: true, projectPath: sandbox.baseDir });
        
        expect(result.success).toBe(false);
        expect(result.exitCode).toBe(1);
        expect(result.error).toBe('No file specified');
      });
    });

    it('returns error when filePath is empty string', async () => {
      await withSandbox({}, async (sandbox) => {
        const result = await checkLogic('', { silent: true, projectPath: sandbox.baseDir });
        
        expect(result.success).toBe(false);
        expect(result.exitCode).toBe(1);
        expect(result.error).toBe('No file specified');
      });
    });
  });

  describe('with analysis data', () => {
    it('returns error when no analysis data exists', async () => {
      await withSandbox({
        'test.js': 'export const test = 1;'
        // No .omnysysdata directory = no analysis
      }, async (sandbox) => {
        const result = await checkLogic('test.js', { 
          silent: true, 
          projectPath: sandbox.baseDir 
        });

        expect(result.success).toBe(false);
        expect(result.exitCode).toBe(1);
        expect(result.error).toBe('No analysis data found');
      });
    });

    it('returns error when file not found in system map', async () => {
      await withSandbox({
        'test.js': 'export const test = 1;',
        '.omnysysdata/system-map-enhanced.json': JSON.stringify({
          files: {
            'src/other.js': { functions: [], exports: [], imports: [] }
          }
        })
      }, async (sandbox) => {
        const result = await checkLogic('test.js', { 
          silent: true, 
          projectPath: sandbox.baseDir 
        });

        expect(result.success).toBe(false);
        expect(result.exitCode).toBe(1);
        expect(result.error).toContain('File not found in analysis');
      });
    });

    it('returns file data when file exists in system map', async () => {
      const systemMap = {
        files: {
          'test.js': {
            functions: [{ name: 'hello' }],
            exports: [{ name: 'default' }],
            imports: [{ source: 'lodash' }],
            dependsOn: ['utils.js'],
            usedBy: ['main.js'],
            riskScore: { total: 5, severity: 'medium' }
          }
        }
      };

      await withSandbox({
        'test.js': 'export const test = 1;',
        '.omnysysdata/system-map-enhanced.json': JSON.stringify(systemMap)
      }, async (sandbox) => {
        const result = await checkLogic('test.js', { 
          silent: true, 
          projectPath: sandbox.baseDir 
        });

        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
        expect(result.fileData).toBeDefined();
        expect(result.fileData.functions).toHaveLength(1);
        expect(result.fileData.exports).toHaveLength(1);
        expect(result.output).toContain('FILE METRICS');
      });
    });

    it('includes semantic connections in output', async () => {
      const systemMap = {
        files: {
          'test.js': {
            functions: [],
            exports: [],
            imports: [],
            semanticConnections: [
              { type: 'event', target: 'click', key: 'onclick' }
            ]
          }
        }
      };

      await withSandbox({
        'test.js': 'export const test = 1;',
        '.omnysysdata/system-map-enhanced.json': JSON.stringify(systemMap)
      }, async (sandbox) => {
        const result = await checkLogic('test.js', { 
          silent: true, 
          projectPath: sandbox.baseDir 
        });

        expect(result.success).toBe(true);
        expect(result.output).toContain('SEMANTIC CONNECTIONS');
      });
    });

    it('includes side effects in output', async () => {
      const systemMap = {
        files: {
          'test.js': {
            functions: [],
            exports: [],
            imports: [],
            sideEffects: {
              usesLocalStorage: true,
              makesNetworkCalls: true,
              accessesWindow: false,
              hasEventListeners: false,
              hasGlobalAccess: false
            }
          }
        }
      };

      await withSandbox({
        'test.js': 'export const test = 1;',
        '.omnysysdata/system-map-enhanced.json': JSON.stringify(systemMap)
      }, async (sandbox) => {
        const result = await checkLogic('test.js', { 
          silent: true, 
          projectPath: sandbox.baseDir 
        });

        expect(result.success).toBe(true);
        expect(result.output).toContain('SIDE EFFECTS');
        expect(result.output).toContain('localStorage');
      });
    });

    it('handles path normalization', async () => {
      const systemMap = {
        files: {
          'src/utils/test.js': {
            functions: [],
            exports: [],
            imports: []
          }
        }
      };

      await withSandbox({
        'src/utils/test.js': 'export const test = 1;',
        '.omnysysdata/system-map-enhanced.json': JSON.stringify(systemMap)
      }, async (sandbox) => {
        const result = await checkLogic('utils/test.js', { 
          silent: true, 
          projectPath: sandbox.baseDir 
        });

        expect(result.success).toBe(true);
        expect(result.matchedPath).toBe('src/utils/test.js');
      });
    });

    it('handles errors gracefully', async () => {
      await withSandbox({
        'test.js': 'export const test = 1;',
        '.omnysysdata/system-map-enhanced.json': 'invalid json'
      }, async (sandbox) => {
        const result = await checkLogic('test.js', { 
          silent: true, 
          projectPath: sandbox.baseDir 
        });

        expect(result.success).toBe(false);
        expect(result.exitCode).toBe(1);
      });
    });
  });
});

describe('check (Real Factories)', () => {
  it('exports check function', () => {
    expect(typeof check).toBe('function');
  });

  it('calls process.exit with exitCode from logic', async () => {
    const originalExit = process.exit;
    let exitCode = null;
    
    // Mock temporal solo para este test específico
    process.exit = (code) => {
      exitCode = code;
    };
    
    try {
      await withSandbox({}, async (sandbox) => {
        // Modificar process.cwd temporalmente
        const originalCwd = process.cwd;
        process.cwd = () => sandbox.baseDir;
        
        await check(null);
        
        process.cwd = originalCwd;
      });
      
      expect(exitCode).toBe(1);
    } finally {
      process.exit = originalExit;
    }
  });
});
