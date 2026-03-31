/**
 * @fileoverview schema-registry-helpers.js
 * 
 * Helpers internos para el schema registry.
 * Extraído de schema-registry.js para reducir tamaño del archivo principal.
 * 
 * @module storage/database/schema-registry-helpers
 */

/**
 * Genera la definición SQL de una columna
 * @param {Object} col - Definición de la columna
 * @param {Object} options - Opciones adicionales
 * @param {boolean} options.isAlter - Si es para ALTER TABLE
 * @returns {string} Definición SQL de la columna
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