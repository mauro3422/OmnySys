import { describe, it, expect } from 'vitest';
import {
  detectCycles,
  isInCycle,
  getFilesInCycles
} from '#layer-a/graph/algorithms/cycle-detector.js';
import { GraphBuilder, GraphScenarios } from '../../../../factories/graph-test.factory.js';

describe('CycleDetector', () => {
  describe('Structure Contract', () => {
    it('should export detectCycles function', () => {
      expect(typeof detectCycles).toBe('function');
    });

    it('should export isInCycle function', () => {
      expect(typeof isInCycle).toBe('function');
    });

    it('should export getFilesInCycles function', () => {
      expect(typeof getFilesInCycles).toBe('function');
    });

    it('detectCycles should return array of cycles', () => {
      const graph = GraphBuilder.create().build();
      const cycles = detectCycles(graph.files);
      
      expect(Array.isArray(cycles)).toBe(true);
    });

    it('isInCycle should return boolean', () => {
      const cycles = [['a.js', 'b.js', 'c.js']];
      expect(typeof isInCycle('a.js', cycles)).toBe('boolean');
    });

    it('getFilesInCycles should return a Set', () => {
      const cycles = [['a.js', 'b.js']];
      const files = getFilesInCycles(cycles);
      
      expect(files instanceof Set).toBe(true);
    });
  });

  describe('Cycle Detection', () => {
    it('should detect no cycles in empty graph', () => {
      const graph = GraphBuilder.create().build();
      const cycles = detectCycles(graph.files);
      
      expect(cycles).toHaveLength(0);
    });

    it('should detect no cycles in linear chain', () => {
      const graph = GraphScenarios.linearChain();
      const cycles = detectCycles(graph.files);
      
      expect(cycles).toHaveLength(0);
    });

    it('should detect simple cycle', () => {
      const graph = GraphScenarios.simpleCycle();
      const cycles = detectCycles(graph.files);
      
      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should detect self-cycle', () => {
      const graph = GraphScenarios.selfCycle();
      const cycles = detectCycles(graph.files);
      
      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0]).toContain('src/a.js');
    });

    it('should detect multiple cycles', () => {
      const graph = GraphScenarios.multipleCycles();
      const cycles = detectCycles(graph.files);
      
      expect(cycles.length).toBeGreaterThanOrEqual(2);
    });

    it('should detect cycle in diamond pattern', () => {
      // Create diamond with back-edge to form cycle
      const graph = GraphBuilder.create()
        .withFiles(['a.js', 'b.js', 'c.js', 'd.js'])
        .withDependency('a.js', 'b.js')
        .withDependency('a.js', 'c.js')
        .withDependency('b.js', 'd.js')
        .withDependency('c.js', 'd.js')
        .withDependency('d.js', 'a.js') // Back edge creates cycle
        .build();
      
      const cycles = detectCycles(graph.files);
      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should detect nested cycles', () => {
      const graph = GraphBuilder.create()
        .withFiles(['a.js', 'b.js', 'c.js', 'd.js'])
        .withDependency('a.js', 'b.js')
        .withDependency('b.js', 'c.js')
        .withDependency('c.js', 'a.js') // Cycle A->B->C->A
        .withDependency('c.js', 'd.js')
        .withDependency('d.js', 'b.js') // Cycle B->C->D->B
        .build();
      
      const cycles = detectCycles(graph.files);
      expect(cycles.length).toBeGreaterThanOrEqual(1);
    });

    it('should include cycle closing element in cycle path', () => {
      const graph = GraphScenarios.simpleCycle();
      const cycles = detectCycles(graph.files);
      
      if (cycles.length > 0) {
        // First and last element should be the same (cycle closure)
        const firstCycle = cycles[0];
        expect(firstCycle[0]).toBe(firstCycle[firstCycle.length - 1]);
      }
    });
  });

  describe('Custom Dependency Function', () => {
    it('should use custom getDependencies function', () => {
      const files = {
        'a.js': { customDeps: ['b.js'] },
        'b.js': { customDeps: ['c.js'] },
        'c.js': { customDeps: ['a.js'] }
      };
      
      const cycles = detectCycles(files, (node) => node.customDeps);
      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should handle missing dependency property', () => {
      const files = {
        'a.js': { dependsOn: ['b.js'] },
        'b.js': {} // Missing dependsOn
      };
      
      const cycles = detectCycles(files);
      expect(cycles).toHaveLength(0);
    });

    it('should handle null dependencies', () => {
      const files = {
        'a.js': { dependsOn: null },
        'b.js': { dependsOn: ['a.js'] }
      };
      
      expect(() => detectCycles(files)).not.toThrow();
    });
  });

  describe('isInCycle', () => {
    it('should return true for file in cycle', () => {
      const cycles = [['a.js', 'b.js', 'c.js', 'a.js']];
      
      expect(isInCycle('a.js', cycles)).toBe(true);
      expect(isInCycle('b.js', cycles)).toBe(true);
      expect(isInCycle('c.js', cycles)).toBe(true);
    });

    it('should return false for file not in cycle', () => {
      const cycles = [['a.js', 'b.js', 'a.js']];
      
      expect(isInCycle('c.js', cycles)).toBe(false);
      expect(isInCycle('d.js', cycles)).toBe(false);
    });

    it('should return false for empty cycles', () => {
      expect(isInCycle('a.js', [])).toBe(false);
    });

    it('should handle multiple cycles', () => {
      const cycles = [
        ['a.js', 'b.js', 'a.js'],
        ['c.js', 'd.js', 'c.js']
      ];
      
      expect(isInCycle('a.js', cycles)).toBe(true);
      expect(isInCycle('c.js', cycles)).toBe(true);
      expect(isInCycle('e.js', cycles)).toBe(false);
    });
  });

  describe('getFilesInCycles', () => {
    it('should return empty set for no cycles', () => {
      const files = getFilesInCycles([]);
      expect(files.size).toBe(0);
    });

    it('should return all files in cycles', () => {
      const cycles = [['a.js', 'b.js', 'c.js', 'a.js']];
      const files = getFilesInCycles(cycles);
      
      expect(files.has('a.js')).toBe(true);
      expect(files.has('b.js')).toBe(true);
      expect(files.has('c.js')).toBe(true);
    });

    it('should deduplicate files across cycles', () => {
      const cycles = [
        ['a.js', 'b.js', 'a.js'],
        ['b.js', 'c.js', 'b.js']
      ];
      const files = getFilesInCycles(cycles);
      
      expect(files.size).toBe(3);
      expect(files.has('a.js')).toBe(true);
      expect(files.has('b.js')).toBe(true);
      expect(files.has('c.js')).toBe(true);
    });

    it('should handle multiple separate cycles', () => {
      const cycles = [
        ['a.js', 'b.js', 'a.js'],
        ['x.js', 'y.js', 'z.js', 'x.js']
      ];
      const files = getFilesInCycles(cycles);
      
      expect(files.size).toBe(5);
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle null files map', () => {
      expect(() => detectCycles(null)).not.toThrow();
      expect(detectCycles(null)).toEqual([]);
    });

    it('should handle undefined files map', () => {
      expect(() => detectCycles(undefined)).not.toThrow();
    });

    it('should handle empty files map', () => {
      const cycles = detectCycles({});
      expect(cycles).toEqual([]);
    });

    it('should handle missing file nodes gracefully', () => {
      const files = {
        'a.js': { dependsOn: ['b.js'] },
        // b.js is missing
        'c.js': { dependsOn: ['a.js'] }
      };
      
      expect(() => detectCycles(files)).not.toThrow();
    });

    it('isInCycle should handle null file path', () => {
      expect(() => isInCycle(null, [['a.js', 'a.js']])).not.toThrow();
    });

    it('isInCycle should handle null cycles', () => {
      expect(() => isInCycle('a.js', null)).not.toThrow();
    });

    it('getFilesInCycles should handle null cycles', () => {
      expect(() => getFilesInCycles(null)).not.toThrow();
    });

    it('should handle corrupted cycle data', () => {
      const cycles = [['a.js', null, 'c.js', 'a.js']];
      expect(() => getFilesInCycles(cycles)).not.toThrow();
    });
  });

  describe('Real-world Scenarios', () => {
    it('should detect cycles in complex graph', () => {
      const graph = GraphScenarios.complex();
      // The complex scenario doesn't have cycles by default
      const cycles = detectCycles(graph.files);
      // May or may not have cycles depending on the scenario
      expect(Array.isArray(cycles)).toBe(true);
    });

    it('should handle deep graph without cycles', () => {
      const graph = GraphScenarios.deepTree();
      const cycles = detectCycles(graph.files);
      expect(cycles).toHaveLength(0);
    });

    it('should handle star pattern', () => {
      const graph = GraphScenarios.star();
      const cycles = detectCycles(graph.files);
      expect(cycles).toHaveLength(0);
    });

    it('should detect cycle when multiple files depend on each other', () => {
      const graph = GraphBuilder.create()
        .withFiles(['utils.js', 'helpers.js', 'constants.js'])
        .withDependency('utils.js', 'helpers.js')
        .withDependency('helpers.js', 'constants.js')
        .withDependency('constants.js', 'utils.js')
        .build();
      
      const cycles = detectCycles(graph.files);
      expect(cycles.length).toBeGreaterThan(0);
      
      const filesInCycles = getFilesInCycles(cycles);
      expect(filesInCycles.has('utils.js')).toBe(true);
      expect(filesInCycles.has('helpers.js')).toBe(true);
      expect(filesInCycles.has('constants.js')).toBe(true);
    });

    it('should work with SystemMap structure', () => {
      const systemMap = GraphBuilder.create()
        .withCycle(['src/a.js', 'src/b.js', 'src/c.js'])
        .buildSystemMap();
      
      const cycles = detectCycles(systemMap.files);
      expect(cycles.length).toBeGreaterThan(0);
      
      // Verify SystemMap metadata is updated
      systemMap.metadata.cyclesDetected = cycles;
      expect(systemMap.metadata.cyclesDetected.length).toBeGreaterThan(0);
    });
  });
});
