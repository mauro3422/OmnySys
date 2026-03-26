/**
 * @fileoverview exports-query.js
 *
 * Query especializada para obtener exports de un archivo.
 * Usado por validate-imports para validación de imports.
 *
 * @module query/queries/file-query/atoms/exports-query
 */

import path from 'path';
import { parseFileFromDisk } from '#layer-a/parser/index.js';
import { loadAtoms } from '#layer-c/storage/index.js';
import { getFileAnalysis } from '../core/single-file.js';

function getAtomExportName(atom = {}) {
  return atom.name || atom.atom_name || atom.functionName || atom.exportName || null;
}

function collectMetadataExportNames(metadataExports, exportNames) {
  for (const exp of metadataExports) {
    if (exp?.name) {
      exportNames.add(exp.name);
    }

    if (exp?.type === 'reexport' && Array.isArray(exp.exports)) {
      for (const reexport of exp.exports) {
        if (reexport?.name) {
          exportNames.add(reexport.name);
        }
      }
    }
  }
}

function collectAtomExportNames(atoms = []) {
  const exportNames = new Set();

  for (const atom of atoms) {
    const isExported = atom.isExported ?? atom.is_exported ?? false;
    const atomName = getAtomExportName(atom);

    if (isExported && atomName) {
      exportNames.add(atomName);
    }

    if (Array.isArray(atom.metadata?.exports) && atom.metadata.exports.length > 0) {
      collectMetadataExportNames(atom.metadata.exports, exportNames);
    }
  }

  return exportNames;
}

function collectAnalysisExportNames(analysis, exportNames) {
  const analysisExports = Array.isArray(analysis?.exports) ? analysis.exports : [];

  for (const exp of analysisExports) {
    if (typeof exp === 'string' && exp.trim()) {
      exportNames.add(exp.trim());
      continue;
    }

    if (exp?.name) {
      exportNames.add(exp.name);
    }
  }
}

/**
 * Obtiene todos los exports de un archivo específico
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<Set<string>>} Set con nombres de exports
 */
export async function getFileExports(rootPath, filePath) {
  const atoms = await loadAtoms(rootPath, filePath);
  const exportNames = collectAtomExportNames(atoms);

  if (exportNames.size === 0) {
    const analysis = await getFileAnalysis(rootPath, filePath).catch(() => null);
    collectAnalysisExportNames(analysis, exportNames);
  }

  if (exportNames.size === 0) {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(rootPath, filePath);
    const parsedFile = await parseFileFromDisk(absolutePath).catch(() => null);
    collectAnalysisExportNames(parsedFile, exportNames);
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
