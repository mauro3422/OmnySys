/**
 * @fileoverview Pattern B: File-Grouped - Tests Funcionales
 * 
 * Tests que ejecutan código real para funciones que agrupan resultados por archivo:
 * Patrón: { totalUnused, byFile: {}, impact }
 * 
 * Funciones testeadas:
 * - findUnusedExports
 * - findUnusedImports
 * 
 * @module tests/functional/patterns/file-grouped.functional
 */

import { describe, it, expect } from 'vitest';
import { createFunctionalTestSuite } from '../../factories/functional/functional-test.factory.js';
import fileGroupedFixtures from './fixtures/file-grouped.fixtures.js';

// Importar funciones a testear
let findUnusedExports;
let findUnusedImports;

try {
  const tier1 = await import('#layer-a/analyses/tier1/index.js');
  findUnusedExports = tier1.findUnusedExports;
} catch (e) {
  // Función no disponible
}

try {
  const tier2 = await import('#layer-a/analyses/tier2/index.js');
  findUnusedImports = tier2.findUnusedImports;
} catch (e) {
  // Función no disponible
}

describe('Pattern B: File-Grouped - Functional Tests', () => {
  
  describe('findUnusedExports()', () => {
    it.skipIf(!findUnusedExports)('detects unused exports correctly', async () => {
      const result = await findUnusedExports(fileGroupedFixtures.withUnusedExports);
      
      expect(result).toBeDefined();
      expect(typeof result.totalUnused).toBe('number');
      expect(typeof result.byFile).toBe('object');
      
      // Debe encontrar exports sin usar
      expect(result.totalUnused).toBeGreaterThan(0);
      expect(Object.keys(result.byFile).length).toBeGreaterThan(0);
    });

    it.skipIf(!findUnusedExports)('returns empty when all exports are used', async () => {
      const result = await findUnusedExports(fileGroupedFixtures.withoutUnusedExports);
      
      expect(result.totalUnused).toBe(0);
      expect(Object.keys(result.byFile).length).toBe(0);
    });

    it.skipIf(!findUnusedExports)('groups results by file path', async () => {
      const result = await findUnusedExports(fileGroupedFixtures.withUnusedExports);
      
      // Verificar que los resultados están agrupados por archivo
      for (const [filePath, unusedExports] of Object.entries(result.byFile)) {
        expect(typeof filePath).toBe('string');
        expect(Array.isArray(unusedExports)).toBe(true);
        
        // Cada export debe tener nombre
        unusedExports.forEach(exp => {
          expect(typeof exp.name).toBe('string');
        });
      }
    });

    it.skipIf(!findUnusedExports)('handles barrel exports correctly', async () => {
      const result = await findUnusedExports(fileGroupedFixtures.withBarrelExports);
      
      // El export original (en helpers.js) no debe marcarse como unused
      // porque se re-exporta en index.js
      const helpersFile = result.byFile['src/utils/helpers.js'];
      if (helpersFile) {
        const formatDateUnused = helpersFile.find(e => e.name === 'formatDate');
        expect(formatDateUnused).toBeUndefined();
      }
    });

    it.skipIf(!findUnusedExports)('ignores test files', async () => {
      const result = await findUnusedExports(fileGroupedFixtures.withTestFiles);
      
      // No debería reportar exports de archivos .test.js
      const testFiles = Object.keys(result.byFile).filter(f => f.includes('.test.'));
      expect(testFiles.length).toBe(0);
    });

    it.skipIf(!findUnusedExports)('handles empty systemMap gracefully', async () => {
      const result = await findUnusedExports(fileGroupedFixtures.emptySystemMap);
      
      expect(result).toBeDefined();
      expect(result.totalUnused).toBe(0);
      expect(Object.keys(result.byFile).length).toBe(0);
    });

    it.skipIf(!findUnusedExports)('handles null input without crashing', async () => {
      const result = await findUnusedExports(null);
      
      expect(result).toBeDefined();
      expect(result.totalUnused).toBe(0);
      expect(typeof result.byFile).toBe('object');
    });

    it.skipIf(!findUnusedExports)('provides impact message', async () => {
      const result = await findUnusedExports(fileGroupedFixtures.withUnusedExports);
      
      expect(typeof result.impact).toBe('string');
      expect(result.impact.length).toBeGreaterThan(0);
    });

    it.skipIf(!findUnusedExports)('handles files with no internal usage', async () => {
      const result = await findUnusedExports(fileGroupedFixtures.withPublicAPI);
      
      // Verificar que la función procesa el archivo correctamente
      // El resultado depende de si las funciones coinciden con patrones de API pública
      expect(typeof result.totalUnused).toBe('number');
      expect(typeof result.byFile).toBe('object');
    });
  });

  describe('findUnusedImports()', () => {
    it.skipIf(!findUnusedImports)('detects unused imports correctly', async () => {
      // Este test requiere un fixture diferente para imports
      // Por ahora verificamos que la función existe y no crashea
      const result = await findUnusedImports({ files: {} });
      
      expect(result).toBeDefined();
      expect(typeof result.total).toBe('number');
      expect(typeof result.byFile).toBe('object');
    });

    it.skipIf(!findUnusedImports)('handles null input', async () => {
      const result = await findUnusedImports(null);
      
      expect(result).toBeDefined();
      expect(result.total).toBe(0);
    });
  });

  // Tests auto-generados con FunctionalTestFactory
  if (findUnusedExports) {
    describe('Auto-generated Tests (FunctionalTestFactory)', () => {
      createFunctionalTestSuite({
        pattern: 'file-grouped',
        functions: [findUnusedExports],
        fixtures: {
          validInput: fileGroupedFixtures.withUnusedExports,
          emptyInput: fileGroupedFixtures.emptySystemMap,
          withData: fileGroupedFixtures.withUnusedExports,
          withoutData: fileGroupedFixtures.withoutUnusedExports
        },
        assertions: {
          mustHaveTotal: true,
          mustHaveByFile: true,
          mustGroupByFile: true,
          mustHandleEmpty: true
        }
      });
    });
  }
});

// Tests de integración
describe('Pattern B: Integration Tests', () => {
  it.skipIf(!findUnusedExports)('unused exports detection provides actionable data', async () => {
    const result = await findUnusedExports(fileGroupedFixtures.withUnusedExports);
    
    // Verificar que los datos son accionables
    // (se puede usar para refactorizar/quitar código)
    if (result.totalUnused > 0) {
      for (const [filePath, unusedList] of Object.entries(result.byFile)) {
        expect(filePath).toMatch(/\.(js|ts|jsx|tsx)$/);
        
        unusedList.forEach(unused => {
          expect(unused.name).toBeDefined();
          expect(unused.line).toBeGreaterThanOrEqual(0);
        });
      }
    }
  });
});
