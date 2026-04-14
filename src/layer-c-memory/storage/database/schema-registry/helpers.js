/**
 * @fileoverview schema-registry-helpers.js
 * 
 * Helpers internos para el schema registry.
 * 
 * @module storage/database/schema-registry-helpers
 */

/**
 * Gets columns for a table from the database
 */
export function getTableColumns(tableName, db) {
  if (!db?.prepare || !tableName) {
    return [];
  }

  try {
    return db.prepare(`PRAGMA table_info(${tableName})`).all() || [];
  } catch {
    return [];
  }
}
