import { describe, it, expect } from 'vitest';
import {
  calculateTransitiveDependencies,
  calculateTransitiveDependents,
  calculateAllTransitiveDependencies,
  calculateAllTransitiveDependents
} from '#layer-a/graph/algorithms/transitive-deps.js';
import { GraphBuilder, GraphScenarios } from '../../../../factories/graph-test.factory.js';

describe('TransitiveDeps', () => {
  describe('Structure Contract', () => {
    it('should export all required functions', () => {
      expect(typeof calculateTransitiveDependencies).toBe('function');
      expect(typeof calculateTransitiveDependents).toBe('function');
      expect(typeof calculateAllTransitiveDependencies).toBe('function');
      expect(typeof calculateAllTransitiveDependents).toBe('function');
    });

    it('calculateTransitiveDependencies should return a Set', () => {
      const graph = GraphBuilder.create().withFile('src/a.js').build();
      const result = calculateTransitiveDependencies('src/a.js', graph.files);
      
      expect(result instanceof Set).toBe(true);
    });

    it('calculateTransitiveDependents should return a Set', () => {
      const graph = GraphBuilder.create().withFile('src/a.js').build();
      const result = calculateTransitiveDependents('src/a.js', graph.files);
      
      expect(result instanceof Set).toBe(true);
    });

    it('calculateAllTransitiveDependencies should return an object', () => {
      const graph = GraphBuilder.create()
        .withFiles(['src/a.js', 'src/b.js'])
        .build();
      
      const result = calculateAllTransitiveDependencies(graph.files);
      
      expect(typeof result).toBe('object');
      expect(Array.isArray(result)).toBe(false);
    });

    it('calculateAllTransitiveDependents should return an object', () => {
      const graph = GraphBuilder.create()
        .withFiles(['src/a.js', 'src/b.js'])
        .build();
      
      const result = calculateAllTransitiveDependents(graph.files);
      
      expect(typeof result).toBe('object');
    });
  });

  describe('calculateTransitiveDependencies', () => {
    it('should return empty set for isolated file', () => {
      const graph = GraphBuilder.create()
        .withFile('src/isolated.js')
        .build();
      
      const deps = calculateTransitiveDependencies('src/isolated.js', graph.files);
      
      expect(deps.size).toBe(0);
    });

    it('should return empty set for non-existent file', () => {
      const graph = GraphBuilder.create().build();
      const deps = calculateTransitiveDependencies('non-existent.js', graph.files);
      
      expect(deps.size).toBe(0);
    });

    it('should calculate single-level dependency', () => {
      const graph = GraphBuilder.create()
        .withFiles(['src/a.js', 'src/b.js'])
        .withDependency('src/a.js', 'src/b.js')
        .build();
      
      const deps = calculateTransitiveDependencies('src/a.js', graph.files);
      
      expect(deps.has('src/b.js')).toBe(true);
      expect(deps.size).toBe(1);
    });

    it('should calculate multi-level dependencies', () => {
      const graph = GraphBuilder.create()
        .withFiles(['src/a.js', 'src/b.js', 'src/c.js'])
        .withDependency('src/a.js', 'src/b.js')
        .withDependency('src/b.js', 'src/c.js')
        .build();
      
      const deps = calculateTransitiveDependencies('src/a.js', graph.files);
      
      expect(deps.has('src/b.js')).toBe(true);
      expect(deps.has('src/c.js')).toBe(true);
      expect(deps.size).toBe(2);
    });

    it('should calculate diamond pattern dependencies', () => {
      const graph = GraphBuilder.create()
        .withFiles(['src/a.js', 'src/b.js', 'src/c.js', 'src/d.js'])
        .withDependency('src/a.js', 'src/b.js')
        .withDependency('src/a.js', 'src/c.js')
        .withDependency('src/b.js', 'src/d.js')
        .withDependency('src/c.js', 'src/d.js')
        .build();
      
      const deps = calculateTransitiveDependencies('src/a.js', graph.files);
      
      expect(deps.has('src/b.js')).toBe(true);
      expect(deps.has('src/c.js')).toBe(true);
      expect(deps.has('src/d.js')).toBe(true);
      expect(deps.size).toBe(3);
    });

    it('should handle cycles gracefully', () => {
      const graph = GraphBuilder.create()
        .withCycle(['src/a.js', 'src/b.js', 'src/c.js'])
        .build();
      
      const deps = calculateTransitiveDependencies('src/a.js', graph.files);
      
      // Should not enter infinite loop
      expect(deps instanceof Set).toBe(true);
    });

    it('should not include self in dependencies', () => {
      const graph = GraphScenarios.selfCycle();
      const deps = calculateTransitiveDependencies('src/a.js', graph.files);
      
      // Self should not be in transitive dependencies
      expect(deps.has('src/a.js')).toBe(false);
    });
  });

  describe('calculateTransitiveDependents', () => {
    it('should return empty set for isolated file', () => {
      const graph = GraphBuilder.create()
        .withFile('src/isolated.js')
        .build();
      
      const dependents = calculateTransitiveDependents('src/isolated.js', graph.files);
      
      expect(dependents.size).toBe(0);
    });

    it('should return empty set for non-existent file', () => {
      const graph = GraphBuilder.create().build();
      const dependents = calculateTransitiveDependents('non-existent.js', graph.files);
      
      expect(dependents.size).toBe(0);
    });

    it('should calculate single-level dependent', () => {
      const graph = GraphBuilder.create()
        .withFiles(['src/a.js', 'src/b.js'])
        .withDependency('src/b.js', 'src/a.js')
        .build();
      
      const dependents = calculateTransitiveDependents('src/a.js', graph.files);
      
      expect(dependents.has('src/b.js')).toBe(true);
      expect(dependents.size).toBe(1);
    });

    it('should calculate multi-level dependents', () => {
      const graph = GraphBuilder.create()
        .withFiles(['src/a.js', 'src/b.js', 'src/c.js'])
        .withDependency('src/b.js', 'src/a.js')
        .withDependency('src/c.js', 'src/b.js')
        .build();
      
      const dependents = calculateTransitiveDependents('src/a.js', graph.files);
      
      expect(dependents.has('src/b.js')).toBe(true);
      expect(dependents.has('src/c.js')).toBe(true);
      expect(dependents.size).toBe(2);
    });

    it('should handle star pattern correctly', () => {
      const builder = GraphBuilder.create().withFile('src/utils.js');
      for (let i = 0; i < 5; i++) {
        builder.withFile(`src/feature${i}.js`);
        builder.withDependency(`src/feature${i}.js`, 'src/utils.js');
      }
      
      const graph = builder.build();
      const dependents = calculateTransitiveDependents('src/utils.js', graph.files);
      
      expect(dependents.size).toBe(5);
      for (let i = 0; i < 5; i++) {
        expect(dependents.has(`src/feature${i}.js`)).toBe(true);
      }
    });

    it('should handle cycles gracefully', () => {
      const graph = GraphBuilder.create()
        .withCycle(['src/a.js', 'src/b.js', 'src/c.js'])
        .build();
      
      const dependents = calculateTransitiveDependents('src/a.js', graph.files);
      
      // Should not enter infinite loop
      expect(dependents instanceof Set).toBe(true);
    });

    it('should not include self in dependents', () => {
      const graph = GraphScenarios.selfCycle();
      const dependents = calculateTransitiveDependents('src/a.js', graph.files);
      
      // Self should not be in transitive dependents
      expect(dependents.has('src/a.js')).toBe(false);
    });
  });

  describe('calculateAllTransitiveDependencies', () => {
    it('should return empty object for empty files', () => {
      const result = calculateAllTransitiveDependencies({});
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should calculate dependencies for all files', () => {
      const graph = GraphBuilder.create()
        .withFiles(['src/a.js', 'src/b.js', 'src/c.js'])
        .withDependency('src/a.js', 'src/b.js')
        .withDependency('src/b.js', 'src/c.js')
        .build();
      
      const allDeps = calculateAllTransitiveDependencies(graph.files);
      
      expect(allDeps).toHaveProperty('src/a.js');
      expect(allDeps).toHaveProperty('src/b.js');
      expect(allDeps).toHaveProperty('src/c.js');
      
      expect(allDeps['src/a.js']).toContain('src/b.js');
      expect(allDeps['src/a.js']).toContain('src/c.js');
      expect(allDeps['src/b.js']).toContain('src/c.js');
      expect(allDeps['src/c.js']).toHaveLength(0);
    });

    it('should return arrays for each file', () => {
      const graph = GraphBuilder.create()
        .withFiles(['src/a.js', 'src/b.js'])
        .build();
      
      const allDeps = calculateAllTransitiveDependencies(graph.files);
      
      expect(Array.isArray(allDeps['src/a.js'])).toBe(true);
      expect(Array.isArray(allDeps['src/b.js'])).toBe(true);
    });
  });

  describe('calculateAllTransitiveDependents', () => {
    it('should return empty object for empty files', () => {
      const result = calculateAllTransitiveDependents({});
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should calculate dependents for all files', () => {
      const graph = GraphBuilder.create()
        .withFiles(['src/a.js', 'src/b.js', 'src/c.js'])
        .withDependency('src/b.js', 'src/a.js')
        .withDependency('src/c.js', 'src/b.js')
        .build();
      
      const allDependents = calculateAllTransitiveDependents(graph.files);
      
      expect(allDependents).toHaveProperty('src/a.js');
      expect(allDependents).toHaveProperty('src/b.js');
      expect(allDependents).toHaveProperty('src/c.js');
      
      expect(allDependents['src/a.js']).toContain('src/b.js');
      expect(allDependents['src/a.js']).toContain('src/c.js');
      expect(allDependents['src/b.js']).toContain('src/c.js');
      expect(allDependents['src/c.js']).toHaveLength(0);
    });

    it('should return arrays for each file', () => {
      const graph = GraphBuilder.create()
        .withFiles(['src/a.js', 'src/b.js'])
        .build();
      
      const allDependents = calculateAllTransitiveDependents(graph.files);
      
      expect(Array.isArray(allDependents['src/a.js'])).toBe(true);
      expect(Array.isArray(allDependents['src/b.js'])).toBe(true);
    });
  });

  describe('Error Handling Contract', () => {
    it('calculateTransitiveDependencies should handle null files', () => {
      const result = calculateTransitiveDependencies('test.js', null);
      expect(result instanceof Set).toBe(true);
      expect(result.size).toBe(0);
    });

    it('calculateTransitiveDependencies should handle null filePath', () => {
      const graph = GraphBuilder.create().build();
      const result = calculateTransitiveDependencies(null, graph.files);
      expect(result instanceof Set).toBe(true);
    });

    it('calculateTransitiveDependents should handle null files', () => {
      const result = calculateTransitiveDependents('test.js', null);
      expect(result instanceof Set).toBe(true);
      expect(result.size).toBe(0);
    });

    it('calculateAllTransitiveDependencies should handle null files', () => {
      const result = calculateAllTransitiveDependencies(null);
      expect(typeof result).toBe('object');
    });

    it('calculateAllTransitiveDependents should handle null files', () => {
      const result = calculateAllTransitiveDependents(null);
      expect(typeof result).toBe('object');
    });

    it('should handle missing dependsOn property', () => {
      const files = {
        'a.js': { usedBy: [] }
        // Missing dependsOn
      };
      
      expect(() => calculateTransitiveDependencies('a.js', files)).not.toThrow();
    });

    it('should handle missing usedBy property', () => {
      const files = {
        'a.js': { dependsOn: [] }
        // Missing usedBy
      };
      
      expect(() => calculateTransitiveDependents('a.js', files)).not.toThrow();
    });

    it('should handle null dependsOn', () => {
      const files = {
        'a.js': { dependsOn: null, usedBy: [] }
      };
      
      const result = calculateTransitiveDependencies('a.js', files);
      expect(result instanceof Set).toBe(true);
    });

    it('should handle null usedBy', () => {
      const files = {
        'a.js': { dependsOn: [], usedBy: null }
      };
      
      const result = calculateTransitiveDependents('a.js', files);
      expect(result instanceof Set).toBe(true);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle deep dependency chain', () => {
      const builder = GraphBuilder.create();
      const depth = 10;
      
      // Create chain: a0 -> a1 -> a2 -> ... -> a9
      for (let i = 0; i < depth; i++) {
        builder.withFile(`src/a${i}.js`);
      }
      for (let i = 0; i < depth - 1; i++) {
        builder.withDependency(`src/a${i}.js`, `src/a${i + 1}.js`);
      }
      
      const graph = builder.build();
      const deps = calculateTransitiveDependencies('src/a0.js', graph.files);
      
      expect(deps.size).toBe(depth - 1);
      for (let i = 1; i < depth; i++) {
        expect(deps.has(`src/a${i}.js`)).toBe(true);
      }
    });

    it('should handle complex dependency graph', () => {
      const graph = GraphScenarios.complex();
      
      const allDeps = calculateAllTransitiveDependencies(graph.files);
      const allDependents = calculateAllTransitiveDependents(graph.files);
      
      // Verify all files have their dependencies calculated
      for (const filePath of Object.keys(graph.files)) {
        expect(allDeps).toHaveProperty(filePath);
        expect(allDependents).toHaveProperty(filePath);
        expect(Array.isArray(allDeps[filePath])).toBe(true);
        expect(Array.isArray(allDependents[filePath])).toBe(true);
      }
    });

    it('should correctly identify files with no dependencies', () => {
      const graph = GraphBuilder.create()
        .withFiles(['src/a.js', 'src/b.js', 'src/c.js'])
        .withDependency('src/a.js', 'src/b.js')
        .build();
      
      const allDeps = calculateAllTransitiveDependencies(graph.files);
      
      // c.js has no dependencies
      expect(allDeps['src/c.js']).toHaveLength(0);
    });

    it('should correctly identify files with no dependents', () => {
      const graph = GraphBuilder.create()
        .withFiles(['src/a.js', 'src/b.js', 'src/c.js'])
        .withDependency('src/b.js', 'src/a.js')
        .build();
      
      const allDependents = calculateAllTransitiveDependents(graph.files);
      
      // c.js has no dependents
      expect(allDependents['src/c.js']).toHaveLength(0);
    });

    it('should be consistent between single and batch calculations', () => {
      const graph = GraphBuilder.create()
        .withFiles(['src/a.js', 'src/b.js', 'src/c.js'])
        .withDependency('src/a.js', 'src/b.js')
        .withDependency('src/b.js', 'src/c.js')
        .build();
      
      // Single calculation
      const singleDeps = calculateTransitiveDependencies('src/a.js', graph.files);
      
      // Batch calculation
      const allDeps = calculateAllTransitiveDependencies(graph.files);
      
      // Results should match
      expect(singleDeps.size).toBe(allDeps['src/a.js'].length);
      for (const dep of singleDeps) {
        expect(allDeps['src/a.js']).toContain(dep);
      }
    });
  });
});
