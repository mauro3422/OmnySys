/**
 * @fileoverview Data Flow Index Tests
 * 
 * Tests for the main data-flow module exports and integration.
 * 
 * @module tests/data-flow/index
 */

import { describe, it, expect } from 'vitest';
import {
  extractDataFlow,
  InputExtractor,
  TransformationExtractor,
  OutputExtractor,
  DataFlowAnalyzer,
  GraphBuilder,
  InvariantDetector,
  TypeInferrer,
  ScopeManager,
  PatternIndexManager
} from '../../../../../src/layer-a-static/extractors/data-flow/index.js';
import { TestFixtures } from './__factories__/data-flow-test.factory.js';

describe('Data Flow Module', () => {
  describe('Exports', () => {
    it('should export extractDataFlow function', () => {
      expect(typeof extractDataFlow).toBe('function');
    });

    it('should export InputExtractor class', () => {
      expect(typeof InputExtractor).toBe('function');
    });

    it('should export TransformationExtractor class', () => {
      expect(typeof TransformationExtractor).toBe('function');
    });

    it('should export OutputExtractor class', () => {
      expect(typeof OutputExtractor).toBe('function');
    });

    it('should export DataFlowAnalyzer class', () => {
      expect(typeof DataFlowAnalyzer).toBe('function');
    });

    it('should export GraphBuilder class', () => {
      expect(typeof GraphBuilder).toBe('function');
    });

    it('should export InvariantDetector class', () => {
      expect(typeof InvariantDetector).toBe('function');
    });

    it('should export TypeInferrer class', () => {
      expect(typeof TypeInferrer).toBe('function');
    });

    it('should export ScopeManager class', () => {
      expect(typeof ScopeManager).toBe('function');
    });

    it('should export PatternIndexManager class', () => {
      expect(typeof PatternIndexManager).toBe('function');
    });
  });

  describe('extractDataFlow Integration', () => {
    it('should extract data flow from simple function', () => {
      const result = extractDataFlow(TestFixtures.SIMPLE_ADD);

      expect(result).toBeDefined();
      expect(result.inputs).toBeDefined();
      expect(result.transformations).toBeDefined();
      expect(result.outputs).toBeDefined();
      expect(result.graph).toBeDefined();
    });

    it('should extract inputs correctly', () => {
      const result = extractDataFlow(TestFixtures.SIMPLE_ADD);

      expect(result.inputs).toHaveLength(2);
      expect(result.inputs.map(i => i.name)).toContain('a');
      expect(result.inputs.map(i => i.name)).toContain('b');
    });

    it('should extract outputs correctly', () => {
      const result = extractDataFlow(TestFixtures.SIMPLE_ADD);

      expect(result.outputs.length).toBeGreaterThan(0);
      const returnOutput = result.outputs.find(o => o.type === 'return');
      expect(returnOutput).toBeDefined();
    });

    it('should build a graph', () => {
      const result = extractDataFlow(TestFixtures.SIMPLE_ADD);

      expect(result.graph.nodes).toBeDefined();
      expect(result.graph.edges).toBeDefined();
      expect(result.graph.meta).toBeDefined();
    });

    it('should handle async functions', () => {
      const result = extractDataFlow(TestFixtures.ASYNC_FLOW);

      expect(result).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should handle arrow functions', () => {
      const result = extractDataFlow(TestFixtures.IMPLICIT_RETURN);

      expect(result).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should handle functions with defaults', () => {
      const result = extractDataFlow(TestFixtures.WITH_DEFAULTS);

      expect(result).toBeDefined();
      expect(result.inputs).toHaveLength(1);
      expect(result.inputs[0].hasDefault).toBe(true);
    });

    it('should handle destructured parameters', () => {
      const result = extractDataFlow(TestFixtures.DESTRUCTURED_OBJECT);

      expect(result).toBeDefined();
      expect(result.inputs.length).toBeGreaterThan(0);
    });

    it('should handle functions with side effects', () => {
      const result = extractDataFlow(TestFixtures.CONSOLE_LOG);

      expect(result).toBeDefined();
      const sideEffect = result.outputs.find(o => o.type === 'side_effect');
      expect(sideEffect).toBeDefined();
    });

    it('should include metadata', () => {
      const result = extractDataFlow(TestFixtures.SIMPLE_ADD);

      expect(result._meta).toBeDefined();
      expect(result._meta.extractedAt).toBeDefined();
      expect(result._meta.version).toBeDefined();
    });
  });

  describe('Options Handling', () => {
    it('should not detect invariants by default', () => {
      const result = extractDataFlow(TestFixtures.SIMPLE_ADD);

      expect(result.analysis.invariants).toEqual([]);
    });

    it('should detect invariants when option is set', () => {
      const result = extractDataFlow(TestFixtures.SIMPLE_ADD, { detectInvariants: true });

      expect(result.analysis.invariants).toBeDefined();
    });

    it('should not infer types by default', () => {
      const result = extractDataFlow(TestFixtures.SIMPLE_ADD);

      expect(result.analysis.inferredTypes).toEqual({});
    });

    it('should infer types when option is set', () => {
      const result = extractDataFlow(TestFixtures.SIMPLE_ADD, { inferTypes: true });

      expect(result.analysis.inferredTypes).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle syntax errors gracefully', () => {
      const result = extractDataFlow('function { invalid');

      expect(result.error).toBeDefined();
    });

    it('should handle empty code', () => {
      const result = extractDataFlow('');

      expect(result.error).toBeDefined();
    });

    it('should handle non-function code', () => {
      const result = extractDataFlow('const x = 5;');

      // Should return empty or gracefully handle
      expect(result).toBeDefined();
    });

    it('should handle complex nested functions', () => {
      const code = `
        function outer() {
          function inner() {
            return 42;
          }
          return inner;
        }
      `;
      const result = extractDataFlow(code);

      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rest parameters', () => {
      const result = extractDataFlow(TestFixtures.REST_PARAMS);

      expect(result).toBeDefined();
      expect(result.inputs.length).toBeGreaterThan(0);
    });

    it('should handle multiple return statements', () => {
      const result = extractDataFlow(TestFixtures.MULTIPLE_RETURNS);

      expect(result.outputs.length).toBeGreaterThan(0);
    });

    it('should handle try-catch blocks', () => {
      const result = extractDataFlow(TestFixtures.TRY_CATCH);

      expect(result).toBeDefined();
    });

    it('should handle loops', () => {
      const result = extractDataFlow(TestFixtures.LOOP_PROCESSING);

      expect(result).toBeDefined();
      expect(result.transformations).toBeDefined();
    });

    it('should handle deeply nested code', () => {
      const code = `
        function deep(a) {
          if (a) {
            if (a.b) {
              if (a.b.c) {
                return a.b.c.d;
              }
            }
          }
          return null;
        }
      `;
      const result = extractDataFlow(code);

      expect(result).toBeDefined();
    });

    it('should handle exports', () => {
      const code = `export function foo(x) { return x; }`;
      const result = extractDataFlow(code);

      expect(result).toBeDefined();
      expect(result.inputs).toHaveLength(1);
    });

    it('should handle default exports', () => {
      const code = `export default function(x) { return x; }`;
      const result = extractDataFlow(code);

      expect(result).toBeDefined();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle full data flow chain', () => {
      const result = extractDataFlow(TestFixtures.BINARY_OPS);

      expect(result.inputs).toHaveLength(2);
      expect(result.transformations.length).toBeGreaterThan(0);
      expect(result.outputs.length).toBeGreaterThan(0);
    });

    it('should handle method chaining', () => {
      const result = extractDataFlow(TestFixtures.CHAINED_CALLS);

      expect(result.transformations.length).toBeGreaterThan(0);
    });

    it('should handle array operations', () => {
      const result = extractDataFlow(TestFixtures.ARRAY_METHODS);

      expect(result.transformations.length).toBeGreaterThan(0);
    });

    it('should handle error throwing', () => {
      const result = extractDataFlow(TestFixtures.ERROR_HANDLING);

      const throwOutput = result.outputs.find(o => o.type === 'throw');
      expect(throwOutput).toBeDefined();
    });

    it('should handle reduce patterns', () => {
      const result = extractDataFlow(TestFixtures.REDUCE_PATTERN);

      expect(result).toBeDefined();
      expect(result.transformations).toBeDefined();
    });
  });
});
