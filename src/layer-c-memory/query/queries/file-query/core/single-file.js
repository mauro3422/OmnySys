/**
 * @fileoverview Single file analysis queries
 * @module query/queries/file-query/core/single-file
 */

import path from 'path';
import { getDataDirectory } from '#layer-c/storage/index.js';
import { readJSON } from '#layer-c/query/readers/json-reader.js';
import { getRepository } from '#layer-c/storage/repository/index.js';

/**
 * Normalizes file path to be relative to root
 * @param {string} rootPath - Project root
 * @param {string} filePath - File path (absolute or relative)
 * @returns {string} - Normalized relative path
 */
function normalizeFilePath(rootPath, filePath) {
  if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
    return null;
  }

  let normalizedPath = filePath;
  const normalizedFilePath = filePath.replace(/\\/g, '/');
  const normalizedRootPath = rootPath.replace(/\\/g, '/');

  if (path.isAbsolute(filePath) && normalizedFilePath.startsWith(normalizedRootPath)) {
    normalizedPath = path.relative(rootPath, filePath);
  }

  // Normalizar separadores y eliminar prefijos basura como ./ o / inicial
  return normalizedPath
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\//, '');
}

/**
 * Obtiene el análisis completo de un archivo específico
 * 
 * PRIORIDAD: SQLite primero → JSON fallback para backwards compatibility
 * 
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta relativa del archivo
 * @returns {Promise<object>} - Datos completos del archivo
 */
export async function getFileAnalysis(rootPath, filePath) {
  const normalizedPath = normalizeFilePath(rootPath, filePath);

  if (!normalizedPath) {
    return null;
  }

  // PRIORIDAD 1: Consultar SQLite
  try {
    const repo = getRepository(rootPath);
    if (repo) {
      // Obtener datos del archivo desde la tabla files
      const row = repo.getFile
        ? await repo.getFile(normalizedPath)
        : null;

      if (row) {

        // Obtener todos los átomos del archivo
        const atoms = await repo.getByFile
          ? await repo.getByFile(normalizedPath)
          : [];

        // --- DINAMISMO ATÓMICO (Phase 9.1) & O(n) Optimizations ---
        const dbExports = JSON.parse(row.exports_json || '[]');

        const mappedAtoms = [];
        const mappedDefinitions = [];
        const atomExports = [];

        for (const atom of atoms) {
          if (!atom) continue;

          const atomType = atom.atom_type || atom.type || 'unknown';
          const atomName = atom.name || 'unknown';

          if (atom.isExported) {
            atomExports.push({ name: atomName, kind: atomType });
          }

          mappedAtoms.push({
            id: atom.id,
            name: atomName,
            type: atomType,
            line: atom.lineStart || 0,
            endLine: atom.lineEnd || 0,
            linesOfCode: atom.linesOfCode || 0,
            complexity: atom.complexity || 0,
            isExported: !!atom.isExported,
            isAsync: !!atom.isAsync,
            calls: typeof atom.calls_json === 'string' ? JSON.parse(atom.calls_json) : (Array.isArray(atom.calls) ? atom.calls : []),
            calledBy: typeof atom.called_by_json === 'string' ? JSON.parse(atom.called_by_json) : (Array.isArray(atom.calledBy) ? atom.calledBy : []),
            archetype: atom.archetype_type || atom.archetype || 'unknown',
            purpose: atom.purpose_type || atom.purpose || 'unknown'
          });

          mappedDefinitions.push({
            name: atomName,
            type: atomType,
            line: atom.lineStart || 0
          });
        }

        // Combinamos: Si atoms tiene exportaciones pero la tabla files no, usamos atoms (Real-Time)
        const exports = atomExports.length > 0 ? atomExports : dbExports;

        // Construir respuesta en formato compatible con la API anterior
        return {
          file: normalizedPath,
          path: normalizedPath,
          lastAnalyzed: row.last_analyzed || row.updated_at || new Date().toISOString(),
          atomCount: atoms.length,
          totalComplexity: row.total_complexity || 0,
          totalLines: row.total_lines || 0,
          moduleName: row.module_name || null,
          imports: JSON.parse(row.imports_json || '[]'),
          exports: exports,
          atoms: mappedAtoms,
          // Campos legacy para compatibilidad
          definitions: mappedDefinitions,
          usedBy: [],
          importedBy: []
        };
      }
    }
  } catch (err) {
    console.error(`[getFileAnalysis] SQLite error, falling back to JSON: ${err.message}`);
  }

  // PRIORIDAD 2: Fallback a JSON (backwards compatibility)
  const dataPath = getDataDirectory(rootPath).replace(/\\/g, '/');
  const filePart = path.posix.join(dataPath, 'files', normalizedPath.replace(/\\/g, '/') + '.json');
  return await readJSON(filePart);
}
