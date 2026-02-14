/**
 * @fileoverview Source Code Builder - Construye mapa de código fuente
 * 
 * Responsabilidad Única (SRP): Leer archivos y construir mapa de source code.
 * 
 * @module pipeline/enhancers/builders
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Builds a map of relativePath -> sourceCode by reading files from disk.
 * Uses parsedFiles (absolute paths) and maps them to relative paths matching systemMap.
 * 
 * @param {string} absoluteRootPath - Raiz absoluta del proyecto
 * @param {Object} parsedFiles - Mapa de absolutePath -> FileInfo (del parser)
 * @param {Object} systemMap - System map con files (relative paths), metadata
 * @returns {Promise<Object>} Mapa de relativePath -> sourceCode
 */
export async function buildSourceCodeMap(absoluteRootPath, parsedFiles, systemMap) {
  const sourceCodeMap = {};
  const normalizedRoot = absoluteRootPath.replace(/\\/g, '/').replace(/\/$/, '');

  for (const absolutePath of Object.keys(parsedFiles)) {
    const normalizedAbsolute = absolutePath.replace(/\\/g, '/');
    const relativePath = normalizedAbsolute.startsWith(normalizedRoot)
      ? normalizedAbsolute.slice(normalizedRoot.length + 1)
      : path.relative(absoluteRootPath, absolutePath).replace(/\\/g, '/');

    // Only read files that are in the systemMap
    if (systemMap.files && systemMap.files[relativePath]) {
      try {
        const code = await fs.readFile(absolutePath, 'utf-8');
        sourceCodeMap[relativePath] = code;
      } catch {
        // Skip unreadable files
      }
    }
  }

  return sourceCodeMap;
}

/**
 * Lee el contenido de un archivo específico
 * @param {string} absolutePath - Ruta absoluta del archivo
 * @returns {Promise<string|null>} Contenido del archivo o null si falla
 */
export async function readSourceFile(absolutePath) {
  try {
    return await fs.readFile(absolutePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Obtiene paths relativos desde absolutos
 * @param {string} absoluteRootPath - Raíz del proyecto
 * @param {string} absolutePath - Path absoluto
 * @returns {string} Path relativo
 */
export function getRelativePath(absoluteRootPath, absolutePath) {
  const normalizedRoot = absoluteRootPath.replace(/\\/g, '/').replace(/\/$/, '');
  const normalizedAbsolute = absolutePath.replace(/\\/g, '/');
  
  return normalizedAbsolute.startsWith(normalizedRoot)
    ? normalizedAbsolute.slice(normalizedRoot.length + 1)
    : path.relative(absoluteRootPath, absolutePath).replace(/\\/g, '/');
}
