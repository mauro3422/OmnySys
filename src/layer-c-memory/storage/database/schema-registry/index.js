/**
 * @fileoverview schema-registry barrel file
 * Re-exports all schema registry functionality and provides derived helpers
 * @module storage/database/schema-registry
 */

import { TABLE_DEFINITIONS } from '../schema-registry-definitions.js';
import { getTableColumns } from './helpers.js';

// Re-export TABLE_DEFINITIONS
export { TABLE_DEFINITIONS } from '../schema-registry-definitions.js';
export { getTableColumns } from './helpers.js';

/**
 * Returns all registered table names
 */
export function getRegisteredTables() {
  return Object.keys(TABLE_DEFINITIONS);
}

/**
 * Returns the full definition of a table
 */
export function getTableDefinition(tableName) {
  return TABLE_DEFINITIONS[tableName] || null;
}

/**
 * Checks if a column exists in a table
 */
export function hasColumn(tableName, columnName) {
  const def = TABLE_DEFINITIONS[tableName];
  if (!def?.columns) return false;
  return def.columns.some(col => col.name === columnName);
}

/**
 * Detects missing columns in a table compared to registered definition
 */
export function detectMissingColumns(tableName, existingColumns = []) {
  const def = TABLE_DEFINITIONS[tableName];
  if (!def?.columns) return [];

  const existingNames = new Set(existingColumns.map(c => c.name || c));
  return def.columns.filter(col => !existingNames.has(col.name));
}

/**
 * Generates SQL to add a column to a table
 */
export function generateAddColumnSQL(tableName, columnName) {
  const def = TABLE_DEFINITIONS[tableName];
  if (!def?.columns) return null;

  const col = def.columns.find(c => c.name === columnName);
  if (!col) return null;

  let sql = `ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${col.type}`;
  if (col.pk) sql += ' PRIMARY KEY';
  if (col.default !== undefined) {
    const defaultVal = typeof col.default === 'string' ? `'${col.default}'` : col.default;
    sql += ` DEFAULT ${defaultVal}`;
  }

  return sql;
}

/**
 * Generates CREATE TABLE SQL for a registered table
 */
export function generateCreateTableSQL(tableName) {
  const def = TABLE_DEFINITIONS[tableName];
  if (!def?.columns) return null;

  const columnDefs = def.columns.map(col => {
    let colSql = `${col.name} ${col.type}`;
    if (col.pk) colSql += ' PRIMARY KEY';
    if (col.autoIncrement) colSql += ' AUTOINCREMENT';
    if (!col.nullable && !col.pk) colSql += ' NOT NULL';
    if (col.default !== undefined) {
      const defaultVal = typeof col.default === 'string' ? `'${col.default}'` : col.default;
      colSql += ` DEFAULT ${defaultVal}`;
    }
    return colSql;
  }).join(',\n  ');

  return `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${columnDefs}\n)`;
}

/**
 * Generates CREATE INDEX SQL for a table
 */
export function generateCreateIndexesSQL(tableName) {
  const def = TABLE_DEFINITIONS[tableName];
  if (!def?.indexes || def.indexes.length === 0) return [];

  return def.indexes.map(idx => {
    const unique = idx.unique ? 'UNIQUE ' : '';
    const columns = idx.columns.join(', ');
    return `CREATE ${unique}INDEX IF NOT EXISTS ${idx.name} ON ${tableName} (${columns})`;
  });
}

/**
 * Generates a full schema report
 */
export function generateSchemaReport(db) {
  if (!db?.prepare) return { tables: [], columns: 0, indexes: 0 };

  const tables = getRegisteredTables().map(name => {
    const def = getTableDefinition(name);
    const columns = getTableColumns(name, db);
    return {
      name,
      registeredColumns: def?.columns || [],
      actualColumns: columns,
      missingColumns: detectMissingColumns(name, columns)
    };
  });

  return {
    tables,
    tablesCount: tables.length,
    totalRegisteredColumns: tables.reduce((sum, t) => sum + t.registeredColumns.length, 0),
    totalActualColumns: tables.reduce((sum, t) => sum + t.actualColumns.length, 0),
    totalMissingColumns: tables.reduce((sum, t) => sum + t.missingColumns.length, 0)
  };
}

/**
 * Exports full schema as SQL
 */
export function exportSchemaSQL(db) {
  if (!db?.prepare) return '';

  const statements = [];

  for (const tableName of getRegisteredTables()) {
    const createTable = generateCreateTableSQL(tableName);
    if (createTable) statements.push(createTable);

    const indexes = generateCreateIndexesSQL(tableName);
    statements.push(...indexes);
  }

  return statements.join(';\n\n') + (statements.length > 0 ? ';' : '');
}

/**
 * Generates column definition SQL (moved from helpers to avoid circular dep)
 */
export function getColumnDefinitionSQL(col, options = {}) {
  let sql = `${col.name} ${col.type}`;
  if (col.pk) sql += ' PRIMARY KEY';
  if (col.autoIncrement) sql += ' AUTOINCREMENT';
  if (!col.nullable && !col.pk && !options.isAlter) sql += ' NOT NULL';
  if (col.default !== undefined) {
    const defaultVal = typeof col.default === 'string' ? `'${col.default}'` : col.default;
    sql += ` DEFAULT ${defaultVal}`;
  }
  return sql;
}

export default {
  TABLE_DEFINITIONS,
  getRegisteredTables,
  getTableDefinition,
  hasColumn,
  detectMissingColumns,
  generateAddColumnSQL,
  generateCreateTableSQL,
  generateCreateIndexesSQL,
  getTableColumns,
  getColumnDefinitionSQL,
  generateSchemaReport,
  exportSchemaSQL
};
