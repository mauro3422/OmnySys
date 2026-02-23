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

  return normalizedPath;
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
      const fileData = repo.query 
        ? await repo.query({ filePath: normalizedPath }, { limit: 1 })
        : null;
      
      if (fileData && fileData.length > 0) {
        const row = fileData[0];
        
        // Obtener todos los átomos del archivo
        const atoms = await repo.getByFile 
          ? await repo.getByFile(normalizedPath) 
          : [];
        
        // Construir respuesta en formato compatible con la API anterior
        return {
          file: normalizedPath,
          path: normalizedPath,
          lastAnalyzed: row.last_analyzed || row.updated_at || new Date().toISOString(),
          atomCount: row.atom_count || atoms.length,
          totalComplexity: row.total_complexity || 0,
          totalLines: row.total_lines || 0,
          moduleName: row.module_name || null,
          imports: JSON.parse(row.imports_json || '[]'),
          exports: JSON.parse(row.exports_json || '[]'),
          atoms: atoms.map(atom => ({
            id: atom.id,
            name: atom.name,
            type: atom.type,
            line: atom.lineStart,
            endLine: atom.lineEnd,
            linesOfCode: atom.linesOfCode,
            complexity: atom.complexity,
            isExported: atom.isExported,
            isAsync: atom.isAsync,
            calls: atom.calls || [],
            calledBy: atom.calledBy || [],
            archetype: atom.archetype,
            purpose: atom.purpose
          })),
          // Campos legacy para compatibilidad
          definitions: (atoms || []).map(a => ({
            name: a.name,
            type: a.type,
            line: a.lineStart
          })),
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
