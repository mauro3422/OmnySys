import { describe, it, expect } from 'vitest';
import {
  countTotalFunctions,
  countTotalItems,
  countUnresolvedImports,
  countFiles,
  countDependencies
} from '#layer-a/graph/utils/counters.js';
import { GraphBuilder, SystemMapBuilder } from '../../../../factories/graph-test.factory.js';

describe('Counters', () => {
  describe('Structure Contract', () => {
    it('should export all required functions', () => {
      expect(typeof countTotalFunctions).toBe('function');
      expect(typeof countTotalItems).toBe('function');
      expect(typeof countUnresolvedImports).toBe('function');
      expect(typeof countFiles).toBe('function');
      expect(typeof countDependencies).toBe('function');
    });
  });

  describe('countTotalFunctions', () => {
    it('should return 0 for empty functions map', () => {
      expect(countTotalFunctions({})).toBe(0);
    });

    it('should count all functions across files', () => {
      const functions = {
        'src/a.js': [{ name: 'f1' }, { name: 'f2' }],
        'src/b.js': [{ name: 'g1' }],
        'src/c.js': [{ name: 'h1' }, { name: 'h2' }, { name: 'h3' }]
      };
      expect(countTotalFunctions(functions)).toBe(6);
    });

    it('should handle files with no functions', () => {
      const functions = {
        'src/a.js': [{ name: 'f1' }],
        'src/b.js': [],
        'src/c.js': [{ name: 'g1' }]
      };
      expect(countTotalFunctions(functions)).toBe(2);
    });

    it('should handle null/undefined arrays', () => {
      const functions = {
        'src/a.js': [{ name: 'f1' }],
        'src/b.js': null,
        'src/c.js': undefined
      };
      expect(countTotalFunctions(functions)).toBe(1);
    });

    it('should handle empty object', () => {
      expect(countTotalFunctions({})).toBe(0);
    });
  });

  describe('countTotalItems', () => {
    it('should return 0 for empty items map', () => {
      expect(countTotalItems({})).toBe(0);
    });

    it('should count all items across files', () => {
      const typeDefinitions = {
        'src/a.js': [{ name: 'TypeA' }, { name: 'TypeB' }],
        'src/b.js': [{ name: 'TypeC' }]
      };
      expect(countTotalItems(typeDefinitions)).toBe(3);
    });

    it('should work with enum definitions', () => {
      const enumDefinitions = {
        'src/a.js': [{ name: 'Status' }],
        'src/b.js': [{ name: 'Priority' }, { name: 'Category' }]
      };
      expect(countTotalItems(enumDefinitions)).toBe(3);
    });

    it('should work with constant exports', () => {
      const constantExports = {
        'src/config.js': [{ name: 'MAX_SIZE' }, { name: 'TIMEOUT' }]
      };
      expect(countTotalItems(constantExports)).toBe(2);
    });

    it('should handle null/undefined values', () => {
      const items = {
        'src/a.js': [{ name: 'item1' }],
        'src/b.js': null
      };
      expect(countTotalItems(items)).toBe(1);
    });
  });

  describe('countUnresolvedImports', () => {
    it('should return 0 for empty unresolved imports', () => {
      expect(countUnresolvedImports({})).toBe(0);
    });

    it('should count all unresolved imports', () => {
      const unresolved = {
        'src/a.js': [
          { source: 'missing-module-1' },
          { source: 'missing-module-2' }
        ],
        'src/b.js': [
          { source: 'another-missing' }
        ]
      };
      expect(countUnresolvedImports(unresolved)).toBe(3);
    });

    it('should handle files with no unresolved imports', () => {
      const unresolved = {
        'src/a.js': [{ source: 'missing' }],
        'src/b.js': [],
        'src/c.js': [{ source: 'another-missing' }]
      };
      expect(countUnresolvedImports(unresolved)).toBe(2);
    });

    it('should handle empty arrays', () => {
      const unresolved = {
        'src/a.js': [],
        'src/b.js': []
      };
      expect(countUnresolvedImports(unresolved)).toBe(0);
    });
  });

  describe('countFiles', () => {
    it('should return 0 for empty files map', () => {
      expect(countFiles({})).toBe(0);
    });

    it('should count all files', () => {
      const files = {
        'src/a.js': {},
        'src/b.js': {},
        'src/c.js': {}
      };
      expect(countFiles(files)).toBe(3);
    });

    it('should work with FileNode objects', () => {
      const files = {
        'src/a.js': { path: 'src/a.js', exports: [] },
        'src/b.js': { path: 'src/b.js', exports: [] }
      };
      expect(countFiles(files)).toBe(2);
    });
  });

  describe('countDependencies', () => {
    it('should return 0 for empty dependencies array', () => {
      expect(countDependencies([])).toBe(0);
    });

    it('should count all dependencies', () => {
      const dependencies = [
        { from: 'src/a.js', to: 'src/b.js' },
        { from: 'src/b.js', to: 'src/c.js' },
        { from: 'src/c.js', to: 'src/d.js' }
      ];
      expect(countDependencies(dependencies)).toBe(3);
    });

    it('should count even duplicate dependencies', () => {
      const dependencies = [
        { from: 'src/a.js', to: 'src/b.js' },
        { from: 'src/a.js', to: 'src/b.js' }
      ];
      expect(countDependencies(dependencies)).toBe(2);
    });
  });

  describe('Error Handling Contract', () => {
    it('countTotalFunctions should handle null input', () => {
      expect(countTotalFunctions(null)).toBe(0);
    });

    it('countTotalFunctions should handle undefined input', () => {
      expect(countTotalFunctions(undefined)).toBe(0);
    });

    it('countTotalItems should handle null input', () => {
      expect(countTotalItems(null)).toBe(0);
    });

    it('countUnresolvedImports should handle null input', () => {
      expect(countUnresolvedImports(null)).toBe(0);
    });

    it('countFiles should handle null input', () => {
      expect(countFiles(null)).toBe(0);
    });

    it('countDependencies should handle null input', () => {
      expect(countDependencies(null)).toBe(0);
    });

    it('countDependencies should handle undefined input', () => {
      expect(countDependencies(undefined)).toBe(0);
    });

    it('should handle non-array values gracefully', () => {
      const functions = {
        'src/a.js': 'not-an-array',
        'src/b.js': 123
      };
      expect(countTotalFunctions(functions)).toBe(0);
    });
  });

  describe('Integration with SystemMap', () => {
    it('should count correctly with GraphBuilder system map', () => {
      const systemMap = GraphBuilder.create()
        .withFiles(['src/a.js', 'src/b.js', 'src/c.js'])
        .withFunction('src/a.js', 'func1')
        .withFunction('src/a.js', 'func2')
        .withFunction('src/b.js', 'func3')
        .buildSystemMap();
      
      expect(countFiles(systemMap.files)).toBe(3);
      expect(countTotalFunctions(systemMap.functions)).toBe(3);
    });

    it('should count dependencies correctly', () => {
      const systemMap = GraphBuilder.create()
        .withFiles(['src/a.js', 'src/b.js', 'src/c.js'])
        .withDependency('src/a.js', 'src/b.js')
        .withDependency('src/b.js', 'src/c.js')
        .buildSystemMap();
      
      expect(countDependencies(systemMap.dependencies)).toBe(2);
    });

    it('should count unresolved imports correctly', () => {
      const systemMap = GraphBuilder.create()
        .withFile('src/a.js')
        .withUnresolvedImports('src/a.js', ['missing-1', 'missing-2'])
        .buildSystemMap();
      
      expect(countUnresolvedImports(systemMap.unresolvedImports)).toBe(2);
    });

    it('should calculate Tier 3 metrics', () => {
      const systemMap = SystemMapBuilder.create()
        .withFile('src/types.js')
        .withTypeDefinitions('src/types.js', [
          { name: 'User' },
          { name: 'Config' }
        ])
        .withEnumDefinitions('src/types.js', [
          { name: 'Status' }
        ])
        .build();
      
      expect(countTotalItems(systemMap.typeDefinitions)).toBe(2);
      expect(countTotalItems(systemMap.enumDefinitions)).toBe(1);
    });

    it('should verify metadata consistency', () => {
      const systemMap = SystemMapBuilder.create()
        .withFiles(['src/a.js', 'src/b.js'])
        .withFunction('src/a.js', 'f1')
        .withFunction('src/a.js', 'f2')
        .withFunction('src/b.js', 'f3')
        .withDependency('src/a.js', 'src/b.js')
        .build();
      
      // Verify metadata matches actual counts
      expect(systemMap.metadata.totalFiles).toBe(countFiles(systemMap.files));
      expect(systemMap.metadata.totalDependencies).toBe(countDependencies(systemMap.dependencies));
      expect(systemMap.metadata.totalFunctions).toBe(countTotalFunctions(systemMap.functions));
    });
  });

  describe('Real-world Scenarios', () => {
    it('should count metrics for complex system', () => {
      const systemMap = SystemMapBuilder.create()
        .withFiles(Array.from({ length: 100 }, (_, i) => `src/file${i}.js`))
        .build();
      
      expect(countFiles(systemMap.files)).toBe(100);
    });

    it('should handle mixed valid and invalid data', () => {
      const functions = {
        'valid.js': [{ name: 'f1' }, { name: 'f2' }],
        'null.js': null,
        'undefined.js': undefined,
        'empty.js': [],
        'single.js': [{ name: 'f3' }]
      };
      
      expect(countTotalFunctions(functions)).toBe(3);
    });
  });
});
