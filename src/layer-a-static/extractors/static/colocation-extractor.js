/**
 * @fileoverview colocation-extractor.js
 *
 * Detecta archivos co-locados por convenciones de nombrado y directorios
 * (Button.js + Button.test.js, Button.stories.js, Button.module.css, etc)
 *
 * @module extractors/static/colocation-extractor
 */

import path from 'path';
import { ConnectionType, DEFAULT_CONFIDENCE } from './constants.js';

/**
 * Patrones de archivos co-locados por suffix
 * @constant {Array}
 */
const COLOCATION_PATTERNS = [
  { suffix: '.test', type: 'test-companion' },
  { suffix: '.spec', type: 'test-companion' },
  { suffix: '.stories', type: 'storybook' },
  { suffix: '.module.css', type: 'css-module' },
  { suffix: '.module.scss', type: 'css-module' },
  { suffix: '.styles', type: 'style-file' },
  { suffix: '.mock', type: 'mock-file' },
  { suffix: '.fixture', type: 'test-fixture' },
];

/**
 * Patrones de directorios especiales
 * @constant {Array}
 */
const DIR_PATTERNS = [
  { dir: '__tests__', type: 'test-companion' },
  { dir: '__mocks__', type: 'mock-file' },
  { dir: '__fixtures__', type: 'test-fixture' },
  { dir: '__stories__', type: 'storybook' },
];

/**
 * Detecta archivos co-locados entre todos los archivos del proyecto
 * @param {string[]} allFilePaths - Lista de todas las rutas de archivos
 * @returns {Array} - Conexiones detectadas
 */
export function detectColocatedFiles(allFilePaths) {
  const connections = [];
  const fileSet = new Set(allFilePaths);

  for (const filePath of allFilePaths) {
    const parsed = path.parse(filePath);
    const baseName = parsed.name.replace(/\.(test|spec|stories|mock|fixture|styles|module)$/, '');
    const dir = parsed.dir;
    const ext = parsed.ext;

    // Buscar archivos hermanos por suffix
    for (const pattern of COLOCATION_PATTERNS) {
      const candidate = path.join(dir, `${baseName}${pattern.suffix}${ext}`);
      if (candidate !== filePath && fileSet.has(candidate)) {
        connections.push({
          id: `colocation-${filePath}-${candidate}`,
          sourceFile: filePath,
          targetFile: candidate,
          type: ConnectionType.COLOCATED,
          via: 'naming-convention',
          colocationType: pattern.type,
          direction: `${baseName}${ext} <-> ${path.basename(candidate)}`,
          confidence: DEFAULT_CONFIDENCE,
          detectedBy: 'colocation-extractor',
          reason: `Co-located files: ${path.basename(filePath)} and ${path.basename(candidate)}`
        });
      }
    }

    // Buscar en directorios patrón (__tests__/Button.js para Button.js)
    for (const pattern of DIR_PATTERNS) {
      const candidate = path.join(dir, pattern.dir, `${parsed.name}${ext}`);
      if (candidate !== filePath && fileSet.has(candidate)) {
        connections.push({
          id: `colocation-${filePath}-${candidate}`,
          sourceFile: filePath,
          targetFile: candidate,
          type: ConnectionType.COLOCATED,
          via: 'directory-convention',
          colocationType: pattern.type,
          direction: `${path.basename(filePath)} <-> ${pattern.dir}/${path.basename(candidate)}`,
          confidence: DEFAULT_CONFIDENCE,
          detectedBy: 'colocation-extractor',
          reason: `Co-located: ${path.basename(filePath)} has companion in ${pattern.dir}/`
        });
      }
    }
  }

  return connections;
}

/**
 * Obtiene los archivos co-locados para un archivo específico
 * @param {string} filePath - Ruta del archivo
 * @param {string[]} allFilePaths - Lista de todas las rutas
 * @returns {Array} - Archivos co-locados encontrados
 */
export function getColocatedFilesFor(filePath, allFilePaths) {
  const allConnections = detectColocatedFiles(allFilePaths);
  return allConnections.filter(
    conn => conn.sourceFile === filePath || conn.targetFile === filePath
  );
}

/**
 * Verifica si un archivo tiene companion de test
 * @param {string} filePath - Ruta del archivo
 * @param {string[]} allFilePaths - Lista de todas las rutas
 * @returns {boolean}
 */
export function hasTestCompanion(filePath, allFilePaths) {
  const colocated = getColocatedFilesFor(filePath, allFilePaths);
  return colocated.some(c => c.colocationType === 'test-companion');
}
