/**
 * Coverage and support surface builders for contract layer.
 * Builds surfaces for metadata_extraction_coverage, risk_assessments, system_map, system_files.
 */

import { normalizeCount } from '../surface-utils.js';
import { buildSurface } from './models.js';

export function buildCoverageAndSupportSurfaces({
  metadataSurfaceParity = null,
  metadataExtractionCoverage = null,
  systemMapPersistenceCoverage = null,
  tableCounts = {}
} = {}) {
  const riskCount = normalizeCount(tableCounts.risk_assessments);

  return [
    buildSurface({
      id: 'system_files',
      kind: 'table',
      status: 'mirrored_support',
      sourceOfTruth: false,
      scope: 'mirrored metadata support',
      surface: 'system_files',
      backingSurface: 'files',
      trustworthy: metadataSurfaceParity?.trustworthy !== false,
      healthy: metadataSurfaceParity?.healthy !== false,
      summary: metadataSurfaceParity?.summary || 'Mirrored support metadata surface used for parity checks.',
      evidence: {
        parityStatus: metadataSurfaceParity?.status || 'unknown'
      }
    }),
    buildSurface({
      id: 'metadata_extraction_coverage',
      kind: 'coverage',
      status: metadataExtractionCoverage?.healthy === false ? 'advisory' : 'canonical',
      sourceOfTruth: false,
      scope: 'metadata extraction coverage',
      surface: 'metadata_extraction_coverage',
      backingSurface: 'atoms + files + system_files',
      trustworthy: metadataExtractionCoverage?.trustworthy !== false,
      healthy: metadataExtractionCoverage?.healthy !== false,
      summary: metadataExtractionCoverage?.summary
        ? `Metadata extraction coverage spans ${normalizeCount(metadataExtractionCoverage.summary.totalFields)} tracked field(s) across ${normalizeCount(metadataExtractionCoverage.summary.totalTables)} table(s).`
        : 'Metadata extraction coverage is tracked across atoms, files, and system_files.',
      evidence: {
        totalTables: normalizeCount(metadataExtractionCoverage?.summary?.totalTables),
        totalRows: normalizeCount(metadataExtractionCoverage?.summary?.totalRows),
        totalFields: normalizeCount(metadataExtractionCoverage?.summary?.totalFields),
        coveredFields: normalizeCount(metadataExtractionCoverage?.summary?.coveredFields),
        fieldCoverageRatio: Number(metadataExtractionCoverage?.summary?.fieldCoverageRatio || 0),
        rowCoverageRatio: Number(metadataExtractionCoverage?.summary?.rowCoverageRatio || 0),
        primaryIssue: metadataExtractionCoverage?.primaryIssue || null
      }
    }),
    buildSurface({
      id: 'risk_assessments',
      kind: 'table',
      status: riskCount > 0 ? 'advisory' : 'advisory_only',
      sourceOfTruth: false,
      scope: 'risk advisory support',
      surface: 'risk_assessments',
      backingSurface: 'atoms',
      trustworthy: riskCount > 0,
      healthy: riskCount > 0,
      summary: riskCount > 0
        ? `Risk advisory surface tracks ${riskCount} rows.`
        : 'Risk advisory surface is empty until the runtime repopulates it.',
      evidence: { rows: riskCount }
    }),
    buildSurface({
      id: 'system_map',
      kind: 'table',
      status: 'mirrored_support',
      sourceOfTruth: false,
      scope: 'system map projection',
      surface: 'system_map',
      backingSurface: 'atoms + files',
      trustworthy: systemMapPersistenceCoverage?.healthy !== false,
      healthy: systemMapPersistenceCoverage?.healthy !== false,
      summary: systemMapPersistenceCoverage?.summary || 'System map projection mirrors the canonical relation surfaces.',
      evidence: {
        healthy: systemMapPersistenceCoverage?.healthy !== false,
        liveAtoms: normalizeCount(systemMapPersistenceCoverage?.liveAtomFiles)
      }
    })
  ];
}
