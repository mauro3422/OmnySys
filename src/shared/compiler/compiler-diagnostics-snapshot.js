/**
 * @fileoverview Canonical compiler diagnostics snapshot.
 *
 * Reuses the current canonical compiler helpers to build the shared
 * diagnostics payload consumed by MCP status/reporting surfaces.
 *
 * @module shared/compiler/compiler-diagnostics-snapshot
 */

import { discoverProjectSourceFiles } from './file-discovery.js';
import { syncPersistedScannedFileManifest, summarizePersistedScannedFileCoverage } from './compiler-persistence.js';
import { collectCanonicalAdoptionEvidence } from './compiler-diagnostics-snapshot-evidence.js';
import {
  buildCompilerDiagnosticsSnapshotContracts,
  getCompilerDiagnosticsDatabaseSurfaces
} from './compiler-diagnostics-snapshot-contracts.js';

async function buildCompilerDiagnosticsSnapshotPayload({
  projectPath,
  db,
  policySummary = { total: 0, high: 0, medium: 0, byPolicyArea: {}, byRule: {} },
  watcherAlerts = [],
  sharedState = {},
  compilerRemediation = null,
  canonicalAdoptions = null,
  tableCounts = {}
} = {}) {
  const scannedFilePaths = await discoverProjectSourceFiles(projectPath);
  const canonicalAdoptionEvidence = await collectCanonicalAdoptionEvidence(projectPath);
  const dbSurfaces = getCompilerDiagnosticsDatabaseSurfaces(db);

  if (dbSurfaces.phase2PendingFiles === 0) {
    await syncPersistedScannedFileManifest(projectPath, scannedFilePaths);
  }

  const persistedFileCoverage = await summarizePersistedScannedFileCoverage(projectPath, scannedFilePaths);
  const contracts = buildCompilerDiagnosticsSnapshotContracts({
    projectPath,
    persistedFileCoverage,
    canonicalAdoptionEvidence,
    dbSurfaces,
    db,
    policySummary,
    watcherAlerts,
    sharedState,
    compilerRemediation,
    canonicalAdoptions,
    tableCounts
  });

  return {
    ...dbSurfaces,
    ...contracts,
    canonicalAdoptionEvidence,
    canonicalAdoptions: contracts.resolvedCanonicalAdoptions
  };
}

export async function loadCompilerDiagnosticsSnapshot(options = {}) {
  return buildCompilerDiagnosticsSnapshotPayload(options);
}
