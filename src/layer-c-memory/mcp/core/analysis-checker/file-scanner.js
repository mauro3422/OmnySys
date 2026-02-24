/**
 * File scanning utilities for analysis checking
 * @module mcp/core/analysis-checker/file-scanner
 */

import path from 'path';
import fs from 'fs/promises';

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
  const files = [];
  
  async function scanDir(dir, relativePath = '') {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.join(relativePath, entry.name);
        
        if (entry.name === 'node_modules' || entry.name === '.omnysysdata' || entry.name.startsWith('.')) {
          continue;
        }
        
        if (entry.isDirectory()) {
          await scanDir(fullPath, relPath);
        } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts') || entry.name.endsWith('.jsx') || entry.name.endsWith('.tsx'))) {
          const stats = await fs.stat(fullPath);
          files.push({
            path: relPath.replace(/\\/g, '/'),
            fullPath,
            mtime: stats.mtime.getTime(),
            size: stats.size
          });
        }
      }
    } catch (error) {
    }
  }
  
  await scanDir(projectPath);
  return files;
}
