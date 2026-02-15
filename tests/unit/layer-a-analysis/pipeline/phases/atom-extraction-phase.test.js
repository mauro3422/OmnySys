/**
 * @fileoverview Atom Extraction Phase (Legacy) Tests
 * 
 * Tests for the legacy atom-extraction-phase.js which re-exports from atom-extraction/.
 * 
 * @module tests/unit/layer-a-analysis/pipeline/phases/atom-extraction-phase
 */

import { describe, it, expect } from 'vitest';
import { 
  AtomExtractionPhase as LegacyAtomExtractionPhase,
  default as DefaultExport 
} from '../../../../../src/layer-a-static/pipeline/phases/atom-extraction-phase.js';
import { AtomExtractionPhase as ActualAtomExtractionPhase } from '../../../../../src/layer-a-static/pipeline/phases/atom-extraction/index.js';

describe('Atom Extraction Phase (Legacy)', () => {
  // ============================================================================
  // Structure Contract - Exports
  // ============================================================================
  describe('Structure Contract - Exports', () => {
    it('should export AtomExtractionPhase', () => {
      expect(LegacyAtomExtractionPhase).toBeDefined();
      expect(typeof LegacyAtomExtractionPhase).toBe('function');
    });

    it('should have default export', () => {
      expect(DefaultExport).toBeDefined();
      expect(typeof DefaultExport).toBe('function');
    });

    it('named export should equal default export', () => {
      expect(LegacyAtomExtractionPhase).toBe(DefaultExport);
    });
  });

  // ============================================================================
  // Structure Contract - Compatibility
  // ============================================================================
  describe('Structure Contract - Compatibility', () => {
    it('should re-export from atom-extraction/index.js', () => {
      expect(LegacyAtomExtractionPhase).toBe(ActualAtomExtractionPhase);
    });

    it('should be instantiable', () => {
      const phase = new LegacyAtomExtractionPhase();
      expect(phase).toBeDefined();
    });

    it('should have correct phase name', () => {
      const phase = new LegacyAtomExtractionPhase();
      expect(phase.name).toBe('atom-extraction');
    });

    it('should extend ExtractionPhase', async () => {
      const { ExtractionPhase } = await import('../../../../../src/layer-a-static/pipeline/phases/base-phase.js');
      const phase = new LegacyAtomExtractionPhase();
      expect(phase).toBeInstanceOf(ExtractionPhase);
    });
  });

  // ============================================================================
  // Structure Contract - Required Methods
  // ============================================================================
  describe('Structure Contract - Required Methods', () => {
    it('should have execute method', () => {
      const phase = new LegacyAtomExtractionPhase();
      expect(typeof phase.execute).toBe('function');
    });

    it('should have canExecute method', () => {
      const phase = new LegacyAtomExtractionPhase();
      expect(typeof phase.canExecute).toBe('function');
    });

    it('should have validateContext method', () => {
      const phase = new LegacyAtomExtractionPhase();
      expect(typeof phase.validateContext).toBe('function');
    });

    it('should have handleError method', () => {
      const phase = new LegacyAtomExtractionPhase();
      expect(typeof phase.handleError).toBe('function');
    });
  });

  // ============================================================================
  // Error Handling Contract
  // ============================================================================
  describe('Error Handling Contract', () => {
    it('should handle missing context', async () => {
      const phase = new LegacyAtomExtractionPhase();
      await expect(phase.execute(null)).rejects.toThrow();
    });

    it('should handle undefined context', async () => {
      const phase = new LegacyAtomExtractionPhase();
      await expect(phase.execute(undefined)).rejects.toThrow();
    });

    it('should handle empty context', async () => {
      const phase = new LegacyAtomExtractionPhase();
      await expect(phase.execute({})).rejects.toThrow();
    });

    it('canExecute should return true by default', () => {
      const phase = new LegacyAtomExtractionPhase();
      expect(phase.canExecute({})).toBe(true);
      expect(phase.canExecute({ filePath: 'test.js' })).toBe(true);
    });
  });

  // ============================================================================
  // Integration - Backward Compatibility
  // ============================================================================
  describe('Integration - Backward Compatibility', () => {
    it('should work with import from legacy path', async () => {
      const phase = new LegacyAtomExtractionPhase();
      
      const context = {
        filePath: 'test.js',
        code: 'function test() { return 1; }',
        fileInfo: {
          functions: [{
            id: 'test::test',
            name: 'test',
            line: 1,
            endLine: 1,
            type: 'declaration',
            isExported: false,
            isAsync: false,
            calls: []
          }]
        },
        fileMetadata: {}
      };
      
      const result = await phase.execute(context);
      expect(result).toHaveProperty('atoms');
      expect(result).toHaveProperty('atomCount');
      expect(Array.isArray(result.atoms)).toBe(true);
    });

    it('should produce same result as direct import', async () => {
      const legacyPhase = new LegacyAtomExtractionPhase();
      const actualPhase = new ActualAtomExtractionPhase();
      
      const context = {
        filePath: 'test.js',
        code: 'function test() { return 1; }',
        fileInfo: {
          functions: [{
            id: 'test::test',
            name: 'test',
            line: 1,
            endLine: 1,
            type: 'declaration',
            isExported: false,
            isAsync: false,
            calls: []
          }]
        },
        fileMetadata: {}
      };
      
      const legacyResult = await legacyPhase.execute(context);
      
      // Create fresh context for actual phase
      const context2 = { ...context, fileInfo: { ...context.fileInfo, functions: [...context.fileInfo.functions] } };
      const actualResult = await actualPhase.execute(context2);
      
      expect(legacyResult.atomCount).toBe(actualResult.atomCount);
      expect(legacyResult.atoms.length).toBe(actualResult.atoms.length);
    });
  });

  // ============================================================================
  // Deprecation Notice
  // ============================================================================
  describe('Deprecation Notice', () => {
    it('should be marked as deprecated in source', async () => {
      const fs = await import('fs');
      const path = new URL('../../../../../src/layer-a-static/pipeline/phases/atom-extraction-phase.js', import.meta.url);
      const content = fs.readFileSync(path, 'utf-8');
      
      expect(content).toContain('@deprecated');
      expect(content).toContain('backward compatibility');
    });
  });
});
