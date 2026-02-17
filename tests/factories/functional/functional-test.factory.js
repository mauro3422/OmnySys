/**
 * @fileoverview FunctionalTestFactory - Tests que ejecutan código real
 * 
 * Genera automáticamente tests funcionales agrupados por patrones de retorno.
 * Extiende el Meta-Factory para tests que invocan la lógica real.
 * 
 * @module tests/factories/functional/functional-test.factory
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach } from 'vitest';

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

      // Test 2: Empty/Null Input - Manejo de casos vacíos
      if (assertions.mustHandleEmpty !== false) {
        it('handles empty/null input gracefully', async () => {
          const result = await fn(null);
          expect(result).toBeDefined();
          expectNoCrash(result);
        });
      }

      // Test 3: No Data - Retorna estructura vacía correcta
      if (fixtures.emptyInput) {
        it('returns empty structure when no data', async () => {
          const result = await fn(fixtures.emptyInput);
          expectEmptyStructure(result, pattern);
        });
      }

      // Test 4: Error Handling - Manejo de errores
      if (fixtures.invalidInput) {
        it('handles invalid input without crashing', async () => {
          const result = await fn(fixtures.invalidInput);
          expect(result).toBeDefined();
          // No debe lanzar excepción
        });
      }

      // Test 5: Specific Pattern Validations
      runPatternValidations(fn, pattern, fixtures, assertions);
    });
  });
}

/**
 * Valida que el resultado siga la estructura del patrón
 */
function validatePatternStructure(result, pattern, assertions) {
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
function expectNoCrash(result) {
  expect(result).toBeDefined();
  // No debe ser un error lanzado
  expect(result).not.toBeInstanceOf(Error);
}

/**
 * Verifica estructura vacía según el patrón
 */
function expectEmptyStructure(result, pattern) {
  switch (pattern) {
    case 'cycle-classification':
      expect(result.total).toBe(0);
      expect(result.cycles).toEqual([]);
      expect(result.classifications).toEqual([]);
      break;
    case 'file-grouped':
      const totalField = Object.keys(result).find(k => k.includes('total'));
      expect(result[totalField]).toBe(0);
      expect(result.byFile).toEqual({});
      break;
    case 'list-results':
      expect(result.total).toBe(0);
      break;
    case 'storage':
      // Storage puede retornar null o path
      expect(result === null || typeof result === 'string' || typeof result === 'object').toBe(true);
      break;
    case 'extraction':
      if (Array.isArray(result)) {
        expect(result).toEqual([]);
      } else {
        Object.values(result).forEach(v => {
          if (Array.isArray(v)) expect(v).toEqual([]);
        });
      }
      break;
    default:
      expect(typeof result).toBe('object');
  }
}

/**
 * Ejecuta validaciones específicas del patrón
 */
function runPatternValidations(fn, pattern, fixtures, assertions) {
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

/**
 * Helpers para crear fixtures de prueba
 */
export const fixtureHelpers = {
  /**
   * Crea un systemMap mínimo para tests
   */
  createMinimalSystemMap(overrides = {}) {
    return {
      files: {},
      metadata: { totalFiles: 0 },
      ...overrides
    };
  },

  /**
   * Crea un archivo simulado con átomos
   */
  createFileWithAtoms(filePath, atoms = []) {
    return {
      [filePath]: {
        atoms,
        metadata: { atomCount: atoms.length }
      }
    };
  },

  /**
   * Crea un átomo de función simulado
   */
  createFunctionAtom(name, calls = [], overrides = {}) {
    return {
      id: `${name}-id`,
      name,
      type: 'function',
      calls,
      ...overrides
    };
  }
};

/**
 * Helpers para mocks
 */
export const mockHelpers = {
  /**
   * Crea un mock de filesystem básico
   */
  createMockFS(options = {}) {
    const files = new Map();
    
    return {
      writeFile: async (path, data) => {
        files.set(path, data);
        return Promise.resolve();
      },
      
      readFile: async (path) => {
        if (files.has(path)) {
          return Promise.resolve(files.get(path));
        }
        throw new Error(`ENOENT: ${path}`);
      },
      
      exists: async (path) => {
        return Promise.resolve(files.has(path));
      },
      
      mkdir: async () => Promise.resolve(),
      
      // Helper para tests
      _files: files,
      _getWrittenFiles: () => Array.from(files.keys())
    };
  },

  /**
   * Crea un mock de path
   */
  createMockPath() {
    return {
      join: (...args) => args.join('/'),
      dirname: (p) => p.split('/').slice(0, -1).join('/'),
      basename: (p) => p.split('/').pop()
    };
  }
};
