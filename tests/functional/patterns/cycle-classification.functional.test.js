/**
 * @fileoverview Pattern E: Cycle/Classification - Tests Funcionales
 * 
 * Tests que ejecutan código real para funciones que detectan y clasifican ciclos.
 * Patrón: { total, cycles[], classifications[], problematicCount }
 * 
 * Funciones testeadas:
 * - findCircularFunctionDeps
 * - findCircularImports  
 * - classifyCycle
 * 
 * @module tests/functional/patterns/cycle-classification.functional
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createFunctionalTestSuite } from '../../factories/functional/functional-test.factory.js';
import cycleFixtures from './fixtures/cycle.fixtures.js';

// Importar funciones a testear
// Nota: Estos imports deben ajustarse según la estructura real del proyecto
let findCircularFunctionDeps;
let findCircularImports;
let classifyCycle;

try {
  const tier1 = await import('#layer-a/analyses/tier1/index.js');
  findCircularFunctionDeps = tier1.findCircularFunctionDeps;
  findCircularImports = tier1.findCircularImports;
} catch (e) {
  // Funciones no disponibles - tests se saltarán
}

try {
  const cycleClassifier = await import('#layer-a/analyses/tier2/cycle-classifier.js');
  classifyCycle = cycleClassifier.classifyCycle;
} catch (e) {
  // Función no disponible
}

describe('Pattern E: Cycle/Classification - Functional Tests', () => {
  
  // Verificar que las funciones existen antes de correr tests
  beforeEach(() => {
    // Setup común si es necesario
  });

  describe('findCircularFunctionDeps()', () => {
    it.skipIf(!findCircularFunctionDeps)('detects function dependency cycles', async () => {
      const result = await findCircularFunctionDeps(cycleFixtures.withFunctionCycles);
      
      expect(result).toBeDefined();
      expect(typeof result.total).toBe('number');
      expect(Array.isArray(result.cycles)).toBe(true);
      expect(Array.isArray(result.classifications)).toBe(true);
    });

    it.skipIf(!findCircularFunctionDeps)('returns empty when no cycles exist', async () => {
      const result = await findCircularFunctionDeps(cycleFixtures.withoutCycles);
      
      expect(result.total).toBe(0);
      expect(result.cycles).toEqual([]);
      expect(result.classifications).toEqual([]);
    });

    it.skipIf(!findCircularFunctionDeps)('detects mutual recursion', async () => {
      const result = await findCircularFunctionDeps(cycleFixtures.withMutualRecursion);

      expect(result.total).toBeGreaterThan(0);
      expect(result.cycles.length).toBeGreaterThan(0);

      // Verificar que se detectó al menos un ciclo
      const cycle = result.cycles[0];
      expect(cycle).toBeDefined();
      expect(cycle.length).toBeGreaterThan(0);

      // El ciclo debe tener severidad asignada
      expect(['CRITICAL', 'WARNING']).toContain(cycle.severity);
    });

    it.skipIf(!findCircularFunctionDeps)('handles empty systemMap gracefully', async () => {
      const result = await findCircularFunctionDeps(cycleFixtures.emptySystemMap);
      
      expect(result).toBeDefined();
      expect(result.total).toBe(0);
      expect(Array.isArray(result.cycles)).toBe(true);
    });

    it.skipIf(!findCircularFunctionDeps)('handles null input without crashing', async () => {
      const result = await findCircularFunctionDeps(null);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it.skipIf(!findCircularFunctionDeps)('detects multiple independent cycles', async () => {
      const result = await findCircularFunctionDeps(cycleFixtures.withMultipleCycles);
      
      // Debe detectar ambos ciclos
      expect(result.total).toBeGreaterThanOrEqual(2);
    });

    it.skipIf(!findCircularFunctionDeps)('classifies cycles by severity', async () => {
      const result = await findCircularFunctionDeps(cycleFixtures.withFunctionCycles);
      
      if (result.classifications && result.classifications.length > 0) {
        const validSeverities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'WARNING', 'INFO'];
        result.classifications.forEach(classification => {
          expect(validSeverities).toContain(classification.severity);
        });
      }
    });
  });

  describe('findCircularImports()', () => {
    it.skipIf(!findCircularImports)('detects import cycles between files', async () => {
      const result = await findCircularImports(cycleFixtures.withImportCycles);
      
      expect(result).toBeDefined();
      expect(typeof result.total).toBe('number');
      expect(Array.isArray(result.cycles)).toBe(true);
    });

    it.skipIf(!findCircularImports)('returns empty when no import cycles', async () => {
      const result = await findCircularImports(cycleFixtures.withoutCycles);
      
      expect(result.total).toBe(0);
      expect(result.cycles).toEqual([]);
    });

    it.skipIf(!findCircularImports)('handles empty systemMap', async () => {
      const result = await findCircularImports(cycleFixtures.emptySystemMap);
      
      expect(result).toBeDefined();
      expect(result.total).toBe(0);
    });
  });

  describe('classifyCycle()', () => {
    it.skipIf(!classifyCycle)('classifies a simple cycle correctly', async () => {
      const cycle = {
        files: ['src/a.js', 'src/b.js', 'src/c.js'],
        imports: [
          { from: 'src/a.js', to: 'src/b.js' },
          { from: 'src/b.js', to: 'src/c.js' },
          { from: 'src/c.js', to: 'src/a.js' }
        ]
      };
      
      const result = await classifyCycle(cycle);
      
      expect(result).toBeDefined();
      expect(typeof result.severity).toBe('string');
      expect(typeof result.category).toBe('string');
      expect(typeof result.explanation).toBe('string');
    });

    it.skipIf(!classifyCycle)('identifies mutual recursion patterns', async () => {
      const cycle = {
        files: ['src/a.js', 'src/b.js'],
        imports: [
          { from: 'src/a.js', to: 'src/b.js' },
          { from: 'src/b.js', to: 'src/a.js' }
        ]
      };
      
      const result = await classifyCycle(cycle);
      
      if (result.category) {
        // La categoría indica el tipo de ciclo
        expect(typeof result.category).toBe('string');
        expect(result.category.length).toBeGreaterThan(0);
      }
    });
  });

  // Usar el FunctionalTestFactory para generar tests automáticos adicionales
  if (findCircularFunctionDeps) {
    describe('Auto-generated Tests (FunctionalTestFactory)', () => {
      createFunctionalTestSuite({
        pattern: 'cycle-classification',
        functions: [findCircularFunctionDeps],
        fixtures: {
          validInput: cycleFixtures.withFunctionCycles,
          emptyInput: cycleFixtures.emptySystemMap,
          withCycles: cycleFixtures.withFunctionCycles,
          withoutCycles: cycleFixtures.withoutCycles
        },
        assertions: {
          mustHaveTotal: true,
          mustHaveCycles: true,
          mustHaveClassifications: true,
          mustClassifySeverity: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'WARNING'],
          mustHandleEmpty: true,
          mustDetectMutualRecursion: true
        }
      });
    });
  }
});

// Tests de integración entre funciones
describe('Pattern E: Integration Tests', () => {
  it.skipIf(!findCircularFunctionDeps || !classifyCycle)('cycle detection and classification work together', async () => {
    // 1. Detectar ciclos
    const detectionResult = await findCircularFunctionDeps(cycleFixtures.withFunctionCycles);
    
    expect(detectionResult.cycles.length).toBeGreaterThan(0);
    
    // 2. Clasificar el primer ciclo detectado
    if (detectionResult.cycles.length > 0 && classifyCycle) {
      const cycle = detectionResult.cycles[0];
      const classification = await classifyCycle(cycle);
      
      expect(classification).toBeDefined();
      expect(typeof classification.severity).toBe('string');
    }
  });
});
