import { describe, it, expect } from 'vitest';
import {
  calculateRiskLevel,
  generateRecommendation,
  getImpactMap,
  getMultipleImpactMaps,
  findHighImpactFiles,
  RISK_LEVELS
} from '#layer-a/graph/algorithms/impact-analyzer.js';
import { GraphBuilder, GraphTestFactory } from '../../../../factories/graph-test.factory.js';

describe('ImpactAnalyzer', () => {
  describe('Structure Contract', () => {
    it('should export all required functions', () => {
      expect(typeof calculateRiskLevel).toBe('function');
      expect(typeof generateRecommendation).toBe('function');
      expect(typeof getImpactMap).toBe('function');
      expect(typeof getMultipleImpactMaps).toBe('function');
      expect(typeof findHighImpactFiles).toBe('function');
    });

    it('should export RISK_LEVELS constants', () => {
      expect(RISK_LEVELS).toBeDefined();
      expect(RISK_LEVELS.NONE).toBeDefined();
      expect(RISK_LEVELS.LOW).toBeDefined();
      expect(RISK_LEVELS.MEDIUM).toBeDefined();
      expect(RISK_LEVELS.HIGH).toBeDefined();
    });

    it('RISK_LEVELS should have correct values', () => {
      expect(RISK_LEVELS.NONE).toBe('none');
      expect(RISK_LEVELS.LOW).toBe('low');
      expect(RISK_LEVELS.MEDIUM).toBe('medium');
      expect(RISK_LEVELS.HIGH).toBe('high');
    });

    it('getImpactMap should return object with required properties', () => {
      const graph = GraphBuilder.create().withFile('src/test.js').build();
      const impact = getImpactMap('src/test.js', graph.files);
      
      expect(impact).toHaveProperty('filePath');
      expect(impact).toHaveProperty('directDependents');
      expect(impact).toHaveProperty('indirectDependents');
      expect(impact).toHaveProperty('allAffected');
      expect(impact).toHaveProperty('totalFilesAffected');
    });
  });

  describe('calculateRiskLevel', () => {
    it('should return LOW for 0 affected files', () => {
      expect(calculateRiskLevel(0)).toBe(RISK_LEVELS.LOW);
    });

    it('should return LOW for 1-3 affected files', () => {
      expect(calculateRiskLevel(1)).toBe(RISK_LEVELS.LOW);
      expect(calculateRiskLevel(2)).toBe(RISK_LEVELS.LOW);
      expect(calculateRiskLevel(3)).toBe(RISK_LEVELS.LOW);
    });

    it('should return MEDIUM for 4-10 affected files', () => {
      expect(calculateRiskLevel(4)).toBe(RISK_LEVELS.MEDIUM);
      expect(calculateRiskLevel(7)).toBe(RISK_LEVELS.MEDIUM);
      expect(calculateRiskLevel(10)).toBe(RISK_LEVELS.MEDIUM);
    });

    it('should return HIGH for more than 10 affected files', () => {
      expect(calculateRiskLevel(11)).toBe(RISK_LEVELS.HIGH);
      expect(calculateRiskLevel(50)).toBe(RISK_LEVELS.HIGH);
      expect(calculateRiskLevel(100)).toBe(RISK_LEVELS.HIGH);
    });
  });

  describe('generateRecommendation', () => {
    it('should return safe message for 0 files', () => {
      const rec = generateRecommendation(0, RISK_LEVELS.LOW);
      expect(rec).toContain('Safe');
      expect(rec).toContain('✅');
    });

    it('should return LOW risk recommendation', () => {
      const rec = generateRecommendation(2, RISK_LEVELS.LOW);
      expect(rec).toContain('Review');
      expect(rec).toContain('📝');
      expect(rec).toContain('2');
    });

    it('should return MEDIUM risk recommendation', () => {
      const rec = generateRecommendation(5, RISK_LEVELS.MEDIUM);
      expect(rec).toContain('MEDIUM RISK');
      expect(rec).toContain('⚠️');
      expect(rec).toContain('5');
    });

    it('should return HIGH risk recommendation', () => {
      const rec = generateRecommendation(15, RISK_LEVELS.HIGH);
      expect(rec).toContain('HIGH RISK');
      expect(rec).toContain('🚨');
      expect(rec).toContain('15');
    });

    it('should handle edge case of 1 file', () => {
      const rec = generateRecommendation(1, RISK_LEVELS.LOW);
      expect(rec).toContain('1 file');
    });

    it('should handle plural correctly', () => {
      const rec1 = generateRecommendation(1, RISK_LEVELS.LOW);
      expect(rec1).toContain('1 file(s)');
    });
  });

  describe('getImpactMap', () => {
    it('should return error for non-existent file', () => {
      const graph = GraphBuilder.create().build();
      const impact = getImpactMap('non-existent.js', graph.files);
      
      expect(impact.error).toBeDefined();
    });

    it('should return impact for file with no dependents', () => {
      const graph = GraphBuilder.create()
        .withFile('src/isolated.js')
        .build();
      
      const impact = getImpactMap('src/isolated.js', graph.files);
      
      expect(impact.totalFilesAffected).toBe(0);
      expect(impact.riskLevel).toBe(RISK_LEVELS.LOW);
    });

    it('should count direct dependents correctly', () => {
      const graph = GraphBuilder.create()
        .withFiles(['src/utils.js', 'src/a.js', 'src/b.js'])
        .withDependency('src/a.js', 'src/utils.js')
        .withDependency('src/b.js', 'src/utils.js')
        .build();
      
      const impact = getImpactMap('src/utils.js', graph.files);
      
      expect(impact.directDependents).toHaveLength(2);
      expect(impact.directDependents).toContain('src/a.js');
      expect(impact.directDependents).toContain('src/b.js');
    });

    it('should include risk level in result', () => {
      const graph = GraphBuilder.create()
        .withFiles(['src/utils.js', 'src/a.js'])
        .withDependency('src/a.js', 'src/utils.js')
        .build();
      
      const impact = getImpactMap('src/utils.js', graph.files);
      
      expect(impact.riskLevel).toBeDefined();
      expect(Object.values(RISK_LEVELS)).toContain(impact.riskLevel);
    });

    it('should include recommendation in result', () => {
      const graph = GraphBuilder.create()
        .withFile('src/test.js')
        .build();
      
      const impact = getImpactMap('src/test.js', graph.files);
      
      expect(impact.recommendation).toBeDefined();
      expect(typeof impact.recommendation).toBe('string');
    });

    it('should use displayPath when available', () => {
      const builder = GraphBuilder.create();
      builder.files['src/utils.js'] = {
        path: 'src/utils.js',
        displayPath: 'utils.js',
        usedBy: [],
        transitiveDependents: []
      };
      
      const impact = getImpactMap('src/utils.js', builder.files);
      
      expect(impact.filePath).toBe('utils.js');
    });

    it('should fall back to filePath when displayPath missing', () => {
      const builder = GraphBuilder.create();
      builder.files['src/utils.js'] = {
        path: 'src/utils.js',
        usedBy: [],
        transitiveDependents: []
      };
      
      const impact = getImpactMap('src/utils.js', builder.files);
      
      expect(impact.filePath).toBe('src/utils.js');
    });
  });

  describe('getMultipleImpactMaps', () => {
    it('should return impact for multiple files', () => {
      const graph = GraphBuilder.create()
        .withFiles(['src/a.js', 'src/b.js', 'src/c.js'])
        .build();
      
      const impacts = getMultipleImpactMaps(['src/a.js', 'src/b.js'], graph.files);
      
      expect(impacts).toHaveProperty('src/a.js');
      expect(impacts).toHaveProperty('src/b.js');
      expect(impacts).not.toHaveProperty('src/c.js');
    });

    it('should handle empty file list', () => {
      const graph = GraphBuilder.create().build();
      const impacts = getMultipleImpactMaps([], graph.files);
      
      expect(Object.keys(impacts)).toHaveLength(0);
    });

    it('should include errors for non-existent files', () => {
      const graph = GraphBuilder.create().build();
      const impacts = getMultipleImpactMaps(['non-existent.js'], graph.files);
      
      expect(impacts['non-existent.js'].error).toBeDefined();
    });
  });

  describe('findHighImpactFiles', () => {
    it('should return empty array for empty files map', () => {
      const result = findHighImpactFiles({});
      expect(result).toEqual([]);
    });

    it('should sort files by dependent count', () => {
      const files = {
        'low.js': { usedBy: ['a.js'], transitiveDependents: [] },
        'high.js': { usedBy: ['a.js', 'b.js', 'c.js'], transitiveDependents: [] },
        'medium.js': { usedBy: ['a.js', 'b.js'], transitiveDependents: [] }
      };
      
      const result = findHighImpactFiles(files);
      
      expect(result[0].path).toBe('high.js');
      expect(result[1].path).toBe('medium.js');
      expect(result[2].path).toBe('low.js');
    });

    it('should respect limit parameter', () => {
      const files = {};
      for (let i = 0; i < 20; i++) {
        files[`file${i}.js`] = { usedBy: Array(i).fill('dep'), transitiveDependents: [] };
      }
      
      const result = findHighImpactFiles(files, 5);
      
      expect(result).toHaveLength(5);
    });

    it('should include both direct and transitive dependents in count', () => {
      const files = {
        'target.js': {
          usedBy: ['a.js', 'b.js'],
          transitiveDependents: ['c.js', 'd.js', 'e.js']
        }
      };
      
      const result = findHighImpactFiles(files);
      
      expect(result[0].dependentCount).toBe(5);
      expect(result[0].directDependents).toBe(2);
      expect(result[0].transitiveDependents).toBe(3);
    });

    it('should handle files with missing usedBy', () => {
      const files = {
        'file.js': {}
      };
      
      const result = findHighImpactFiles(files);
      
      expect(result[0].dependentCount).toBe(0);
    });

    it('should default limit to 10', () => {
      const files = {};
      for (let i = 0; i < 15; i++) {
        files[`file${i}.js`] = { usedBy: [], transitiveDependents: [] };
      }
      
      const result = findHighImpactFiles(files);
      
      expect(result).toHaveLength(10);
    });
  });

  describe('Error Handling Contract', () => {
    it('calculateRiskLevel should handle negative numbers', () => {
      expect(() => calculateRiskLevel(-1)).not.toThrow();
    });

    it('generateRecommendation should handle negative count', () => {
      expect(() => generateRecommendation(-1, RISK_LEVELS.LOW)).not.toThrow();
    });

    it('getImpactMap should handle null files map', () => {
      const impact = getImpactMap('test.js', null);
      expect(impact.error).toBeDefined();
    });

    it('getImpactMap should handle undefined files map', () => {
      const impact = getImpactMap('test.js', undefined);
      expect(impact.error).toBeDefined();
    });

    it('getMultipleImpactMaps should handle null files map', () => {
      const impacts = getMultipleImpactMaps(['test.js'], null);
      expect(impacts['test.js'].error).toBeDefined();
    });

    it('findHighImpactFiles should handle null files map', () => {
      const result = findHighImpactFiles(null);
      expect(result).toEqual([]);
    });

    it('findHighImpactFiles should handle files with null usedBy', () => {
      const files = {
        'file.js': { usedBy: null, transitiveDependents: null }
      };
      
      expect(() => findHighImpactFiles(files)).not.toThrow();
    });
  });

  describe('Real-world Scenarios', () => {
    it('should analyze star pattern correctly', () => {
      const builder = GraphBuilder.create().withFile('src/utils.js');
      for (let i = 0; i < 10; i++) {
        builder.withFile(`src/feature${i}.js`);
        builder.withDependency(`src/feature${i}.js`, 'src/utils.js');
      }
      
      const graph = builder.build();
      const impact = getImpactMap('src/utils.js', graph.files);
      
      expect(impact.totalFilesAffected).toBe(10);
      expect(impact.riskLevel).toBe(RISK_LEVELS.MEDIUM);
    });

    it('should identify high impact files in complex system', () => {
      const builder = GraphBuilder.create();
      
      // Create a central utility file
      builder.withFile('src/core/utils.js');
      
      // Many files depend on it
      for (let i = 0; i < 15; i++) {
        builder.withFile(`src/modules/module${i}.js`);
        builder.withDependency(`src/modules/module${i}.js`, 'src/core/utils.js');
      }
      
      const systemMap = builder.buildSystemMap();
      const highImpact = findHighImpactFiles(systemMap.files, 3);
      
      expect(highImpact[0].path).toBe('src/core/utils.js');
      expect(highImpact[0].dependentCount).toBe(15);
      expect(highImpact[0].riskLevel).toBe(RISK_LEVELS.HIGH);
    });

    it('should calculate correct risk levels for various impact sizes', () => {
      const testCases = [
        { count: 0, expected: RISK_LEVELS.LOW },
        { count: 2, expected: RISK_LEVELS.LOW },
        { count: 5, expected: RISK_LEVELS.MEDIUM },
        { count: 20, expected: RISK_LEVELS.HIGH }
      ];
      
      for (const { count, expected } of testCases) {
        const level = calculateRiskLevel(count);
        expect(level).toBe(expected);
      }
    });

    it('should handle file with transitive dependents', () => {
      const builder = GraphBuilder.create();
      builder.files['src/core.js'] = {
        path: 'src/core.js',
        displayPath: 'src/core.js',
        usedBy: ['src/a.js'],
        transitiveDependents: ['src/b.js', 'src/c.js']
      };
      
      const impact = getImpactMap('src/core.js', builder.files);
      
      expect(impact.directDependents).toHaveLength(1);
      expect(impact.indirectDependents).toHaveLength(2);
      expect(impact.totalFilesAffected).toBe(3);
    });
  });
});
