/**
 * @fileoverview File dependency queries (imports and dependents)
 * @module query/queries/file-query/dependencies/deps
 */

import { getFileAnalysis } from '../core/single-file.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import { getSystemMapPersistenceCoverage, shouldTrustSystemMapDependencies } from '#shared/compiler/index.js';

/**
 * Obtiene dependencias de un archivo
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta del archivo
 * @param {Object} options - includeSemantic: true para incluir shares_state
 * @returns {Promise<string[]>}
 */
export async function getFileDependencies(rootPath, filePath, options = {}) {
  const result = new Set();
  try {
    const repo = getRepository(rootPath);
    if (repo && repo.db) {
      const normalizedPath = filePath.replace(/\\/g, '/');
      const coverage = getSystemMapPersistenceCoverage(repo.db);

      // 1. Structural dependencies (imports)
      if (shouldTrustSystemMapDependencies(coverage)) {
        const deps = repo.db.prepare(`
          SELECT DISTINCT target_path FROM file_dependencies
          WHERE source_path = ?
        `).all(normalizedPath);
        deps.forEach(d => result.add(d.target_path));
      } else {
        const fileRows = repo.db.prepare(`
          SELECT imports_json FROM files WHERE path = ?
        `).all(normalizedPath);
        for (const row of fileRows) {
          try {
            const imports = JSON.parse(row.imports_json || '[]');
            for (const imp of imports) {
              const target = imp?.resolved || imp?.source;
              if (target) result.add(target);
            }
          } catch {
            // Fallback keeps query resilient to malformed rows.
          }
        }
      }

      // 2. Semantic dependencies (shares_state)
      if (options.includeSemantic) {
        const semantic = repo.db.prepare(`
          SELECT DISTINCT a2.file_path as target_file
          FROM atom_relations ar
          JOIN atoms a1 ON ar.source_id = a1.id
          JOIN atoms a2 ON ar.target_id = a2.id
          WHERE a1.file_path = ? AND ar.relation_type = 'shares_state'
        `).all(normalizedPath);
        semantic.forEach(s => { if (s.target_file && s.target_file !== normalizedPath) result.add(s.target_file); });
      }

      if (result.size > 0) return Array.from(result);
    }
  } catch (err) {
    console.error(`[getFileDependencies] SQLite error: ${err.message}`);
  }

  // Fallback
  const analysis = await getFileAnalysis(rootPath, filePath);
  return analysis?.imports?.map(imp => imp.source) || [];
}

/**
 * Obtiene dependientes de un archivo (archivos que importan este archivo)
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta del archivo
 * @param {Object} options - includeSemantic: true para incluir shares_state
 * @returns {Promise<string[]>}
 */
export async function getFileDependents(rootPath, filePath, options = {}) {
  const result = new Set();
  try {
    const repo = getRepository(rootPath);
    if (repo && repo.db) {
      const normalizedPath = filePath.replace(/\\/g, '/');
      const coverage = getSystemMapPersistenceCoverage(repo.db);

      // 1. Structural dependents (importers)
      if (shouldTrustSystemMapDependencies(coverage)) {
        const deps = repo.db.prepare(`
          SELECT DISTINCT source_path FROM file_dependencies 
          WHERE target_path = ? OR target_path LIKE ?
        `).all(normalizedPath, normalizedPath.replace(/\.js$/, '') + '%');
        deps.forEach(d => result.add(d.source_path));
      }

      // 2. Semantic dependents (shares_state callers)
      if (options.includeSemantic) {
        const semantic = repo.db.prepare(`
          SELECT DISTINCT a1.file_path as source_file
          FROM atom_relations ar
          JOIN atoms a1 ON ar.source_id = a1.id
          JOIN atoms a2 ON ar.target_id = a2.id
          WHERE a2.file_path = ? AND ar.relation_type = 'shares_state'
        `).all(normalizedPath);
        semantic.forEach(s => { if (s.source_file && s.source_file !== normalizedPath) result.add(s.source_file); });
      }

      if (result.size > 0) return Array.from(result);
    }
  } catch (err) {
    console.error(`[getFileDependents] SQLite error: ${err.message}`);
  }

  // Fallback
  const analysis = await getFileAnalysis(rootPath, filePath);
  return analysis?.usedBy || [];
}
