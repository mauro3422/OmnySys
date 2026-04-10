/**
 * @fileoverview schema-registry-helpers.js
 *
 * Internal helpers for the schema registry.
 * Extracted from schema-registry.js to keep the main file smaller.
 *
 * @module storage/database/schema-registry-helpers
 */

/**
 * Generates the SQL definition for a column.
 * @param {Object} col - Column definition
 * @param {Object} options - Additional options
 * @param {boolean} options.isAlter - Whether this is for ALTER TABLE
 * @returns {string} SQL definition for the column
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

export default { getColumnDefinitionSQL };
