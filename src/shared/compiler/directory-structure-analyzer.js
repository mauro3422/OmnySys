/**
 * @fileoverview directory-structure-analyzer.js
 *
 * Analiza la estructura de directorios del proyecto para:
 * - Detectar convenciones arquitectónicas
 * - Sugerir ubicación óptima para archivos nuevos
 * - Detectar "architectural drift" (archivos en lugar incorrecto)
 *
 * Complementa a:
 * - architecture-utils.js: Detecta patrones (God Object, Orphan)
 * - architectural-recommendations.js: Sugiere acciones arquitectónicas
 * - helper-reuse-detector.js: Sugiere reutilizar helpers existentes
 *
 * @module shared/compiler/directory-structure-analyzer
 */

import { createLogger } from '#utils/logger.js';
import path from 'path';

const logger = createLogger('OmnySys:DirectoryStructureAnalyzer');

/**
 * Patrones de directorios convencionales
 */
const DIRECTORY_PATTERNS = {
  // Helpers / Utilidades
  helpers: ['/utils/', '/helpers/', '/common/', '/lib/'],
  
  // Policies / Reglas
  policies: ['/compiler/', '/guards/', '/policies/', '/rules/', '/validators/'],
  
  // Services / Lógica
  services: ['/services/', '/core/', '/domain/', '/application/'],
  
  // Controllers / Handlers
  controllers: ['/controllers/', '/handlers/', '/routes/'],
  
  // Models / Entidades
  models: ['/models/', '/entities/', '/schemas/'],
  
  // Tests
  tests: ['/tests/', '/__tests__/', '/specs/']
};

/**
 * Mapeo de tipos de archivos a directorios
 */
const FILE_TYPE_TO_DIRECTORY = {
  'helper': 'helpers',
  'utility': 'helpers',
  'policy': 'policies',
  'guard': 'policies',
  'validator': 'policies',
  'service': 'services',
  'controller': 'controllers',
  'handler': 'controllers',
  'model': 'models',
  'entity': 'models',
  'test': 'tests'
};

/**
 * Analiza estructura de directorios (versión ligera, sin escanear filesystem)
 * Usa la DB del OmnySys para obtener archivos indexados
 * @param {string} projectPath - Ruta del proyecto
 * @param {Object} repo - Repositorio con DB
 * @returns {Object} Convenciones detectadas
 */
export function analyzeDirectoryStructure(projectPath, repo) {
  if (!repo?.db) {
    logger.warn('[analyzeDirectoryStructure] DB not available');
    return getDefaultConventions();
  }

  try {
    // Obtener todos los archivos indexados
    const files = repo.db.prepare(`
      SELECT DISTINCT file_path
      FROM atoms
      WHERE file_path IS NOT NULL
    `).all();

    const conventions = {
      helperDirectories: new Set(),
      policyDirectories: new Set(),
      serviceDirectories: new Set(),
      testDirectories: new Set(),
      fileCount: files.length
    };

    // Analizar cada archivo
    for (const file of files) {
      const filePath = file.file_path.replace(/\\/g, '/');
      const dirPath = path.dirname(filePath);
      const fileName = path.basename(filePath);

      // Detectar tipo de archivo
      const fileType = detectFileType(fileName);

      // Agregar directorio a la convención correspondiente
      if (fileType === 'helper') {
        conventions.helperDirectories.add(dirPath);
      } else if (fileType === 'policy') {
        conventions.policyDirectories.add(dirPath);
      } else if (fileType === 'service') {
        conventions.serviceDirectories.add(dirPath);
      } else if (fileType === 'test') {
        conventions.testDirectories.add(dirPath);
      }
    }

    logger.info(`[analyzeDirectoryStructure] Analyzed ${files.length} files`);

    return {
      helperDirectories: Array.from(conventions.helperDirectories),
      policyDirectories: Array.from(conventions.policyDirectories),
      serviceDirectories: Array.from(conventions.serviceDirectories),
      testDirectories: Array.from(conventions.testDirectories),
      fileCount: conventions.fileCount
    };
  } catch (error) {
    logger.error(`[analyzeDirectoryStructure] Error: ${error.message}`);
    return getDefaultConventions();
  }
}

/**
 * Convenciones por defecto (si no hay DB o está vacía)
 */
function getDefaultConventions() {
  return {
    helperDirectories: ['/utils/', '/shared/', '/helpers/'],
    policyDirectories: ['/compiler/', '/guards/', '/policies/'],
    serviceDirectories: ['/services/', '/core/'],
    testDirectories: ['/tests/', '/__tests__/'],
    fileCount: 0
  };
}

/**
 * Detecta tipo de archivo por nombre
 */
function detectFileType(fileName) {
  const name = fileName.toLowerCase();
  
  if (name.includes('util') || name.includes('helper') || name.includes('common')) {
    return 'helper';
  }
  if (name.includes('policy') || name.includes('guard') || name.includes('rule') || name.includes('validator')) {
    return 'policy';
  }
  if (name.includes('service') || name.includes('manager') || name.includes('orchestrator')) {
    return 'service';
  }
  if (name.includes('controller') || name.includes('handler') || name.includes('route')) {
    return 'controller';
  }
  if (name.includes('model') || name.includes('entity') || name.includes('schema')) {
    return 'model';
  }
  if (name.includes('test') || name.includes('spec')) {
    return 'test';
  }
  
  return 'other';
}

/**
 * Sugiere el mejor directorio para un archivo nuevo
 * @param {string} fileName - Nombre del archivo
 * @param {string} fileType - Tipo de archivo (helper, policy, service, etc.)
 * @param {Object} conventions - Convenciones detectadas
 * @returns {string} Directorio sugerido
 */
export function suggestDirectoryForFile(fileName, fileType, conventions) {
  const directoryKey = FILE_TYPE_TO_DIRECTORY[fileType];
  
  if (!directoryKey) {
    return 'src/'; // Default
  }

  const directories = conventions[`${directoryKey}Directories`] || [];
  
  if (directories.length === 0) {
    // Si no hay convenciones detectadas, usar patrón por defecto
    const patterns = DIRECTORY_PATTERNS[directoryKey] || [];
    return patterns[0] || 'src/';
  }

  // Preferir el directorio más específico (más profundo)
  const sorted = [...directories].sort((a, b) => b.split('/').length - a.split('/').length);
  
  return sorted[0];
}

/**
 * Valida si un archivo está en el directorio correcto
 * @param {string} filePath - Ruta del archivo
 * @param {string} fileType - Tipo de archivo
 * @param {Object} conventions - Convenciones detectadas
 * @returns {Object} Resultado de validación
 */
export function validateFileLocation(filePath, fileType, conventions) {
  const expectedDirectory = suggestDirectoryForFile(path.basename(filePath), fileType, conventions);
  const actualDirectory = path.dirname(filePath).replace(/\\/g, '/');
  
  const isCorrect = actualDirectory.includes(expectedDirectory.replace(/^\//, ''));
  
  return {
    isCorrect,
    filePath,
    expectedDirectory,
    actualDirectory,
    suggestion: isCorrect ? null : `Move to ${expectedDirectory}`
  };
}

/**
 * Detecta archivos en directorios incorrectos (Architectural Drift)
 * @param {Array} files - Lista de archivos con su tipo
 * @param {Object} conventions - Convenciones detectadas
 * @returns {Array} Archivos en directorios incorrectos
 */
export function detectArchitecturalDrift(files, conventions) {
  const drift = [];
  
  for (const file of files) {
    const validation = validateFileLocation(file.path, file.type, conventions);
    
    if (!validation.isCorrect) {
      drift.push({
        ...validation,
        severity: 'medium',
        type: 'architectural_drift',
        message: `File ${file.path} is in wrong directory. Should be in ${validation.expectedDirectory}`
      });
    }
  }
  
  logger.info(`[detectArchitecturalDrift] Found ${drift.length} files in wrong directories`);
  
  return drift;
}

/**
 * Calcula score de organización arquitectónica (0-100, 100 = perfecto)
 * @param {Array} files - Lista de archivos
 * @param {Object} conventions - Convenciones detectadas
 * @returns {Object} Score y detalles
 */
export function calculateArchitectureOrganizationScore(files, conventions) {
  if (files.length === 0) {
    return { score: 100, total: 0, correct: 0, incorrect: 0 };
  }

  let correct = 0;
  const drift = [];

  for (const file of files) {
    const validation = validateFileLocation(file.path, file.type, conventions);
    if (validation.isCorrect) {
      correct++;
    } else {
      drift.push(validation);
    }
  }

  const score = Math.round((correct / files.length) * 100);

  return {
    score,
    total: files.length,
    correct,
    incorrect: drift.length,
    drift,
    level: score >= 90 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'fair' : 'poor'
  };
}
