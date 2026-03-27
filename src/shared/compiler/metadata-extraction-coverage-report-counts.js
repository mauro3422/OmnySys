import { toNumber } from './core-utils.js';

export function collectMetadataCoverageCounts(tables = []) {
  const totalTables = tables.length;
  const totalRows = tables.reduce((sum, table) => sum + toNumber(table.totalRows), 0);
  const totalFields = tables.reduce((sum, table) => sum + toNumber(table.totalFields), 0);
  const coveredFields = tables.reduce((sum, table) => sum + toNumber(table.coveredFields), 0);
  const emptyFields = tables.reduce((sum, table) => sum + toNumber(table.emptyFields), 0);
  const partialFields = tables.reduce((sum, table) => sum + toNumber(table.partialFields), 0);
  const fieldCoverageRatio = totalFields > 0 ? Number((coveredFields / totalFields).toFixed(3)) : 0;
  const rowCoverageRatio = totalFields > 0 && totalRows > 0
    ? Number((tables.reduce((sum, table) => sum + (toNumber(table.rowCoverageRatio) * toNumber(table.totalFields)), 0) / totalFields).toFixed(3))
    : 0;
  return {
    totalTables,
    totalRows,
    totalFields,
    coveredFields,
    emptyFields,
    partialFields,
    fieldCoverageRatio,
    rowCoverageRatio,
    coverageRatio: rowCoverageRatio,
    coveragePct: Math.round(rowCoverageRatio * 100),
    fieldCoveragePct: Math.round(fieldCoverageRatio * 100),
    trustworthy: totalFields > 0 && fieldCoverageRatio >= 0.5 && rowCoverageRatio >= 0.5,
    healthy: totalFields > 0 && fieldCoverageRatio >= 0.75 && rowCoverageRatio >= 0.75
  };
}
