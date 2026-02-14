import { describe, it, expect } from 'vitest';
import { calculateStaticComplexity } from '../../../../../src/layer-a-static/analyses/tier3/factors/StaticComplexity.js';
import { FileAnalysisBuilder } from '../../../../factories/tier3-analysis.factory.js';

describe('Tier 3 - StaticComplexity Factor', () => {
  describe('Structure Contract', () => {
    it('should return an object with score, explanation, and metrics', () => {
      const result = calculateStaticComplexity({});
      
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('explanation');
      expect(result).toHaveProperty('metrics');
    });

    it('should return numeric score', () => {
      const result = calculateStaticComplexity({});
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should NOT throw on null/undefined input', () => {
      expect(() => calculateStaticComplexity(null)).not.toThrow();
      expect(() => calculateStaticComplexity(undefined)).not.toThrow();
      expect(() => calculateStaticComplexity({})).not.toThrow();
    });
  });

  describe('Function Count Scoring', () => {
    it('should score 0 for files with < 5 functions', () => {
      const analysis = FileAnalysisBuilder.create().withFunctions(4).build();
      const result = calculateStaticComplexity(analysis);
      
      expect(result.score).toBe(0);
    });

    it('should score 1 for files with 5-9 functions', () => {
      const analysis = FileAnalysisBuilder.create().withFunctions(7).build();
      const result = calculateStaticComplexity(analysis);
      
      expect(result.score).toBe(1);
      expect(result.explanation).toContain('Low function count');
    });

    it('should score 2 for files with 10-19 functions', () => {
      const analysis = FileAnalysisBuilder.create().withFunctions(15).build();
      const result = calculateStaticComplexity(analysis);
      
      expect(result.score).toBe(2);
      expect(result.explanation).toContain('Medium function count');
    });

    it('should score 3 for files with >= 20 functions', () => {
      const analysis = FileAnalysisBuilder.create().withFunctions(25).build();
      const result = calculateStaticComplexity(analysis);
      
      expect(result.score).toBe(3);
      expect(result.explanation).toContain('High function count');
    });
  });

  describe('Import Count Scoring', () => {
    it('should score 2 for files with 10-19 imports', () => {
      const analysis = FileAnalysisBuilder.create().withImports(12).build();
      const result = calculateStaticComplexity(analysis);
      
      // Import score is 2, no functions = should be 2
      expect(result.score).toBeGreaterThanOrEqual(2);
    });

    it('should score 3 for files with >= 20 imports', () => {
      const analysis = FileAnalysisBuilder.create().withImports(25).build();
      const result = calculateStaticComplexity(analysis);
      
      expect(result.score).toBe(3);
      expect(result.explanation).toContain('High import count');
    });

    it('should combine function and import scores (max)', () => {
      const analysis = FileAnalysisBuilder.create()
        .withFunctions(8)  // score 1
        .withImports(15)   // score 2
        .build();
      
      const result = calculateStaticComplexity(analysis);
      
      // Should take max of both scores
      expect(result.score).toBe(2);
      expect(result.metrics).toMatchObject({
        functionCount: 8,
        importCount: 15
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing arrays gracefully', () => {
      const result = calculateStaticComplexity({});
      
      expect(result.score).toBe(0);
      expect(result.metrics).toEqual({
        functionCount: 0,
        importCount: 0,
        exportCount: 0
      });
    });

    it('should handle null arrays', () => {
      const result = calculateStaticComplexity({
        functions: null,
        imports: null,
        exports: null
      });
      
      expect(result.score).toBe(0);
    });

    it('should include metrics in result', () => {
      const analysis = FileAnalysisBuilder.create()
        .withFunctions(10)
        .withImports(5)
        .withExports(3)
        .build();
      
      const result = calculateStaticComplexity(analysis);
      
      expect(result.metrics).toEqual({
        functionCount: 10,
        importCount: 5,
        exportCount: 3
      });
    });

    it('should handle empty explanation for low complexity', () => {
      const result = calculateStaticComplexity({});
      
      expect(result.explanation).toBeUndefined();
    });
  });
});
