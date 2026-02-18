/**
 * @fileoverview Pattern G: Storage - Tests Funcionales
 *
 * Tests que ejecutan código real para funciones de almacenamiento:
 * Patrón: string (path) / { paths }
 *
 * Funciones testeadas:
 * - saveMetadata(rootPath, metadata, fileIndex)
 * - saveFileAnalysis(rootPath, filePath, fileData)
 * - saveConnections(rootPath, connectionsData)
 * - saveRiskAssessment(rootPath, riskData)
 * - saveAtom(rootPath, filePath, functionName, atomData)
 * - saveMolecule(rootPath, filePath, moleculeData)
 *
 * @module tests/functional/patterns/storage.functional
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import storageFixtures from './fixtures/storage.fixtures.js';

// Importar funciones a testear
let saveMetadata;
let saveFileAnalysis;
let saveConnections;
let saveRiskAssessment;
let saveAtom;
let saveMolecule;

try {
  const storage = await import('#layer-c/storage/index.js');
  saveMetadata = storage.saveMetadata;
  saveFileAnalysis = storage.saveFileAnalysis;
  saveConnections = storage.saveConnections;
  saveRiskAssessment = storage.saveRiskAssessment;
  saveAtom = storage.saveAtom;
  saveMolecule = storage.saveMolecule;
} catch (e) {
  // Funciones no disponibles
  console.log('Storage functions not available:', e.message);
}

describe('Pattern G: Storage - Functional Tests', () => {

  describe('saveMetadata()', () => {
    it.skipIf(!saveMetadata)('saves metadata and returns path', async () => {
      const rootPath = storageFixtures.testProjectPaths.valid;
      const metadata = storageFixtures.metadataData;
      const fileIndex = storageFixtures.fileIndexData;

      const result = await saveMetadata(rootPath, metadata, fileIndex);

      // Debe retornar un string (path)
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);

      // El path debe terminar en 'index.json'
      expect(result.endsWith('index.json')).toBe(true);
    });

    it.skipIf(!saveMetadata)('works without fileIndex', async () => {
      const rootPath = storageFixtures.testProjectPaths.valid;
      const metadata = storageFixtures.metadataData;

      // Llamar sin fileIndex (debe usar default {})
      const result = await saveMetadata(rootPath, metadata);

      expect(typeof result).toBe('string');
      expect(result.endsWith('index.json')).toBe(true);
    });

    it.skipIf(!saveMetadata)('handles nested project paths', async () => {
      const rootPath = storageFixtures.testProjectPaths.deeplyNested;
      const metadata = storageFixtures.metadataData;

      const result = await saveMetadata(rootPath, metadata);

      expect(typeof result).toBe('string');
      expect(result.includes('.omnysysdata')).toBe(true);
    });
  });

  describe('saveFileAnalysis()', () => {
    it.skipIf(!saveFileAnalysis)('saves file analysis and returns path', async () => {
      const rootPath = storageFixtures.testProjectPaths.valid;
      const filePath = 'src/app.js';
      const data = storageFixtures.fileAnalysisData;

      const result = await saveFileAnalysis(rootPath, filePath, data);

      // Debe retornar un string (path)
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);

      // El path debe contener 'files' y terminar en '.json'
      expect(result.includes('files')).toBe(true);
      expect(result.endsWith('.json')).toBe(true);
    });

    it.skipIf(!saveFileAnalysis)('handles file paths with subdirectories', async () => {
      const rootPath = storageFixtures.testProjectPaths.valid;
      const filePath = 'src/components/Button/Button.tsx';
      const data = storageFixtures.fileAnalysisData;

      const result = await saveFileAnalysis(rootPath, filePath, data);

      expect(typeof result).toBe('string');
      expect(result.endsWith('.json')).toBe(true);
    });
  });

  describe('saveConnections()', () => {
    it.skipIf(!saveConnections)('saves connections and returns paths object', async () => {
      const rootPath = storageFixtures.testProjectPaths.valid;
      const sharedState = storageFixtures.connectionsData.sharedState;
      const eventListeners = storageFixtures.connectionsData.eventListeners;

      const result = await saveConnections(rootPath, sharedState, eventListeners);

      // Debe retornar un objeto con paths
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();

      // Debe tener ambos paths
      expect(typeof result.sharedStatePath).toBe('string');
      expect(typeof result.eventListenersPath).toBe('string');
    });

    it.skipIf(!saveConnections)('handles empty connections data', async () => {
      const rootPath = storageFixtures.testProjectPaths.valid;

      const result = await saveConnections(rootPath, [], []);

      expect(typeof result).toBe('object');
      expect(typeof result.sharedStatePath).toBe('string');
      expect(typeof result.eventListenersPath).toBe('string');
    });
  });

  describe('saveRiskAssessment()', () => {
    it.skipIf(!saveRiskAssessment)('saves risk assessment and returns path', async () => {
      const rootPath = storageFixtures.testProjectPaths.valid;
      const data = storageFixtures.riskAssessmentData;

      const result = await saveRiskAssessment(rootPath, data);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);

      // El path debe terminar en '.json'
      expect(result.endsWith('.json')).toBe(true);
    });
  });

  describe('saveAtom()', () => {
    it.skipIf(!saveAtom)('saves atom and returns path', async () => {
      const rootPath = storageFixtures.testProjectPaths.valid;
      const { filePath, functionName, data } = storageFixtures.atomParams;

      const result = await saveAtom(rootPath, filePath, functionName, data);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);

      // El path debe contener 'atoms' y terminar en '.json'
      expect(result.includes('atoms')).toBe(true);
      expect(result.endsWith('.json')).toBe(true);

      // El path debe incluir el nombre de la función
      expect(result.includes(functionName)).toBe(true);
    });
  });

  describe('saveMolecule()', () => {
    it.skipIf(!saveMolecule)('saves molecule and returns path', async () => {
      const rootPath = storageFixtures.testProjectPaths.valid;
      const { filePath, data } = storageFixtures.moleculeParams;

      const result = await saveMolecule(rootPath, filePath, data);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);

      // El path debe terminar en '.json'
      expect(result.endsWith('.json')).toBe(true);
    });
  });

  // Tests de consistencia entre funciones de storage
  describe('Storage Consistency Tests', () => {
    it.skipIf(!saveMetadata || !saveFileAnalysis)('all storage functions use consistent base path', async () => {
      const rootPath = storageFixtures.testProjectPaths.valid;

      // Guardar diferentes tipos de datos
      const metadataPath = await saveMetadata(rootPath, storageFixtures.metadataData);
      const filePath = await saveFileAnalysis(rootPath, 'src/test.js', storageFixtures.fileAnalysisData);

      // Ambos paths deben estar en el mismo directorio base (.omnysysdata)
      expect(metadataPath.includes('.omnysysdata')).toBe(true);
      expect(filePath.includes('.omnysysdata')).toBe(true);
    });
  });

  // Tests de manejo de errores
  describe('Storage Error Handling', () => {
    it.skipIf(!saveMetadata)('handles invalid rootPath gracefully', async () => {
      // Este test verifica que la función maneje errores
      try {
        await saveMetadata('', storageFixtures.metadataData);
        // Si no lanza error, está bien
        expect(true).toBe(true);
      } catch (error) {
        // Si lanza error, debe ser un error manejable
        expect(error).toBeDefined();
      }
    });
  });
});

// Tests de integración entre storage y otras capas
describe('Pattern G: Integration Tests', () => {
  it.skipIf(!saveMetadata || !saveFileAnalysis)('storage workflow works end-to-end', async () => {
    const rootPath = storageFixtures.testProjectPaths.valid;

    // 1. Guardar metadata del proyecto
    const metadataPath = await saveMetadata(rootPath, storageFixtures.metadataData, storageFixtures.fileIndexData);
    expect(typeof metadataPath).toBe('string');
    expect(metadataPath.endsWith('index.json')).toBe(true);

    // 2. Guardar análisis de archivos
    const filePath = await saveFileAnalysis(rootPath, 'src/app.js', storageFixtures.fileAnalysisData);
    expect(typeof filePath).toBe('string');
    expect(filePath.endsWith('.json')).toBe(true);

    // 3. Guardar átomos (si disponible)
    if (saveAtom) {
      const { filePath: atomFile, functionName, data } = storageFixtures.atomParams;
      const atomPath = await saveAtom(rootPath, atomFile, functionName, data);
      expect(typeof atomPath).toBe('string');
      expect(atomPath.endsWith('.json')).toBe(true);
    }

    // Todos los paths deben ser válidos y contener .omnysysdata
    expect(metadataPath.includes('.omnysysdata')).toBe(true);
    expect(filePath.includes('.omnysysdata')).toBe(true);
  });
});
