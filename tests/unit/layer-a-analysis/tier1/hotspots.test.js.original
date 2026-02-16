/**
 * Tier 1 Analysis: Hotspots Tests
 * 
 * Tests for findHotspots - detects functions called from many places
 */

import { describe, it, expect } from 'vitest';
import { findHotspots } from '#layer-a/analyses/tier1/hotspots.js';
import { 
  createMockSystemMap, 
  createMockFunctionLink,
  createMockFunction,
  ScenarioBuilder 
} from '../../../factories/analysis.factory.js';

describe('Tier 1 - Hotspots Analysis', () => {
  describe('Structure Contract', () => {
    it('MUST return an object with required fields', () => {
      const systemMap = createMockSystemMap();
      const result = findHotspots(systemMap);
      
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('functions');
      expect(result).toHaveProperty('criticalCount');
      expect(Array.isArray(result.functions)).toBe(true);
      expect(typeof result.total).toBe('number');
    });

    it('MUST NOT throw on empty system map', () => {
      const systemMap = createMockSystemMap();
      expect(() => findHotspots(systemMap)).not.toThrow();
    });

    it('MUST return empty result when no function links exist', () => {
      const systemMap = createMockSystemMap({ function_links: [] });
      const result = findHotspots(systemMap);
      
      expect(result.total).toBe(0);
      expect(result.functions).toHaveLength(0);
      expect(result.criticalCount).toBe(0);
    });
  });

  describe('Hotspot Detection', () => {
    it('should detect function with exactly 5 callers as MEDIUM severity', () => {
      const systemMap = ScenarioBuilder.hotspot(5);
      const result = findHotspots(systemMap);
      
      expect(result.total).toBe(1);
      expect(result.functions[0].severity).toBe('MEDIUM');
      expect(result.functions[0].callers).toBe(5);
    });

    it('should detect function with 10 callers as HIGH severity', () => {
      const systemMap = ScenarioBuilder.hotspot(10);
      const result = findHotspots(systemMap);
      
      expect(result.total).toBe(1);
      expect(result.functions[0].severity).toBe('HIGH');
    });

    it('should detect function with 15+ callers as CRITICAL severity', () => {
      const systemMap = ScenarioBuilder.hotspot(15);
      const result = findHotspots(systemMap);
      
      expect(result.total).toBe(1);
      expect(result.functions[0].severity).toBe('CRITICAL');
      expect(result.criticalCount).toBe(1);
    });

    it('should count unique callers only (deduplication)', () => {
      const systemMap = createMockSystemMap({
        function_links: [
          createMockFunctionLink('a.js:func1', 'utils.js:helper'),
          createMockFunctionLink('a.js:func1', 'utils.js:helper'), // Duplicate caller
          createMockFunctionLink('b.js:func2', 'utils.js:helper'),
        ]
      });
      
      const result = findHotspots(systemMap);
      // Should count as 2 unique callers, not 3
      expect(result.total).toBe(0); // Below threshold of 5
    });

    it('should sort hotspots by caller count (descending)', () => {
      const systemMap = createMockSystemMap({
        function_links: [
          // Helper B: 3 callers
          ...[1, 2, 3].map(i => createMockFunctionLink(`c${i}.js`, 'utils.js:helperB')),
          // Helper A: 5 callers (should be first)
          ...[1, 2, 3, 4, 5].map(i => createMockFunctionLink(`d${i}.js`, 'utils.js:helperA')),
        ]
      });
      
      const result = findHotspots(systemMap);
      expect(result.functions[0].functionId).toContain('helperA');
    });
  });

  describe('Recommendations', () => {
    it('MUST include recommendation for each hotspot', () => {
      const systemMap = ScenarioBuilder.hotspot(10);
      const result = findHotspots(systemMap);
      
      expect(result.functions[0].recommendation).toBeDefined();
      expect(typeof result.functions[0].recommendation).toBe('string');
      expect(result.functions[0].recommendation).toContain('10');
    });

    it('MUST include list of unique callers', () => {
      const systemMap = ScenarioBuilder.hotspot(5);
      const result = findHotspots(systemMap);
      
      expect(result.functions[0].callersList).toBeDefined();
      expect(Array.isArray(result.functions[0].callersList)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle function_links with missing "to" field gracefully', () => {
      const systemMap = createMockSystemMap({
        function_links: [
          { from: 'a.js:func1' } // Missing 'to'
        ]
      });
      
      expect(() => findHotspots(systemMap)).not.toThrow();
    });

    it('should handle very large number of callers', () => {
      const systemMap = ScenarioBuilder.hotspot(100);
      const result = findHotspots(systemMap);
      
      expect(result.total).toBe(1);
      expect(result.functions[0].severity).toBe('CRITICAL');
      expect(result.functions[0].callers).toBe(100);
    });

    it('should return empty arrays when systemMap has no function_links field', () => {
      const systemMap = {};
      const result = findHotspots(systemMap);
      
      expect(result.total).toBe(0);
      expect(result.functions).toHaveLength(0);
    });
  });
});
