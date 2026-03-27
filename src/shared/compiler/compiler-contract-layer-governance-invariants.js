/**
 * @fileoverview Governance invariants for the compiler contract layer.
 *
 * @module shared/compiler/compiler-contract-layer-governance-invariants
 */

import { buildInvariant, normalizeCount } from './compiler-contract-layer-helpers.js';

export function buildInvariants({
  persistedFileCoverage = null,
  fileUniverseGranularity = null,
  metadataSurfaceParity = null,
  semanticCanonicality = null,
  semanticSurfaceGranularity = null,
  systemMapPersistenceCoverage = null,
  tableCounts = {}
} = {}) {
  return [
    buildInvariant({
      id: 'primary_file_metadata_surface',
      status: normalizeCount(tableCounts.files) > 0 ? 'pass' : 'fail',
      severity: 'high',
      message: 'The `files` table is the primary file-level metadata surface.',
      recommendedAction: 'Do not promote mirrored support tables to primary truth; repopulate `files` first if it is empty.',
      evidence: { rows: normalizeCount(tableCounts.files) }
    }),
    buildInvariant({
      id: 'scanner_manifest_alignment',
      status: fileUniverseGranularity?.healthy === false || persistedFileCoverage?.synchronized === false ? 'fail' : 'pass',
      severity: 'high',
      message: 'Discovered files, persisted scanner manifest, and live index must stay aligned through the scanned-file manifest contract.',
      recommendedAction: 'Run scanner discovery through syncPersistedScannedFileManifest before reporting file-universe counts.',
      evidence: {
        persistedFileCoverage,
        fileUniverseGranularity
      }
    }),
    buildInvariant({
      id: 'semantic_summary_is_not_detail',
      status: semanticSurfaceGranularity?.materiallyDrifting === true ? 'fail' : 'pass',
      severity: 'high',
      message: 'File-level semantic summaries must never be treated as equivalent to atom-level semantic relations.',
      recommendedAction: 'Use atoms semantic metadata as source of truth and pass semantic_connections through getSemanticSurfaceGranularity.',
      evidence: {
        semanticCanonicality,
        semanticSurfaceGranularity
      }
    }),
    buildInvariant({
      id: 'mirrored_metadata_requires_parity',
      status: metadataSurfaceParity?.healthy === false ? 'fail' : 'pass',
      severity: 'medium',
      message: 'Mirrored metadata support tables must preserve enough richness to back file-level queries safely.',
      recommendedAction: 'Check getMetadataSurfaceParity before serving mirrored metadata as if it were primary.',
      evidence: metadataSurfaceParity || {}
    }),
    buildInvariant({
      id: 'system_map_support_alignment',
      status: systemMapPersistenceCoverage?.healthy === false ? 'fail' : 'pass',
      severity: 'medium',
      message: 'system_files/file_dependencies must stay aligned with canonical persistence and graph output.',
      recommendedAction: 'Repair or validate system-map persistence coverage before legacy queries rely on support tables.',
      evidence: systemMapPersistenceCoverage || {}
    })
  ];
}
