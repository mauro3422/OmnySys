/**
 * @fileoverview Cache validation logic
 * @module verification/validators/integrity/validators/cache-validator
 */

import path from 'path';
import { Severity, IssueCategory, DataSystem } from '../../../types/index.js';

/**
 * Valida el caché verificando SQLite
 * @param {string} dataPath - Directorio de datos (.omnysysdata)
 * @param {Function} addIssue - Callback para agregar issues
 */
export async function validateCache(dataPath, addIssue) {
  const dbPath = path.join(dataPath, 'omnysys.db');

  try {
    const { default: Database } = await import('better-sqlite3');
    const db = new Database(dbPath, { readonly: true });
    
    // Verificar que la tabla atoms existe y tiene datos
    const atomsCount = db.prepare('SELECT COUNT(*) as count FROM atoms').get();
    
    if (!atomsCount || atomsCount.count === 0) {
      addIssue({
        category: IssueCategory.INTEGRITY,
        severity: Severity.HIGH,
        system: DataSystem.CACHE,
        path: 'omnysys.db',
        message: 'No atoms found in database'
      });
    }
    
    // Verificar tablas principales
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table'
    `).all();
    
    const requiredTables = ['atoms', 'atom_relations', 'files'];
    const existingTables = new Set(tables.map(t => t.name));
    
    for (const table of requiredTables) {
      if (!existingTables.has(table)) {
        addIssue({
          category: IssueCategory.INTEGRITY,
          severity: Severity.HIGH,
          system: DataSystem.CACHE,
          path: 'omnysys.db',
          message: `Missing required table: ${table}`
        });
      }
    }
    
    db.close();
    return true;
  } catch (error) {
    addIssue({
      category: IssueCategory.INTEGRITY,
      severity: Severity.MEDIUM,
      system: DataSystem.CACHE,
      path: 'omnysys.db',
      message: `Cache validation error: ${error.message}`
    });
    return false;
  }
}
