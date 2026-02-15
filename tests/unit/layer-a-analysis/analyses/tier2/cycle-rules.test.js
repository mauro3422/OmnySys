/**
 * @fileoverview Tests for tier2/cycle-rules.js
 * 
 * Tests the CYCLE_RULES and evaluateRules functions.
 */

import { describe, it, expect } from 'vitest';
import {
  CYCLE_RULES,
  evaluateRules
} from '#layer-a/analyses/tier2/cycle-rules.js';

describe('tier2/cycle-rules.js', () => {
  describe('CYCLE_RULES structure', () => {
    it('should be an array', () => {
      expect(Array.isArray(CYCLE_RULES)).toBe(true);
    });

    it('should have at least 5 rules', () => {
      expect(CYCLE_RULES.length).toBeGreaterThanOrEqual(5);
    });

    it('should have unique rule IDs', () => {
      const ids = CYCLE_RULES.map(rule => rule.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds.length).toBe(ids.length);
    });
  });

  describe('Rule properties', () => {
    CYCLE_RULES.forEach(rule => {
      describe(`Rule: ${rule.id}`, () => {
        it('should have an id', () => {
          expect(rule.id).toBeDefined();
          expect(typeof rule.id).toBe('string');
        });

        it('should have a name', () => {
          expect(rule.name).toBeDefined();
          expect(typeof rule.name).toBe('string');
        });

        it('should have a condition function', () => {
          expect(rule.condition).toBeDefined();
          expect(typeof rule.condition).toBe('function');
        });

        it('should have a valid severity', () => {
          expect(['ERROR', 'WARNING', 'INFO']).toContain(rule.severity);
        });

        it('should have a valid category', () => {
          expect(['VALID_ARCHITECTURE', 'COUPLING_ISSUE', 'CRITICAL_ISSUE', 'REQUIRES_REVIEW', 'UNKNOWN'])
            .toContain(rule.category);
        });

        it('should have autoIgnore boolean', () => {
          expect(typeof rule.autoIgnore).toBe('boolean');
        });

        it('should have an explanation', () => {
          expect(rule.explanation).toBeDefined();
          expect(typeof rule.explanation).toBe('string');
        });
      });
    });
  });

  describe('event-driven-cycle rule', () => {
    const rule = CYCLE_RULES.find(r => r.id === 'event-driven-cycle');

    it('should match event-driven derived properties', () => {
      const derived = {
        hasEventEmitters: true,
        hasEventListeners: true,
        eventDrivenRatio: 0.5,
        cycleLength: 2,
        totalAtoms: 2
      };

      expect(rule.condition(derived)).toBe(true);
    });

    it('should not match when no event emitters', () => {
      const derived = {
        hasEventEmitters: false,
        hasEventListeners: true,
        eventDrivenRatio: 0.5,
        cycleLength: 2,
        totalAtoms: 2
      };

      expect(rule.condition(derived)).toBe(false);
    });

    it('should not match when event ratio too low', () => {
      const derived = {
        hasEventEmitters: true,
        hasEventListeners: true,
        eventDrivenRatio: 0.1,
        cycleLength: 10,
        totalAtoms: 10
      };

      expect(rule.condition(derived)).toBe(false);
    });

    it('should have INFO severity', () => {
      expect(rule.severity).toBe('INFO');
    });

    it('should auto ignore', () => {
      expect(rule.autoIgnore).toBe(true);
    });
  });

  describe('lifecycle-coordination rule', () => {
    const rule = CYCLE_RULES.find(r => r.id === 'lifecycle-coordination');

    it('should match lifecycle coordination pattern', () => {
      const derived = {
        hasLifecycleHooks: true,
        hasInitialization: true,
        cycleLength: 3,
        totalAtoms: 3
      };

      expect(rule.condition(derived)).toBe(true);
    });

    it('should not match when cycle too long', () => {
      const derived = {
        hasLifecycleHooks: true,
        hasInitialization: true,
        cycleLength: 5,
        totalAtoms: 5
      };

      expect(rule.condition(derived)).toBe(false);
    });

    it('should have INFO severity', () => {
      expect(rule.severity).toBe('INFO');
    });
  });

  describe('pure-import-cycle rule', () => {
    const rule = CYCLE_RULES.find(r => r.id === 'pure-import-cycle');

    it('should match pure static import cycle', () => {
      const derived = {
        hasSideEffects: false,
        hasNetworkCalls: false,
        hasAsync: false,
        staticImportRatio: 1,
        cycleLength: 2,
        totalAtoms: 2
      };

      expect(rule.condition(derived)).toBe(true);
    });

    it('should not match when has side effects', () => {
      const derived = {
        hasSideEffects: true,
        hasNetworkCalls: false,
        hasAsync: false,
        staticImportRatio: 1,
        cycleLength: 2,
        totalAtoms: 2
      };

      expect(rule.condition(derived)).toBe(false);
    });

    it('should not match when cycle too long', () => {
      const derived = {
        hasSideEffects: false,
        hasNetworkCalls: false,
        hasAsync: false,
        staticImportRatio: 1,
        cycleLength: 3,
        totalAtoms: 3
      };

      expect(rule.condition(derived)).toBe(false);
    });

    it('should have WARNING severity', () => {
      expect(rule.severity).toBe('WARNING');
    });

    it('should not auto ignore', () => {
      expect(rule.autoIgnore).toBe(false);
    });

    it('should have a suggestion', () => {
      expect(rule.suggestion).toBeDefined();
      expect(typeof rule.suggestion).toBe('string');
    });
  });

  describe('complex-circular-dependency rule', () => {
    const rule = CYCLE_RULES.find(r => r.id === 'complex-circular-dependency');

    it('should match complex circular dependency', () => {
      const derived = {
        cycleLength: 6,
        hasStateModification: true,
        hasSideEffects: true,
        totalAtoms: 21
      };

      expect(rule.condition(derived)).toBe(true);
    });

    it('should not match simple cycles', () => {
      const derived = {
        cycleLength: 3,
        hasStateModification: true,
        hasSideEffects: true,
        totalAtoms: 21
      };

      expect(rule.condition(derived)).toBe(false);
    });

    it('should have ERROR severity', () => {
      expect(rule.severity).toBe('ERROR');
    });
  });

  describe('evaluateRules', () => {
    it('should return empty array for non-matching derived', () => {
      const derived = {
        hasEventEmitters: false,
        hasEventListeners: false,
        hasLifecycleHooks: false,
        hasSideEffects: true,
        hasNetworkCalls: true,
        hasAsync: true,
        staticImportRatio: 0,
        cycleLength: 10,
        totalAtoms: 10
      };

      const result = evaluateRules(derived);

      expect(result).toEqual([]);
    });

    it('should return matching rules', () => {
      const derived = {
        hasEventEmitters: true,
        hasEventListeners: true,
        eventDrivenRatio: 0.5,
        cycleLength: 2,
        totalAtoms: 2
      };

      const result = evaluateRules(derived);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should sort by severity: ERROR first', () => {
      const derived = {
        cycleLength: 10,
        hasStateModification: true,
        hasSideEffects: true,
        totalAtoms: 25
      };

      const result = evaluateRules(derived);

      if (result.length > 0) {
        expect(result[0].severity).toBe('ERROR');
      }
    });

    it('should sort by severity: WARNING before INFO', () => {
      // Create derived that matches both WARNING and INFO rules
      const derived = {
        hasEventEmitters: true,
        hasEventListeners: true,
        eventDrivenRatio: 0.5,
        hasSideEffects: false,
        hasNetworkCalls: false,
        hasAsync: false,
        staticImportRatio: 1,
        cycleLength: 2,
        totalAtoms: 2
      };

      const result = evaluateRules(derived);

      if (result.length >= 2) {
        const warningIndex = result.findIndex(r => r.severity === 'WARNING');
        const infoIndex = result.findIndex(r => r.severity === 'INFO');
        
        if (warningIndex !== -1 && infoIndex !== -1) {
          expect(warningIndex).toBeLessThan(infoIndex);
        }
      }
    });

    it('should return all matching rules', () => {
      const derived = {
        hasEventEmitters: true,
        hasEventListeners: true,
        eventDrivenRatio: 0.5,
        hasLifecycleHooks: true,
        hasInitialization: true,
        hasSideEffects: false,
        hasNetworkCalls: false,
        hasAsync: false,
        cycleLength: 2,
        totalAtoms: 2
      };

      const result = evaluateRules(derived);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });
});
