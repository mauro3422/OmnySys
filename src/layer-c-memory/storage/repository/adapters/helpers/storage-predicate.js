export function buildSoftDeletePredicate(tableAlias = '', includeRemoved = false) {
  if (includeRemoved) {
    return '1=1';
  }

  const prefix = tableAlias ? `${tableAlias}.` : '';
  return `(${prefix}is_removed IS NULL OR ${prefix}is_removed = 0)`;
}
