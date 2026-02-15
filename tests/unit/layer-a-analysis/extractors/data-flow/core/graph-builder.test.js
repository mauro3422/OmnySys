/**
 * @fileoverview Graph Builder Tests
 * 
 * Tests for the GraphBuilder class that builds transformation graphs.
 * 
 * @module tests/data-flow/core/graph-builder
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GraphBuilder } from '../../../../../../src/layer-a-static/extractors/data-flow/core/graph-builder.js';
import { createMockNode, createMockGraph } from '../__factories__/data-flow-test.factory.js';

describe('GraphBuilder', () => {
  let builder;

  beforeEach(() => {
    builder = new GraphBuilder();
  });

  describe('Node Management', () => {
    it('should add a node with generated ID', () => {
      const id = builder.addNode({
        type: 'INPUT',
        category: 'input',
        output: { name: 'x' }
      });

      expect(id).toBeDefined();
      expect(builder.nodes.has(id)).toBe(true);
    });

    it('should add a node with custom ID', () => {
      const id = builder.addNode({
        id: 'custom_001',
        type: 'INPUT',
        category: 'input'
      });

      expect(id).toBe('custom_001');
      expect(builder.nodes.has('custom_001')).toBe(true);
    });

    it('should register output variables in scope', () => {
      builder.addNode({
        type: 'ASSIGNMENT',
        category: 'transformation',
        output: { name: 'myVar' }
      });

      expect(builder.scope.get('myVar')).toBeDefined();
    });

    it('should auto-generate sequential IDs', () => {
      const id1 = builder.addNode({ type: 'INPUT' });
      const id2 = builder.addNode({ type: 'BINARY' });
      const id3 = builder.addNode({ type: 'RETURN' });

      expect(id1).toContain('001');
      expect(id2).toContain('002');
      expect(id3).toContain('003');
    });

    it('should preserve node properties', () => {
      const id = builder.addNode({
        type: 'CALL',
        category: 'function_call',
        inputs: [{ name: 'arg1', sourceType: 'variable' }],
        output: { name: 'result' },
        properties: { isAsync: true },
        location: { line: 10 }
      });

      const node = builder.nodes.get(id);
      expect(node.type).toBe('CALL');
      expect(node.category).toBe('function_call');
      expect(node.inputs).toHaveLength(1);
      expect(node.properties.isAsync).toBe(true);
      expect(node.location.line).toBe(10);
    });
  });

  describe('Edge Management', () => {
    it('should add an edge between nodes', () => {
      builder.addEdge('node1', 'node2');

      expect(builder.edges).toHaveLength(1);
      expect(builder.edges[0]).toEqual({ from: 'node1', to: 'node2' });
    });

    it('should add edge with metadata', () => {
      builder.addEdge('node1', 'node2', { type: 'dependency', dataFlow: 'x' });

      expect(builder.edges[0].type).toBe('dependency');
      expect(builder.edges[0].dataFlow).toBe('x');
    });

    it('should allow multiple edges', () => {
      builder.addEdge('a', 'b');
      builder.addEdge('b', 'c');
      builder.addEdge('a', 'c');

      expect(builder.edges).toHaveLength(3);
    });
  });

  describe('Automatic Node Connection', () => {
    it('should connect nodes based on variable dependencies', () => {
      const inputId = builder.addNode({
        type: 'INPUT',
        output: { name: 'x' }
      });

      const transformId = builder.addNode({
        type: 'BINARY',
        inputs: [{ name: 'x', sourceType: 'variable' }],
        output: { name: 'y' }
      });

      builder.connectNodes();

      const edge = builder.edges.find(e => e.from === inputId && e.to === transformId);
      expect(edge).toBeDefined();
      expect(edge.dataFlow).toBe('x');
    });

    it('should not connect nodes without dependencies', () => {
      builder.addNode({ type: 'INPUT', output: { name: 'x' } });
      builder.addNode({ type: 'INPUT', output: { name: 'y' } });

      builder.connectNodes();

      expect(builder.edges).toHaveLength(0);
    });

    it('should not create self-referencing edges', () => {
      const id = builder.addNode({
        type: 'BINARY',
        inputs: [{ name: 'x', sourceType: 'variable' }],
        output: { name: 'x' }
      });

      builder.connectNodes();

      const selfEdge = builder.edges.find(e => e.from === id && e.to === id);
      expect(selfEdge).toBeUndefined();
    });

    it('should handle multiple dependencies', () => {
      builder.addNode({ type: 'INPUT', output: { name: 'a' } });
      builder.addNode({ type: 'INPUT', output: { name: 'b' } });

      builder.addNode({
        type: 'BINARY',
        inputs: [
          { name: 'a', sourceType: 'variable' },
          { name: 'b', sourceType: 'variable' }
        ]
      });

      builder.connectNodes();

      expect(builder.edges).toHaveLength(2);
    });

    it('should skip non-variable inputs', () => {
      builder.addNode({
        type: 'INPUT',
        output: { name: 'x' }
      });

      builder.addNode({
        type: 'BINARY',
        inputs: [
          { name: 'x', sourceType: 'variable' },
          { value: 42, sourceType: 'literal' }
        ]
      });

      builder.connectNodes();

      expect(builder.edges).toHaveLength(1);
    });
  });

  describe('Graph Building', () => {
    it('should build complete graph', () => {
      builder.addNode({ type: 'INPUT', output: { name: 'x' } });
      builder.addNode({ type: 'RETURN' });

      const graph = builder.build();

      expect(graph.nodes).toHaveLength(2);
      expect(graph.edges).toBeDefined();
      expect(graph.meta).toBeDefined();
    });

    it('should calculate metadata correctly', () => {
      builder.addNode({ type: 'INPUT', output: { name: 'x' } });
      builder.addNode({ type: 'BINARY', output: { name: 'y' } });
      builder.addNode({ type: 'RETURN' });

      const graph = builder.build();

      expect(graph.meta.totalNodes).toBe(3);
      expect(graph.meta.entryPoints).toBeDefined();
      expect(graph.meta.exitPoints).toBeDefined();
    });

    it('should detect side effects in metadata', () => {
      builder.addNode({
        type: 'SIDE_EFFECT',
        category: 'side_effect',
        properties: { hasSideEffects: true }
      });

      const graph = builder.build();

      expect(graph.meta.hasSideEffects).toBe(true);
    });

    it('should detect async operations', () => {
      builder.addNode({
        type: 'AWAIT',
        properties: { isAsync: true }
      });

      const graph = builder.build();

      expect(graph.meta.hasAsync).toBe(true);
    });

    it('should calculate complexity', () => {
      builder.addNode({ type: 'INPUT', category: 'input' });
      builder.addNode({ type: 'BINARY', category: 'transformation' });
      builder.addNode({ type: 'CONDITIONAL' });

      const graph = builder.build();

      expect(graph.meta.complexity).toBeGreaterThan(0);
    });
  });

  describe('Entry Points', () => {
    it('should identify INPUT nodes as entry points', () => {
      const inputId = builder.addNode({ type: 'INPUT' });

      const entries = builder.findEntryPoints();

      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe(inputId);
    });

    it('should identify nodes without incoming edges as entry points', () => {
      builder.addNode({ type: 'INPUT', output: { name: 'x' } });
      const isolatedId = builder.addNode({ type: 'CONSTANT', output: { name: 'y' } });

      builder.connectNodes();
      const entries = builder.findEntryPoints();

      expect(entries.some(e => e.id === isolatedId)).toBe(true);
    });

    it('should not identify connected nodes as entry points', () => {
      const inputId = builder.addNode({ type: 'INPUT', output: { name: 'x' } });
      const transformId = builder.addNode({
        type: 'BINARY',
        inputs: [{ name: 'x', sourceType: 'variable' }]
      });

      builder.connectNodes();
      const entries = builder.findEntryPoints();

      expect(entries.some(e => e.id === transformId)).toBe(false);
    });
  });

  describe('Exit Points', () => {
    it('should identify RETURN nodes as exit points', () => {
      const returnId = builder.addNode({ type: 'RETURN' });

      const exits = builder.findExitPoints();

      expect(exits).toHaveLength(1);
      expect(exits[0].id).toBe(returnId);
    });

    it('should identify SIDE_EFFECT nodes as exit points', () => {
      const sideEffectId = builder.addNode({ type: 'SIDE_EFFECT' });

      const exits = builder.findExitPoints();

      expect(exits.some(e => e.id === sideEffectId)).toBe(true);
    });

    it('should identify nodes without outgoing edges as exit points', () => {
      const transformId = builder.addNode({ type: 'BINARY', output: { name: 'y' } });

      const exits = builder.findExitPoints();

      expect(exits.some(e => e.id === transformId)).toBe(true);
    });
  });

  describe('Path Tracing', () => {
    it('should trace path from node to exit', () => {
      const id1 = builder.addNode({ type: 'INPUT', output: { name: 'x' } });
      const id2 = builder.addNode({ type: 'BINARY', output: { name: 'y' } });
      const id3 = builder.addNode({ type: 'RETURN' });

      builder.addEdge(id1, id2);
      builder.addEdge(id2, id3);

      const paths = builder.tracePath(id1);

      expect(paths).toHaveLength(1);
    });

    it('should detect cycles in paths', () => {
      const id1 = builder.addNode({ type: 'INPUT' });
      const id2 = builder.addNode({ type: 'BINARY' });

      builder.addEdge(id1, id2);
      builder.addEdge(id2, id1); // Cycle

      const paths = builder.tracePath(id1, new Set());

      // Should handle cycle gracefully
      expect(paths).toBeDefined();
    });

    it('should handle terminal nodes', () => {
      const id = builder.addNode({ type: 'RETURN' });

      const paths = builder.tracePath(id);

      expect(paths).toHaveLength(1);
      expect(paths[0].isExit).toBe(true);
    });
  });

  describe('Dependent Transformations', () => {
    it('should find dependent nodes', () => {
      builder.addNode({ type: 'INPUT', output: { name: 'x' } });
      const transformId = builder.addNode({ type: 'BINARY', output: { name: 'y' } });
      const returnId = builder.addNode({ type: 'RETURN' });

      builder.addEdge('input_001', transformId);
      builder.addEdge(transformId, returnId);

      const dependents = builder.findDependentTransforms('x');

      expect(dependents).toHaveLength(2);
    });

    it('should return empty array for unknown variable', () => {
      const dependents = builder.findDependentTransforms('unknown');

      expect(dependents).toEqual([]);
    });

    it('should follow dependency chain', () => {
      builder.addNode({ type: 'INPUT', output: { name: 'a' } });
      builder.addNode({ type: 'BINARY', output: { name: 'b' } });
      builder.addNode({ type: 'BINARY', output: { name: 'c' } });
      builder.addNode({ type: 'RETURN' });

      builder.addEdge('input_001', 'binary_001');
      builder.addEdge('binary_001', 'binary_002');
      builder.addEdge('binary_002', 'return_001');

      const dependents = builder.findDependentTransforms('a');

      expect(dependents.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Visual Format', () => {
    it('should generate visual representation', () => {
      builder.addNode({
        type: 'INPUT',
        category: 'input',
        inputs: [],
        output: { name: 'x' }
      });

      const visual = builder.toVisualFormat();

      expect(visual).toContain('Data Flow Graph');
      expect(visual).toContain('Entry Points');
      expect(visual).toContain('Nodes');
    });

    it('should include node details in visual format', () => {
      builder.addNode({
        type: 'BINARY',
        inputs: [{ name: 'a' }, { name: 'b' }],
        output: { name: 'result' }
      });

      const visual = builder.toVisualFormat();

      expect(visual).toContain('BINARY');
      expect(visual).toContain('a');
      expect(visual).toContain('result');
    });

    it('should include edges in visual format', () => {
      builder.addNode({ type: 'INPUT', output: { name: 'x' } });
      builder.addNode({ type: 'RETURN' });
      builder.addEdge('input_001', 'return_001');

      const visual = builder.toVisualFormat();

      expect(visual).toContain('Edges');
      expect(visual).toContain('input_001');
      expect(visual).toContain('return_001');
    });
  });

  describe('Complexity Calculation', () => {
    it('should base complexity on transformation count', () => {
      builder.addNode({ type: 'INPUT', category: 'input' });
      builder.addNode({ type: 'BINARY', category: 'transformation' });

      const complexity = builder.calculateComplexity();

      expect(complexity).toBeGreaterThanOrEqual(1);
    });

    it('should add complexity for side effects', () => {
      builder.addNode({
        type: 'SIDE_EFFECT',
        category: 'side_effect',
        properties: { hasSideEffects: true }
      });

      const complexity = builder.calculateComplexity();

      expect(complexity).toBeGreaterThanOrEqual(2);
    });

    it('should add complexity for conditionals', () => {
      builder.addNode({ type: 'CONDITIONAL' });

      const complexity = builder.calculateComplexity();

      expect(complexity).toBeGreaterThanOrEqual(1);
    });

    it('should not count inputs and constants', () => {
      builder.addNode({ type: 'INPUT', category: 'input' });
      builder.addNode({ type: 'CONSTANT', category: 'constant' });

      const complexity = builder.calculateComplexity();

      expect(complexity).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty graph', () => {
      const graph = builder.build();

      expect(graph.nodes).toEqual([]);
      expect(graph.edges).toEqual([]);
      expect(graph.meta.totalNodes).toBe(0);
    });

    it('should handle nodes without outputs', () => {
      const id = builder.addNode({
        type: 'BINARY',
        output: null
      });

      expect(builder.scope.has('undefined')).toBe(false);
    });

    it('should handle duplicate IDs', () => {
      builder.addNode({ id: 'same', type: 'INPUT' });
      builder.addNode({ id: 'same', type: 'BINARY' });

      expect(builder.nodes.size).toBe(1);
      expect(builder.nodes.get('same').type).toBe('BINARY');
    });

    it('should handle nodes with empty inputs', () => {
      builder.addNode({
        type: 'BINARY',
        inputs: [],
        output: { name: 'result' }
      });

      builder.connectNodes();

      expect(builder.edges).toHaveLength(0);
    });

    it('should preserve node metadata', () => {
      const customData = { customField: 'value', nested: { key: 'val' } };
      const id = builder.addNode({
        type: 'CUSTOM',
        customField: 'value',
        nested: { key: 'val' }
      });

      const node = builder.nodes.get(id);
      expect(node.customField).toBe('value');
      expect(node.nested.key).toBe('val');
    });
  });
});
