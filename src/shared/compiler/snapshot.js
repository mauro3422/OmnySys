/**
 * @fileoverview Canonical compiler diagnostics snapshot.
 *
 * Reuses the current canonical compiler helpers to build the shared
 * diagnostics payload consumed by MCP status/reporting surfaces.
 *
 * @module shared/compiler/compiler-diagnostics-snapshot
 */

import { discoverProjectSourceFiles } from './file-discovery.js';
import {
  reconcileExcludedCompilerFiles,
  syncPersistedScannedFileManifest,
  summarizePersistedScannedFileCoverage
} from './persistence/index.js';
import { collectCanonicalAdoptionEvidence } from './evidence.js';
import {
  buildCompilerDiagnosticsSnapshotContracts,
  getCompilerDiagnosticsDatabaseSurfaces
} from './contracts.js';
export {
  buildCompilerMetricsSnapshot,
  summarizeCompilerMetricsSnapshot
} from './metrics/snapshot.js';

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
  let dbSurfaces = getCompilerDiagnosticsDatabaseSurfaces(db);

  await syncPersistedScannedFileManifest(projectPath, scannedFilePaths);
  await reconcileExcludedCompilerFiles(projectPath);
  dbSurfaces = getCompilerDiagnosticsDatabaseSurfaces(db);

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
