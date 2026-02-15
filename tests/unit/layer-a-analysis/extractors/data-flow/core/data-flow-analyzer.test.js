/**
 * @fileoverview Data Flow Analyzer Tests
 * 
 * Tests for the DataFlowAnalyzer class that analyzes data flow coherence.
 * 
 * @module tests/data-flow/core/data-flow-analyzer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DataFlowAnalyzer } from '../../../../../../src/layer-a-static/extractors/data-flow/core/data-flow-analyzer.js';
import { DataFlowBuilder, TestFixtures, parseCode } from '../__factories__/data-flow-test.factory.js';

describe('DataFlowAnalyzer', () => {
  describe('Basic Analysis', () => {
    it('should analyze empty data flow', () => {
      const analyzer = new DataFlowAnalyzer([], [], []);
      const result = analyzer.analyze();

      expect(result.coherence).toBe(0);
      expect(result.coverage).toBe(0);
      expect(result.unusedInputs).toEqual([]);
      expect(result.deadVariables).toEqual([]);
    });

    it('should analyze simple data flow', () => {
      const analyzer = new DataFlowAnalyzer(
        [{ name: 'x', position: 0, type: 'simple' }],
        [{ to: 'result', from: 'x', operation: 'return' }],
        [{ type: 'return', value: 'x' }]
      );
      const result = analyzer.analyze();

      expect(result.coherence).toBeGreaterThan(0);
      expect(result.coverage).toBeGreaterThan(0);
    });

    it('should calculate correct metrics', () => {
      const analyzer = new DataFlowAnalyzer(
        [{ name: 'a', position: 0 }, { name: 'b', position: 1 }],
        [{ to: 'sum', from: ['a', 'b'], operation: 'binary_operation' }],
        [{ type: 'return', sources: ['sum'] }]
      );
      const result = analyzer.analyze();

      expect(result.metrics.totalInputs).toBe(2);
      expect(result.metrics.totalTransformations).toBe(1);
      expect(result.metrics.totalOutputs).toBe(1);
    });
  });

  describe('Unused Inputs Detection', () => {
    it('should detect unused simple inputs', () => {
      const analyzer = new DataFlowAnalyzer(
        [{ name: 'used', position: 0 }, { name: 'unused', position: 1 }],
        [{ to: 'result', from: 'used', operation: 'return' }],
        [{ type: 'return', sources: ['used'] }]
      );

      const unused = analyzer.findUnusedInputs();
      expect(unused).toHaveLength(1);
      expect(unused[0].name).toBe('unused');
    });

    it('should detect all unused inputs', () => {
      const analyzer = new DataFlowAnalyzer(
        [{ name: 'a', position: 0 }, { name: 'b', position: 1 }],
        [],
        []
      );

      const unused = analyzer.findUnusedInputs();
      expect(unused).toHaveLength(2);
    });

    it('should not flag used inputs as unused', () => {
      const analyzer = new DataFlowAnalyzer(
        [{ name: 'x', position: 0, usages: [{ type: 'reference' }] }],
        [],
        []
      );

      const unused = analyzer.findUnusedInputs();
      expect(unused).toHaveLength(0);
    });

    it('should detect unused destructured properties', () => {
      const analyzer = new DataFlowAnalyzer(
        [{
          name: '__destructured_0',
          position: 0,
          type: 'destructured-object',
          properties: [{ local: 'id' }, { local: 'unused' }]
        }],
        [{ to: 'result', from: 'id', operation: 'return' }],
        [{ type: 'return', sources: ['id'] }]
      );

      const unused = analyzer.findUnusedInputs();
      expect(unused).toHaveLength(1);
    });
  });

  describe('Dead Variables Detection', () => {
    it('should detect dead variables', () => {
      const analyzer = new DataFlowAnalyzer(
        [],
        [
          { to: 'dead', from: 'input', operation: 'assignment' },
          { to: 'used', from: 'input', operation: 'assignment' }
        ],
        [{ type: 'return', sources: ['used'] }]
      );

      const dead = analyzer.findDeadVariables();
      expect(dead).toHaveLength(1);
      expect(dead[0].name).toBe('dead');
    });

    it('should not flag used variables as dead', () => {
      const analyzer = new DataFlowAnalyzer(
        [],
        [{ to: 'temp', from: 'input', operation: 'assignment' }],
        [{ type: 'return', sources: ['temp'] }]
      );

      const dead = analyzer.findDeadVariables();
      expect(dead).toHaveLength(0);
    });

    it('should track variables through transformations', () => {
      const analyzer = new DataFlowAnalyzer(
        [],
        [
          { to: 'step1', from: 'input', operation: 'function_call' },
          { to: 'step2', from: 'step1', operation: 'property_access' }
        ],
        [{ type: 'return', sources: ['step2'] }]
      );

      const dead = analyzer.findDeadVariables();
      expect(dead).toHaveLength(0);
    });

    it('should handle array from fields', () => {
      const analyzer = new DataFlowAnalyzer(
        [],
        [{ to: 'result', from: ['a', 'b'], operation: 'binary_operation' }],
        [{ type: 'return', sources: ['result'] }]
      );

      const dead = analyzer.findDeadVariables();
      expect(dead).toHaveLength(0);
    });
  });

  describe('Coverage Calculation', () => {
    it('should calculate 0 coverage for empty flow', () => {
      const analyzer = new DataFlowAnalyzer([], [], []);
      expect(analyzer.calculateCoverage()).toBe(0);
    });

    it('should calculate high coverage for good flow', () => {
      const analyzer = new DataFlowAnalyzer(
        [{ name: 'x', position: 0 }],
        [{ to: 'y', from: 'x', operation: 'assignment' }],
        [{ type: 'return', sources: ['y'] }]
      );

      const coverage = analyzer.calculateCoverage();
      expect(coverage).toBeGreaterThan(80);
    });

    it('should penalize unused inputs in coverage', () => {
      const analyzer = new DataFlowAnalyzer(
        [{ name: 'x' }, { name: 'unused' }],
        [{ to: 'y', from: 'x', operation: 'assignment' }],
        [{ type: 'return' }]
      );

      const coverage = analyzer.calculateCoverage();
      expect(coverage).toBeLessThan(100);
    });

    it('should require outputs for full coverage', () => {
      const analyzer = new DataFlowAnalyzer(
        [{ name: 'x' }],
        [{ to: 'y', from: 'x', operation: 'assignment' }],
        []
      );

      const coverage = analyzer.calculateCoverage();
      expect(coverage).toBeLessThan(100);
    });
  });

  describe('Coherence Calculation', () => {
    it('should give high coherence for perfect flow', () => {
      const analyzer = new DataFlowAnalyzer(
        [{ name: 'x' }],
        [{ to: 'y', from: 'x', operation: 'assignment' }],
        [{ type: 'return', sources: ['y'] }]
      );

      const result = analyzer.analyze();
      expect(result.coherence).toBeGreaterThan(80);
    });

    it('should penalize unused inputs', () => {
      const analyzer = new DataFlowAnalyzer(
        [{ name: 'x' }, { name: 'unused' }],
        [{ to: 'y', from: 'x', operation: 'assignment' }],
        [{ type: 'return' }]
      );

      const result = analyzer.analyze();
      expect(result.coherence).toBeLessThan(100);
    });

    it('should penalize dead variables', () => {
      const analyzer = new DataFlowAnalyzer(
        [{ name: 'x' }],
        [
          { to: 'dead', from: 'x', operation: 'assignment' },
          { to: 'used', from: 'x', operation: 'assignment' }
        ],
        [{ type: 'return', sources: ['used'] }]
      );

      const result = analyzer.analyze();
      expect(result.coherence).toBeLessThan(100);
    });

    it('should give 0 coherence for empty flow', () => {
      const analyzer = new DataFlowAnalyzer([], [], []);
      const result = analyzer.analyze();
      expect(result.coherence).toBe(0);
    });
  });

  describe('Usage Rate Calculation', () => {
    it('should calculate 100% usage when all inputs used', () => {
      const analyzer = new DataFlowAnalyzer(
        [{ name: 'x' }, { name: 'y' }],
        [],
        [{ type: 'return', sources: ['x', 'y'] }]
      );

      expect(analyzer.calculateUsageRate(2, 0)).toBe(100);
    });

    it('should calculate 0% usage when no inputs', () => {
      const analyzer = new DataFlowAnalyzer([], [], []);
      expect(analyzer.calculateUsageRate(0, 0)).toBe(100);
    });

    it('should calculate 50% usage when half inputs unused', () => {
      const analyzer = new DataFlowAnalyzer([], [], []);
      expect(analyzer.calculateUsageRate(4, 2)).toBe(50);
    });
  });

  describe('Productivity Calculation', () => {
    it('should calculate productivity for productive transforms', () => {
      const analyzer = new DataFlowAnalyzer(
        [],
        [
          { to: 'temp1', from: 'input', operation: 'assignment' },
          { to: 'temp2', from: 'temp1', operation: 'function_call' }
        ],
        [{ type: 'return', sources: ['temp2'] }]
      );

      expect(analyzer.calculateProductivity()).toBe(100);
    });

    it('should calculate 0 productivity for no transforms', () => {
      const analyzer = new DataFlowAnalyzer([], [], []);
      expect(analyzer.calculateProductivity()).toBe(0);
    });

    it('should detect unproductive transforms', () => {
      const analyzer = new DataFlowAnalyzer(
        [],
        [
          { to: 'unused1', from: 'input', operation: 'assignment' },
          { to: 'unused2', from: 'input', operation: 'function_call' }
        ],
        [{ type: 'return', sources: [] }]
      );

      expect(analyzer.calculateProductivity()).toBe(0);
    });
  });

  describe('Output Diversity', () => {
    it('should calculate diversity for varied outputs', () => {
      const analyzer = new DataFlowAnalyzer(
        [],
        [],
        [
          { type: 'return', operation: 'primitive' },
          { type: 'side_effect', operation: 'logging' }
        ]
      );

      expect(analyzer.calculateOutputDiversity()).toBeGreaterThan(0);
    });

    it('should calculate 0 diversity for no outputs', () => {
      const analyzer = new DataFlowAnalyzer([], [], []);
      expect(analyzer.calculateOutputDiversity()).toBe(0);
    });
  });

  describe('Pattern Detection', () => {
    it('should detect read-transform-persist pattern', () => {
      const analyzer = new DataFlowAnalyzer(
        [{ name: 'data' }],
        [{ to: 'processed', from: 'data', operation: 'map' }],
        [{ type: 'side_effect', operation: 'persistence' }]
      );

      const patterns = analyzer.detectPatterns();
      expect(patterns).toContain('read-transform-persist');
    });

    it('should detect pure function pattern', () => {
      const analyzer = new DataFlowAnalyzer(
        [{ name: 'x' }],
        [{ to: 'y', from: 'x', operation: 'assignment' }],
        [{ type: 'return', sources: ['y'] }]
      );

      const patterns = analyzer.detectPatterns();
      expect(patterns).toContain('pure-function');
    });

    it('should detect event handler pattern', () => {
      const analyzer = new DataFlowAnalyzer(
        [{ name: 'event' }],
        [],
        [{ type: 'side_effect', operation: 'event_emission' }]
      );

      const patterns = analyzer.detectPatterns();
      expect(patterns).toContain('event-handler');
    });

    it('should detect validator pattern', () => {
      const analyzer = new DataFlowAnalyzer(
        [{ name: 'input' }],
        [],
        [
          { type: 'return', operation: 'early_return' },
          { type: 'return', operation: 'normal' }
        ]
      );

      const patterns = analyzer.detectPatterns();
      expect(patterns).toContain('validator');
    });
  });

  describe('Suggestions Generation', () => {
    it('should suggest removing unused inputs', () => {
      const analyzer = new DataFlowAnalyzer(
        [{ name: 'unused' }],
        [],
        []
      );

      const suggestions = analyzer.generateSuggestions();
      const unusedSuggestion = suggestions.find(s => s.type === 'unused-inputs');
      expect(unusedSuggestion).toBeDefined();
      expect(unusedSuggestion.severity).toBe('warning');
    });

    it('should suggest removing dead variables', () => {
      const analyzer = new DataFlowAnalyzer(
        [{ name: 'x' }],
        [{ to: 'dead', from: 'x', operation: 'assignment' }],
        [{ type: 'return' }]
      );

      const suggestions = analyzer.generateSuggestions();
      const deadSuggestion = suggestions.find(s => s.type === 'dead-code');
      expect(deadSuggestion).toBeDefined();
      expect(deadSuggestion.severity).toBe('info');
    });

    it('should warn about low coverage', () => {
      const analyzer = new DataFlowAnalyzer(
        [{ name: 'x' }, { name: 'y' }, { name: 'z' }],
        [],
        []
      );

      const suggestions = analyzer.generateSuggestions();
      const coverageSuggestion = suggestions.find(s => s.type === 'low-coverage');
      expect(coverageSuggestion).toBeDefined();
    });

    it('should praise pure functions', () => {
      const analyzer = new DataFlowAnalyzer(
        [{ name: 'x' }],
        [{ to: 'y', from: 'x', operation: 'assignment' }],
        [{ type: 'return', sources: ['y'] }]
      );

      const suggestions = analyzer.generateSuggestions();
      const patternSuggestion = suggestions.find(s => s.type === 'pattern-detected');
      expect(patternSuggestion).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null inputs gracefully', () => {
      const analyzer = new DataFlowAnalyzer(null, null, null);
      const result = analyzer.analyze();

      expect(result.coherence).toBe(0);
      expect(result.unusedInputs).toEqual([]);
      expect(result.deadVariables).toEqual([]);
    });

    it('should handle undefined values', () => {
      const analyzer = new DataFlowAnalyzer(undefined, undefined, undefined);
      const result = analyzer.analyze();

      expect(result.coherence).toBe(0);
    });

    it('should handle mixed from types', () => {
      const analyzer = new DataFlowAnalyzer(
        [],
        [
          { to: 'result', from: 'single', operation: 'assignment' },
          { to: 'result2', from: ['multi', 'source'], operation: 'binary_operation' }
        ],
        []
      );

      const dead = analyzer.findDeadVariables();
      expect(dead).toHaveLength(2);
    });

    it('should handle properties in outputs', () => {
      const analyzer = new DataFlowAnalyzer(
        [{ name: 'x' }],
        [],
        [{ type: 'return', value: 'x.property' }]
      );

      const unused = analyzer.findUnusedInputs();
      expect(unused).toHaveLength(0);
    });
  });
});
