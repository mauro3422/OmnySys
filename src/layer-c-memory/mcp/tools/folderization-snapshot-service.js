/**
 * Shared service for building lightweight folderization snapshots.
 */

import { getRepository } from '#layer-c/storage/repository/index.js';
import {
  buildFolderizationReportFromRepo,
  buildEmptyFolderizationReport,
  getDatabaseHealthSummary
} from '../../../shared/compiler/index.js';
import {
  buildFolderizationSnapshotFingerprint,
  loadFolderizationSnapshotHistory,
  persistFolderizationSnapshot
} from './folderization-snapshot-helpers.js';
import {
  buildFolderizationSnapshotSummary,
  buildHistoryWithCurrent,
  summarizeSemanticSurfaceForSnapshot
} from './folderization-snapshot-summary.js';

function normalizeFilePaths(filePaths = []) {
  return Array.isArray(filePaths)
    ? filePaths.map((filePath) => String(filePath || '').trim()).filter(Boolean)
    : [];
}

export async function buildFolderizationSnapshotContext(args = {}, context = {}, overrides = {}) {
  const projectPath = context?.projectPath || null;
  const repo = projectPath ? getRepository(projectPath) : null;
  if (!projectPath || !repo) {
    return {
      success: false,
      error: 'Project repository unavailable'
    };
  }

  const scopePath = args?.scopePath || null;
  const focusPath = args?.focusPath || null;
  const filePaths = normalizeFilePaths(args?.filePaths || []);
  const databaseHealth = args?.includeDatabaseHealth === false
    ? null
    : getDatabaseHealthSummary(repo.db, { liveRowSyncSampleLimit: 5 });
  const liveRowSync = databaseHealth?.metrics?.liveRowSync || null;
  const folderizationOptions = {
    scopePath,
    focusPath,
    filePaths,
    databaseHealthy: databaseHealth?.healthy === true,
    liveRowSyncState: liveRowSync?.state || 'missing'
  };

  const folderizationReport = repo
    ? buildFolderizationReportFromRepo(repo, folderizationOptions)
    : buildEmptyFolderizationReport(folderizationOptions);

  const prePersistHistory = loadFolderizationSnapshotHistory(repo.db, {
    projectPath,
    scopePath,
    focusPath,
    limit: args?.historyLimit || 5
  });

  const summary = buildFolderizationSnapshotSummary({
    folderizationReport,
    databaseHealth,
    scopePath,
    focusPath,
    history: prePersistHistory
  });

  const snapshot = {
    projectPath,
    scopePath,
    focusPath,
    filePaths,
    capturedAt: new Date().toISOString(),
    snapshotKind: overrides.snapshotKind || args?.snapshotKind || 'folderization',
    captureSource: overrides.captureSource || args?.captureSource || 'mcp.tool.get_folderization_snapshot',
    folderization: {
      candidateReport: folderizationReport.candidateReport,
      familyState: folderizationReport.familyState,
      migrationPlans: folderizationReport.migrationPlans,
      naming: folderizationReport.naming,
      namingPatterns: folderizationReport.namingPatterns,
      creationGuidance: folderizationReport.creationGuidance,
      propagation: folderizationReport.propagation,
      recommendation: folderizationReport.recommendation,
      drift: folderizationReport.drift || null,
      decision: folderizationReport.decision,
      summary: folderizationReport.summary
    },
    databaseHealth: databaseHealth ? {
      healthy: databaseHealth.healthy === true,
      healthScore: Number(databaseHealth.healthScore || 0),
      healthGrade: databaseHealth.grade || 'F',
      summary: databaseHealth.summary || null,
      metrics: {
        activeAtoms: Number(databaseHealth.metrics?.activeAtoms || 0),
        liveRowSync: databaseHealth.metrics?.liveRowSync || null,
        fileUniverse: databaseHealth.metrics?.fileUniverse || null,
        systemMapCoverage: databaseHealth.metrics?.systemMapCoverage || null,
        semanticSurface: summarizeSemanticSurfaceForSnapshot(databaseHealth.metrics?.semanticSurface)
      },
      criticalFindings: Array.isArray(databaseHealth.criticalFindings) ? databaseHealth.criticalFindings.slice(0, 5) : [],
      warnings: Array.isArray(databaseHealth.warnings) ? databaseHealth.warnings.slice(0, 5) : [],
      recommendations: Array.isArray(databaseHealth.recommendations) ? databaseHealth.recommendations.slice(0, 5) : []
    } : null,
    summary
  };

  snapshot.snapshotFingerprint = buildFolderizationSnapshotFingerprint(snapshot);
  snapshot.trend = summary.trend;

  const persisted = args?.persist !== false
    ? persistFolderizationSnapshot(repo.db, snapshot)
    : null;
  const history = buildHistoryWithCurrent(snapshot, prePersistHistory);

  return {
    success: true,
    projectPath,
    repo,
    folderizationReport,
    databaseHealth,
    snapshot: {
      ...snapshot,
      history
    },
    history,
    trend: summary.trend,
    persisted
  };
}

export default { buildFolderizationSnapshotContext };
