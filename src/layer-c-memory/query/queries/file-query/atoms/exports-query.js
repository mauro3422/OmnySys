/**
 * @fileoverview exports-query.js
 *
 * Query especializada para obtener exports de un archivo.
 * Usado por validate-imports para validación de imports.
 *
 * @module query/queries/file-query/atoms/exports-query
 */

import { loadAtoms } from '#layer-c/storage/index.js';

/**
 * Obtiene todos los exports de un archivo específico
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<Set<string>>} Set con nombres de exports
 */
export async function getFileExports(rootPath, filePath) {
  const atoms = await loadAtoms(rootPath, filePath);
  
  const exportNames = new Set();
  
  for (const atom of atoms) {
    // Agregar exports directos
    if (atom.is_exported && atom.name) {
      exportNames.add(atom.name);
    }
    
    // Agregar re-exports (export * from)
    if (atom.metadata?.exports) {
      for (const exp of atom.metadata.exports) {
        if (exp?.name) {
          exportNames.add(exp.name);
        }
        // Manejar re-exports anidados
        if (exp?.type === 'reexport' && exp?.exports) {
          for (const reexport of exp.exports) {
            if (reexport?.name) {
              exportNames.add(reexport.name);
            }
          }
        }
      }
    }
  }
  
  return exportNames;
}

/**
 * Verifica si un export específico existe en un archivo
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta del archivo
 * @param {string} exportName - Nombre del export a verificar
 * @returns {Promise<boolean>} True si el export existe
 */
export async function hasExport(rootPath, filePath, exportName) {
  const exports = await getFileExports(rootPath, filePath);
  return exports.has(exportName);
}
