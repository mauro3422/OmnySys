/**
 * @fileoverview Canonical metadata extraction coverage helpers.
 *
 * Summarizes how much of the extracted metadata surface is populated in the
 * canonical DB tables without falling back to filesystem heuristics.
 *
 * @module shared/compiler/metadata-extraction-coverage
 */

import { buildNoDatabaseCoverage } from './metadata-extraction-coverage-helpers.js';
import { repairMetadataExtractionCoverage } from '../metadata-extraction-coverage-repair.js';
import {
  buildMetadataCoverageReport,
  collectMetadataCoverageTables,
  shouldRepairMetadataCoverage
} from './index.js';

export function getMetadataExtractionCoverage(db) {
  if (!db?.prepare) {
    return buildNoDatabaseCoverage();
  }

  const initialCoverage = buildMetadataCoverageReport(collectMetadataCoverageTables(db));
  if (shouldRepairMetadataCoverage(initialCoverage)) {
    const repairResult = repairMetadataExtractionCoverage(db);
    if (repairResult?.repaired === true) {
      return buildMetadataCoverageReport(collectMetadataCoverageTables(db));
    }
  }

  return initialCoverage;
}

export function summarizeMetadataExtractionCoverage(coverage = null) {
  if (!coverage || typeof coverage !== 'object') {
    return {
      totalTables: 0,
      totalRows: 0,
      totalFields: 0,
      coveredFields: 0,
      emptyFields: 0,
      partialFields: 0,
      fieldCoverageRatio: 0,
      rowCoverageRatio: 0,
      coverageRatio: 0,
      coveragePct: 0,
      fieldCoveragePct: 0,
      healthy: false,
      trustworthy: false,
      nextAction: 'No metadata extraction coverage is available.'
    };
  }

  return coverage.summary || {
    totalTables: 0,
    totalRows: 0,
    totalFields: 0,
    coveredFields: 0,
    emptyFields: 0,
    partialFields: 0,
    fieldCoverageRatio: 0,
    rowCoverageRatio: 0,
    coverageRatio: 0,
    coveragePct: 0,
    fieldCoveragePct: 0,
    healthy: false,
    trustworthy: false,
    nextAction: 'No metadata extraction coverage summary is available.'
  };
}

export default {
  getMetadataExtractionCoverage,
  summarizeMetadataExtractionCoverage
};
