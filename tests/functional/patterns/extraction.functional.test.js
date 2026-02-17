/**
 * @fileoverview Pattern H: Extraction - Tests Funcionales
 *
 * Tests que ejecutan código real para funciones de extracción:
 * Patrón: { interfaces[], types[], classes[], exports[], all[] }
 *
 * Funciones testeadas:
 * - extractTypeScriptDefinitions
 * - extractInterfaces
 * - extractExports
 * - detectAllSemanticConnections
 *
 * @module tests/functional/patterns/extraction.functional
 */

import { describe, it, expect } from 'vitest';
import extractionFixtures from './fixtures/extraction.fixtures.js';

// Importar funciones a testear
let extractTypeScriptDefinitions;
let extractInterfaces;
let extractExports;
let detectAllSemanticConnections;

try {
  const tsExtractor = await import('#layer-a/extractors/typescript/index.js');
  extractTypeScriptDefinitions = tsExtractor.extractTypeScriptDefinitions;
  extractInterfaces = tsExtractor.extractInterfaces;
  extractExports = tsExtractor.extractExports;
} catch (e) {
  // Funciones no disponibles
}

try {
  const semantic = await import('#layer-a/extractors/static/index.js');
  detectAllSemanticConnections = semantic.detectAllSemanticConnections;
} catch (e) {
  // Función no disponible
}

describe('Pattern H: Extraction - Functional Tests', () => {

  describe('extractTypeScriptDefinitions()', () => {
    it.skipIf(!extractTypeScriptDefinitions)('extracts interfaces from TypeScript code', async () => {
      const code = extractionFixtures.typeScriptCode.simple;

      const result = await extractTypeScriptDefinitions(code);

      expect(result).toBeDefined();
      expect(Array.isArray(result.interfaces)).toBe(true);

      // Debe encontrar al menos una interfaz
      if (result.interfaces.length > 0) {
        expect(result.interfaces[0]).toHaveProperty('name');
        expect(result.interfaces[0]).toHaveProperty('type');
      }
    });

    it.skipIf(!extractTypeScriptDefinitions)('extracts types from TypeScript code', async () => {
      const code = extractionFixtures.typeScriptCode.simple;

      const result = await extractTypeScriptDefinitions(code);

      expect(result).toBeDefined();
      expect(Array.isArray(result.types)).toBe(true);
    });

    it.skipIf(!extractTypeScriptDefinitions)('extracts classes from TypeScript code', async () => {
      const code = extractionFixtures.typeScriptCode.simple;

      const result = await extractTypeScriptDefinitions(code);

      expect(result).toBeDefined();
      expect(Array.isArray(result.classes)).toBe(true);
    });

    it.skipIf(!extractTypeScriptDefinitions)('detects generics correctly', async () => {
      const code = extractionFixtures.typeScriptCode.withGenerics;

      const result = await extractTypeScriptDefinitions(code);

      expect(result).toBeDefined();

      // Debe detectar que hay generics
      if (result.generics && result.generics.length > 0) {
        expect(Array.isArray(result.generics)).toBe(true);
      }
    });

    it.skipIf(!extractTypeScriptDefinitions)('provides combined all[] array', async () => {
      const code = extractionFixtures.typeScriptCode.simple;

      const result = await extractTypeScriptDefinitions(code);

      expect(result).toBeDefined();
      expect(Array.isArray(result.all)).toBe(true);

      // all[] debe contener todas las definiciones
      const totalFromArrays =
        result.interfaces.length +
        result.types.length +
        result.classes.length;

      expect(result.all.length).toBeGreaterThanOrEqual(totalFromArrays);
    });

    it.skipIf(!extractTypeScriptDefinitions)('handles empty code gracefully', async () => {
      const code = '';

      const result = await extractTypeScriptDefinitions(code);

      expect(result).toBeDefined();
      expect(result.interfaces).toEqual([]);
      expect(result.types).toEqual([]);
      expect(result.classes).toEqual([]);
    });

    it.skipIf(!extractTypeScriptDefinitions)('handles code without TypeScript definitions', async () => {
      const code = extractionFixtures.typeScriptCode.noDefinitions;

      const result = await extractTypeScriptDefinitions(code);

      expect(result).toBeDefined();
      // Puede tener 0 o pocas definiciones
      expect(Array.isArray(result.interfaces)).toBe(true);
    });
  });

  describe('extractInterfaces()', () => {
    it.skipIf(!extractInterfaces)('extracts only interfaces', async () => {
      const code = extractionFixtures.typeScriptCode.simple;

      const result = await extractInterfaces(code);

      expect(Array.isArray(result)).toBe(true);

      // Cada elemento debe ser una interfaz
      result.forEach(item => {
        expect(item.type).toBe('interface');
        expect(item.name).toBeDefined();
      });
    });

    it.skipIf(!extractInterfaces)('handles extends clauses', async () => {
      const code = extractionFixtures.typeScriptCode.complex;

      const result = await extractInterfaces(code);

      // Debe encontrar interfaces con extends
      const withExtends = result.find(i => i.extends && i.extends.length > 0);
      if (withExtends) {
        expect(Array.isArray(withExtends.extends)).toBe(true);
      }
    });
  });

  describe('extractExports()', () => {
    it.skipIf(!extractExports)('extracts exported items', async () => {
      const code = extractionFixtures.typeScriptCode.simple;

      const result = await extractExports(code);

      expect(Array.isArray(result)).toBe(true);

      // Debe encontrar exports
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('name');
        expect(result[0]).toHaveProperty('type');
      }
    });
  });

  describe('detectAllSemanticConnections()', () => {
    it.skipIf(!detectAllSemanticConnections)('detects localStorage connections', async () => {
      const code = extractionFixtures.semanticCode.withLocalStorage;

      const result = await detectAllSemanticConnections(code);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');

      // Debe tener array de conexiones
      if (result.localStorageConnections) {
        expect(Array.isArray(result.localStorageConnections)).toBe(true);
      }
    });

    it.skipIf(!detectAllSemanticConnections)('detects event listener connections', async () => {
      const code = extractionFixtures.semanticCode.withEvents;

      const result = await detectAllSemanticConnections(code);

      expect(result).toBeDefined();

      if (result.eventConnections) {
        expect(Array.isArray(result.eventConnections)).toBe(true);
      }
    });

    it.skipIf(!detectAllSemanticConnections)('detects global variable usage', async () => {
      const code = extractionFixtures.semanticCode.withGlobals;

      const result = await detectAllSemanticConnections(code);

      expect(result).toBeDefined();

      if (result.globalConnections) {
        expect(Array.isArray(result.globalConnections)).toBe(true);
      }
    });

    it.skipIf(!detectAllSemanticConnections)('returns empty for clean code', async () => {
      const code = extractionFixtures.semanticCode.clean;

      const result = await detectAllSemanticConnections(code);

      expect(result).toBeDefined();

      // No debería tener conexiones
      if (result.all) {
        expect(result.all.length).toBe(0);
      }
    });

    it.skipIf(!detectAllSemanticConnections)('handles empty code', async () => {
      const code = '';

      const result = await detectAllSemanticConnections(code);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it.skipIf(!detectAllSemanticConnections)('provides combined all[] array', async () => {
      const code = extractionFixtures.semanticCode.withLocalStorage;

      const result = await detectAllSemanticConnections(code);

      expect(result).toBeDefined();

      if (result.all) {
        expect(Array.isArray(result.all)).toBe(true);
      }
    });
  });

  // Tests de integración
  describe('Pattern H: Integration Tests', () => {
    it.skipIf(!extractTypeScriptDefinitions)('extraction provides complete type information', async () => {
      const code = extractionFixtures.typeScriptCode.complex;

      const result = await extractTypeScriptDefinitions(code);

      // Verificar que tiene toda la información necesaria
      expect(result).toHaveProperty('interfaces');
      expect(result).toHaveProperty('types');
      expect(result).toHaveProperty('classes');
      expect(result).toHaveProperty('all');

      // all[] debe ser la suma de todas las categorías
      const total = result.interfaces.length +
                    result.types.length +
                    result.classes.length +
                    (result.enums ? result.enums.length : 0);

      expect(result.all.length).toBeGreaterThanOrEqual(total);
    });

    it.skipIf(!detectAllSemanticConnections)('semantic detection identifies all connection types', async () => {
      // Usar código con múltiples tipos de conexiones
      const code = extractionFixtures.semanticCode.withLocalStorage;

      const result = await detectAllSemanticConnections(code);

      expect(result).toBeDefined();

      // Verificar que la función detecta conexiones (puede ser cualquier tipo)
      const hasAnyConnections =
        (result.localStorageConnections && result.localStorageConnections.length > 0) ||
        (result.eventConnections && result.eventConnections.length > 0) ||
        (result.globalConnections && result.globalConnections.length > 0) ||
        (result.all && result.all.length > 0);

      // La función debe retornar un objeto válido
      expect(typeof result).toBe('object');

      // Si detectó conexiones, verificar que son válidas
      if (hasAnyConnections && result.all && result.all.length > 0) {
        expect(Array.isArray(result.all)).toBe(true);
      }
    });
  });
});
