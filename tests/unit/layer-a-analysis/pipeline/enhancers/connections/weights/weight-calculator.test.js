/**
 * @fileoverview weight-calculator.test.js
 * 
 * Tests for Weight Calculator
 * Tests calculateAllWeights, calculateConnectionWeight, getConnectionCategory, getWeightStats
 * 
 * @module tests/unit/layer-a-analysis/pipeline/enhancers/connections/weights
 */

import { describe, it, expect } from 'vitest';
import {
  calculateAllWeights,
  calculateConnectionWeight,
  getConnectionCategory,
  getWeightStats
} from '#layer-a/pipeline/enhancers/connections/weights/weight-calculator.js';

describe('Weight Calculator', () => {
  describe('calculateAllWeights', () => {
    it('should return empty array for empty connections', () => {
      const result = calculateAllWeights({}, []);

      expect(result).toEqual([]);
    });

    it('should calculate weights for all connection types', () => {
      const connections = {
        imports: [{ type: 'import', from: 'a', to: 'b', confidence: 1 }],
        dataFlow: [{ type: 'data-flow-chain', from: 'c', to: 'd', confidence: 0.8 }]
      };
      const atoms = [
        { id: 'a' },
        { id: 'b' },
        { id: 'c' },
        { id: 'd' }
      ];

      const result = calculateAllWeights(connections, atoms);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('weight');
      expect(result[1]).toHaveProperty('weight');
    });

    it('should add connectionCategory to each connection', () => {
      const connections = {
        test: [{ type: 'import', from: 'a', to: 'b', confidence: 1 }]
      };
      const atoms = [{ id: 'a' }, { id: 'b' }];

      const result = calculateAllWeights(connections, atoms);

      expect(result[0]).toHaveProperty('connectionCategory');
    });

    it('should sort by weight descending', () => {
      const connections = {
        test: [
          { type: 'import', from: 'a', to: 'b', confidence: 0.5 },
          { type: 'import', from: 'c', to: 'd', confidence: 1 }
        ]
      };
      const atoms = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];

      const result = calculateAllWeights(connections, atoms);

      expect(result[0].weight).toBeGreaterThanOrEqual(result[1].weight);
    });
  });

  describe('calculateConnectionWeight', () => {
    it('should calculate base weight from type', () => {
      const conn = { type: 'import', confidence: 1 };
      const atomIndex = new Map();

      const result = calculateConnectionWeight(conn, atomIndex);

      expect(result).toBeGreaterThan(0);
    });

    it('should apply default weight for unknown types', () => {
      const conn = { type: 'unknown', confidence: 1 };
      const atomIndex = new Map();

      const result = calculateConnectionWeight(conn, atomIndex);

      expect(result).toBeGreaterThan(0);
    });

    it('should multiply by confidence', () => {
      const conn1 = { type: 'import', confidence: 1 };
      const conn2 = { type: 'import', confidence: 0.5 };
      const atomIndex = new Map();

      const result1 = calculateConnectionWeight(conn1, atomIndex);
      const result2 = calculateConnectionWeight(conn2, atomIndex);

      expect(result1).toBeGreaterThan(result2);
    });

    it('should boost weight for high vibration atoms', () => {
      const conn = { type: 'import', from: 'a', confidence: 1 };
      const atomIndex = new Map([
        ['a', { ancestry: { vibrationScore: 0.5 } }]
      ]);

      const result = calculateConnectionWeight(conn, atomIndex);

      expect(result).toBeGreaterThan(1);
    });

    it('should penalize broken connections', () => {
      const conn = { type: 'import', confidence: 1, status: 'broken' };
      const atomIndex = new Map();

      const result = calculateConnectionWeight(conn, atomIndex);

      expect(result).toBeLessThan(1);
    });

    it('should boost weight for older generations', () => {
      const conn = { type: 'import', confidence: 1, generation: 3 };
      const atomIndex = new Map();

      const result = calculateConnectionWeight(conn, atomIndex);

      expect(result).toBeGreaterThan(1);
    });

    it('should cap weight at 2.0', () => {
      const conn = {
        type: 'import',
        confidence: 1,
        generation: 10
      };
      const atomIndex = new Map([
        ['a', { ancestry: { vibrationScore: 1 } }]
      ]);

      const result = calculateConnectionWeight(conn, atomIndex);

      expect(result).toBeLessThanOrEqual(2.0);
    });

    it('should handle missing confidence', () => {
      const conn = { type: 'import' };
      const atomIndex = new Map();

      const result = calculateConnectionWeight(conn, atomIndex);

      expect(result).toBeGreaterThan(0);
    });
  });

  describe('getConnectionCategory', () => {
    it('should return critical for weight >= 1.2', () => {
      expect(getConnectionCategory(1.2)).toBe('critical');
      expect(getConnectionCategory(1.5)).toBe('critical');
      expect(getConnectionCategory(2.0)).toBe('critical');
    });

    it('should return strong for weight >= 0.9', () => {
      expect(getConnectionCategory(0.9)).toBe('strong');
      expect(getConnectionCategory(1.1)).toBe('strong');
    });

    it('should return medium for weight >= 0.6', () => {
      expect(getConnectionCategory(0.6)).toBe('medium');
      expect(getConnectionCategory(0.8)).toBe('medium');
    });

    it('should return weak for weight < 0.6', () => {
      expect(getConnectionCategory(0.5)).toBe('weak');
      expect(getConnectionCategory(0.1)).toBe('weak');
      expect(getConnectionCategory(0)).toBe('weak');
    });
  });

  describe('getWeightStats', () => {
    it('should return zeros for empty connections', () => {
      const result = getWeightStats([]);

      expect(result.average).toBe(0);
      expect(result.max).toBe(0);
      expect(result.min).toBe(0);
    });

    it('should calculate average', () => {
      const connections = [
        { weight: 1.0 },
        { weight: 2.0 }
      ];

      const result = getWeightStats(connections);

      expect(result.average).toBe(1.5);
    });

    it('should find max', () => {
      const connections = [
        { weight: 0.5, connectionCategory: 'weak' },
        { weight: 1.5, connectionCategory: 'critical' }
      ];

      const result = getWeightStats(connections);

      expect(result.max).toBe(1.5);
    });

    it('should find min', () => {
      const connections = [
        { weight: 0.5, connectionCategory: 'weak' },
        { weight: 1.5, connectionCategory: 'critical' }
      ];

      const result = getWeightStats(connections);

      expect(result.min).toBe(0.5);
    });

    it('should count by category', () => {
      const connections = [
        { weight: 1.5, connectionCategory: 'critical' },
        { weight: 1.0, connectionCategory: 'strong' },
        { weight: 0.7, connectionCategory: 'medium' },
        { weight: 0.4, connectionCategory: 'weak' }
      ];

      const result = getWeightStats(connections);

      expect(result.critical).toBe(1);
      expect(result.strong).toBe(1);
      expect(result.medium).toBe(1);
      expect(result.weak).toBe(1);
    });

    it('should handle single connection', () => {
      const connections = [{ weight: 1.0, connectionCategory: 'strong' }];

      const result = getWeightStats(connections);

      expect(result.average).toBe(1.0);
      expect(result.max).toBe(1.0);
      expect(result.min).toBe(1.0);
    });
  });
});
