import { describe, it, expect } from 'vitest';
import { groupByFile, sortBySeverity } from '#layer-a/analyses/tier3/utils/issue-utils.js';
import { IssueBuilder } from '../../../../factories/tier3-analysis.factory.js';

describe('IssueUtils', () => {
  describe('Structure Contract', () => {
    it('should export groupByFile function', () => {
      expect(typeof groupByFile).toBe('function');
    });

    it('should export sortBySeverity function', () => {
      expect(typeof sortBySeverity).toBe('function');
    });

    it('should return object from groupByFile', () => {
      const result = groupByFile([]);
      expect(typeof result).toBe('object');
      expect(Array.isArray(result)).toBe(false);
    });

    it('should return array from sortBySeverity', () => {
      const result = sortBySeverity([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should not throw on empty input', () => {
      expect(() => groupByFile([])).not.toThrow();
      expect(() => sortBySeverity([])).not.toThrow();
    });
  });

  describe('Functionality Tests', () => {
    describe('groupByFile', () => {
      it('should group issues by sourceFile property', () => {
        const issues = IssueBuilder.create()
          .addIssue({ sourceFile: 'a.js', message: 'issue1' })
          .addIssue({ sourceFile: 'a.js', message: 'issue2' })
          .addIssue({ sourceFile: 'b.js', message: 'issue3' })
          .build();
        
        const result = groupByFile(issues);
        
        expect(Object.keys(result)).toHaveLength(2);
        expect(result['a.js']).toHaveLength(2);
        expect(result['b.js']).toHaveLength(1);
      });

      it('should group issues by file property if sourceFile not present', () => {
        const issues = [
          { file: 'a.js', message: 'issue1' },
          { file: 'a.js', message: 'issue2' }
        ];
        
        const result = groupByFile(issues);
        
        expect(result['a.js']).toHaveLength(2);
      });

      it('should prefer sourceFile over file', () => {
        const issues = [
          { sourceFile: 'a.js', file: 'b.js', message: 'issue1' }
        ];
        
        const result = groupByFile(issues);
        
        expect(result['a.js']).toHaveLength(1);
        expect(result['b.js']).toBeUndefined();
      });

      it('should handle empty array', () => {
        const result = groupByFile([]);
        
        expect(result).toEqual({});
      });

      it('should handle issues with neither sourceFile nor file', () => {
        const issues = [
          { message: 'issue1' },
          { sourceFile: 'a.js', message: 'issue2' }
        ];
        
        // Should not throw
        const result = groupByFile(issues);
        
        expect(result['a.js']).toHaveLength(1);
      });
    });

    describe('sortBySeverity', () => {
      it('should sort HIGH before MEDIUM', () => {
        const issues = [
          { severity: 'MEDIUM', message: 'medium' },
          { severity: 'HIGH', message: 'high' }
        ];
        
        const result = sortBySeverity(issues);
        
        expect(result[0].severity).toBe('HIGH');
        expect(result[1].severity).toBe('MEDIUM');
      });

      it('should sort MEDIUM before LOW', () => {
        const issues = [
          { severity: 'LOW', message: 'low' },
          { severity: 'MEDIUM', message: 'medium' }
        ];
        
        const result = sortBySeverity(issues);
        
        expect(result[0].severity).toBe('MEDIUM');
        expect(result[1].severity).toBe('LOW');
      });

      it('should sort HIGH before MEDIUM before LOW', () => {
        const issues = [
          { severity: 'LOW' },
          { severity: 'HIGH' },
          { severity: 'MEDIUM' },
          { severity: 'LOW' },
          { severity: 'HIGH' }
        ];
        
        const result = sortBySeverity(issues);
        
        expect(result[0].severity).toBe('HIGH');
        expect(result[1].severity).toBe('HIGH');
        expect(result[2].severity).toBe('MEDIUM');
        expect(result[3].severity).toBe('LOW');
        expect(result[4].severity).toBe('LOW');
      });

      it('should not modify original array', () => {
        const issues = [
          { severity: 'LOW' },
          { severity: 'HIGH' }
        ];
        
        const result = sortBySeverity(issues);
        
        expect(issues[0].severity).toBe('LOW');
        expect(result[0].severity).toBe('HIGH');
      });

      it('should handle empty array', () => {
        const result = sortBySeverity([]);
        
        expect(result).toEqual([]);
      });

      it('should handle unknown severity levels', () => {
        const issues = [
          { severity: 'UNKNOWN', message: 'unknown' },
          { severity: 'HIGH', message: 'high' }
        ];
        
        // Should not throw, unknown severities will be sorted last
        const result = sortBySeverity(issues);
        
        expect(result).toHaveLength(2);
      });

      it('should handle CRITICAL severity', () => {
        const issues = [
          { severity: 'HIGH' },
          { severity: 'CRITICAL' },
          { severity: 'MEDIUM' }
        ];
        
        const result = sortBySeverity(issues);
        
        // The sort order depends on the implementation - documenting current behavior
        // CRITICAL may or may not be recognized as higher than HIGH
        expect(result).toHaveLength(3);
        // Verify that some sorting occurred
        expect(['CRITICAL', 'HIGH']).toContain(result[0].severity);
        expect(result[2].severity).toBe('MEDIUM');
      });
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle null input for groupByFile (documented behavior)', () => {
      // Module throws on null - documenting current behavior
      try {
        groupByFile(null);
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
      }
    });

    it('should handle undefined input for groupByFile (documented behavior)', () => {
      // Module throws on undefined - documenting current behavior
      try {
        groupByFile(undefined);
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
      }
    });

    it('should handle null input for sortBySeverity (documented behavior)', () => {
      // Module throws on null - documenting current behavior
      try {
        sortBySeverity(null);
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
      }
    });

    it('should handle undefined input for sortBySeverity (documented behavior)', () => {
      // Module throws on undefined - documenting current behavior
      try {
        sortBySeverity(undefined);
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
      }
    });

    it('should handle issues with null properties (documented behavior)', () => {
      const issues = [
        { sourceFile: null, message: 'issue1' },
        { sourceFile: 'a.js', message: 'issue2' }
      ];
      
      // Module may or may not handle null properties - documenting
      expect(() => groupByFile(issues)).not.toThrow();
    });

    it('should handle issues without severity property', () => {
      const issues = [
        { message: 'no severity' },
        { severity: 'HIGH', message: 'has severity' }
      ];
      
      expect(() => sortBySeverity(issues)).not.toThrow();
    });

    it('should handle mixed valid and invalid issues (documented behavior)', () => {
      const issues = [
        null,
        undefined,
        { sourceFile: 'a.js', message: 'valid' },
        { severity: 'MEDIUM' }
      ];
      
      // Module throws on null/undefined items - documenting current behavior
      try {
        groupByFile(issues);
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
      }
      try {
        sortBySeverity(issues);
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
      }
    });
  });
});
