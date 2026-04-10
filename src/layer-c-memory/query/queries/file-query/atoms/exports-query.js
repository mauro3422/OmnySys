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
import { getRepository } from '#layer-c/storage/repository/index.js';
import { getFileAnalysis } from '../core/single-file.js';
import { normalizePath } from '#shared/utils/path-utils.js';

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
    const resolvedName = resolveExportName(exp);
    if (resolvedName) {
      exportNames.add(resolvedName);
    }
  }

  // Also check explicit re-export entries
  const reExports = Array.isArray(analysis?.reExports) ? analysis.reExports : [];
  for (const reExp of reExports) {
    if (typeof reExp === 'string') {
      exportNames.add(reExp);
    } else {
      const resolvedName = resolveExportName(reExp);
      if (resolvedName) {
        exportNames.add(resolvedName);
      }
    }
  }
}

function resolveExportName(exp) {
  if (typeof exp === 'string') return exp.trim() || null;
  return exp?.exportedAs || exp?.localName || exp?.exportName || exp?.name || null;
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

  // Always merge exports_json from DB to catch re-exports that are not atoms
  // e.g.: export { foo as bar } from './other.js' — these don't create atoms
  const repo = getRepository(rootPath);
  if (repo?.initialized && repo?.db && repo.db.open !== false) {
    const row = repo.db.prepare(
      'SELECT exports_json FROM files WHERE path = ? AND is_removed = 0'
    ).get(normalizePath(filePath, rootPath));
    if (row?.exports_json) {
      try {
        const exports = JSON.parse(row.exports_json);
        for (const exp of exports) {
          if (typeof exp === 'string') {
            exportNames.add(exp);
          } else if (exp?.name) {
            exportNames.add(exp.name);
          } else if (exp?.exportedAs) {
            exportNames.add(exp.exportedAs);
          } else if (exp?.localName) {
            exportNames.add(exp.localName);
          }
        }
      } catch {
        // JSON parse error — skip
      }
    }
  }

  if (exportNames.size === 0) {
    const analysis = await getFileAnalysis(rootPath, filePath).catch(() => null);
    if (analysis) {
      collectAnalysisExportNames(analysis, exportNames);
    }
  }

  // Fallback: parse from disk when DB has no exports (stale index or new file)
  if (exportNames.size === 0) {
    try {
      const parsed = await parseFileFromDisk(path.join(rootPath, filePath));
      if (parsed?.exports) {
        collectAnalysisExportNames({ exports: parsed.exports }, exportNames);
      }
    } catch {
      // File may not exist on disk or parse error — accept empty exports
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
