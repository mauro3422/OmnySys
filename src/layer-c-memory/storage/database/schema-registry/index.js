/**
 * @fileoverview schema-registry.js
 *
 * 🏛️ SINGLE SOURCE OF TRUTH - Schema Registry (Barrel)
 *
 * Este archivo es el barrel coordinador. Las definiciones de tablas y helpers
 * internos están en archivos separados para mantener este archivo bajo 300 líneas.
 *
 * ESTRUCTURA:
 * - schema-registry-definitions.js: TABLE_DEFINITIONS (todas las tablas)
 * - schema-registry-helpers.js: getColumnDefinitionSQL (generador SQL de columnas)
 *
 * @module storage/database/schema-registry
 */

// Imports desde módulos separados
import { TABLE_DEFINITIONS } from '../schema-registry-definitions.js';
import { getColumnDefinitionSQL as _getColumnDefinitionSQL } from './helpers.js';

// Re-exportar TABLE_DEFINITIONS para compatibilidad
export { TABLE_DEFINITIONS };

/**
 * Obtiene todas las tablas registradas
 */
export function getRegisteredTables() {
  return Object.keys(TABLE_DEFINITIONS);
}

/**
 * Obtiene la definición de una tabla
 */
export function getTableDefinition(tableName) {
  return TABLE_DEFINITIONS[tableName];
}

/**
 * Obtiene todas las columnas de una tabla
 */
export function getTableColumns(tableName) {
  const table = TABLE_DEFINITIONS[tableName];
  if (!table) return [];
  return table.columns;
}

/**
 * Obtiene los índices de una tabla
 */
export function getTableIndexes(tableName) {
  const table = TABLE_DEFINITIONS[tableName];
  if (!table) return [];
  return table.indexes || [];
}

/**
 * Verifica si una columna existe en una tabla
 */
export function hasColumn(tableName, columnName) {
  const columns = getTableColumns(tableName);
  return columns.some(col => col.name === columnName);
}

/**
 * Obtiene una columna específica
 */
export function getColumn(tableName, columnName) {
  const columns = getTableColumns(tableName);
  return columns.find(col => col.name === columnName);
}

/**
 * Genera SQL para crear una tabla
 */
export function generateCreateTableSQL(tableName) {
  const table = TABLE_DEFINITIONS[tableName];
  if (!table) throw new Error(`Table ${tableName} not found in registry`);

  const columnDefs = table.columns.map(col => _getColumnDefinitionSQL(col));

  if (table.unique) {
    table.unique.forEach(uniqueCols => {
      columnDefs.push(`UNIQUE(${uniqueCols.join(', ')})`);
    });
  }

  return `CREATE TABLE IF NOT EXISTS ${tableName} (\n    ${columnDefs.join(',\n    ')}\n);`;
}

/**
 * Genera SQL para crear índices de una tabla
 */
export function generateCreateIndexesSQL(tableName) {
  const table = TABLE_DEFINITIONS[tableName];
  if (!table || !table.indexes) return [];

  return table.indexes.map(idx => {
    const columns = idx.columns.join(', ');
    return `CREATE INDEX IF NOT EXISTS ${idx.name} ON ${tableName}(${columns});`;
  });
}

/**
 * Detecta columnas faltantes en una tabla
 * @param {Array} existingColumns - Array de {name} desde PRAGMA table_info
 */
export function detectMissingColumns(tableName, existingColumns) {
  const registeredColumns = getTableColumns(tableName);
  const existingNames = new Set(existingColumns.map(col => col.name));

  return registeredColumns.filter(col => !existingNames.has(col.name));
}

/**
 * Genera SQL para agregar columnas faltantes
 */
export function generateAddColumnSQL(tableName, columnName) {
  const column = getColumn(tableName, columnName);
  if (!column) throw new Error(`Column ${columnName} not found in registry`);

  return `ALTER TABLE ${tableName} ADD COLUMN ${_getColumnDefinitionSQL(column, { isAlter: true })}`;
}

/**
 * Obtiene metadata de herramientas que usan una columna
 */
export function getColumnToolUsage(tableName, columnName) {
  const column = getColumn(tableName, columnName);
  if (!column) return [];
  return [];
}

/**
 * Genera reporte de estado del schema
 */
export function generateSchemaReport(existingTablesInfo) {
  const report = {
    tables: {},
    missingColumns: [],
    extraColumns: [],
    totalRegisteredColumns: 0,
    totalExistingColumns: 0
  };

  Object.entries(TABLE_DEFINITIONS).forEach(([tableName, tableDef]) => {
    const existingTable = existingTablesInfo.find(t => t.name === tableName);
    const registeredColumns = tableDef.columns;

    if (!existingTable) {
      report.tables[tableName] = {
        status: 'missing',
        registeredColumns: registeredColumns.length,
        existingColumns: 0
      };
      report.missingColumns.push({ table: tableName, columns: registeredColumns.map(c => c.name) });
    } else {
      const existingNames = new Set(existingTable.columns.map(c => c.name));
      const registeredNames = new Set(registeredColumns.map(c => c.name));

      const missing = registeredColumns.filter(col => !existingNames.has(col.name)).map(c => c.name);
      const extra = [...existingNames].filter(name => !registeredNames.has(name));

      report.tables[tableName] = {
        status: missing.length === 0 ? 'ok' : 'mismatch',
        registeredColumns: registeredColumns.length,
        existingColumns: existingTable.columns.length,
        missingColumns: missing,
        extraColumns: extra
      };

      if (missing.length > 0) report.missingColumns.push({ table: tableName, columns: missing });
      if (extra.length > 0) report.extraColumns.push({ table: tableName, columns: extra });
    }

    report.totalRegisteredColumns += registeredColumns.length;
    report.totalExistingColumns += report.tables[tableName].existingColumns;
  });

  return report;
}

/**
 * Exporta el schema completo como SQL
 */
export function exportSchemaSQL() {
  const header = [
    '-- OmnySystem SQLite Schema',
    `-- Generated from schema-registry.js`,
    `-- ${new Date().toISOString()}\n`
  ].join('\n');

  const body = Object.keys(TABLE_DEFINITIONS).map(tableName => {
    const tableSql = generateCreateTableSQL(tableName);
    const indexesSql = generateCreateIndexesSQL(tableName).join('\n');
    const description = `-- ${TABLE_DEFINITIONS[tableName].description}`;

    return [description, tableSql, indexesSql].filter(Boolean).join('\n');
  }).join('\n\n');

  return header + body;
}

// Default export para compatibilidad
export default {
  TABLE_DEFINITIONS,
  getRegisteredTables,
  getTableDefinition,
  getTableColumns,
  getTableIndexes,
  hasColumn,
  getColumn,
  generateCreateTableSQL,
  generateCreateIndexesSQL,
  detectMissingColumns,
  generateAddColumnSQL,
  getColumnToolUsage,
  generateSchemaReport,
  exportSchemaSQL
};
