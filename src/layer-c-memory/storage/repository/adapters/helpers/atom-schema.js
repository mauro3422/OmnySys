import { TABLE_DEFINITIONS } from '../../../database/schema-registry.js';

export function getAtomInsertColumns() {
  return TABLE_DEFINITIONS.atoms.columns.map((column) => column.name);
}

export function buildAtomInsertSql() {
  const columns = getAtomInsertColumns();
  const placeholders = columns.map(() => '?').join(', ');
  return `INSERT OR REPLACE INTO atoms (${columns.join(', ')}) VALUES (${placeholders})`;
}

export function buildAtomInsertValues(row, updatedAt) {
  return getAtomInsertColumns().map((column) => {
    if (column === 'updated_at' && updatedAt) {
      return updatedAt;
    }

    return row[column] !== undefined ? row[column] : null;
  });
}
