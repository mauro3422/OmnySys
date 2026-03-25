export function buildConditionalUpdateStatement(db, table, column, emptyCondition, hasUpdatedAt) {
  const updateSql = hasUpdatedAt
    ? `UPDATE ${table} SET ${column} = ?, updated_at = ? WHERE path = ? AND (${emptyCondition})`
    : `UPDATE ${table} SET ${column} = ? WHERE path = ? AND (${emptyCondition})`;
  return db.prepare(updateSql);
}

export function runConditionalUpdate(updateStmt, hasUpdatedAt, values, nowIso, filePath) {
  const args = Array.isArray(values) ? values : [values];
  return hasUpdatedAt
    ? updateStmt.run(...args, nowIso, filePath)
    : updateStmt.run(...args, filePath);
}
