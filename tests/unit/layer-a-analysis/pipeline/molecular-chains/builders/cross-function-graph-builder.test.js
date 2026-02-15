/**
 * @fileoverview cross-function-graph-builder.test.js
 * 
 * Tests for cross-function-graph-builder.js backward compatibility module
 * 
 * @module tests/unit/molecular-chains/builders/cross-function-graph-builder
 */

import { describe, it, expect } from 'vitest';

describe('cross-function-graph-builder (backward compatibility)', () => {
  // ============================================================================
  // Exports
  // ============================================================================
  describe('exports', () => {
    it('should export CrossFunctionGraphBuilder', async () => {
      const module = await import('#molecular-chains/cross-function-graph-builder.js');
      
      expect(module.CrossFunctionGraphBuilder).toBeDefined();
    });

    it('should export default', async () => {
      const module = await import('#molecular-chains/cross-function-graph-builder.js');
      
      expect(module.default).toBeDefined();
    });

    it('should re-export GraphBuilder from graph-builder', async () => {
      const wrapperModule = await import('#molecular-chains/cross-function-graph-builder.js');
      const { GraphBuilder } = await import('#molecular-chains/graph-builder/index.js');
      
      expect(wrapperModule.CrossFunctionGraphBuilder).toBe(GraphBuilder);
      expect(wrapperModule.default).toBe(GraphBuilder);
    });
  });

  // ============================================================================
  // Functionality
  // ============================================================================
  describe('functionality', () => {
    it('should create working GraphBuilder instance', async () => {
      const { CrossFunctionGraphBuilder } = await import('#molecular-chains/cross-function-graph-builder.js');
      
      const atoms = [{
        id: 'test::fn1',
        name: 'fn1',
        isExported: true,
        calledBy: [],
        calls: [],
        dataFlow: { inputs: [], outputs: [], transformations: [] }
      }];
      
      const builder = new CrossFunctionGraphBuilder(atoms, [], []);
      const result = builder.build();
      
      expect(result).toBeDefined();
      expect(result.nodes).toBeDefined();
      expect(result.edges).toBeDefined();
      expect(result.meta).toBeDefined();
    });

    it('should support findPaths method', async () => {
      const { CrossFunctionGraphBuilder } = await import('#molecular-chains/cross-function-graph-builder.js');
      
      const atoms = [
        { id: 'test::A', name: 'A', isExported: true, calls: [{ name: 'B', type: 'internal' }], dataFlow: { inputs: [], outputs: [], transformations: [] } },
        { id: 'test::B', name: 'B', calledBy: ['test::A'], calls: [], dataFlow: { inputs: [], outputs: [], transformations: [] } }
      ];
      
      const builder = new CrossFunctionGraphBuilder(atoms, [], []);
      const paths = builder.findPaths('A', 'B');
      
      expect(Array.isArray(paths)).toBe(true);
    });

    it('should support calculateMetrics method', async () => {
      const { CrossFunctionGraphBuilder } = await import('#molecular-chains/cross-function-graph-builder.js');
      
      const atoms = [{
        id: 'test::fn',
        name: 'fn',
        isExported: true,
        dataFlow: { inputs: [], outputs: [], transformations: [] }
      }];
      
      const builder = new CrossFunctionGraphBuilder(atoms, [], []);
      const metrics = builder.calculateMetrics();
      
      expect(metrics).toBeDefined();
    });
  });
});
