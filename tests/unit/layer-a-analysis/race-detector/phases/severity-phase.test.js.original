/**
 * @fileoverview severity-phase.test.js
 * 
 * Tests for severity phase module.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/phases/severity-phase
 */

import { describe, it, expect } from 'vitest';
import { 
  calculateSeverities, 
  SeverityPhase 
} from '#layer-a/race-detector/phases/severity-phase.js';
import { RaceConditionBuilder } from '../../../../factories/race-detector-test.factory.js';

describe('Severity Phase', () => {
  describe('Structure Contract', () => {
    it('should export calculateSeverities function', () => {
      expect(calculateSeverities).toBeDefined();
      expect(typeof calculateSeverities).toBe('function');
    });

    it('should export SeverityPhase class', () => {
      expect(SeverityPhase).toBeDefined();
      expect(typeof SeverityPhase).toBe('function');
    });

    it('should create SeverityPhase instance', () => {
      const phase = new SeverityPhase([], {}, {});
      expect(phase).toBeInstanceOf(SeverityPhase);
    });

    it('should have execute method on SeverityPhase', () => {
      const phase = new SeverityPhase([], {}, {});
      expect(typeof phase.execute).toBe('function');
    });
  });

  describe('calculateSeverities', () => {
    it('should return array', () => {
      const result = calculateSeverities([], {}, {});
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array for empty races', () => {
      const result = calculateSeverities([], {}, {});
      expect(result).toEqual([]);
    });

    it('should add severity to each race', () => {
      const race = new RaceConditionBuilder()
        .withId('race-1')
        .withAccess('atom-1', { type: 'write' })
        .withAccess('atom-2', { type: 'write' })
        .build();
      
      const riskScorer = {
        calculate: () => 'high'
      };
      
      const result = calculateSeverities([race], riskScorer, {});
      
      expect(result[0]).toHaveProperty('severity', 'high');
    });

    it('should call riskScorer.calculate for each race', () => {
      const races = [
        new RaceConditionBuilder().withId('race-1').build(),
        new RaceConditionBuilder().withId('race-2').build()
      ];
      
      const calculateCalls = [];
      const riskScorer = {
        calculate: (race) => {
          calculateCalls.push(race.id);
          return 'medium';
        }
      };
      
      calculateSeverities(races, riskScorer, {});
      
      expect(calculateCalls).toHaveLength(2);
      expect(calculateCalls).toContain('race-1');
      expect(calculateCalls).toContain('race-2');
    });

    it('should pass project data to riskScorer', () => {
      const race = new RaceConditionBuilder().build();
      const project = { name: 'test-project' };
      
      let receivedProject;
      const riskScorer = {
        calculate: (r, p) => {
          receivedProject = p;
          return 'low';
        }
      };
      
      calculateSeverities([race], riskScorer, project);
      
      expect(receivedProject).toBe(project);
    });

    it('should handle different severity levels', () => {
      const races = [
        new RaceConditionBuilder().withId('race-1').build(),
        new RaceConditionBuilder().withId('race-2').build(),
        new RaceConditionBuilder().withId('race-3').build()
      ];
      
      const severities = ['critical', 'high', 'medium'];
      let index = 0;
      
      const riskScorer = {
        calculate: () => severities[index++]
      };
      
      const result = calculateSeverities(races, riskScorer, {});
      
      expect(result[0].severity).toBe('critical');
      expect(result[1].severity).toBe('high');
      expect(result[2].severity).toBe('medium');
    });

    it('should modify races in place', () => {
      const race = new RaceConditionBuilder().build();
      
      const riskScorer = {
        calculate: () => 'critical'
      };
      
      const result = calculateSeverities([race], riskScorer, {});
      
      expect(result[0]).toBe(race);
      expect(race.severity).toBe('critical');
    });

    it('should handle many races', () => {
      const races = Array(50).fill(null).map((_, i) => 
        new RaceConditionBuilder().withId(`race-${i}`).build()
      );
      
      const riskScorer = {
        calculate: () => 'medium'
      };
      
      const result = calculateSeverities(races, riskScorer, {});
      
      expect(result).toHaveLength(50);
      result.forEach(race => {
        expect(race.severity).toBe('medium');
      });
    });
  });

  describe('SeverityPhase class', () => {
    it('should store parameters in constructor', () => {
      const races = [{ id: 'race-1' }];
      const riskScorer = {};
      const project = { name: 'test' };
      
      const phase = new SeverityPhase(races, riskScorer, project);
      
      expect(phase.races).toEqual(races);
      expect(phase.riskScorer).toBe(riskScorer);
      expect(phase.project).toBe(project);
    });

    it('should execute and return races with severities', () => {
      const races = [new RaceConditionBuilder().build()];
      const riskScorer = {
        calculate: () => 'high'
      };
      
      const phase = new SeverityPhase(races, riskScorer, {});
      const result = phase.execute();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].severity).toBe('high');
    });

    it('should process all races on execute', () => {
      const races = [
        new RaceConditionBuilder().withId('race-1').build(),
        new RaceConditionBuilder().withId('race-2').build()
      ];
      
      const riskScorer = {
        calculate: () => 'medium'
      };
      
      const phase = new SeverityPhase(races, riskScorer, {});
      const result = phase.execute();
      
      expect(result).toHaveLength(2);
      result.forEach(race => {
        expect(race.severity).toBe('medium');
      });
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle empty races array', () => {
      const riskScorer = { calculate: () => 'low' };
      expect(() => calculateSeverities([], riskScorer, {})).not.toThrow();
    });

    it('should handle null races', () => {
      const riskScorer = { calculate: () => 'low' };
      expect(() => calculateSeverities(null, riskScorer, {})).toThrow();
    });

    it('should handle null riskScorer', () => {
      const race = new RaceConditionBuilder().build();
      expect(() => calculateSeverities([race], null, {})).toThrow();
    });

    it('should handle riskScorer returning invalid severity', () => {
      const race = new RaceConditionBuilder().build();
      const riskScorer = { calculate: () => 'invalid-severity' };
      
      expect(() => calculateSeverities([race], riskScorer, {})).not.toThrow();
      
      const result = calculateSeverities([race], riskScorer, {});
      expect(result[0].severity).toBe('invalid-severity');
    });

    it('should handle riskScorer returning null', () => {
      const race = new RaceConditionBuilder().build();
      const riskScorer = { calculate: () => null };
      
      const result = calculateSeverities([race], riskScorer, {});
      expect(result[0].severity).toBeNull();
    });

    it('should handle riskScorer throwing error', () => {
      const race = new RaceConditionBuilder().build();
      const riskScorer = {
        calculate: () => { throw new Error('Scoring error'); }
      };
      
      expect(() => calculateSeverities([race], riskScorer, {})).toThrow('Scoring error');
    });

    it('should handle null project', () => {
      const race = new RaceConditionBuilder().build();
      const riskScorer = { calculate: () => 'low' };
      
      expect(() => calculateSeverities([race], riskScorer, null)).not.toThrow();
    });

    it('should handle SeverityPhase with null races', () => {
      const phase = new SeverityPhase(null, {}, {});
      expect(() => phase.execute()).toThrow();
    });

    it('should handle SeverityPhase with null riskScorer', () => {
      const phase = new SeverityPhase([{}], null, {});
      expect(() => phase.execute()).toThrow();
    });
  });
});
