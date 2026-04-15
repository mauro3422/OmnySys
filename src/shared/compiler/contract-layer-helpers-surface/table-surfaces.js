/**
 * Canonical table surface builders for contract layer.
 * Builds surfaces for atoms, files, atom_relations, compiler_scanned_files.
 */

import { normalizeCount } from '../surface-utils.js';
import { buildSurface } from './models.js';

export function buildCanonicalTableSurfaces(tableCounts = {}, persistedFileCoverage = null, fileUniverseGranularity = null) {
  const filesCount = normalizeCount(tableCounts.files);
  const atomsCount = normalizeCount(tableCounts.atoms);
  const relationsCount = normalizeCount(tableCounts.atom_relations);
  const manifestCount = normalizeCount(persistedFileCoverage?.manifestFileTotal);
  const scannedCount = normalizeCount(persistedFileCoverage?.scannedFileTotal);
  const liveFileCount = normalizeCount(fileUniverseGranularity?.liveFileCount ?? persistedFileCoverage?.liveIndexedFiles);

  return [
    buildSurface({
      id: 'atoms',
      kind: 'table',
      status: 'canonical',
      sourceOfTruth: true,
      scope: 'live graph atoms',
      surface: 'atoms',
      trustworthy: atomsCount > 0,
      healthy: atomsCount > 0,
      summary: `Primary atom graph with ${atomsCount} live rows.`,
      evidence: { rows: atomsCount }
    }),
    buildSurface({
      id: 'files',
      kind: 'table',
      status: 'canonical',
      sourceOfTruth: true,
      scope: 'primary file metadata',
      surface: 'files',
      trustworthy: filesCount > 0,
      healthy: filesCount > 0,
      summary: `Primary file-level metadata surface with ${filesCount} live rows.`,
      evidence: { rows: filesCount }
    }),
    buildSurface({
      id: 'atom_relations',
      kind: 'table',
      status: 'canonical',
      sourceOfTruth: true,
      scope: 'dependency and semantic detail',
      surface: 'atom_relations',
      trustworthy: relationsCount > 0,
      healthy: relationsCount > 0,
      summary: `Canonical atom-level relation surface with ${relationsCount} live rows.`,
      evidence: { rows: relationsCount }
    }),
    buildSurface({
      id: 'compiler_scanned_files',
      kind: 'table',
      status: 'canonical',
      sourceOfTruth: true,
      scope: 'scanner manifest',
      surface: 'compiler_scanned_files',
      trustworthy: persistedFileCoverage?.synchronized !== false,
      healthy: fileUniverseGranularity?.healthy !== false,
      summary: `Scanner manifest tracks ${manifestCount} persisted rows for ${scannedCount} discovered files.`,
      evidence: {
        scannedFileTotal: scannedCount,
        manifestFileTotal: manifestCount,
        liveFileCount
      }
    })
  ];
}

export function buildRuntimeBoundarySurface() {
  return buildSurface({
    id: 'runtime_boundary_surfaces',
    kind: 'surface',
    status: 'canonical',
    sourceOfTruth: true,
    scope: 'runtime boundary checks',
    surface: 'runtime_boundary_surfaces',
    backingSurface: 'runtime-boundary-execution + runtime-boundary-classification + runtime-boundary-recovery',
    trustworthy: true,
    healthy: true,
    summary: 'Canonical runtime boundary surface for async recovery, network execution, and boundary classification.',
    evidence: {
      entrypoints: [
        'executeWithBoundary',
        'executeWithNetworkBoundary',
        'classifyBoundaryError'
      ]
    },
    recommendedAction: 'Keep this as the source of truth.'
  });
}

export { buildSurface };
