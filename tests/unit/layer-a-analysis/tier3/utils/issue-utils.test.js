import { describe, it, expect } from 'vitest';
import { groupByFile, sortBySeverity } from '../../../../../src/layer-a-static/analyses/tier3/utils/issue-utils.js';

describe('Tier 3 - issue-utils', () => {
  describe('groupByFile', () => {
    it('should group issues by sourceFile property', () => {
      const issues = [
        { sourceFile: 'a.js', message: 'issue1' },
        { sourceFile: 'a.js', message: 'issue2' },
        { sourceFile: 'b.js', message: 'issue3' }
      ];
      
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
  });
});
