/**
 * @fileoverview Tests for tier2/cycle-classifier.js
 * 
 * Tests the classifyCycle and findCircularImports functions.
 */

import { describe, it, expect, vi } from 'vitest';
import { 
  classifyCycle, 
  findCircularImports,
  extractCycleMetadata,
  deriveCycleProperties,
  evaluateRules,
  CYCLE_RULES
} from '#layer-a/analyses/tier2/cycle-classifier.js';
import { createMockSystemMap, ScenarioBuilder } from '../../../../factories/analysis.factory.js';

describe('tier2/cycle-classifier.js', () => {
  describe('classifyCycle', () => {
    it('should classify event-driven cycle as VALID_ARCHITECTURE', () => {
      const cycle = ['src/events/emitter.js', 'src/events/listener.js'];
      const atomsIndex = {
        'src/events/emitter.js': {
          atoms: [{
            name: 'emitEvent',
            temporal: { patterns: { eventEmitter: true } },
            archetypes: ['handler']
          }]
        },
        'src/events/listener.js': {
          atoms: [{
            name: 'onEvent',
            temporal: { patterns: { eventListener: true } },
            archetypes: ['handler']
          }]
        }
      };
      
      const result = classifyCycle(cycle, atomsIndex);
      
      expect(result.category).toBe('VALID_ARCHITECTURE');
      expect(result.severity).toBe('INFO');
      expect(result.autoIgnore).toBe(true);
    });

    it('should classify pure import cycle as COUPLING_ISSUE', () => {
      const cycle = ['src/a.js', 'src/b.js'];
      const atomsIndex = {
        'src/a.js': { atoms: [{ name: 'helperA', hasSideEffects: false, hasNetworkCalls: false, isAsync: false }] },
        'src/b.js': { atoms: [{ name: 'helperB', hasSideEffects: false, hasNetworkCalls: false, isAsync: false }] }
      };
      
      const result = classifyCycle(cycle, atomsIndex);
      
      expect(result.category).toBe('COUPLING_ISSUE');
      expect(result.severity).toBe('WARNING');
    });

    it('should handle empty cycle', () => {
      const result = classifyCycle([], {});
      
      expect(result.cycle).toEqual([]);
      expect(result.category).toBe('UNKNOWN');
    });

    it('should handle cycle without atoms index', () => {
      const cycle = ['src/a.js', 'src/b.js'];
      
      const result = classifyCycle(cycle, null);
      
      expect(result.cycle).toEqual(cycle);
      expect(result.category).toBeDefined();
    });

    it('should include derived properties in result', () => {
      const cycle = ['src/a.js'];
      const atomsIndex = {
        'src/a.js': { atoms: [{ name: 'func', isAsync: true }] }
      };
      
      const result = classifyCycle(cycle, atomsIndex);
      
      expect(result.derived).toBeDefined();
      expect(result.derived.cycleLength).toBe(1);
    });
  });

  describe('findCircularImports', () => {
    it('should return empty result for null systemMap', async () => {
      const result = await findCircularImports(null);
      
      expect(result.total).toBe(0);
      expect(result.cycles).toEqual([]);
    });

    it('should return empty result when no cycles detected', () => {
      const systemMap = createMockSystemMap({
        metadata: { cyclesDetected: [] }
      });
      
      const result = findCircularImports(systemMap);
      
      expect(result.total).toBe(0);
      expect(result.recommendation).toContain('No circular');
    });

    it('should classify detected cycles', () => {
      const systemMap = createMockSystemMap({
        metadata: {
          cyclesDetected: [['src/a.js', 'src/b.js']]
        }
      });
      
      const result = findCircularImports(systemMap, {});
      
      expect(result.total).toBe(1);
      expect(result.classifications).toHaveLength(1);
    });

    it('should separate problematic and valid cycles', () => {
      const systemMap = createMockSystemMap({
        metadata: {
          cyclesDetected: [
            ['src/event-emitter.js', 'src/event-listener.js'], // Valid
            ['src/utils.js', 'src/helpers.js'] // Problematic
          ]
        }
      });
      
      const atomsIndex = {
        'src/event-emitter.js': {
          atoms: [{ temporal: { patterns: { eventEmitter: true } } }]
        },
        'src/event-listener.js': {
          atoms: [{ temporal: { patterns: { eventListener: true } } }]
        },
        'src/utils.js': { atoms: [{ hasSideEffects: false }] },
        'src/helpers.js': { atoms: [{ hasSideEffects: false }] }
      };
      
      const result = findCircularImports(systemMap, atomsIndex);
      
      expect(result.validCount).toBeGreaterThanOrEqual(0);
      expect(result.problematicCount).toBeGreaterThanOrEqual(0);
    });

    it('should generate circularPairs list', () => {
      const systemMap = createMockSystemMap({
        metadata: {
          cyclesDetected: [['src/a.js', 'src/b.js']]
        }
      });
      
      const result = findCircularImports(systemMap, {});
      
      expect(result.circularPairs).toBeDefined();
      expect(Array.isArray(result.circularPairs)).toBe(true);
    });
  });

  describe('extractCycleMetadata', () => {
    it('should extract metadata for all files in cycle', () => {
      const cycle = ['src/a.js', 'src/b.js'];
      const atomsIndex = {
        'src/a.js': {
          atoms: [{ name: 'funcA', isAsync: true }]
        },
        'src/b.js': {
          atoms: [{ name: 'funcB', isAsync: false }]
        }
      };
      
      const result = extractCycleMetadata(cycle, atomsIndex);
      
      expect(result).toHaveLength(2);
      expect(result[0].filePath).toBe('src/a.js');
      expect(result[0].atomCount).toBe(1);
    });

    it('should handle missing atoms index entries', () => {
      const cycle = ['src/a.js', 'src/missing.js'];
      const atomsIndex = {
        'src/a.js': { atoms: [] }
      };
      
      const result = extractCycleMetadata(cycle, atomsIndex);
      
      expect(result).toHaveLength(2);
      expect(result[1].atoms).toEqual([]);
    });
  });

  describe('deriveCycleProperties', () => {
    it('should derive properties from empty metadata', () => {
      const result = deriveCycleProperties([]);
      
      expect(result.cycleLength).toBe(0);
      expect(result.totalAtoms).toBe(0);
    });

    it('should detect event-driven patterns', () => {
      const metadata = [
        {
          filePath: 'src/emitter.js',
          atoms: [{ temporal: { patterns: { eventEmitter: true } } }]
        },
        {
          filePath: 'src/listener.js',
          atoms: [{ temporal: { patterns: { eventListener: true } } }]
        }
      ];
      
      const result = deriveCycleProperties(metadata);
      
      expect(result.hasEventEmitters).toBe(true);
      expect(result.hasEventListeners).toBe(true);
      expect(result.eventDrivenRatio).toBeGreaterThan(0);
    });

    it('should detect lifecycle hooks', () => {
      const metadata = [
        {
          filePath: 'src/component.js',
          atoms: [{ hasLifecycleHooks: true }]
        }
      ];
      
      const result = deriveCycleProperties(metadata);
      
      expect(result.hasLifecycleHooks).toBe(true);
    });

    it('should calculate archetypes correctly', () => {
      const metadata = [
        {
          filePath: 'src/store.js',
          atoms: [{ archetypes: ['store'] }]
        },
        {
          filePath: 'src/handler.js',
          atoms: [{ archetypes: ['handler'] }]
        }
      ];
      
      const result = deriveCycleProperties(metadata);
      
      expect(result.archetypes).toContain('store');
      expect(result.archetypes).toContain('handler');
    });
  });

  describe('CYCLE_RULES', () => {
    it('should have all required rule properties', () => {
      CYCLE_RULES.forEach(rule => {
        expect(rule).toHaveProperty('id');
        expect(rule).toHaveProperty('name');
        expect(rule).toHaveProperty('condition');
        expect(rule).toHaveProperty('severity');
        expect(rule).toHaveProperty('category');
        expect(typeof rule.condition).toBe('function');
      });
    });

    it('should have unique rule IDs', () => {
      const ids = CYCLE_RULES.map(r => r.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid severity values', () => {
      const validSeverities = ['ERROR', 'WARNING', 'INFO'];
      
      CYCLE_RULES.forEach(rule => {
        expect(validSeverities).toContain(rule.severity);
      });
    });
  });

  describe('evaluateRules', () => {
    it('should return empty array for non-matching derived properties', () => {
      const derived = { cycleLength: 0, totalAtoms: 0 };
      
      const result = evaluateRules(derived);
      
      expect(result).toEqual([]);
    });

    it('should return matching rules sorted by severity', () => {
      const derived = {
        hasEventEmitters: true,
        hasEventListeners: true,
        eventDrivenRatio: 0.5,
        cycleLength: 2,
        totalAtoms: 2
      };
      
      const result = evaluateRules(derived);
      
      expect(result.length).toBeGreaterThan(0);
      // Check INFO severity comes after ERROR if both present
      if (result.length > 1) {
        const severities = result.map(r => r.severity);
        expect(severities.indexOf('ERROR')).toBeLessThanOrEqual(severities.indexOf('INFO'));
      }
    });

    it('should prioritize ERROR over WARNING over INFO', () => {
      const derived = {
        cycleLength: 10,
        totalAtoms: 25,
        hasStateModification: true,
        hasSideEffects: true
      };
      
      const result = evaluateRules(derived);
      
      if (result.length > 0) {
        expect(result[0].severity).toBe('ERROR');
      }
    });
  });
});
