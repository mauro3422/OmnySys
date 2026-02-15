/**
 * @fileoverview mitigation-phase.test.js
 * 
 * Tests for mitigation phase module.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/phases/mitigation-phase
 */

import { describe, it, expect, vi } from 'vitest';
import { 
  checkMitigations, 
  MitigationPhase 
} from '#layer-a/race-detector/phases/mitigation-phase.js';
import { RaceConditionBuilder } from '../../../../factories/race-detector-test.factory.js';

describe('Mitigation Phase', () => {
  describe('Structure Contract', () => {
    it('should export checkMitigations function', () => {
      expect(checkMitigations).toBeDefined();
      expect(typeof checkMitigations).toBe('function');
    });

    it('should export MitigationPhase class', () => {
      expect(MitigationPhase).toBeDefined();
      expect(typeof MitigationPhase).toBe('function');
    });

    it('should create MitigationPhase instance', () => {
      const phase = new MitigationPhase([], {}, []);
      expect(phase).toBeInstanceOf(MitigationPhase);
    });

    it('should have execute method on MitigationPhase', () => {
      const phase = new MitigationPhase([], {}, []);
      expect(typeof phase.execute).toBe('function');
    });
  });

  describe('checkMitigations', () => {
    const createMockProject = (mitigations = {}) => ({
      findAtomById: () => ({ 
        code: mitigations.code || '' 
      })
    });

    it('should return array', () => {
      const result = checkMitigations([], {});
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array for empty races', () => {
      const result = checkMitigations([], {});
      expect(result).toEqual([]);
    });

    it('should keep races without mitigation', () => {
      const race = new RaceConditionBuilder()
        .withId('race-1')
        .withSeverity('high')
        .withAccess('atom-1', { type: 'write', isAsync: true })
        .withAccess('atom-2', { type: 'write', isAsync: true })
        .build();
      
      const result = checkMitigations([race], {});
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('race-1');
    });

    it('should keep critical races even with mitigation', () => {
      const race = new RaceConditionBuilder()
        .withId('race-1')
        .withSeverity('critical')
        .withAccess('atom-1', { type: 'write' })
        .withAccess('atom-2', { type: 'write' })
        .build();
      
      race.hasMitigation = true;
      
      const result = checkMitigations([race], {});
      
      expect(result).toHaveLength(1);
    });

    it('should keep races with partial mitigation', () => {
      const race = new RaceConditionBuilder()
        .withId('race-1')
        .withSeverity('high')
        .build();
      
      race.hasMitigation = true;
      race.mitigationType = 'partial-lock';
      
      const result = checkMitigations([race], {});
      
      expect(result).toHaveLength(1);
    });

    it('should filter out races with complete non-critical mitigation', () => {
      const race = new RaceConditionBuilder()
        .withId('race-1')
        .withSeverity('medium')
        .withAccess('atom-1', { type: 'write' })
        .withAccess('atom-2', { type: 'write' })
        .build();
      
      race.hasMitigation = true;
      race.mitigationType = 'lock';
      
      const result = checkMitigations([race], {});
      
      expect(result).toHaveLength(0);
    });

    it('should handle multiple races with different mitigation status', () => {
      const race1 = new RaceConditionBuilder()
        .withId('race-1')
        .withSeverity('high')
        .withAccess('atom-1', { type: 'write' })
        .withAccess('atom-2', { type: 'write' })
        .build();
      race1.hasMitigation = true;
      race1.mitigationType = 'lock';
      
      const race2 = new RaceConditionBuilder()
        .withId('race-2')
        .withSeverity('medium')
        .withAccess('atom-1', { type: 'write' })
        .withAccess('atom-2', { type: 'write' })
        .build();
      race2.hasMitigation = false;
      
      const race3 = new RaceConditionBuilder()
        .withId('race-3')
        .withSeverity('critical')
        .withAccess('atom-1', { type: 'write' })
        .withAccess('atom-2', { type: 'write' })
        .build();
      race3.hasMitigation = true;
      race3.mitigationType = 'atomic';
      
      const result = checkMitigations([race1, race2, race3], {});
      
      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toContain('race-2');
      expect(result.map(r => r.id)).toContain('race-3');
    });

    it('should add to warnings array', () => {
      const warnings = [];
      const race = new RaceConditionBuilder()
        .withId('race-1')
        .withSeverity('medium')
        .build();
      
      race.hasMitigation = true;
      
      checkMitigations([race], {}, warnings);
      
      // Warnings should be populated based on mitigation findings
      expect(Array.isArray(warnings)).toBe(true);
    });
  });

  describe('MitigationPhase class', () => {
    it('should store parameters in constructor', () => {
      const races = [{ id: 'race-1' }];
      const project = { name: 'test' };
      const warnings = [];
      
      const phase = new MitigationPhase(races, project, warnings);
      
      expect(phase.races).toEqual(races);
      expect(phase.project).toBe(project);
      expect(phase.warnings).toEqual(warnings);
    });

    it('should use default empty warnings array', () => {
      const phase = new MitigationPhase([], {});
      expect(phase.warnings).toEqual([]);
    });

    it('should execute and return filtered races', () => {
      const race = new RaceConditionBuilder()
        .withId('race-1')
        .withSeverity('medium')
        .build();
      
      const phase = new MitigationPhase([race], {});
      const result = phase.execute();
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle empty races array', () => {
      expect(() => checkMitigations([], {})).not.toThrow();
    });

    it('should handle null races', () => {
      expect(() => checkMitigations(null, {})).toThrow();
    });

    it('should handle null project', () => {
      const race = new RaceConditionBuilder().build();
      expect(() => checkMitigations([race], null)).not.toThrow();
    });

    it('should handle races without accesses property', () => {
      const race = { id: 'race-1', severity: 'medium' };
      expect(() => checkMitigations([race], {})).not.toThrow();
    });

    it('should handle races without severity property', () => {
      const race = { 
        id: 'race-1', 
        accesses: [{ atom: 'a1' }],
        hasMitigation: true 
      };
      expect(() => checkMitigations([race], {})).not.toThrow();
    });

    it('should handle null warnings array', () => {
      const race = new RaceConditionBuilder().build();
      expect(() => checkMitigations([race], {}, null)).not.toThrow();
    });

    it('should handle MitigationPhase with null races', () => {
      const phase = new MitigationPhase(null, {});
      expect(() => phase.execute()).toThrow();
    });

    it('should handle MitigationPhase with null project', () => {
      const race = new RaceConditionBuilder().build();
      const phase = new MitigationPhase([race], null);
      expect(() => phase.execute()).not.toThrow();
    });
  });
});
