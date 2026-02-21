/**
 * @fileoverview pattern-validators.js
 * 
 * Validadores específicos para cada patrón de resultado.
 * 
 * @module tests/factories/functional/pattern-validators
 */

import { expect } from 'vitest';

/**
 * Valida la estructura del resultado según el patrón
 * @param {Object} result - Resultado a validar
 * @param {string} pattern - Nombre del patrón
 * @param {Object} assertions - Aserciones adicionales
 */
export function validatePatternStructure(result, pattern, assertions) {
  switch (pattern) {
    case 'cycle-classification':
      validateCycleClassification(result, assertions);
      break;
    case 'file-grouped':
      validateFileGrouped(result, assertions);
      break;
    case 'list-results':
      validateListResults(result, assertions);
      break;
    case 'storage':
      validateStorage(result, assertions);
      break;
    case 'extraction':
      validateExtraction(result, assertions);
      break;
    default:
      // Patrón genérico: verificar que es un objeto
      expect(typeof result).toBe('object');
  }
}

/**
 * Validación específica para Pattern E: Cycle/Classification
 */
function validateCycleClassification(result, assertions) {
  // Debe tener total
  expect(typeof result.total).toBe('number');
  
  // Debe tener cycles array
  expect(Array.isArray(result.cycles)).toBe(true);
  
  // Debe tener classifications array
  expect(Array.isArray(result.classifications)).toBe(true);
  
  // Verificar severidades si se especificaron
  if (assertions.mustClassifySeverity) {
    result.classifications.forEach(classification => {
      expect(assertions.mustClassifySeverity).toContain(classification.severity);
    });
  }
  
  // Verificar conteos problemáticos
  if (typeof result.problematicCount === 'number') {
    expect(result.problematicCount).toBeGreaterThanOrEqual(0);
  }
  
  // Verificar recursión mutua si aplica
  if (assertions.mustDetectMutualRecursion && result.hasMutualRecursion !== undefined) {
    expect(typeof result.hasMutualRecursion).toBe('boolean');
  }
}

/**
 * Validación específica para Pattern B: File-Grouped
 */
function validateFileGrouped(result, assertions) {
  // Debe tener total
  const totalField = Object.keys(result).find(k => k.includes('total'));
  expect(totalField).toBeDefined();
  expect(typeof result[totalField]).toBe('number');
  
  // Debe tener byFile objeto
  expect(typeof result.byFile).toBe('object');
  expect(result.byFile).not.toBeNull();
  
  // Si hay items, verificar estructura
  Object.values(result.byFile).forEach(items => {
    expect(Array.isArray(items)).toBe(true);
  });
}

/**
 * Validación específica para Pattern A: List Results
 */
function validateListResults(result, assertions) {
  // Debe tener total
  expect(typeof result.total).toBe('number');
  
  // Debe tener algún array de items
  const arrayFields = Object.keys(result).filter(k => Array.isArray(result[k]));
  expect(arrayFields.length).toBeGreaterThan(0);
  
  // Verificar sub-conteos si existen
  const countFields = Object.keys(result).filter(k => 
    k.includes('Count') && typeof result[k] === 'number'
  );
  countFields.forEach(field => {
    expect(result[field]).toBeGreaterThanOrEqual(0);
  });
}

/**
 * Validación específica para Pattern G: Storage
 */
function validateStorage(result, assertions) {
  // Puede ser string (path) o objeto con paths
  const isString = typeof result === 'string';
  const isObject = typeof result === 'object' && result !== null;
  
  expect(isString || isObject).toBe(true);
  
  if (isObject) {
    // Debe tener al menos un path
    const hasPath = Object.values(result).some(v => typeof v === 'string');
    expect(hasPath).toBe(true);
  }
}

/**
 * Validación específica para Pattern H: Extraction
 */
function validateExtraction(result, assertions) {
  // Puede ser array o objeto con arrays
  if (Array.isArray(result)) {
    expect(Array.isArray(result)).toBe(true);
  } else {
    // Debe tener al menos un array de datos
    const arrayFields = Object.keys(result).filter(k => Array.isArray(result[k]));
    expect(arrayFields.length).toBeGreaterThan(0);
  }
}

/**
 * Verifica que el resultado no cause crash
 */
export function expectNoCrash(result) {
  expect(result).toBeDefined();
  expect(typeof result).not.toBe('undefined');
}

/**
 * Verifica que el resultado esté vacío según el patrón
 */
export function expectEmptyStructure(result, pattern) {
  switch (pattern) {
    case 'cycle-classification':
      expect(result.total).toBe(0);
      expect(result.cycles).toEqual([]);
      expect(result.classifications).toEqual([]);
      break;
    case 'file-grouped':
      expect(result.byFile).toEqual({});
      break;
    case 'list-results':
      expect(result.total).toBe(0);
      break;
    default:
      // Para patrones genéricos, verificar que no tenga datos significativos
      const hasData = Object.values(result).some(v => 
        (Array.isArray(v) && v.length > 0) ||
        (typeof v === 'number' && v > 0) ||
        (typeof v === 'object' && v !== null && Object.keys(v).length > 0)
      );
      expect(hasData).toBe(false);
  }
}
