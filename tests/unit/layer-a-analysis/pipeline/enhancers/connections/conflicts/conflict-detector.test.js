/**
 * @fileoverview conflict-detector.test.js
 * 
 * Tests for Conflict Detector
 * Tests detectConnectionConflicts, hasCriticalConflicts, groupConflictsBySeverity
 * 
 * @module tests/unit/layer-a-analysis/pipeline/enhancers/connections/conflicts
 */

import { describe, it, expect } from 'vitest';
import {
  detectConnectionConflicts,
  hasCriticalConflicts,
  groupConflictsBySeverity
} from '#layer-a/pipeline/enhancers/connections/conflicts/conflict-detector.js';

describe('Conflict Detector', () => {
  describe('detectConnectionConflicts', () => {
    it('should return empty array for empty connections', () => {
      const result = detectConnectionConflicts([]);

      expect(result).toEqual([]);
    });

    it('should detect temporal cycles', () => {
      const connections = [
        { from: 'A', to: 'B', type: 'temporal-dependency', relationship: 'must-run-before' },
        { from: 'B', to: 'C', type: 'temporal-dependency', relationship: 'must-run-before' },
        { from: 'C', to: 'A', type: 'temporal-dependency', relationship: 'must-run-before' }
      ];

      const result = detectConnectionConflicts(connections);

      expect(result.some(c => c.type === 'temporal-cycle')).toBe(true);
    });

    it('should detect race conditions', () => {
      const connections = [
        { from: 'A', to: 'B', relationship: 'same-execution-phase', potentialRace: true, phase: 'init' }
      ];

      const result = detectConnectionConflicts(connections);

      expect(result.some(c => c.type === 'potential-race')).toBe(true);
    });

    it('should include severity in conflicts', () => {
      const connections = [
        { from: 'A', to: 'B', type: 'temporal-dependency', relationship: 'must-run-before' },
        { from: 'B', to: 'A', type: 'temporal-dependency', relationship: 'must-run-before' }
      ];

      const result = detectConnectionConflicts(connections);

      expect(result[0].severity).toBeDefined();
    });

    it('should include fix suggestion in temporal cycle conflicts', () => {
      const connections = [
        { from: 'A', to: 'B', type: 'temporal-dependency', relationship: 'must-run-before' },
        { from: 'B', to: 'A', type: 'temporal-dependency', relationship: 'must-run-before' }
      ];

      const result = detectConnectionConflicts(connections);

      const cycleConflict = result.find(c => c.type === 'temporal-cycle');
      if (cycleConflict) {
        expect(cycleConflict.fix).toBeDefined();
      }
    });

    it('should include message in conflicts', () => {
      const connections = [
        { from: 'A', to: 'B', relationship: 'same-execution-phase', potentialRace: true, phase: 'init' }
      ];

      const result = detectConnectionConflicts(connections);

      expect(result[0].message).toBeDefined();
    });

    it('should include between array in race condition conflicts', () => {
      const connections = [
        { from: 'funcA', to: 'funcB', relationship: 'same-execution-phase', potentialRace: true, phase: 'init' }
      ];

      const result = detectConnectionConflicts(connections);

      const raceConflict = result.find(c => c.type === 'potential-race');
      if (raceConflict) {
        expect(raceConflict.between).toBeDefined();
        expect(Array.isArray(raceConflict.between)).toBe(true);
      }
    });

    it('should handle connections without conflicts', () => {
      const connections = [
        { from: 'A', to: 'B', type: 'import' },
        { from: 'B', to: 'C', type: 'export' }
      ];

      const result = detectConnectionConflicts(connections);

      // May or may not have conflicts, but should not throw
      expect(Array.isArray(result)).toBe(true);
    });

    it('should include cycle path in temporal cycle conflicts', () => {
      const connections = [
        { from: 'A', to: 'B', type: 'temporal-dependency', relationship: 'must-run-before' },
        { from: 'B', to: 'C', type: 'temporal-dependency', relationship: 'must-run-before' },
        { from: 'C', to: 'A', type: 'temporal-dependency', relationship: 'must-run-before' }
      ];

      const result = detectConnectionConflicts(connections);

      const cycleConflict = result.find(c => c.type === 'temporal-cycle');
      if (cycleConflict) {
        expect(cycleConflict.cycle).toBeDefined();
        expect(Array.isArray(cycleConflict.cycle)).toBe(true);
      }
    });
  });

  describe('hasCriticalConflicts', () => {
    it('should return true when critical conflicts exist', () => {
      const conflicts = [
        { type: 'temporal-cycle', severity: 'critical' }
      ];

      const result = hasCriticalConflicts(conflicts);

      expect(result).toBe(true);
    });

    it('should return false when no critical conflicts', () => {
      const conflicts = [
        { type: 'potential-race', severity: 'warning' }
      ];

      const result = hasCriticalConflicts(conflicts);

      expect(result).toBe(false);
    });

    it('should return false for empty conflicts', () => {
      const result = hasCriticalConflicts([]);

      expect(result).toBe(false);
    });

    it('should return false for mixed severity without critical', () => {
      const conflicts = [
        { type: 'race', severity: 'warning' },
        { type: 'issue', severity: 'info' }
      ];

      const result = hasCriticalConflicts(conflicts);

      expect(result).toBe(false);
    });
  });

  describe('groupConflictsBySeverity', () => {
    it('should group conflicts by severity', () => {
      const conflicts = [
        { type: 'cycle', severity: 'critical' },
        { type: 'race', severity: 'warning' },
        { type: 'issue', severity: 'warning' }
      ];

      const result = groupConflictsBySeverity(conflicts);

      expect(result.critical).toHaveLength(1);
      expect(result.warning).toHaveLength(2);
    });

    it('should return empty object for empty conflicts', () => {
      const result = groupConflictsBySeverity([]);

      expect(result).toEqual({});
    });

    it('should handle unknown severity', () => {
      const conflicts = [
        { type: 'issue' } // no severity
      ];

      const result = groupConflictsBySeverity(conflicts);

      expect(result.unknown).toHaveLength(1);
    });

    it('should handle all severities', () => {
      const conflicts = [
        { type: 'a', severity: 'critical' },
        { type: 'b', severity: 'high' },
        { type: 'c', severity: 'medium' },
        { type: 'd', severity: 'low' },
        { type: 'e', severity: 'info' }
      ];

      const result = groupConflictsBySeverity(conflicts);

      expect(result.critical).toHaveLength(1);
      expect(result.high).toHaveLength(1);
      expect(result.medium).toHaveLength(1);
      expect(result.low).toHaveLength(1);
      expect(result.info).toHaveLength(1);
    });

    it('should not modify original conflicts array', () => {
      const conflicts = [
        { type: 'cycle', severity: 'critical' }
      ];
      const original = [...conflicts];

      groupConflictsBySeverity(conflicts);

      expect(conflicts).toEqual(original);
    });
  });
});
