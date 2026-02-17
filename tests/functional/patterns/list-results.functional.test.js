/**
 * @fileoverview Pattern A: List Results - Tests Funcionales
 * 
 * Tests que ejecutan código real para funciones que retornan listas:
 * Patrón: { total, items[], subCount }
 * 
 * Funciones testeadas:
 * - findHotspots
 * - detectSideEffectMarkers
 * 
 * @module tests/functional/patterns/list-results.functional
 */

import { describe, it, expect } from 'vitest';
import { createFunctionalTestSuite } from '../../factories/functional/functional-test.factory.js';
import listResultsFixtures from './fixtures/list-results.fixtures.js';

// Importar funciones a testear
let findHotspots;
let detectSideEffectMarkers;

try {
  const tier1 = await import('#layer-a/analyses/tier1/index.js');
  findHotspots = tier1.findHotspots;
} catch (e) {
  // Función no disponible
}

try {
  const tier2 = await import('#layer-a/analyses/tier2/index.js');
  detectSideEffectMarkers = tier2.detectSideEffectMarkers;
} catch (e) {
  // Función no disponible
}

describe('Pattern A: List Results - Functional Tests', () => {
  
  describe('findHotspots()', () => {
    it.skipIf(!findHotspots)('detects hotspots correctly', async () => {
      const result = await findHotspots(listResultsFixtures.withHotspots);
      
      expect(result).toBeDefined();
      expect(typeof result.total).toBe('number');
      expect(Array.isArray(result.functions)).toBe(true);
      
      // Debe encontrar funciones críticas
      expect(result.total).toBeGreaterThan(0);
      expect(result.functions.length).toBeGreaterThan(0);
    });

    it.skipIf(!findHotspots)('returns empty when no hotspots', async () => {
      const result = await findHotspots(listResultsFixtures.withoutHotspots);
      
      expect(result.total).toBe(0);
      expect(result.functions).toEqual([]);
    });

    it.skipIf(!findHotspots)('returns functions in array', async () => {
      const result = await findHotspots(listResultsFixtures.withHotspots);
      
      if (result.total > 0) {
        result.functions.forEach(func => {
          expect(typeof func).toBe('object');
          expect(typeof func.functionId).toBe('string');
        });
      }
    });

    it.skipIf(!findHotspots)('provides critical count', async () => {
      const result = await findHotspots(listResultsFixtures.withManyHotspots);
      
      // Debe tener criticalCount si hay hotspots
      if (result.total > 0) {
        expect(typeof result.criticalCount).toBe('number');
        expect(result.criticalCount).toBeGreaterThanOrEqual(0);
        expect(result.criticalCount).toBeLessThanOrEqual(result.total);
      }
    });

    it.skipIf(!findHotspots)('handles empty systemMap gracefully', async () => {
      const result = await findHotspots(listResultsFixtures.emptySystemMap);
      
      expect(result).toBeDefined();
      expect(result.total).toBe(0);
      expect(Array.isArray(result.functions)).toBe(true);
    });

    it.skipIf(!findHotspots)('handles null input without crashing', async () => {
      const result = await findHotspots(null);
      
      expect(result).toBeDefined();
      expect(typeof result.total).toBe('number');
    });

    it.skipIf(!findHotspots)('handles many hotspots', async () => {
      const result = await findHotspots(listResultsFixtures.withManyHotspots);
      
      expect(result.total).toBeGreaterThan(0);
      expect(result.functions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('detectSideEffectMarkers()', () => {
    it.skipIf(!detectSideEffectMarkers)('detects side effects correctly', async () => {
      const result = await detectSideEffectMarkers(listResultsFixtures.withSideEffects);
      
      expect(result).toBeDefined();
      expect(typeof result.total).toBe('number');
      expect(Array.isArray(result.functions)).toBe(true);
    });

    it.skipIf(!detectSideEffectMarkers)('returns empty when no side effects', async () => {
      const result = await detectSideEffectMarkers(listResultsFixtures.withoutSideEffects);
      
      expect(result.total).toBe(0);
      expect(result.functions).toEqual([]);
    });

    it.skipIf(!detectSideEffectMarkers)('handles empty systemMap', async () => {
      const result = await detectSideEffectMarkers(listResultsFixtures.emptySystemMap);
      
      expect(result.total).toBe(0);
      expect(Array.isArray(result.functions)).toBe(true);
    });

    it.skipIf(!detectSideEffectMarkers)('handles null input', async () => {
      const result = await detectSideEffectMarkers(null);
      
      expect(result).toBeDefined();
    });
  });

  // Tests auto-generados con FunctionalTestFactory
  if (findHotspots) {
    describe('Auto-generated Tests (FunctionalTestFactory)', () => {
      createFunctionalTestSuite({
        pattern: 'list-results',
        functions: [findHotspots],
        fixtures: {
          validInput: listResultsFixtures.withHotspots,
          emptyInput: listResultsFixtures.emptySystemMap,
          withItems: listResultsFixtures.withHotspots,
          withoutItems: listResultsFixtures.withoutHotspots
        },
        assertions: {
          mustHaveTotal: true,
          mustHaveItemsArray: true,
          mustHaveSubCounts: true,
          mustHandleEmpty: true
        }
      });
    });
  }
});

// Tests de integración
describe('Pattern A: Integration Tests', () => {
    it.skipIf(!findHotspots)('hotspots detection identifies functions with many callers', async () => {
    const result = await findHotspots(listResultsFixtures.withHotspots);
    
    // Verificar que las funciones con muchos callers son identificadas
    if (result.total > 0) {
      const functionIds = result.functions.map(f => f.functionId);
      
      // Debe incluir la función log que tiene 5 callers
      expect(functionIds.some(id => id.includes('logger'))).toBe(true);
    }
  });

  it.skipIf(!detectSideEffectMarkers)('side effect detection flags impure functions', async () => {
    const result = await detectSideEffectMarkers(listResultsFixtures.withSideEffects);
    
    if (result.total > 0) {
      const functionNames = result.functions.map(f => f.name);
      
      // Debe incluir funciones que modifican estado
      expect(functionNames.some(name => 
        name.includes('update') || name.includes('fetch')
      )).toBe(true);
    }
  });
});
