/**
 * File scanning utilities for analysis checking
 * @module mcp/core/analysis-checker/file-scanner
 */

import path from 'path';
import fs from 'fs/promises';
import { discoverProjectSourceFiles } from '#shared/compiler/file-discovery.js';

const DATA_DIR = '.omnysysdata';

/**
 * Verifica si existe analisis previo en .omnysysdata/
 * @param {string} projectPath - Project root path
 * @returns {Promise<boolean>} - True if analysis exists
 */
export async function hasExistingAnalysis(projectPath) {
  const dbPath = path.join(projectPath, DATA_DIR, 'omnysys.db');
  
  try {
    // Check for index.json (legacy)
    const indexPath = path.join(projectPath, DATA_DIR, 'index.json');
    try { await fs.unlink(indexPath + '.tmp'); } catch { }
    await fs.access(indexPath);
    return true;
  } catch {
    // Check for SQLite database (newer)
    try {
      await fs.access(dbPath);
      // Verify SQLite has data
      const SQLite = (await import('better-sqlite3')).default;
      const db = new SQLite(dbPath, { readonly: true });
      const count = db.prepare('SELECT COUNT(*) as count FROM atoms').get();
      db.close();
      return count?.count > 0;
    } catch {
      return false;
    }
  }
}

/**
 * Escanear archivos actuales del proyecto
 * @param {string} projectPath - Project root path
 * @returns {Promise<Array>} - Array of file info objects
 */
export async function scanCurrentFiles(projectPath) {
  const relativePaths = await discoverProjectSourceFiles(projectPath);
  const files = await Promise.all(relativePaths.map(async (relativePath) => {
    const fullPath = path.join(projectPath, relativePath);
    const stats = await fs.stat(fullPath);
    return {
      path: relativePath,
      fullPath,
      mtime: stats.mtime.getTime(),
      size: stats.size
    };
  }));

  return files;
}

/**
 * Obtiene los archivos que realmente existen en el índice persistido.
 * Se usan ambas tablas porque `files` puede quedar desfasada durante reinicios,
 * mientras `atoms` refleja mejor qué terminó persistido.
 *
 * @param {string} projectPath - Project root path
 * @returns {Promise<Set<string>>}
 */
export async function getIndexedFilePaths(projectPath) {
  const dbPath = path.join(projectPath, DATA_DIR, 'omnysys.db');

  try {
    const SQLite = (await import('better-sqlite3')).default;
    const db = new SQLite(dbPath, { readonly: true });
    const rows = db.prepare(`
      SELECT path AS file_path FROM files
      UNION
      SELECT DISTINCT file_path FROM atoms
      WHERE file_path IS NOT NULL AND file_path != ''
    `).all();
    db.close();

    return new Set(
      rows
        .map((row) => row?.file_path)
        .filter(Boolean)
        .map((filePath) => filePath.replace(/\\/g, '/'))
    );
  } catch {
    return new Set();
  }
}
