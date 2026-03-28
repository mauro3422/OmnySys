export { normalizeDbPath } from './system-map-persistence-repair-normalization.js';

export function getTableColumns(db, table) {
  return db.prepare(`PRAGMA table_info("${table}")`).all();
}

export function hasColumn(columns, columnName) {
  return Array.isArray(columns) && columns.some((column) => column?.name === columnName);
}
