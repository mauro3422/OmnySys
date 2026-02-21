/**
 * @fileoverview create-functional-test-suite.js
 * 
 * Función principal para crear suites de tests funcionales.
 * 
 * @module tests/factories/functional/create-functional-test-suite
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { validatePatternStructure } from './pattern-validators.js';
import { runPatternValidations } from './test-runners.js';

/**
 * Crea un suite de tests funcionales para funciones que siguen el mismo patrón
 * 
 * @param {Object} config - Configuración del test suite
 * @param {string} config.pattern - Nombre del patrón ('cycle-classification', 'file-grouped', etc.)
 * @param {Function[]} config.functions - Funciones a testear
 * @param {Object} config.fixtures - Datos de prueba
 * @param {Object} config.mocks - Mocks necesarios { fs, path, etc. }
 * @param {Object} config.assertions - Validaciones específicas del patrón
 */
export function createFunctionalTestSuite(config) {
  const {
    pattern,
    functions,
    fixtures,
    mocks = {},
    assertions = {}
  } = config;

  if (!pattern || !functions || !fixtures) {
    throw new Error('FunctionalTestFactory: pattern, functions y fixtures son requeridos');
  }

  // Generar tests para cada función del patrón
  functions.forEach((fn) => {
    const fnName = fn.name || 'anonymous';
    
    describe(`${fnName}() - ${pattern}`, () => {
      
      // Test 1: Happy Path - Ejecuta con datos válidos
      if (fixtures.validInput) {
        it('returns correct structure with valid input', async () => {
          const result = await fn(fixtures.validInput);
          expect(result).toBeDefined();
          validatePatternStructure(result, pattern, assertions);
        });
      }

      // Test 2: Edge Cases - Datos límite
      if (fixtures.edgeCases) {
        fixtures.edgeCases.forEach((edgeCase, idx) => {
          it(`handles edge case ${idx + 1}: ${edgeCase.description || 'unnamed'}`, async () => {
            const result = await fn(edgeCase.input);
            expect(result).toBeDefined();
            if (edgeCase.expectError) {
              expect(result.error || result.message).toBeDefined();
            } else {
              validatePatternStructure(result, pattern, assertions);
            }
          });
        });
      }

      // Test 3: Empty Input - Manejo de vacíos
      if (fixtures.emptyInput !== undefined) {
        it('handles empty input gracefully', async () => {
          const result = await fn(fixtures.emptyInput);
          expect(result).toBeDefined();
          // No debe lanzar error
        });
      }

      // Test 4: Invalid Input - Manejo de errores
      if (fixtures.invalidInput) {
        it('handles invalid input without crashing', async () => {
          try {
            const result = await fn(fixtures.invalidInput);
            // Si no lanza error, debe retornar algo coherente
            expect(result).toBeDefined();
          } catch (error) {
            // Si lanza error, debe ser controlado
            expect(error).toBeInstanceOf(Error);
          }
        });
      }

      // Test 5: Pattern-Specific Validations
      if (assertions.customValidations) {
        assertions.customValidations.forEach((validation, idx) => {
          it(`passes custom validation ${idx + 1}: ${validation.name}`, async () => {
            const result = await fn(fixtures.validInput);
            const isValid = validation.test(result);
            expect(isValid).toBe(true);
          });
        });
      }

      // Test 6: Consistency - Múltiples ejecuciones
      if (assertions.mustBeConsistent) {
        it('returns consistent results on multiple runs', async () => {
          const result1 = await fn(fixtures.validInput);
          const result2 = await fn(fixtures.validInput);
          expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
        });
      }
    });
  });

  // Tests de integración entre funciones del mismo patrón
  if (functions.length > 1 && assertions.testIntegration) {
    describe(`${pattern} - Integration`, () => {
      it('all functions follow the same pattern contract', async () => {
        const results = await Promise.all(
          functions.map(fn => fn(fixtures.validInput))
        );
        
        // Todas deben tener la misma estructura
        const firstKeys = Object.keys(results[0]).sort();
        results.forEach((result, idx) => {
          const keys = Object.keys(result).sort();
          expect(keys).toEqual(firstKeys);
        });
      });
    });
  }
}

// Re-exportar funciones auxiliares
export { validatePatternStructure, runPatternValidations };
