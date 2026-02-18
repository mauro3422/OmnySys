/**
 * @fileoverview Semantic Validation Rules Tests
 */

import { describe, it, expect } from 'vitest';
import { ExportUsageRule } from '../../../../src/validation/rules/semantic/export-usage.js';

describe('ExportUsageRule', () => {
  describe('configuration', () => {
    it('has correct id', () => {
      expect(ExportUsageRule.id).toBe('semantic.export-usage');
    });

    it('is not invariant', () => {
      expect(ExportUsageRule.invariant).toBe(false);
    });

    it('applies to file and molecule', () => {
      expect(ExportUsageRule.appliesTo).toContain('file');
      expect(ExportUsageRule.appliesTo).toContain('molecule');
    });

    it('requires exports and usedBy', () => {
      expect(ExportUsageRule.requires).toContain('exports');
      expect(ExportUsageRule.requires).toContain('usedBy');
    });
  });

  describe('validate', () => {
    it('warns for unused exports', async () => {
      const entity = {
        id: 'utils.js',
        exports: [{ name: 'helper1' }, { name: 'helper2' }],
        usedBy: []
      };
      
      const result = await ExportUsageRule.validate(entity, {});
      
      expect(result.severity).toBe('warning');
      expect(result.message).toContain('not imported');
    });

    it('returns valid for used exports', async () => {
      const entity = {
        id: 'utils.js',
        exports: [{ name: 'helper' }],
        usedBy: ['main.js', 'app.js']
      };
      
      const result = await ExportUsageRule.validate(entity, {});
      
      expect(result.valid).toBe(true);
      expect(result.message).toContain('imported by 2');
    });

    it('returns valid for no exports', async () => {
      const entity = {
        id: 'internal.js',
        exports: [],
        usedBy: []
      };
      
      const result = await ExportUsageRule.validate(entity, {});
      
      expect(result.valid).toBe(true);
    });

    it('handles string exports', async () => {
      const entity = {
        id: 'old.js',
        exports: ['foo', 'bar'],
        usedBy: []
      };
      
      const result = await ExportUsageRule.validate(entity, {});
      
      expect(result.severity).toBe('warning');
      expect(result.details.exportCount).toBe(2);
    });

    it('suggests entry point for unused', async () => {
      const entity = {
        id: 'index.js',
        exports: [{ name: 'main' }],
        usedBy: []
      };
      
      const result = await ExportUsageRule.validate(entity, {});
      
      expect(result.details.suggestion).toBeDefined();
    });

    it('counts exports correctly', async () => {
      const entity = {
        id: 'module.js',
        exports: [
          { name: 'a', type: 'named' },
          { name: 'b', type: 'named' },
          { name: 'default', type: 'default' }
        ],
        usedBy: ['other.js']
      };
      
      const result = await ExportUsageRule.validate(entity, {});
      
      expect(result.details.exportCount).toBe(3);
      expect(result.details.usedByCount).toBe(1);
    });
  });
});
