export function collectMetadataCoverageFields(tables = []) {
  const flattenedFields = tables.flatMap((table) => table.fields);
  const applicableFields = flattenedFields.filter((field) => field.eligibleRows > 0 && field.state !== 'not_applicable');
  const sortedMissingFields = applicableFields
    .filter((field) => field.populatedRows === 0)
    .sort((a, b) => a.table.localeCompare(b.table) || a.field.localeCompare(b.field));
  const sortedCoveredFields = applicableFields
    .filter((field) => field.populatedRows > 0)
    .sort((a, b) => b.coverageRatio - a.coverageRatio || a.table.localeCompare(b.table) || a.field.localeCompare(b.field));
  const primaryIssue = sortedMissingFields[0] || applicableFields
    .filter((field) => field.populatedRows > 0)
    .sort((a, b) => a.coverageRatio - b.coverageRatio || a.table.localeCompare(b.table) || a.field.localeCompare(b.field))[0] || null;

  return {
    flattenedFields,
    sortedMissingFields,
    sortedCoveredFields,
    primaryIssue
  };
}
