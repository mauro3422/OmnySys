/**
 * @fileoverview Fixtures para Pattern G: Storage
 *
 * Datos de prueba para funciones de almacenamiento:
 * - saveMetadata(rootPath, metadata, fileIndex)
 * - saveFileAnalysis(rootPath, filePath, fileData)
 * - saveConnections(rootPath, connectionsData)
 * - saveRiskAssessment(rootPath, riskData)
 * - saveAtom(rootPath, filePath, functionName, atomData)
 * - saveMolecule(rootPath, filePath, moleculeData)
 *
 * ESTRUCTURA:
 * Las funciones de storage reciben (rootPath, ...data) y guardan en filesystem
 * Retornan: string (path) o { paths }
 *
 * @module tests/functional/patterns/fixtures/storage.fixtures
 */

/**
 * Datos de ejemplo para guardar metadata
 */
export const metadataData = {
  projectName: 'test-project',
  version: '1.0.0',
  analyzedAt: '2026-02-18T00:00:00Z',
  totalFiles: 10,
  totalFunctions: 50
};

/**
 * Índice de archivos para metadata
 */
export const fileIndexData = {
  'src/app.js': { analyzed: true, lastModified: Date.now() },
  'src/utils.js': { analyzed: true, lastModified: Date.now() }
};

/**
 * Datos de ejemplo para guardar análisis de archivo
 */
export const fileAnalysisData = {
  filePath: 'src/app.js',
  atoms: [
    { name: 'init', type: 'function', line: 10 },
    { name: 'App', type: 'class', line: 20 }
  ],
  imports: [{ source: './utils', names: ['helper'] }],
  exports: ['init', 'App'],
  complexity: { cyclomatic: 5 }
};

/**
 * Datos de ejemplo para guardar conexiones
 */
export const connectionsData = {
  sharedState: [
    { from: 'src/a.js', to: 'src/b.js', variable: 'state' }
  ],
  eventListeners: [
    { from: 'src/c.js', to: 'src/d.js', event: 'click' }
  ]
};

/**
 * Datos de ejemplo para guardar evaluación de riesgos
 */
export const riskAssessmentData = {
  score: 75,
  level: 'MEDIUM',
  issues: [
    { file: 'src/app.js', severity: 'HIGH', message: 'High complexity' }
  ]
};

/**
 * Datos de ejemplo para guardar átomo (con functionName separado)
 */
export const atomParams = {
  filePath: 'src/utils/math.js',
  functionName: 'calculateTotal',
  data: {
    id: 'func-1',
    name: 'calculateTotal',
    type: 'function',
    line: 15,
    complexity: { cyclomatic: 3 }
  }
};

/**
 * Datos de ejemplo para guardar molécula
 */
export const moleculeParams = {
  filePath: 'src/payment.js',
  data: {
    id: 'chain-1',
    name: 'processPayment',
    atoms: ['func-1', 'func-2', 'func-3'],
    files: ['src/payment.js', 'src/validation.js']
  }
};

/**
 * Project paths de prueba
 */
export const testProjectPaths = {
  valid: '/test/project',
  withSpaces: '/test/my project',
  deeplyNested: '/test/projects/web/app/src'
};

/**
 * Resultados esperados para validación
 */
export const expectedResults = {
  saveMetadata: {
    returnsPath: true,
    pathEndsWith: 'index.json'
  },
  saveFileAnalysis: {
    returnsPath: true,
    pathContains: 'files'
  },
  saveConnections: {
    returnsObject: true,
    hasPaths: ['sharedStatePath', 'eventListenersPath']
  },
  saveRiskAssessment: {
    returnsPath: true,
    pathContains: 'risks'
  },
  saveAtom: {
    returnsPath: true,
    pathContains: 'atoms'
  },
  saveMolecule: {
    returnsPath: true,
    pathContains: 'molecules'
  }
};

/**
 * Exportar todos los fixtures juntos
 */
export default {
  metadataData,
  fileIndexData,
  fileAnalysisData,
  connectionsData,
  riskAssessmentData,
  atomParams,
  moleculeParams,
  testProjectPaths,
  expectedResults
};
