/**
 * @fileoverview file-utils.js
 * Utilidades para operaciones con archivos
 */

import fs from 'fs/promises';
import { resolveImportPath } from '../resolvers/path-resolver.js';

/**
 * Verifica si un archivo existe
 * @param {string} filePath - Path del archivo
 * @returns {Promise<boolean>}
 */
export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifica si un módulo importado existe en el filesystem
 * @param {string} importSource - Path del import
 * @param {string} currentFile - Archivo que hace el import
 * @param {string} projectPath - Path del proyecto
 * @returns {Promise<Object>} {exists, resolvedPath, attemptedPaths}
 */
export async function checkImportExists(importSource, currentFile, projectPath) {
  const possiblePaths = resolveImportPath(importSource, currentFile, projectPath);
  const attemptedPaths = [];
  
  for (const p of possiblePaths) {
    if (p === 'node_module') {
      return { exists: true, resolvedPath: importSource, attemptedPaths: [importSource] };
    }
    
    attemptedPaths.push(p);
    
    // Verificar existencia real en disco
    if (await fileExists(p)) {
      return { exists: true, resolvedPath: p, attemptedPaths };
    }
    
    // También probar con /index.js o /index.ts si es un directorio
    const indexPaths = [`${p}/index.js`, `${p}/index.ts`];
    for (const indexPath of indexPaths) {
      attemptedPaths.push(indexPath);
      if (await fileExists(indexPath)) {
        return { exists: true, resolvedPath: indexPath, attemptedPaths };
      }
    }
  }
  
  return { exists: false, resolvedPath: null, attemptedPaths };
}
