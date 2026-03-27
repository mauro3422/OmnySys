export function buildMetadataCoverageSummary(counts, primaryIssue) {
  return {
    totalTables: counts.totalTables,
    totalRows: counts.totalRows,
    totalFields: counts.totalFields,
    coveredFields: counts.coveredFields,
    emptyFields: counts.emptyFields,
    partialFields: counts.partialFields,
    fieldCoverageRatio: counts.fieldCoverageRatio,
    rowCoverageRatio: counts.rowCoverageRatio,
    coverageRatio: counts.coverageRatio,
    coveragePct: counts.coveragePct,
    fieldCoveragePct: counts.fieldCoveragePct,
    nextAction: primaryIssue
      ? `Review ${primaryIssue.table}.${primaryIssue.field} before trusting downstream metadata consumers.`
      : counts.healthy
        ? 'Metadata extraction coverage is healthy enough to trust downstream consumers.'
        : 'Reconcile the missing metadata surfaces before trusting downstream consumers.'
  };
}
