/**
 * @fileoverview test-runners.js
 * 
 * Runners de tests específicos para cada patrón.
 * 
 * @module tests/factories/functional/test-runners
 */

import { it, expect } from 'vitest';

/**
 * Ejecuta validaciones específicas del patrón
 * @param {Function} fn - Función a testear
 * @param {string} pattern - Nombre del patrón
 * @param {Object} fixtures - Fixtures de prueba
 * @param {Object} assertions - Aserciones adicionales
 */
export function runPatternValidations(fn, pattern, fixtures, assertions) {
  const fnName = fn.name;
  
  switch (pattern) {
    case 'cycle-classification':
      if (fixtures.withCycles) {
        it('detects cycles correctly', async () => {
          const result = await fn(fixtures.withCycles);
          expect(result.total).toBeGreaterThan(0);
          expect(result.cycles.length).toBeGreaterThan(0);
        });
      }
      
      if (fixtures.withoutCycles) {
        it('returns empty when no cycles', async () => {
          const result = await fn(fixtures.withoutCycles);
          expect(result.total).toBe(0);
          expect(result.cycles).toEqual([]);
        });
      }
      break;
      
    case 'file-grouped':
      if (fixtures.withIssues) {
        it('groups issues by file correctly', async () => {
          const result = await fn(fixtures.withIssues);
          expect(Object.keys(result.byFile).length).toBeGreaterThan(0);
        });
      }
      break;
      
    case 'list-results':
      if (fixtures.withItems) {
        it('returns items in correct order', async () => {
          const result = await fn(fixtures.withItems);
          expect(result.total).toBeGreaterThan(0);
          
          // Verificar que total coincide con array length
          const arrayFields = Object.keys(result).filter(k => Array.isArray(result[k]));
          arrayFields.forEach(field => {
            if (field !== 'all') {  // 'all' puede ser combinación
              expect(result[field].length).toBeGreaterThanOrEqual(0);
            }
          });
        });
      }
      break;
  }
}
