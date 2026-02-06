/**
 * @fileoverview export-index.js
 * 
 * Construcción del índice de exports incluyendo re-exports.
 * Permite rastrear barrel exports: export { x } from './file'
 * 
 * @module graph/builders/export-index
 */

import { resolveImportPath } from '../utils/path-utils.js';

/**
 * Información sobre un export en el índice
 * @typedef {Object} ExportIndexEntry
 * @property {'direct'|'reexport'} type - Tipo de export
 * @property {string} sourceFile - Archivo fuente
 * @property {string} sourceName - Nombre original en el archivo fuente
 */

/**
 * Construye el índice de exports para todos los archivos
 * 
 * @param {Object} parsedFiles - Mapa de archivos parseados
 * @param {Set<string>} allFilePaths - Set de todos los paths válidos
 * @returns {Object.<string, Object.<string, ExportIndexEntry>>} - Índice de exports
 */
export function buildExportIndex(parsedFiles, allFilePaths) {
  const exportIndex = {};

  for (const [filePath, fileInfo] of Object.entries(parsedFiles)) {
    if (!fileInfo.exports || fileInfo.exports.length === 0) continue;

    exportIndex[filePath] = {};

    for (const exportItem of fileInfo.exports) {
      if (exportItem.type === 'reexport' && exportItem.source) {
        // Re-export: export { x } from './file'
        const resolvedSource = resolveImportPath(filePath, exportItem.source);

        // Solo agregar si el archivo fuente existe en el grafo
        if (allFilePaths.has(resolvedSource)) {
          exportIndex[filePath][exportItem.name] = {
            type: 'reexport',
            sourceFile: resolvedSource,
            sourceName: exportItem.local
          };
        }
      } else {
        // Export directo
        exportIndex[filePath][exportItem.name] = {
          type: 'direct',
          sourceFile: filePath,
          sourceName: exportItem.name
        };
      }
    }
  }

  return exportIndex;
}

/**
 * Obtiene la fuente original de un export (resolviendo re-exports)
 * 
 * @param {string} exportName - Nombre del export
 * @param {string} filePath - Archivo donde se exporta
 * @param {Object} exportIndex - Índice de exports
 * @param {number} [maxDepth=10] - Profundidad máxima para evitar ciclos
 * @returns {ExportIndexEntry|null} - Fuente original o null
 */
export function resolveExportSource(exportName, filePath, exportIndex, maxDepth = 10) {
  let currentFile = filePath;
  let currentName = exportName;
  let depth = 0;

  while (depth < maxDepth) {
    const fileExports = exportIndex[currentFile];
    if (!fileExports) return null;

    const entry = fileExports[currentName];
    if (!entry) return null;

    if (entry.type === 'direct') {
      return entry;
    }

    // Es re-export, seguir la cadena
    currentFile = entry.sourceFile;
    currentName = entry.sourceName;
    depth++;
  }

  // Se alcanzó la profundidad máxima (posible ciclo de re-exports)
  return null;
}

/**
 * Encuentra todos los archivos que re-exportan desde un archivo fuente
 * 
 * @param {string} sourceFile - Archivo fuente
 * @param {Object} exportIndex - Índice de exports
 * @returns {Array<{file: string, exports: string[]}>}
 */
export function findReexportingFiles(sourceFile, exportIndex) {
  const result = [];

  for (const [filePath, exports] of Object.entries(exportIndex)) {
    const reexported = [];

    for (const [name, entry] of Object.entries(exports)) {
      if (entry.type === 'reexport' && entry.sourceFile === sourceFile) {
        reexported.push(name);
      }
    }

    if (reexported.length > 0) {
      result.push({ file: filePath, exports: reexported });
    }
  }

  return result;
}
